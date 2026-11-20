import { describe, expect, it, vi } from "vitest";
import signup from "./signup.js";

const { createSignup, normalizeSignup, SignupValidationError, DuplicateEmailError } = signup;

const studentSkillAnswers = [
  "Python",
  "Algorithms",
  "Data Structures",
  "Object-Oriented Programming",
  "Computer Systems",
  "Databases"
].map((name, index) => ({ name, answer: index % 2 === 0 ? "yes" : "no" }));

describe("normalizeSignup", () => {
  it("normalizes names and email for a teacher without student-only details", () => {
    const result = normalizeSignup({
      firstName: "  Alex ",
      lastName: " Rivera ",
      email: "  ALEX@EXAMPLE.EDU ",
      password: "A-long-demo-password",
      role: "teacher"
    });

    expect(result).toMatchObject({
      firstName: "Alex",
      lastName: "Rivera",
      email: "alex@example.edu",
      role: "teacher"
    });
    expect(result).not.toHaveProperty("skills");
  });

  it("normalizes student skill answers for persistence", () => {
    const result = normalizeSignup({
      firstName: "Sam",
      lastName: "Student",
      email: "sam@example.edu",
      password: "A-long-demo-password",
      role: "student",
      major: "Computer Science, B.S.",
      career: "Software Developer / Engineer",
      skills: studentSkillAnswers
    });

    expect(result.skills).toHaveLength(6);
    expect(result.skills[0]).toEqual({ name: "Python", knowsSkill: true });
    expect(result.skills[1]).toEqual({ name: "Algorithms", knowsSkill: false });
  });

  it("rejects incomplete student assessments and short passwords", () => {
    const signupDetails = {
      firstName: "Sam",
      lastName: "Student",
      email: "sam@example.edu",
      password: "A-long-demo-password",
      role: "student",
      major: "Computer Science, B.S.",
      career: "Software Developer / Engineer",
      skills: studentSkillAnswers.slice(0, 5)
    };

    expect(() => normalizeSignup(signupDetails)).toThrow(SignupValidationError);
    expect(() => normalizeSignup({
      ...signupDetails,
      password: "short",
      skills: studentSkillAnswers
    })).toThrow(SignupValidationError);
  });
});

describe("createSignup", () => {
  it("saves a student account, profile, and skill answers in one transaction", async () => {
    const savedSkills = [];
    const transaction = {
      user: {
        create: vi.fn().mockResolvedValue({
          id: "student-id",
          email: "sam@example.edu",
          role: "student"
        })
      },
      program: { findUnique: vi.fn().mockResolvedValue({ id: "program-id" }) },
      careerField: { findUnique: vi.fn().mockResolvedValue({ id: "career-id" }) },
      skill: {
        findMany: vi.fn().mockResolvedValue(studentSkillAnswers.map(({ name }, index) => ({
          id: `skill-${index}`,
          name
        })))
      },
      profile: { create: vi.fn().mockResolvedValue({}) },
      studentSkill: {
        create: vi.fn().mockImplementation(({ data }) => {
          savedSkills.push(data);
          return Promise.resolve(data);
        })
      },
      course: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "course-1",
            code: "SAMPLE-101",
            programMappings: [{ programId: "program-id" }],
            careerMappings: [{ careerFieldId: "career-id" }],
            prerequisites: [],
            skills: [{ skillId: "skill-0", importance: 1 }]
          },
          {
            id: "course-2",
            code: "SAMPLE-201",
            programMappings: [{ programId: "program-id" }],
            careerMappings: [{ careerFieldId: "career-id" }],
            prerequisites: [{ prerequisiteId: "course-1" }],
            skills: [{ skillId: "skill-1", importance: 1 }]
          }
        ])
      },
      roadmap: { create: vi.fn().mockResolvedValue({ id: "roadmap-id" }) },
      roadmapCourse: {
        create: vi.fn().mockResolvedValue({})
      }
    };
    const prisma = {
      $transaction: vi.fn((callback) => callback(transaction))
    };

    await expect(createSignup(prisma, {
      firstName: "Sam",
      lastName: "Student",
      email: "sam@example.edu",
      password: "A-long-demo-password",
      role: "student",
      major: "Computer Science, B.S.",
      career: "Software Developer / Engineer",
      skills: studentSkillAnswers
    })).resolves.toMatchObject({ id: "student-id", roadmapCourseCount: 2 });

    expect(transaction.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        passwordHash: expect.stringMatching(/^scrypt\$[0-9a-f]+\$[0-9a-f]+$/)
      })
    }));
    expect(transaction.profile.create).toHaveBeenCalledWith({
      data: {
        userId: "student-id",
        majorProgramId: "program-id",
        desiredCareerId: "career-id"
      }
    });
    expect(savedSkills).toHaveLength(6);
    expect(transaction.roadmapCourse.create).toHaveBeenNthCalledWith(1, {
      data: { roadmapId: "roadmap-id", courseId: "course-1", position: 1 }
    });
    expect(transaction.roadmapCourse.create).toHaveBeenNthCalledWith(2, {
      data: { roadmapId: "roadmap-id", courseId: "course-2", position: 2 }
    });
  });

  it("does not create student profile data for an employer", async () => {
    const transaction = {
      user: {
        create: vi.fn().mockResolvedValue({
          id: "employer-id",
          email: "employer@example.edu",
          role: "employer"
        })
      }
    };
    const prisma = { $transaction: vi.fn((callback) => callback(transaction)) };

    await createSignup(prisma, {
      firstName: "Ari",
      lastName: "Employer",
      email: "employer@example.edu",
      password: "A-long-demo-password",
      role: "employer"
    });

    expect(transaction.user.create).toHaveBeenCalledOnce();
    expect(transaction.profile).toBeUndefined();
  });

  it("returns a clear conflict for duplicate email addresses", async () => {
    const prisma = {
      $transaction: vi.fn(async () => {
        const error = new Error("Unique constraint failed");
        error.code = "P2002";
        throw error;
      })
    };

    await expect(createSignup(prisma, {
      firstName: "Sam",
      lastName: "Student",
      email: "sam@example.edu",
      password: "A-long-demo-password",
      role: "teacher"
    })).rejects.toBeInstanceOf(DuplicateEmailError);
  });
});

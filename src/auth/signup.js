const { promisify } = require("node:util");
const { randomBytes, scrypt: scryptCallback } = require("node:crypto");
const { generateStudentRoadmap } = require("../roadmap/generate");

const scrypt = promisify(scryptCallback);

const studentSkills = [
  "Python",
  "Algorithms",
  "Data Structures",
  "Object-Oriented Programming",
  "Computer Systems",
  "Databases"
];

class SignupValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "SignupValidationError";
    this.statusCode = 400;
  }
}

class DuplicateEmailError extends Error {
  constructor() {
    super("An account with this email already exists.");
    this.name = "DuplicateEmailError";
    this.statusCode = 409;
  }
}

function requiredText(value, label, maxLength) {
  if (typeof value !== "string") {
    throw new SignupValidationError(`${label} is required.`);
  }
  const text = value.trim();
  if (!text || text.length > maxLength) {
    throw new SignupValidationError(`${label} must be between 1 and ${maxLength} characters.`);
  }
  return text;
}

function normalizeSignup(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new SignupValidationError("Submit valid sign-up details.");
  }

  const firstName = requiredText(input.firstName, "First name", 80);
  const lastName = requiredText(input.lastName, "Last name", 80);
  const email = requiredText(input.email, "Email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new SignupValidationError("Enter a valid email address.");
  }

  if (typeof input.password !== "string" || input.password.length < 12 || input.password.length > 128) {
    throw new SignupValidationError("Password must be between 12 and 128 characters.");
  }

  const role = input.role;
  if (!["student", "teacher", "employer"].includes(role)) {
    throw new SignupValidationError("Choose Student, Teacher, or Employer.");
  }

  const signup = { firstName, lastName, email, password: input.password, role };
  if (role !== "student") {
    return signup;
  }

  signup.major = requiredText(input.major, "Major", 120);
  signup.career = requiredText(input.career, "Career field", 120);
  if (!Array.isArray(input.skills) || input.skills.length !== studentSkills.length) {
    throw new SignupValidationError("Answer every skill question to continue.");
  }

  const answers = new Map();
  for (const answer of input.skills) {
    if (
      !answer ||
      typeof answer !== "object" ||
      !studentSkills.includes(answer.name) ||
      !["yes", "no"].includes(answer.answer) ||
      answers.has(answer.name)
    ) {
      throw new SignupValidationError("Provide one Yes or No answer for each listed skill.");
    }
    answers.set(answer.name, answer.answer === "yes");
  }

  if (answers.size !== studentSkills.length) {
    throw new SignupValidationError("Answer every skill question to continue.");
  }
  signup.skills = Array.from(answers, ([name, knowsSkill]) => ({ name, knowsSkill }));
  return signup;
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

async function createSignup(prisma, input) {
  const signup = normalizeSignup(input);
  const passwordHash = await hashPassword(signup.password);

  try {
    return await prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          email: signup.email,
          passwordHash,
          firstName: signup.firstName,
          lastName: signup.lastName,
          role: signup.role
        },
        select: { id: true, email: true, firstName: true, lastName: true, role: true }
      });

      if (signup.role !== "student") {
        return { ...user, roadmapCourseCount: 0 };
      }

      const [major, career, skills] = await Promise.all([
        transaction.program.findUnique({ where: { name: signup.major }, select: { id: true } }),
        transaction.careerField.findUnique({ where: { name: signup.career }, select: { id: true } }),
        transaction.skill.findMany({
          where: { name: { in: signup.skills.map(({ name }) => name) } },
          select: { id: true, name: true }
        })
      ]);

      if (!major || !career || skills.length !== studentSkills.length) {
        throw new SignupValidationError(
          "Sign-up options are not available yet. Please try again after the catalog is initialized."
        );
      }

      const skillIds = new Map(skills.map(({ id, name }) => [name, id]));
      await transaction.profile.create({
        data: {
          userId: user.id,
          majorProgramId: major.id,
          desiredCareerId: career.id
        }
      });

      for (const { name, knowsSkill } of signup.skills) {
        await transaction.studentSkill.create({
          data: {
            profileUserId: user.id,
            skillId: skillIds.get(name),
            knowsSkill
          }
        });
      }

      const roadmapCourseCount = await generateStudentRoadmap(transaction, {
        userId: user.id,
        programId: major.id,
        careerFieldId: career.id,
        skills: signup.skills.map(({ name, knowsSkill }) => ({
          id: skillIds.get(name),
          knowsSkill
        }))
      });

      return { ...user, roadmapCourseCount };
    });
  } catch (error) {
    if (error && error.code === "P2002") {
      throw new DuplicateEmailError();
    }
    throw error;
  }
}

module.exports = {
  createSignup,
  normalizeSignup,
  SignupValidationError,
  DuplicateEmailError
};

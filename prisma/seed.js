const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const programs = [
  "Artificial Intelligence, B.S.",
  "Computer Science, B.A.",
  "Computer Science, B.S.",
  "Data Science, B.S.",
  "Sports Analytics, B.S."
];

const softwarePrograms = [
  "Artificial Intelligence, B.S.",
  "Computer Science, B.A.",
  "Computer Science, B.S."
];

const dataPrograms = [
  "Artificial Intelligence, B.S.",
  "Data Science, B.S.",
  "Sports Analytics, B.S."
];

const careerFields = [
  "Software Developer / Engineer",
  "Web Developer",
  "Mobile App Developer",
  "Game Developer",
  "Data Scientist",
  "Data Analyst",
  "AI / Machine Learning Engineer",
  "Cybersecurity Analyst",
  "Security Engineer",
  "Network Engineer",
  "Cloud Engineer / Architect",
  "DevOps Engineer",
  "Database Administrator",
  "Systems Analyst",
  "QA / Test Engineer",
  "UX / UI Designer",
  "IT Support Specialist",
  "Technical Product Manager",
  "Computer Science Educator",
  "Researcher",
  "Other computer-related career"
];

const skills = [
  ["Python", "Programming fundamentals using Python."],
  ["Algorithms", "Design and analysis of algorithms."],
  ["Data Structures", "Common data structures and their tradeoffs."],
  ["Object-Oriented Programming", "Classes, objects, and object-oriented design."],
  ["Computer Systems", "Computer architecture, operating systems, and low-level concepts."],
  ["Databases", "Relational data modeling and database queries."],
  ["Networking", "Computer networking concepts and protocols."],
  ["Web Development", "Building web applications."],
  ["Security", "Secure software and foundational cybersecurity concepts."],
  ["Statistics", "Statistical reasoning and data analysis."],
  ["Machine Learning", "Foundational machine-learning methods."],
  ["Software Design", "Software architecture and design practices."],
  ["Software Testing", "Testing strategies and quality assurance."],
  ["Mobile Development", "Designing and building mobile applications."]
];

const courses = [
  {
    code: "SAMPLE-CS-101",
    title: "Introduction to Programming with Python",
    skills: ["Python", "Object-Oriented Programming"],
    programs,
    careers: careerFields
  },
  {
    code: "SAMPLE-CS-201",
    title: "Data Structures",
    prerequisites: ["SAMPLE-CS-101"],
    skills: ["Data Structures", "Algorithms"],
    programs: softwarePrograms.concat(dataPrograms),
    careers: [
      "Software Developer / Engineer", "Web Developer", "Mobile App Developer",
      "Game Developer", "Data Scientist", "AI / Machine Learning Engineer",
      "Cybersecurity Analyst", "Security Engineer", "QA / Test Engineer", "Researcher"
    ]
  },
  {
    code: "SAMPLE-CS-202",
    title: "Database Fundamentals",
    prerequisites: ["SAMPLE-CS-101"],
    skills: ["Databases"],
    programs: dataPrograms.concat(["Computer Science, B.A.", "Computer Science, B.S."]),
    careers: [
      "Data Scientist", "Data Analyst", "Database Administrator",
      "Systems Analyst", "Software Developer / Engineer", "Researcher"
    ]
  },
  {
    code: "SAMPLE-CS-203",
    title: "Computer Systems Foundations",
    prerequisites: ["SAMPLE-CS-101"],
    skills: ["Computer Systems"],
    programs: ["Artificial Intelligence, B.S.", "Computer Science, B.S."],
    careers: [
      "Cybersecurity Analyst", "Security Engineer", "Network Engineer",
      "Cloud Engineer / Architect", "DevOps Engineer", "IT Support Specialist",
      "Systems Analyst", "Researcher"
    ]
  },
  {
    code: "SAMPLE-CS-204",
    title: "Web Application Development",
    prerequisites: ["SAMPLE-CS-101"],
    skills: ["Web Development", "Software Design"],
    programs: softwarePrograms,
    careers: [
      "Software Developer / Engineer", "Web Developer", "UX / UI Designer",
      "Technical Product Manager", "QA / Test Engineer"
    ]
  },
  {
    code: "SAMPLE-CS-301",
    title: "Algorithms and Problem Solving",
    prerequisites: ["SAMPLE-CS-201"],
    skills: ["Algorithms", "Data Structures"],
    programs: dataPrograms.concat(["Computer Science, B.S."]),
    careers: [
      "Software Developer / Engineer", "Game Developer", "Data Scientist",
      "AI / Machine Learning Engineer", "Researcher"
    ]
  },
  {
    code: "SAMPLE-CS-302",
    title: "Software Engineering and Testing",
    prerequisites: ["SAMPLE-CS-201"],
    skills: ["Software Design", "Software Testing", "Object-Oriented Programming"],
    programs: softwarePrograms,
    careers: [
      "Software Developer / Engineer", "Web Developer", "Mobile App Developer",
      "Game Developer", "QA / Test Engineer", "Technical Product Manager"
    ]
  },
  {
    code: "SAMPLE-CS-303",
    title: "Data Analysis and Statistics",
    prerequisites: ["SAMPLE-CS-101", "SAMPLE-CS-202"],
    skills: ["Statistics", "Databases", "Python"],
    programs: dataPrograms,
    careers: [
      "Data Scientist", "Data Analyst", "AI / Machine Learning Engineer",
      "Systems Analyst", "Researcher"
    ]
  },
  {
    code: "SAMPLE-CS-304",
    title: "Networking and Cloud Foundations",
    prerequisites: ["SAMPLE-CS-203"],
    skills: ["Networking", "Computer Systems"],
    programs: ["Artificial Intelligence, B.S.", "Computer Science, B.S."],
    careers: [
      "Network Engineer", "Cloud Engineer / Architect", "DevOps Engineer",
      "Security Engineer", "IT Support Specialist"
    ]
  },
  {
    code: "SAMPLE-CS-305",
    title: "Cybersecurity Fundamentals",
    prerequisites: ["SAMPLE-CS-203", "SAMPLE-CS-304"],
    skills: ["Security", "Networking", "Computer Systems"],
    programs: ["Artificial Intelligence, B.S.", "Computer Science, B.S."],
    careers: [
      "Cybersecurity Analyst", "Security Engineer", "Network Engineer",
      "Systems Analyst", "Researcher"
    ]
  },
  {
    code: "SAMPLE-CS-401",
    title: "Machine Learning Foundations",
    prerequisites: ["SAMPLE-CS-201", "SAMPLE-CS-303"],
    skills: ["Machine Learning", "Statistics", "Python", "Algorithms"],
    programs: dataPrograms,
    careers: ["AI / Machine Learning Engineer", "Data Scientist", "Researcher"]
  },
  {
    code: "SAMPLE-CS-402",
    title: "Mobile Application Development",
    prerequisites: ["SAMPLE-CS-204"],
    skills: ["Mobile Development", "Software Design", "Software Testing"],
    programs: softwarePrograms,
    careers: [
      "Mobile App Developer", "Software Developer / Engineer",
      "Game Developer", "UX / UI Designer"
    ]
  }
];

async function upsertNames(names, model) {
  const records = new Map();

  for (const name of names) {
    const record = await model.upsert({
      where: { name },
      update: {},
      create: { name }
    });
    records.set(name, record.id);
  }

  return records;
}

function requireId(records, name, kind) {
  const id = records.get(name);
  if (!id) {
    throw new Error(`Unknown ${kind} in sample catalog: ${name}`);
  }
  return id;
}

async function seed() {
  const programsByName = await upsertNames(programs, prisma.program);
  const careersByName = await upsertNames(careerFields, prisma.careerField);
  const skillsByName = new Map();

  for (const [name, description] of skills) {
    const skill = await prisma.skill.upsert({
      where: { name },
      update: { description },
      create: { name, description }
    });
    skillsByName.set(name, skill.id);
  }

  const coursesByCode = new Map();
  for (const course of courses) {
    const record = await prisma.course.upsert({
      where: { code: course.code },
      update: {
        title: course.title,
        description: "Illustrative sample only; not an official catalog entry or degree requirement.",
        isSample: true
      },
      create: {
        code: course.code,
        title: course.title,
        description: "Illustrative sample only; not an official catalog entry or degree requirement.",
        isSample: true
      }
    });
    coursesByCode.set(course.code, record.id);
  }

  for (const course of courses) {
    const courseId = requireId(coursesByCode, course.code, "course");

    for (const programName of course.programs) {
      const programId = requireId(programsByName, programName, "major");
      await prisma.programCourse.upsert({
        where: { programId_courseId: { programId, courseId } },
        update: {},
        create: { programId, courseId }
      });
    }

    for (const careerName of course.careers) {
      const careerFieldId = requireId(careersByName, careerName, "career");
      await prisma.courseCareer.upsert({
        where: { courseId_careerFieldId: { courseId, careerFieldId } },
        update: {},
        create: { courseId, careerFieldId }
      });
    }

    for (const skillName of course.skills) {
      const skillId = requireId(skillsByName, skillName, "skill");
      await prisma.courseSkill.upsert({
        where: { courseId_skillId: { courseId, skillId } },
        update: {},
        create: { courseId, skillId }
      });
    }

    for (const prerequisiteCode of course.prerequisites || []) {
      const prerequisiteId = requireId(coursesByCode, prerequisiteCode, "prerequisite course");
      await prisma.coursePrerequisite.upsert({
        where: { courseId_prerequisiteId: { courseId, prerequisiteId } },
        update: {},
        create: { courseId, prerequisiteId }
      });
    }
  }
}

seed()
  .catch((error) => {
    console.error("Failed to seed roadmap foundation data:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

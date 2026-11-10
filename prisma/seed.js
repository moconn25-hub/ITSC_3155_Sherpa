const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const programs = [
  "Computer Science",
  "Data Science",
  "Software Engineering"
];

const careerFields = [
  "Software Engineer",
  "Data Scientist",
  "Cybersecurity Analyst",
  "Machine Learning Engineer"
];

async function seed() {
  for (const name of programs) {
    await prisma.program.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }

  for (const name of careerFields) {
    await prisma.careerField.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }
}

seed()
  .catch((error) => {
    console.error("Failed to seed sign-up lookup data:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

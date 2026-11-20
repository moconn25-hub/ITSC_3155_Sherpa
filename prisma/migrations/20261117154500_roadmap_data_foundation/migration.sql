-- Align legacy seeded career lookup labels while preserving linked profiles.
UPDATE "Profile"
SET "desiredCareerId" = (
    SELECT "target"."id"
    FROM "CareerField" AS "target"
    WHERE "target"."name" = 'Software Developer / Engineer'
)
WHERE "desiredCareerId" = (
    SELECT "legacy"."id"
    FROM "CareerField" AS "legacy"
    WHERE "legacy"."name" = 'Software Engineer'
)
AND EXISTS (
    SELECT 1 FROM "CareerField"
    WHERE "name" = 'Software Developer / Engineer'
);

DELETE FROM "CareerField"
WHERE "name" = 'Software Engineer'
AND EXISTS (
    SELECT 1 FROM "CareerField"
    WHERE "name" = 'Software Developer / Engineer'
);

UPDATE "CareerField"
SET "name" = 'Software Developer / Engineer'
WHERE "name" = 'Software Engineer';

UPDATE "Profile"
SET "desiredCareerId" = (
    SELECT "target"."id"
    FROM "CareerField" AS "target"
    WHERE "target"."name" = 'AI / Machine Learning Engineer'
)
WHERE "desiredCareerId" = (
    SELECT "legacy"."id"
    FROM "CareerField" AS "legacy"
    WHERE "legacy"."name" = 'Machine Learning Engineer'
)
AND EXISTS (
    SELECT 1 FROM "CareerField"
    WHERE "name" = 'AI / Machine Learning Engineer'
);

DELETE FROM "CareerField"
WHERE "name" = 'Machine Learning Engineer'
AND EXISTS (
    SELECT 1 FROM "CareerField"
    WHERE "name" = 'AI / Machine Learning Engineer'
);

UPDATE "CareerField"
SET "name" = 'AI / Machine Learning Engineer'
WHERE "name" = 'Machine Learning Engineer';

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ProgramCourse" (
    "programId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    PRIMARY KEY ("programId", "courseId"),
    CONSTRAINT "ProgramCourse_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProgramCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CourseCareer" (
    "courseId" TEXT NOT NULL,
    "careerFieldId" TEXT NOT NULL,
    PRIMARY KEY ("courseId", "careerFieldId"),
    CONSTRAINT "CourseCareer_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CourseCareer_careerFieldId_fkey" FOREIGN KEY ("careerFieldId") REFERENCES "CareerField" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CourseSkill" (
    "courseId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "importance" INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY ("courseId", "skillId"),
    CONSTRAINT "CourseSkill_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CourseSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CoursePrerequisite" (
    "courseId" TEXT NOT NULL,
    "prerequisiteId" TEXT NOT NULL,
    PRIMARY KEY ("courseId", "prerequisiteId"),
    CONSTRAINT "CoursePrerequisite_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CoursePrerequisite_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudentSkill" (
    "profileUserId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "knowsSkill" BOOLEAN NOT NULL,
    "assessedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("profileUserId", "skillId"),
    CONSTRAINT "StudentSkill_profileUserId_fkey" FOREIGN KEY ("profileUserId") REFERENCES "Profile" ("userId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Roadmap" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Roadmap_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoadmapCourse" (
    "roadmapId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "completedAt" DATETIME,
    PRIMARY KEY ("roadmapId", "courseId"),
    CONSTRAINT "RoadmapCourse_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "Roadmap" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoadmapCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Course_code_key" ON "Course"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");

-- CreateIndex
CREATE INDEX "ProgramCourse_courseId_idx" ON "ProgramCourse"("courseId");

-- CreateIndex
CREATE INDEX "CourseCareer_careerFieldId_idx" ON "CourseCareer"("careerFieldId");

-- CreateIndex
CREATE INDEX "CourseSkill_skillId_idx" ON "CourseSkill"("skillId");

-- CreateIndex
CREATE INDEX "CoursePrerequisite_prerequisiteId_idx" ON "CoursePrerequisite"("prerequisiteId");

-- CreateIndex
CREATE INDEX "StudentSkill_skillId_idx" ON "StudentSkill"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "Roadmap_userId_key" ON "Roadmap"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RoadmapCourse_roadmapId_position_key" ON "RoadmapCourse"("roadmapId", "position");

-- CreateIndex
CREATE INDEX "RoadmapCourse_courseId_idx" ON "RoadmapCourse"("courseId");

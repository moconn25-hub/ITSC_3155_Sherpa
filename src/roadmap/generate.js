class RoadmapGenerationError extends Error {
  constructor(message) {
    super(message);
    this.name = "RoadmapGenerationError";
    this.statusCode = 422;
  }
}

function orderCourses(courses, programId, careerFieldId, knownSkills) {
  const coursesById = new Map(courses.map((course) => [course.id, course]));
  const eligible = courses.filter((course) =>
    course.programMappings.some(({ programId: mappedProgramId }) => mappedProgramId === programId) &&
    course.careerMappings.some(({ careerFieldId: mappedCareerId }) => mappedCareerId === careerFieldId)
  );

  if (!eligible.length) {
    throw new RoadmapGenerationError("No courses match this major and career yet.");
  }

  const selectedIds = new Set();
  const pending = eligible.map(({ id }) => id);
  while (pending.length) {
    const courseId = pending.pop();
    if (selectedIds.has(courseId)) {
      continue;
    }

    const course = coursesById.get(courseId);
    if (!course) {
      throw new RoadmapGenerationError("A required course is missing from the catalog.");
    }
    selectedIds.add(courseId);
    course.prerequisites.forEach(({ prerequisiteId }) => {
      if (!coursesById.has(prerequisiteId)) {
        throw new RoadmapGenerationError("A required course is missing from the catalog.");
      }
      pending.push(prerequisiteId);
    });
  }

  const selectedCourses = Array.from(selectedIds, (id) => coursesById.get(id));
  const dependents = new Map(selectedCourses.map(({ id }) => [id, []]));
  const prerequisiteCounts = new Map();
  for (const course of selectedCourses) {
    const prerequisites = course.prerequisites
      .map(({ prerequisiteId }) => prerequisiteId)
      .filter((id) => selectedIds.has(id));
    prerequisiteCounts.set(course.id, prerequisites.length);
    for (const prerequisiteId of prerequisites) {
      dependents.get(prerequisiteId).push(course.id);
    }
  }

  function priority(course) {
    const skillGapScore = course.skills.reduce((score, courseSkill) => {
      return knownSkills.get(courseSkill.skillId) === false
        ? score + courseSkill.importance
        : score;
    }, 0);
    const careerScore = course.careerMappings.some(
      ({ careerFieldId: mappedCareerId }) => mappedCareerId === careerFieldId
    ) ? 1 : 0;
    return skillGapScore + careerScore;
  }

  const ready = selectedCourses.filter(({ id }) => prerequisiteCounts.get(id) === 0);
  const ordered = [];
  while (ready.length) {
    ready.sort((left, right) =>
      priority(right) - priority(left) || left.code.localeCompare(right.code)
    );
    const course = ready.shift();
    ordered.push(course);

    for (const dependentId of dependents.get(course.id)) {
      const count = prerequisiteCounts.get(dependentId) - 1;
      prerequisiteCounts.set(dependentId, count);
      if (count === 0) {
        ready.push(coursesById.get(dependentId));
      }
    }
  }

  if (ordered.length !== selectedIds.size) {
    throw new RoadmapGenerationError("The course catalog contains a prerequisite cycle.");
  }
  return ordered;
}

async function generateStudentRoadmap(transaction, {
  userId,
  programId,
  careerFieldId,
  skills
}) {
  const courses = await transaction.course.findMany({
    include: {
      programMappings: { select: { programId: true } },
      careerMappings: { select: { careerFieldId: true } },
      prerequisites: { select: { prerequisiteId: true } },
      skills: { select: { skillId: true, importance: true } }
    }
  });
  const skillKnowledge = new Map(skills.map(({ id, knowsSkill }) => [id, knowsSkill]));
  const orderedCourses = orderCourses(courses, programId, careerFieldId, skillKnowledge);
  const roadmap = await transaction.roadmap.create({
    data: { userId },
    select: { id: true }
  });

  for (const [index, course] of orderedCourses.entries()) {
    await transaction.roadmapCourse.create({
      data: {
        roadmapId: roadmap.id,
        courseId: course.id,
        position: index + 1
      }
    });
  }

  return orderedCourses.length;
}

module.exports = {
  generateStudentRoadmap,
  orderCourses,
  RoadmapGenerationError
};

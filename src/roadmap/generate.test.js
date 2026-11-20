import { describe, expect, it } from "vitest";
import roadmap from "./generate.js";

const { orderCourses, RoadmapGenerationError } = roadmap;

function course({
  id,
  code = id,
  programMappings = [{ programId: "program-1" }],
  careerMappings = [{ careerFieldId: "career-1" }],
  prerequisites = [],
  skills = []
}) {
  return { id, code, programMappings, careerMappings, prerequisites, skills };
}

describe("orderCourses", () => {
  it("includes prerequisites and never places a course before them", () => {
    const courses = [
      course({
        id: "intro",
        careerMappings: [],
        skills: [{ skillId: "python", importance: 1 }]
      }),
      course({
        id: "advanced",
        prerequisites: [{ prerequisiteId: "intro" }]
      }),
      course({ id: "unrelated", programMappings: [] })
    ];

    const ordered = orderCourses(courses, "program-1", "career-1", new Map());
    expect(ordered.map(({ id }) => id)).toEqual(["intro", "advanced"]);
  });

  it("prioritizes available courses that address assessed skill gaps", () => {
    const courses = [
      course({
        id: "already-known",
        skills: [{ skillId: "known", importance: 1 }]
      }),
      course({
        id: "skill-gap",
        skills: [{ skillId: "gap", importance: 2 }]
      })
    ];

    const ordered = orderCourses(
      courses,
      "program-1",
      "career-1",
      new Map([["known", true], ["gap", false]])
    );
    expect(ordered[0].id).toBe("skill-gap");
  });

  it("rejects a course prerequisite cycle", () => {
    const courses = [
      course({ id: "first", prerequisites: [{ prerequisiteId: "second" }] }),
      course({ id: "second", prerequisites: [{ prerequisiteId: "first" }] })
    ];

    expect(() => orderCourses(courses, "program-1", "career-1", new Map()))
      .toThrow(RoadmapGenerationError);
  });
});

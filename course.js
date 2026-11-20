const courseView = document.querySelector("#course-view");
const errorView = document.querySelector("#course-error-view");
const errorMessage = document.querySelector("#course-error");
const courseTitle = document.querySelector("#course-heading");
const courseCode = document.querySelector("#course-code");
const courseDescription = document.querySelector("#course-description");
const sampleNote = document.querySelector("#course-sample-note");
const prerequisiteSection = document.querySelector("#course-prerequisites");
const prerequisiteList = document.querySelector("#course-prerequisite-list");
const skillSection = document.querySelector("#course-skills");
const skillList = document.querySelector("#course-skill-list");
const statusMessage = document.querySelector("#course-status");
const completeButton = document.querySelector("#complete-course");
const courseId = new URLSearchParams(window.location.search).get("id");
let currentCourse = null;
let isSaving = false;

function showCourseError(message) {
  errorMessage.textContent = message;
  courseView.hidden = true;
  errorView.hidden = false;
}

function addListItems(list, values, formatValue) {
  list.replaceChildren();
  for (const value of values) {
    const item = document.createElement("li");
    item.textContent = formatValue(value);
    list.append(item);
  }
}

function renderCourse(entry) {
  const course = entry.course;
  currentCourse = course;
  courseTitle.textContent = course.title;
  courseCode.textContent = course.code;
  courseDescription.textContent = course.description;
  sampleNote.textContent = course.isSample
    ? "This is an illustrative sample course, not an official UNC Charlotte course or degree requirement."
    : "";

  const prerequisites = course.prerequisites.map(({ prerequisite }) => prerequisite);
  prerequisiteSection.hidden = prerequisites.length === 0;
  addListItems(prerequisiteList, prerequisites, ({ code, title }) => `${code}: ${title}`);

  skillSection.hidden = course.skills.length === 0;
  addListItems(skillList, course.skills, ({ skill }) => skill.name);

  if (entry.completedAt) {
    statusMessage.textContent = "This course is marked completed.";
    completeButton.hidden = true;
  } else {
    statusMessage.textContent = "";
    completeButton.hidden = false;
    completeButton.disabled = false;
  }
  courseView.hidden = false;
}

async function loadCourse() {
  if (!courseId) {
    showCourseError("Choose a course from your saved roadmap.");
    return;
  }

  try {
    const response = await fetch("/api/auth/session");
    if (response.status === 401) {
      showCourseError("Sign in to view courses on your roadmap.");
      return;
    }

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "We could not load your account.");
    }
    if (result.user.role !== "student" || !result.user.roadmap) {
      showCourseError("Courses are available from a student's saved roadmap.");
      return;
    }

    const entry = result.user.roadmap.courses.find(({ course }) => course.id === courseId);
    if (!entry) {
      showCourseError("This course is not part of your saved roadmap.");
      return;
    }
    renderCourse(entry);
  } catch (error) {
    showCourseError(
      error instanceof Error ? error.message : "We could not load this course."
    );
  }
}

completeButton.addEventListener("click", async () => {
  if (!currentCourse || isSaving) {
    return;
  }
  isSaving = true;
  completeButton.disabled = true;
  statusMessage.textContent = "Saving your progress...";

  try {
    const response = await fetch(
      `/api/roadmap/courses/${encodeURIComponent(currentCourse.id)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true })
      }
    );
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "We could not save your progress.");
    }
    window.location.assign("Signin.html");
  } catch (error) {
    statusMessage.textContent =
      error instanceof Error ? error.message : "We could not save your progress.";
    completeButton.disabled = false;
  } finally {
    isSaving = false;
  }
});

loadCourse();

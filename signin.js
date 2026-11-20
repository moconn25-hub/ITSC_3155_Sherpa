const loginForm = document.querySelector("#login-form");
const loginView = document.querySelector("#login-view");
const loginError = document.querySelector("#login-error");
const dashboardError = document.querySelector("#dashboard-error");
const roleViews = {
  student: document.querySelector("#student-view"),
  teacher: document.querySelector("#instructor-view"),
  employer: document.querySelector("#employer-view")
};

function showStudentPage(page) {
  for (const panel of document.querySelectorAll("[data-student-panel]")) {
    panel.hidden = panel.dataset.studentPanel !== page;
  }
  for (const button of document.querySelectorAll("[data-student-page]")) {
    if (button.dataset.studentPage === page) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  }
  document.querySelector("#student-view").scrollTop = 0;
}

function showLoginError(message) {
  loginError.textContent = message;
  loginError.hidden = false;
}

function renderStudentRoadmap(user) {
  const roadmap = user.roadmap;
  const courses = roadmap ? roadmap.courses : [];
  const completed = courses.filter(({ completedAt }) => completedAt).length;
  const percent = courses.length ? Math.round((completed / courses.length) * 100) : 0;
  const list = document.querySelector("#roadmap-courses");
  const trail = document.querySelector("#roadmap-trail");
  const trailLine = document.querySelector("#roadmap-trail-line");
  const profile = user.profile;
  const sampleCourses = courses.some(({ course }) => course.isSample);
  const careerName = profile?.desiredCareer?.name || "your career goal";
  const majorName = profile?.majorProgram?.name || "your major";

  document.querySelector("#roadmap-progress").textContent = `${percent}% complete`;
  document.querySelector("#roadmap-count").textContent =
    `${completed} of ${courses.length} courses completed`;
  document.querySelector("#roadmap-progress-bar").value = percent;
  document.querySelector("#home-progress").textContent = `${percent}% complete`;
  document.querySelector("#home-count").textContent =
    `${completed} of ${courses.length} courses completed`;
  document.querySelector("#student-program").textContent = profile
    ? `${majorName} · ${careerName}`
    : "";
  document.querySelector("#home-goal").textContent =
    `Your course path is based on ${majorName} and ${careerName}.`;
  document.querySelector("#profile-name").textContent = `${user.firstName} ${user.lastName}`;
  document.querySelector("#profile-email").textContent = user.email;
  document.querySelector("#profile-major").textContent = `Major: ${majorName}`;
  document.querySelector("#profile-career").textContent = `Career goal: ${careerName}`;
  document.querySelector("#roadmap-note").textContent = courses.length
    ? sampleCourses
      ? "This saved path uses illustrative sample courses, not official degree requirements."
      : ""
    : "Your account has no saved roadmap yet. Please contact your Sherpa administrator.";
  list.replaceChildren();
  list.style.setProperty("--course-count", courses.length);
  trail.setAttribute("viewBox", `0 0 100 ${Math.max(courses.length * 168, 168)}`);
  trailLine.setAttribute(
    "points",
    courses.map((_, index) => {
      const row = courses.length - index - 1;
      const x = index % 2 === 0 ? 35 : 65;
      return `${x},${row * 168 + 84}`;
    }).join(" ")
  );

  for (const [index, entry] of courses.entries()) {
    const item = document.createElement("li");
    const link = document.createElement("a");
    item.dataset.checkpoint = String(index + 1);
    item.dataset.completed = entry.completedAt ? "true" : "false";
    item.style.gridRow = String(courses.length - index);
    link.className = "roadmap-course-link";
    link.href = `Course.html?id=${encodeURIComponent(entry.course.id)}`;
    link.dataset.completed = entry.completedAt ? "true" : "false";
    link.setAttribute(
      "aria-label",
      `Checkpoint ${index + 1}, ${entry.course.code}, ${entry.course.title}, ${entry.completedAt ? "completed" : "open course details"}`
    );
    const code = document.createElement("span");
    const title = document.createElement("strong");
    const status = document.createElement("span");
    code.className = "course-flag-code";
    code.textContent = entry.course.code;
    title.textContent = entry.course.title;
    status.className = "course-flag-status";
    status.textContent = entry.completedAt ? "Completed" : "View course";
    link.append(code, title, status);
    item.append(link);
    list.append(item);
  }

  showStudentPage("roadmap");
}

function showUser(user) {
  const view = roleViews[user.role];
  if (!view) {
    throw new Error("This account has an unsupported role.");
  }

  loginView.hidden = true;
  dashboardError.hidden = true;
  for (const roleView of Object.values(roleViews)) {
    roleView.hidden = true;
  }
  view.querySelector("[data-user-name]").textContent = user.firstName;
  if (user.role === "student") {
    renderStudentRoadmap(user);
  }
  view.hidden = false;
  if (user.role === "student") {
    requestAnimationFrame(() => {
      const map = document.querySelector("#roadmap-map-scroll");
      map.scrollTop = map.scrollHeight;
    });
  }
}

async function loadExistingSession() {
  try {
    const response = await fetch("/api/auth/session");
    if (response.status === 401) {
      return;
    }
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "We could not check your sign-in session.");
    }
    showUser(result.user);
  } catch (error) {
    showLoginError(
      error instanceof Error ? error.message : "We could not check your sign-in session."
    );
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.hidden = true;
  loginError.textContent = "";
  const submitButton = loginForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  const formData = new FormData(loginForm);
  try {
    const response = await fetch("/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: formData.get("role"),
        email: formData.get("email"),
        password: formData.get("password")
      })
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "We could not sign you in.");
    }
    loginForm.reset();
    showUser(result.user);
  } catch (error) {
    showLoginError(error instanceof Error ? error.message : "We could not sign you in.");
  } finally {
    submitButton.disabled = false;
  }
});

document.querySelectorAll("[data-student-page]").forEach((button) => {
  button.addEventListener("click", () => {
    showStudentPage(button.dataset.studentPage);
  });
});

const roadmapMap = document.querySelector("#roadmap-map-scroll");
let roadmapDrag = null;
let suppressRoadmapClick = false;

roadmapMap.addEventListener("pointerdown", (event) => {
  if (!event.isPrimary || event.button !== 0 || event.pointerType === "touch") {
    return;
  }
  roadmapDrag = {
    pointerId: event.pointerId,
    startY: event.clientY,
    startScrollTop: roadmapMap.scrollTop,
    moved: false
  };
});

document.addEventListener("pointermove", (event) => {
  if (!roadmapDrag || event.pointerId !== roadmapDrag.pointerId) {
    return;
  }
  if (!roadmapDrag.moved && Math.abs(event.clientY - roadmapDrag.startY) > 4) {
    roadmapDrag.moved = true;
    roadmapMap.classList.add("is-dragging");
  }
  if (roadmapDrag.moved) {
    event.preventDefault();
    roadmapMap.scrollTop = roadmapDrag.startScrollTop + roadmapDrag.startY - event.clientY;
  }
}, { passive: false });

function finishRoadmapDrag(event) {
  if (!roadmapDrag || event.pointerId !== roadmapDrag.pointerId) {
    return;
  }
  suppressRoadmapClick = roadmapDrag.moved;
  roadmapMap.classList.remove("is-dragging");
  roadmapDrag = null;
  if (suppressRoadmapClick) {
    window.setTimeout(() => {
      suppressRoadmapClick = false;
    }, 0);
  }
}

document.addEventListener("pointerup", finishRoadmapDrag);
document.addEventListener("pointercancel", finishRoadmapDrag);

roadmapMap.addEventListener("click", (event) => {
  if (suppressRoadmapClick && event.target instanceof Element &&
      event.target.closest(".roadmap-course-link")) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);

document.querySelector("[data-open-roadmap]").addEventListener("click", () => {
  showStudentPage("roadmap");
  document.querySelector("[data-student-page='roadmap']").focus();
});

document.querySelectorAll("[data-signout]").forEach((button) => {
  button.addEventListener("click", async () => {
    button.disabled = true;
    dashboardError.hidden = true;
    try {
      const response = await fetch("/api/auth/signout", { method: "POST" });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "We could not sign you out.");
      }

      for (const roleView of Object.values(roleViews)) {
        roleView.hidden = true;
      }
      loginForm.reset();
      loginView.hidden = false;
      loginError.hidden = true;
      document.querySelector("#email").focus();
    } catch (error) {
      dashboardError.textContent =
        error instanceof Error ? error.message : "We could not sign you out.";
      dashboardError.hidden = false;
    } finally {
      button.disabled = false;
    }
  });
});

loadExistingSession();

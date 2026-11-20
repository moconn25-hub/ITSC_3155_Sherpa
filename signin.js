const loginForm = document.querySelector("#login-form");
const loginView = document.querySelector("#login-view");
const loginError = document.querySelector("#login-error");
const dashboardError = document.querySelector("#dashboard-error");
const roleViews = {
  student: document.querySelector("#student-view"),
  teacher: document.querySelector("#instructor-view"),
  employer: document.querySelector("#employer-view")
};

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
  const profile = user.profile;
  const sampleCourses = courses.some(({ course }) => course.isSample);

  document.querySelector("#roadmap-progress").textContent = `${percent}% complete`;
  document.querySelector("#roadmap-count").textContent =
    `${completed} of ${courses.length} courses completed`;
  document.querySelector("#student-program").textContent = profile
    ? `${profile.majorProgram?.name || "Major not set"} · ${profile.desiredCareer?.name || "Career goal not set"}`
    : "";
  document.querySelector("#roadmap-note").textContent = courses.length
    ? sampleCourses
      ? "This saved path uses illustrative sample courses, not official degree requirements."
      : ""
    : "Your account has no saved roadmap yet. Please contact your Sherpa administrator.";
  list.replaceChildren();

  for (const entry of courses) {
    const item = document.createElement("li");
    const title = document.createElement("strong");
    const detail = document.createElement("span");
    title.textContent = `${entry.course.code}: ${entry.course.title}`;
    detail.textContent = entry.completedAt ? "Completed" : "In your roadmap";
    item.append(title, detail);
    list.append(item);
  }
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

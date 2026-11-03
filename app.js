const testUsers = {
  student: {
    email: "student@sherpa.test",
    password: "StudentDemo123!",
    viewId: "student-view"
  },
  instructor: {
    email: "instructor@sherpa.test",
    password: "InstructorDemo123!",
    viewId: "instructor-view"
  },
  employer: {
    email: "employer@sherpa.test",
    password: "EmployerDemo123!",
    viewId: "employer-view"
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.querySelector("#login-form");
  const loginView = document.querySelector("#login-view");
  const loginError = document.querySelector("#login-error");

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    loginError.hidden = true;
    loginError.textContent = "";

    const formData = new FormData(loginForm);
    const role = formData.get("role");
    const email = formData.get("email").trim().toLowerCase();
    const password = formData.get("password");
    const user = testUsers[role];

    if (!user || email !== user.email || password !== user.password) {
      loginError.textContent = "The selected role, email, or password is incorrect.";
      loginError.hidden = false;
      return;
    }

    loginView.hidden = true;
    document.querySelector(`#${user.viewId}`).hidden = false;
  });
});

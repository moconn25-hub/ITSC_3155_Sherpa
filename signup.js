const form = document.querySelector("#signup-form");
const accountFields = document.querySelector("#account-fields");
const studentProfile = document.querySelector("#student-profile");
const skillAssessment = document.querySelector("#skill-assessment");
const roleSelect = document.querySelector("#classification");
const majorSelect = document.querySelector("#major");
const careerSelect = document.querySelector("#career");
const continueButton = document.querySelector("#continue-signup");
const createAccountButton = document.querySelector("#create-account");
const backButton = document.querySelector("#back-to-account");
const statusMessage = document.querySelector("#signup-status");

const skillSelects = Array.from(skillAssessment.querySelectorAll("select[data-skill]"));
let isAssessingSkills = false;
let accountCreated = false;
let isSubmitting = false;

function showStatus(message) {
  statusMessage.textContent = message;
}

function updateRoleFields() {
  const isStudent = roleSelect.value === "student";
  studentProfile.hidden = !isStudent;
  majorSelect.disabled = !isStudent;
  careerSelect.disabled = !isStudent;
  majorSelect.required = isStudent;
  careerSelect.required = isStudent;
}

function showSkillStep() {
  isAssessingSkills = true;
  accountFields.hidden = true;
  skillAssessment.hidden = false;
  continueButton.hidden = true;
  skillSelects.forEach((select) => {
    select.disabled = false;
  });
  showStatus("");
  skillSelects[0].focus();
}

function showAccountStep() {
  isAssessingSkills = false;
  accountFields.hidden = false;
  skillAssessment.hidden = true;
  continueButton.hidden = false;
  skillSelects.forEach((select) => {
    select.disabled = true;
  });
  showStatus("");
  continueButton.focus();
}

function getSignupDetails() {
  const data = new FormData(form);
  const signup = {
    firstName: data.get("firstName"),
    lastName: data.get("lastName"),
    email: data.get("email"),
    password: data.get("password"),
    role: data.get("role")
  };

  if (signup.role === "student") {
    signup.major = majorSelect.selectedOptions[0].textContent.trim();
    signup.career = careerSelect.selectedOptions[0].textContent.trim();
    signup.skills = skillSelects.map((select) => ({
      name: select.dataset.skill,
      answer: select.value
    }));
  }
  return signup;
}

async function submitSignup() {
  if (isSubmitting) {
    return;
  }

  const password = document.querySelector("#password").value;
  const confirmPassword = document.querySelector("#confirm-password").value;
  if (password !== confirmPassword) {
    showStatus("The passwords do not match.");
    document.querySelector("#confirm-password").focus();
    return;
  }

  isSubmitting = true;
  continueButton.disabled = true;
  createAccountButton.disabled = true;
  showStatus("Creating your account...");

  try {
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getSignupDetails())
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "We could not create your account.");
    }

    accountCreated = true;
    form.querySelectorAll("input, select, button").forEach((control) => {
      control.disabled = true;
    });
    if (result.user.role === "student") {
      showStatus(
        `Your account has been created and your initial roadmap includes ${result.user.roadmapCourseCount} sample courses. Sign in to view your roadmap.`
      );
    } else {
      showStatus("Your account has been created and saved. You can now sign in.");
    }
  } catch (error) {
    showStatus(error instanceof Error ? error.message : "We could not create your account. Please try again.");
  } finally {
    isSubmitting = false;
    if (!accountCreated) {
      continueButton.disabled = false;
      createAccountButton.disabled = false;
    }
  }
}

skillSelects.forEach((select) => {
  select.disabled = true;
});
updateRoleFields();

roleSelect.addEventListener("change", () => {
  updateRoleFields();
  showStatus("");
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (accountCreated) {
    return;
  }

  if (roleSelect.value === "student" && !isAssessingSkills) {
    showSkillStep();
    return;
  }

  submitSignup();
});

backButton.addEventListener("click", showAccountStep);

form.addEventListener("input", () => {
  showStatus("");
});

form.addEventListener("change", () => {
  showStatus("");
});

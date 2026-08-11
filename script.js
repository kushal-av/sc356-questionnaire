// --------------------------------------------------
// Supabase configuration
// --------------------------------------------------

const SUPABASE_URL =
  "https://dshhpsuudpzrosmwnkno.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_26JjsSCjswxHKTlFIYHPfw_jZSEXhtA";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

// --------------------------------------------------
// Page elements and questionnaire state
// --------------------------------------------------

const steps = [...document.querySelectorAll(".form-step")];
const form = document.querySelector("#questionnaire");

const welcomeSection = document.querySelector("#welcomeSection");
const surveySection = document.querySelector("#surveySection");
const thankYouSection = document.querySelector("#thankYouSection");

const consentCheckbox = document.querySelector("#consent");
const consentError = document.querySelector("#consentError");
const formError = document.querySelector("#formError");

const startButton = document.querySelector("#startButton");
const nextButton = document.querySelector("#nextButton");
const backButton = document.querySelector("#backButton");
const submitButton = document.querySelector("#submitButton");

let currentStep = 1;
let submissionInProgress = false;

// --------------------------------------------------
// Build rating-scale questions
// --------------------------------------------------

function buildRadioScale(container, name, labels) {
  labels.forEach((label, index) => {
    const item = document.createElement("label");
    item.className = "radio-choice";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = name;
    radio.value = String(index + 1);
    radio.required = true;

    const labelText = document.createElement("span");
    labelText.textContent = label;

    item.appendChild(radio);
    item.appendChild(labelText);
    container.appendChild(item);
  });
}

document.querySelectorAll(".scale").forEach((element) => {
  buildRadioScale(
    element,
    element.parentElement.dataset.requiredRadio,
    [
      "Strongly disagree",
      "Disagree",
      "Neutral",
      "Agree",
      "Strongly agree"
    ]
  );
});

document.querySelectorAll(".frequency").forEach((element) => {
  buildRadioScale(
    element,
    element.parentElement.dataset.requiredRadio,
    [
      "Never",
      "Rarely",
      "Sometimes",
      "Often",
      "Always"
    ]
  );
});

// --------------------------------------------------
// Step navigation
// --------------------------------------------------

function showStep(step) {
  currentStep = step;

  steps.forEach((item) => {
    const isCurrentStep = Number(item.dataset.step) === step;
    item.classList.toggle("hidden", !isCurrentStep);
  });

  const percent = step * 25;

  document.querySelector("#stepText").textContent =
    `Step ${step} of 4`;

  document.querySelector("#percentText").textContent =
    `${percent}%`;

  document.querySelector("#progressFill").style.width =
    `${percent}%`;

  const progressTrack =
    document.querySelector(".progress-track");

  if (progressTrack) {
    progressTrack.setAttribute(
      "aria-valuenow",
      String(percent)
    );
  }

  backButton.classList.toggle("hidden", step === 1);
  nextButton.classList.toggle("hidden", step === 4);
  submitButton.classList.toggle("hidden", step !== 4);

  formError.textContent = "";

  if (step === 4) {
    renderSummary();
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

// --------------------------------------------------
// Validation
// --------------------------------------------------

function validateCurrentStep() {
  const currentFieldset = steps[currentStep - 1];

  const normalFields = [
    ...currentFieldset.querySelectorAll(
      'select[required], input:not([type="radio"])[required]'
    )
  ];

  const normalFieldsValid = normalFields.every((field) => {
    return field.checkValidity();
  });

  const radioGroups = [
    ...currentFieldset.querySelectorAll(
      "[data-required-radio]"
    )
  ];

  const radioGroupsValid = radioGroups.every((group) => {
    const groupName = group.dataset.requiredRadio;

    return Boolean(
      form.querySelector(
        `input[name="${groupName}"]:checked`
      )
    );
  });

  const valid = normalFieldsValid && radioGroupsValid;

  formError.textContent = valid
    ? ""
    : "Please answer every question before continuing.";

  if (!valid) {
    const firstInvalidField =
      currentFieldset.querySelector(":invalid");

    if (firstInvalidField) {
      firstInvalidField.focus();
    }
  }

  return valid;
}

// --------------------------------------------------
// Review summary
// --------------------------------------------------

const summaryLabels = {
  ageGroup: "Age group",
  yearOfStudy: "Year of study",
  fieldOfStudy: "Field of study",
  courseCount: "Courses",
  sleepHours: "Sleep",
  workload: "Workload pressure",
  deadlines: "Deadline pressure",
  exams: "Exam pressure",
  overwhelmed: "Feeling overwhelmed",
  concentrate: "Concentration",
  positive: "Positive mood",
  rested: "Feeling rested"
};

function renderSummary() {
  const formData = new FormData(form);
  const summary = document.querySelector("#answerSummary");

  summary.replaceChildren();

  Object.entries(summaryLabels).forEach(([key, label]) => {
    const row = document.createElement("div");
    row.className = "summary-row";

    const labelElement = document.createElement("span");
    labelElement.textContent = label;

    const valueElement = document.createElement("strong");
    valueElement.textContent =
      getReadableAnswer(key, formData.get(key));

    row.appendChild(labelElement);
    row.appendChild(valueElement);
    summary.appendChild(row);
  });
}

function getReadableAnswer(name, value) {
  if (!value) {
    return "Not answered";
  }

  const selectedField = form.querySelector(
    `[name="${name}"][value="${CSS.escape(String(value))}"]`
  );

  if (
    selectedField &&
    selectedField.tagName === "OPTION"
  ) {
    return selectedField.textContent.trim();
  }

  const select = form.querySelector(`select[name="${name}"]`);

  if (select) {
    const selectedOption =
      select.options[select.selectedIndex];

    return selectedOption
      ? selectedOption.textContent.trim()
      : String(value);
  }

  return String(value);
}

// --------------------------------------------------
// Welcome and consent
// --------------------------------------------------

startButton.addEventListener("click", () => {
  if (!consentCheckbox.checked) {
    consentError.textContent =
      "Please provide consent before starting.";

    consentCheckbox.focus();
    return;
  }

  consentError.textContent = "";
  welcomeSection.classList.add("hidden");
  surveySection.classList.remove("hidden");

  showStep(1);
});

consentCheckbox.addEventListener("change", () => {
  if (consentCheckbox.checked) {
    consentError.textContent = "";
  }
});

// --------------------------------------------------
// Next and back buttons
// --------------------------------------------------

nextButton.addEventListener("click", () => {
  if (validateCurrentStep() && currentStep < 4) {
    showStep(currentStep + 1);
  }
});

backButton.addEventListener("click", () => {
  if (currentStep > 1) {
    showStep(currentStep - 1);
  }
});

// --------------------------------------------------
// Convert form answers to an object
// --------------------------------------------------

function formToObject(questionnaireForm) {
  const formData = new FormData(questionnaireForm);
  const answers = {};

  for (const [name, value] of formData.entries()) {
    const cleanValue =
      typeof value === "string"
        ? value.trim()
        : value;

    if (Object.prototype.hasOwnProperty.call(answers, name)) {
      if (!Array.isArray(answers[name])) {
        answers[name] = [answers[name]];
      }

      answers[name].push(cleanValue);
    } else {
      answers[name] = cleanValue;
    }
  }

  return answers;
}

// --------------------------------------------------
// Supabase submission
// --------------------------------------------------

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (submissionInProgress) {
    return;
  }

  if (!consentCheckbox.checked) {
    formError.textContent =
      "Consent is required before submitting.";
    return;
  }

  if (!validateCurrentStep()) {
    return;
  }

  const answers = formToObject(form);

  submissionInProgress = true;
  submitButton.disabled = true;
  submitButton.textContent = "Submitting...";
  formError.textContent = "";

  try {
    const { error } = await supabaseClient
      .from("survey_responses")
      .insert({
        consent_given: true,
        survey_version: "1.0",
        answers: answers
      });

    if (error) {
      throw error;
    }

    form.reset();
    consentCheckbox.checked = false;

    surveySection.classList.add("hidden");
    thankYouSection.classList.remove("hidden");

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  } catch (error) {
    console.error("Supabase submission failed:", error);

    formError.textContent =
      "Your response could not be submitted. Please check your internet connection and try again.";

    submitButton.disabled = false;
    submitButton.textContent = "Submit anonymously";
    submissionInProgress = false;
  }
});

// --------------------------------------------------
// Support panel
// --------------------------------------------------

const supportPanel =
  document.querySelector("#supportPanel");

const overlay =
  document.querySelector("#overlay");

const supportButton =
  document.querySelector("#supportButton");

const closeSupportButton =
  document.querySelector("#closeSupport");

const thankYouSupportButton =
  document.querySelector("#thankYouSupportButton");

function toggleSupport(open) {
  supportPanel.classList.toggle("hidden", !open);
  overlay.classList.toggle("hidden", !open);

  supportPanel.setAttribute(
    "aria-hidden",
    String(!open)
  );

  supportButton.setAttribute(
    "aria-expanded",
    String(open)
  );

  if (open) {
    closeSupportButton.focus();
  }
}

supportButton.addEventListener("click", () => {
  toggleSupport(true);
});

closeSupportButton.addEventListener("click", () => {
  toggleSupport(false);
});

overlay.addEventListener("click", () => {
  toggleSupport(false);
});

if (thankYouSupportButton) {
  thankYouSupportButton.addEventListener("click", () => {
    toggleSupport(true);
  });
}

document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    !supportPanel.classList.contains("hidden")
  ) {
    toggleSupport(false);
  }
});
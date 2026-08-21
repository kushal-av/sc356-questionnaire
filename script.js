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
      "1",
      "2",
      "3",
      "4",
      "5"
    ]
  );
});

document.querySelectorAll(".frequency").forEach((element) => {
  buildRadioScale(
    element,
    element.parentElement.dataset.requiredRadio,
    [
      "1",
      "2",
      "3",
      "4",
      "5"
    ]
  );
});

// --------------------------------------------------
// Conditional digital-tool follow-up questions
// --------------------------------------------------

const digitalToolUse = document.querySelector("#digitalToolUse");
const digitalToolFollowUps = document.querySelector("#digitalToolFollowUps");

function updateDigitalToolFollowUps() {
  const shouldShow = digitalToolUse.value === "yes";
  const fields = [
    ...digitalToolFollowUps.querySelectorAll("input, select, textarea")
  ];

  digitalToolFollowUps.classList.toggle("hidden", !shouldShow);
  digitalToolFollowUps.setAttribute("aria-hidden", String(!shouldShow));

  fields.forEach((field) => {
    field.disabled = !shouldShow;

    if (!shouldShow && (field.type === "checkbox" || field.type === "radio")) {
      field.checked = false;
    }
  });
}

digitalToolUse.addEventListener("change", updateDigitalToolFollowUps);
updateDigitalToolFollowUps();

// --------------------------------------------------
// Limit multi-select checkbox groups
// --------------------------------------------------

document.querySelectorAll("[data-max-selections]").forEach((group) => {
  const checkboxes = [...group.querySelectorAll('input[type="checkbox"]')];
  const maxSelections = Number(group.dataset.maxSelections);

  const updateAvailability = () => {
    const selectedCount = checkboxes.filter((box) => box.checked).length;

    checkboxes.forEach((box) => {
      box.disabled = !box.checked && selectedCount >= maxSelections;
    });
  };

  checkboxes.forEach((box) => {
    box.addEventListener("change", updateAvailability);
  });

  updateAvailability();
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

  const totalSteps = steps.length;
  const percent = Math.round((step / totalSteps) * 100);

  document.querySelector("#stepText").textContent =
    `Step ${step} of ${totalSteps}`;

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
  nextButton.classList.toggle("hidden", step === totalSteps);
  submitButton.classList.toggle("hidden", step !== totalSteps);

  formError.textContent = "";

  if (step === totalSteps) {
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
  ].filter((group) => !group.closest(".hidden"));

  const radioGroupsValid = radioGroups.every((group) => {
    const groupName = group.dataset.requiredRadio;

    return Boolean(
      form.querySelector(
        `input[name="${groupName}"]:checked`
      )
    );
  });

  const checkboxGroups = [
    ...currentFieldset.querySelectorAll(
      "[data-required-checkbox]"
    )
  ].filter((group) => !group.closest(".hidden"));

  const checkboxGroupsValid = checkboxGroups.every((group) => {
    const groupName = group.dataset.requiredCheckbox;
    const checkedCount = group.querySelectorAll(
      `input[name="${groupName}"]:checked`
    ).length;
    const minSelections = Number(group.dataset.minSelections || 1);
    const maxSelections = group.dataset.maxSelections
      ? Number(group.dataset.maxSelections)
      : Number.POSITIVE_INFINITY;

    return checkedCount >= minSelections && checkedCount <= maxSelections;
  });

  const valid =
    normalFieldsValid &&
    radioGroupsValid &&
    checkboxGroupsValid;

  const firstInvalidCheckboxGroup = checkboxGroups.find((group) => {
    const count = group.querySelectorAll("input:checked").length;
    const min = Number(group.dataset.minSelections || 1);
    const max = group.dataset.maxSelections
      ? Number(group.dataset.maxSelections)
      : Number.POSITIVE_INFINITY;

    return count < min || count > max;
  });

  formError.textContent = valid
    ? ""
    : normalFieldsValid && radioGroupsValid && firstInvalidCheckboxGroup
      ? firstInvalidCheckboxGroup.dataset.validationMessage ||
        "Please select one or two schools before continuing."
      : "Please answer every question before continuing.";

  if (!valid) {
    const firstInvalidField =
      currentFieldset.querySelector(":invalid");

    if (firstInvalidField) {
      firstInvalidField.focus();
    } else {
      firstInvalidCheckboxGroup
        ?.querySelector("input")
        ?.focus();
    }
  }

  return valid;
}

// --------------------------------------------------
// Review summary
// --------------------------------------------------

const summaryLabels = {
  age_group: "Age group",
  gender: "Gender",
  year_of_study: "Year of study",
  faculty: "School",
  study_mode: "Study mode",
  weekly_study_hours: "Weekly study hours",
  sleep_hours_per_night: "Sleep per night",
  stress_workload: "Workload stress",
  stress_assignments: "Assignment stress",
  stress_tests: "Test and examination stress",
  stress_deadlines: "Deadline stress",
  stress_time_management: "Time-management stress",
  stress_financial: "Financial stress",
  stress_balance_responsibilities: "Study and responsibility balance stress",
  stress_expected_performance: "Expected academic performance stress",
  stress_classes: "Keeping up with classes stress",
  stress_group_work: "Group-work stress",
  stress_commute_access: "Travel and class-access stress",
  stress_study_resources: "Technology and study-resource stress",
  family_responsibility_stress: "Family-responsibility stress",
  wellbeing_cheerful: "Feeling cheerful",
  wellbeing_calm: "Feeling calm",
  wellbeing_active: "Feeling active",
  wellbeing_rested: "Feeling rested",
  wellbeing_interested: "Interest in daily life",
  distress_low_mood: "Low mood",
  distress_concentration: "Difficulty concentrating",
  distress_exhaustion: "Emotional exhaustion",
  distress_stress_relax: "Stress or difficulty relaxing",
  distress_anxiety: "Anxiety or nervousness",
  distress_worry_control: "Difficulty controlling worry",
  sought_support: "Sought support",
  digital_tool_use: "Used digital wellbeing support",
  digital_tool_types: "Types of digital support used",
  digital_tool_usefulness: "Digital-tool usefulness",
  university_app_comfort: "Comfort with a university-supported app",
  desired_app_features: "Useful app features",
  app_concerns: "App concerns",
  primary_stress_coping: "Primary stress-coping response",
  preferred_is_support: "Preferred IS support"
};

const conditionalDigitalToolSummaryKeys = new Set([
  "digital_tool_types",
  "digital_tool_usefulness"
]);

function renderSummary() {
  const formData = new FormData(form);
  const summary = document.querySelector("#answerSummary");

  summary.replaceChildren();

  Object.entries(summaryLabels).forEach(([key, label]) => {
    if (
      conditionalDigitalToolSummaryKeys.has(key) &&
      formData.get("digital_tool_use") !== "yes"
    ) {
      return;
    }

    const row = document.createElement("div");
    row.className = "summary-row";

    const labelElement = document.createElement("span");
    labelElement.textContent = label;

    const valueElement = document.createElement("strong");
    const values = formData.getAll(key);
    valueElement.textContent = getReadableAnswer(
      key,
      values.length > 1 ? values : values[0]
    );

    row.appendChild(labelElement);
    row.appendChild(valueElement);
    summary.appendChild(row);
  });
}

function getReadableAnswer(name, value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => getReadableAnswer(name, item))
      .join(", ");
  }

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

  if (
    selectedField &&
    selectedField.type === "checkbox"
  ) {
    const choiceText = selectedField
      .closest("label")
      ?.querySelector("span")
      ?.textContent
      ?.trim();

    return choiceText || String(value);
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
  if (validateCurrentStep() && currentStep < steps.length) {
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
// Calculate analysis-ready stress and wellbeing scores
// --------------------------------------------------

const stressVariables = [
  "stress_workload",
  "stress_assignments",
  "stress_tests",
  "stress_deadlines",
  "stress_time_management",
  "stress_financial",
  "stress_balance_responsibilities",
  "stress_expected_performance",
  "stress_classes",
  "stress_group_work",
  "stress_commute_access",
  "stress_study_resources"
];

const wellbeingVariables = [
  "wellbeing_cheerful",
  "wellbeing_calm",
  "wellbeing_active",
  "wellbeing_rested",
  "wellbeing_interested"
];

const distressVariables = [
  "distress_low_mood",
  "distress_concentration",
  "distress_exhaustion",
  "distress_stress_relax",
  "distress_anxiety",
  "distress_worry_control"
];

function calculateScaleScore(answers, variableNames) {
  const values = variableNames.map((name) =>
    Number(answers[name])
  );

  const allValuesValid = values.every((value) =>
    Number.isInteger(value) && value >= 1 && value <= 5
  );

  if (!allValuesValid) {
    throw new Error("A required 1–5 scale response is missing or invalid.");
  }

  return values.reduce((total, value) => total + value, 0);
}

function addCalculatedFields(answers) {
  answers.stress_score = calculateScaleScore(
    answers,
    stressVariables
  );

  answers.wellbeing_score = calculateScaleScore(
    answers,
    wellbeingVariables
  );

  answers.distress_score = calculateScaleScore(
    answers,
    distressVariables
  );

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

  let answers;

  try {
    answers = addCalculatedFields(formToObject(form));
  } catch (error) {
    console.error("Score calculation failed:", error);
    formError.textContent =
      "A scale response is missing or invalid. Please review your answers.";
    return;
  }

  submissionInProgress = true;
  submitButton.disabled = true;
  submitButton.textContent = "Submitting...";
  formError.textContent = "";

  try {
    const { error } = await supabaseClient
      .from("survey_responses")
      .insert({
        consent_given: true,
        survey_version: "3.0",
        answers: answers
      });

    if (error) {
      throw error;
    }

    form.reset();
    consentCheckbox.checked = false;
    updateDigitalToolFollowUps();

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

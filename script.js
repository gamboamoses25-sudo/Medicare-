/* =========================================================
   MediCare+ Patient Records Management System
   script.js — Event-Driven Application Logic

   This file demonstrates EVENT-DRIVEN PROGRAMMING:
   the UI does nothing on its own — every change on screen
   is triggered by a specific event (click, submit, change,
   input) captured through addEventListener, which then
   updates the in-memory "database" (JS arrays) and re-renders
   the affected parts of the DOM.
========================================================= */

/* =========================================================
   1. PERSISTENT STORAGE LAYER (localStorage)
   All application data — staff accounts, patients, audit log,
   the patient ID counter, and the logged-in session — is
   persisted to localStorage so nothing is lost on refresh
   or when the browser is closed.
========================================================= */

const STORAGE_KEYS = {
  STAFF: "medicarePlus.staffAccounts",
  PATIENTS: "medicarePlus.patients",
  AUDIT: "medicarePlus.auditLog",
  NEXT_ID: "medicarePlus.nextPatientNumber",
  SESSION: "medicarePlus.session",
};

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.error(`Failed to load "${key}" from storage:`, e);
    return fallback;
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to save "${key}" to storage:`, e);
  }
}

function persistStaff() { saveToStorage(STORAGE_KEYS.STAFF, staffAccounts); }
function persistPatients() { saveToStorage(STORAGE_KEYS.PATIENTS, patients); }
function persistAudit() { saveToStorage(STORAGE_KEYS.AUDIT, auditLog); }
function persistNextId() { saveToStorage(STORAGE_KEYS.NEXT_ID, nextPatientNumber); }
function persistSession() {
  if (currentUser) {
    saveToStorage(STORAGE_KEYS.SESSION, { staffId: currentUser.id });
  } else {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  }
}

/* =========================================================
   2. SIMULATED DATABASE (loaded from localStorage, seeded once)
========================================================= */

// Staff accounts are no longer predefined — every account is created
// through the Sign Up form and stored in localStorage.
let staffAccounts = loadFromStorage(STORAGE_KEYS.STAFF, []);

// Patient records are restored from localStorage or start empty on first run
const savedPatients = loadFromStorage(STORAGE_KEYS.PATIENTS, null);
const isFirstRun = savedPatients === null;

function normalizeAddress(value) {
  if (!value) {
    return {
      houseNo: "",
      street: "",
      subdivision: "",
      barangay: "",
      municipality: "",
      province: "",
      zipCode: "",
    };
  }

  if (typeof value === "string") {
    return {
      houseNo: "",
      street: value,
      subdivision: "",
      barangay: "",
      municipality: "",
      province: "",
      zipCode: "",
    };
  }

  return {
    houseNo: value.houseNo || "",
    street: value.street || "",
    subdivision: value.subdivision || "",
    barangay: value.barangay || "",
    municipality: value.municipality || "",
    province: value.province || "",
    zipCode: value.zipCode || "",
  };
}

function formatAddressSummary(address) {
  if (!address) return "—";
  const parts = [];
  if (address.houseNo) parts.push(address.houseNo);
  if (address.street) parts.push(address.street);
  if (address.subdivision) parts.push(address.subdivision);
  if (address.barangay) parts.push(address.barangay);
  if (address.municipality) parts.push(address.municipality);
  if (address.province) parts.push(address.province);
  if (address.zipCode) parts.push(address.zipCode);
  return parts.length ? parts.join(", ") : "—";
}

function formatAddressHtml(address) {
  if (!address) return "Not available";
  const parts = [];
  if (address.houseNo) parts.push(address.houseNo);
  if (address.street) parts.push(address.street);
  if (address.subdivision) parts.push(address.subdivision);
  if (address.barangay) parts.push(address.barangay);
  if (address.municipality) parts.push(address.municipality);
  if (address.province) parts.push(address.province);
  if (address.zipCode) parts.push(address.zipCode);
  return parts.length ? parts.join("<br>") : "Not available";
}

function normalizePatientRecord(p) {
  return {
    id: p.id,
    name: p.name,
    age: p.age,
    gender: p.gender,
    contact: p.contact,
    address: normalizeAddress(p.address),
    history: p.history || "",
    documents: p.documents ? [...p.documents] : [],
    photoUrl: p.photoUrl || "",
    queueStatus: p.queueStatus || "Waiting",
    registeredAt: p.registeredAt || new Date().toISOString(),
    lastConsultation: p.lastConsultation || "",
    lastUpload: p.lastUpload || "",
  };
}

let patients = (savedPatients || SEED_PATIENTS).map(normalizePatientRecord);

// Audit log entries — restored from localStorage
let auditLog = loadFromStorage(STORAGE_KEYS.AUDIT, []);

// Next auto-generated patient ID counter — restored from localStorage
let nextPatientNumber = loadFromStorage(STORAGE_KEYS.NEXT_ID, 1006);

// Currently logged-in staff member (session state) — restored during initialization
const savedSession = loadFromStorage(STORAGE_KEYS.SESSION, null);
let currentUser = null;
if (savedSession && savedSession.staffId) {
  currentUser = loadFromStorage(STORAGE_KEYS.STAFF, [])
    .find((s) => s.id === savedSession.staffId) || null;
}

// Track currently open record ID for the edit/delete modals
let activeEditId = null;
let activeDeleteId = null;

function restoreSession() {
  if (!currentUser) return;

  applyRoleBasedAccess(currentUser.role);
  updateUserHeader(currentUser);
  loginScreen.classList.add("hidden");
  appShell.classList.remove("hidden");
  switchView("dashboard");
}

// Persist the seed data on first run so it's saved immediately, before any edits
if (isFirstRun) {
  persistPatients();
  persistNextId();
}


/* =========================================================
   2. DOM ELEMENT REFERENCES
========================================================= */

const loginScreen = document.getElementById("loginScreen");
const appShell = document.getElementById("appShell");
const loginForm = document.getElementById("loginForm");
const loginUsername = document.getElementById("loginUsername");
const staffPassword = document.getElementById("staffPassword");
const showSignupLink = document.getElementById("showSignupLink");

const signupScreen = document.getElementById("signupScreen");
const signupForm = document.getElementById("signupForm");
const suFullName = document.getElementById("suFullName");
const suUsername = document.getElementById("suUsername");
const suEmail = document.getElementById("suEmail");
const suRole = document.getElementById("suRole");
const suPassword = document.getElementById("suPassword");
const suConfirmPassword = document.getElementById("suConfirmPassword");
const showLoginLink = document.getElementById("showLoginLink");

const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const menuToggle = document.getElementById("menuToggle");
const navItems = document.querySelectorAll(".nav-item[data-view]");
const views = document.querySelectorAll(".view");
const pageTitle = document.getElementById("pageTitle");

const userRoleBadge = document.getElementById("userRoleBadge");
const userAvatar = document.getElementById("userAvatar");
const userName = document.getElementById("userName");
const userRoleText = document.getElementById("userRoleText");
const logoutBtn = document.getElementById("logoutBtn");

const statTotalPatients = document.getElementById("statTotalPatients");
const statTotalDocs = document.getElementById("statTotalDocs");
const statAuditEntries = document.getElementById("statAuditEntries");
const statRole = document.getElementById("statRole");
const recentPatientsTable = document.querySelector("#recentPatientsTable tbody");

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const searchResultsTable = document.querySelector("#searchResultsTable tbody");
const searchResultCount = document.getElementById("searchResultCount");

const registerForm = document.getElementById("registerForm");
const regId = document.getElementById("regId");
const regName = document.getElementById("regName");
const regAge = document.getElementById("regAge");
const regGender = document.getElementById("regGender");
const regContact = document.getElementById("regContact");
const regPhotoFile = document.getElementById("regPhotoFile");
const regHouseNo = document.getElementById("regHouseNo");
const regStreet = document.getElementById("regStreet");
const regSubdivision = document.getElementById("regSubdivision");
const regBarangay = document.getElementById("regBarangay");
const regMunicipality = document.getElementById("regMunicipality");
const regProvince = document.getElementById("regProvince");
const regZipCode = document.getElementById("regZipCode");

const recordsTable = document.querySelector("#recordsTable tbody");

const uploadPatientSelect = document.getElementById("uploadPatientSelect");
const dropzone = document.getElementById("dropzone");
const dropzoneText = document.getElementById("dropzoneText");
const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const uploadsTable = document.querySelector("#uploadsTable tbody");

const auditTable = document.querySelector("#auditTable tbody");

const editModalOverlay = document.getElementById("editModalOverlay");
const editForm = document.getElementById("editForm");
const editId = document.getElementById("editId");
const editName = document.getElementById("editName");
const editAge = document.getElementById("editAge");
const editGender = document.getElementById("editGender");
const editContact = document.getElementById("editContact");
const editHouseNo = document.getElementById("editHouseNo");
const editStreet = document.getElementById("editStreet");
const editSubdivision = document.getElementById("editSubdivision");
const editBarangay = document.getElementById("editBarangay");
const editMunicipality = document.getElementById("editMunicipality");
const editProvince = document.getElementById("editProvince");
const editZipCode = document.getElementById("editZipCode");
const editHistory = document.getElementById("editHistory");
const closeEditModal = document.getElementById("closeEditModal");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const viewModalOverlay = document.getElementById("viewModalOverlay");
const viewModalBody = document.getElementById("viewModalBody");
const closeViewModal = document.getElementById("closeViewModal");

const docViewerOverlay = document.getElementById("docViewerOverlay");
const docViewerBody = document.getElementById("docViewerBody");
const closeDocViewer = document.getElementById("closeDocViewer");

const deleteModalOverlay = document.getElementById("deleteModalOverlay");
const deletePatientName = document.getElementById("deletePatientName");
const closeDeleteModal = document.getElementById("closeDeleteModal");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

const toastContainer = document.getElementById("toastContainer");


/* =========================================================
   3. UTILITY / HELPER FUNCTIONS
========================================================= */

// Show a toast notification (used for both success and error events)
function showToast(type, title, message) {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const icons = {
    success: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg>',
    error: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>',
    info: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
  };

  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <div class="toast-content">
      <strong>${title}</strong>
      <p>${message}</p>
    </div>
  `;

  toastContainer.appendChild(toast);

  // Auto-remove after 4 seconds
  setTimeout(() => {
    toast.classList.add("removing");
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}

// Format the current date/time for audit log timestamps
function getTimestamp() {
  const now = new Date();
  return now.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// Create a new audit log entry — called automatically whenever
// a record-changing event happens (register, update, upload)
function addAuditEntry(patientName, action) {
  const entry = {
    timestamp: getTimestamp(),
    role: currentUser ? currentUser.role : "System",
    patientName: patientName,
    action: action,
  };
  auditLog.unshift(entry); // newest first
  persistAudit();
  renderAuditTable();
  renderDashboardStats();
}

// Find a patient record by ID
function findPatientById(id) {
  return patients.find((p) => p.id === id);
}

// Generate the badge HTML for gender
function genderBadge(gender) {
  const cls = gender.toLowerCase();
  return `<span class="badge ${cls}">${gender}</span>`;
}

// Simple field validation helper: shows/clears inline error messages
function setFieldError(inputEl, errorEl, message) {
  if (message) {
    inputEl.classList.add("invalid");
    errorEl.textContent = message;
    return false;
  } else {
    inputEl.classList.remove("invalid");
    errorEl.textContent = "";
    return true;
  }
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function () {
      resolve(reader.result);
    };
    reader.onerror = function () {
      reject(new Error("Failed to read file."));
    };
    reader.readAsDataURL(file);
  });
}


/* =========================================================
   4. RENDER FUNCTIONS (update the DOM from array data)
========================================================= */

function formatDateLabel(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(status) {
  const cls = status.toLowerCase().replace(/\s+/g, "-");
  return `<span class="badge ${cls}">${status}</span>`;
}

function renderDashboardStats() {
  statTotalPatients.textContent = patients.length;
  const totalDocs = patients.reduce((sum, p) => sum + p.documents.length, 0);
  statTotalDocs.textContent = totalDocs;
  statAuditEntries.textContent = auditLog.length;
  statRole.textContent = currentUser ? currentUser.role : "—";

  const todayKey = new Date().toISOString().slice(0, 10);
  const todaysPatients = patients.filter((p) => p.registeredAt.slice(0, 10) === todayKey).length;
  const newRegistrations = patients.filter((p) => {
    const registered = new Date(p.registeredAt);
    return registered >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  }).length;
  const waitingPatients = patients.filter((p) => p.queueStatus === "Waiting").length;
  const completedConsultations = patients.filter((p) => p.queueStatus === "Completed").length;

  document.getElementById("statTodaysPatients").textContent = todaysPatients;
  document.getElementById("statNewRegistrations").textContent = newRegistrations;
  document.getElementById("statWaitingPatients").textContent = waitingPatients;
  document.getElementById("statCompletedConsultations").textContent = completedConsultations;

  const recent = patients.slice(-5).reverse();
  recentPatientsTable.innerHTML = "";
  if (recent.length === 0) {
    recentPatientsTable.innerHTML = `<tr class="empty-row"><td colspan="5">No patients yet.</td></tr>`;
    return;
  }
  recent.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.id}</td>
      <td>${p.name}</td>
      <td>${p.age}</td>
      <td>${genderBadge(p.gender)}</td>
      <td>${p.contact}</td>
      <td class="table-actions">
        <button class="btn btn-sm btn-ghost" data-action="view" data-id="${p.id}">View</button>
        <button class="btn btn-sm btn-danger" data-action="delete" data-id="${p.id}">Delete</button>
      </td>
    `;
    recentPatientsTable.appendChild(tr);
  });
}

function renderSearchResults(results, queryGiven) {
  searchResultsTable.innerHTML = "";

  if (!queryGiven) {
    searchResultCount.textContent = "";
    return;
  }

  searchResultCount.textContent = `${results.length} result(s) found.`;

  if (results.length === 0) {
    searchResultsTable.innerHTML = `<tr class="empty-row"><td colspan="8">No matching patient records found.</td></tr>`;
    return;
  }

  const canDelete = currentUser && ["doctor", "nurse"].includes(currentUser.role.toLowerCase());
  results.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.id}</td>
      <td>${p.name}</td>
      <td>${p.age}</td>
      <td>${genderBadge(p.gender)}</td>
      <td>${p.contact}</td>
      <td>${formatAddressSummary(p.address)}</td>
      <td>${statusBadge(p.queueStatus)}</td>
      <td class="table-actions">
        <button class="btn btn-sm btn-ghost" data-action="view" data-id="${p.id}">View</button>
        ${canDelete ? `<button class="btn btn-sm btn-danger-solid" data-action="delete" data-id="${p.id}">Delete</button>` : ""}
      </td>
    `;
    searchResultsTable.appendChild(tr);
  });
}

function renderRecordsTable() {
  recordsTable.innerHTML = "";

  if (patients.length === 0) {
    recordsTable.innerHTML = `<tr class="empty-row"><td colspan="8">No patient records available.</td></tr>`;
    return;
  }

  patients.forEach((p) => {
    const tr = document.createElement("tr");
    const historyPreview = p.history
      ? (p.history.length > 40 ? p.history.slice(0, 40) + "…" : p.history)
      : "—";
    tr.innerHTML = `
      <td>${p.id}</td>
      <td>${p.name}</td>
      <td>${p.age}</td>
      <td>${genderBadge(p.gender)}</td>
      <td>${p.contact}</td>
      <td>${historyPreview}</td>
      <td>${statusBadge(p.queueStatus)}</td>
      <td class="table-actions">
        <button class="btn btn-sm btn-ghost" data-action="view" data-id="${p.id}">View</button>
        <button class="btn btn-sm btn-primary" data-action="edit" data-id="${p.id}">Update</button>
        <button class="btn btn-sm btn-danger-solid" data-action="delete" data-id="${p.id}">Delete</button>
      </td>
    `;
    recordsTable.appendChild(tr);
  });
}

function renderUploadPatientSelect() {
  const currentValue = uploadPatientSelect.value;
  uploadPatientSelect.innerHTML = `<option value="" disabled selected>Choose a patient</option>`;
  patients.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.id} — ${p.name}`;
    uploadPatientSelect.appendChild(opt);
  });
  if (currentValue) uploadPatientSelect.value = currentValue;
}

function renderUploadsTable() {
  uploadsTable.innerHTML = "";
  const allDocs = [];
  patients.forEach((p) => {
    p.documents.forEach((doc, idx) => {
      allDocs.push({ patientId: p.id, docIndex: idx, patientName: p.name, ...doc });
    });
  });

  if (allDocs.length === 0) {
    uploadsTable.innerHTML = `<tr class="empty-row"><td colspan="5">No documents uploaded yet.</td></tr>`;
    return;
  }

  allDocs.reverse().forEach((doc) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${doc.patientName}</td>
      <td>${doc.fileName}</td>
      <td>${doc.fileType}</td>
      <td>${doc.dateUploaded}</td>
      <td class="table-actions">
        <button class="btn btn-sm btn-ghost doc-preview-btn" data-patient-id="${doc.patientId}" data-doc-index="${doc.docIndex}">Preview</button>
      </td>
    `;
    uploadsTable.appendChild(tr);
  });
}

function renderAuditTable() {
  auditTable.innerHTML = "";
  if (auditLog.length === 0) {
    auditTable.innerHTML = `<tr class="empty-row"><td colspan="4">No audit log entries yet.</td></tr>`;
    return;
  }
  auditLog.forEach((entry) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${entry.timestamp}</td>
      <td>${entry.role}</td>
      <td>${entry.patientName}</td>
      <td>${entry.action}</td>
    `;
    auditTable.appendChild(tr);
  });
}

// Central re-render: called after any data mutation so every view stays in sync
function renderAll() {
  renderDashboardStats();
  renderRecordsTable();
  renderUploadPatientSelect();
  renderUploadsTable();
  renderAuditTable();
}


/* =========================================================
   5. EVENT: STAFF LOGIN
   -> Displays different menus/features based on role
========================================================= */

loginForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const username = loginUsername.value.trim();
  const password = staffPassword.value.trim();

  if (!username) {
    showToast("error", "Login Failed", "Please enter your username.");
    return;
  }

  const account = staffAccounts.find((s) => s.username.toLowerCase() === username.toLowerCase());

  if (!account || account.password !== password) {
    showToast("error", "Login Failed", "Incorrect username or password. Please try again.");
    staffPassword.classList.add("invalid");
    return;
  }

  // Successful login — set session
  currentUser = account;
  persistSession();
  staffPassword.classList.remove("invalid");

  applyRoleBasedAccess(account.role);
  updateUserHeader(account);

  loginScreen.classList.add("hidden");
  appShell.classList.remove("hidden");

  showToast("success", "Welcome back!", `Logged in as ${account.name} (${account.role}).`);

  // Reset to dashboard view on every login
  switchView("dashboard");
  renderAll();

  loginForm.reset();
});

function updateUserHeader(account) {
  userRoleBadge.textContent = account.role;
  userAvatar.textContent = account.initials;
  userName.textContent = account.name;
  userRoleText.textContent = account.role;
}

// Show/hide sidebar nav items depending on the logged-in role
function applyRoleBasedAccess(role) {
  const roleKey = role.toLowerCase();
  navItems.forEach((btn) => {
    const allowedRoles = btn.dataset.roles;
    if (!allowedRoles) {
      btn.classList.remove("hidden"); // Dashboard: available to all
      return;
    }
    const allowed = allowedRoles.split(",").includes(roleKey);
    btn.classList.toggle("hidden", !allowed);
  });
}

// Logout event — clears session and returns to login screen
logoutBtn.addEventListener("click", function () {
  showToast("info", "Logged Out", "You have been signed out successfully.");
  currentUser = null;
  persistSession();
  appShell.classList.add("hidden");
  loginScreen.classList.remove("hidden");
  loginUsername.value = "";
  staffPassword.value = "";
});


/* =========================================================
   5b. EVENT: SWITCH BETWEEN LOGIN / SIGN UP SCREENS
========================================================= */

showSignupLink.addEventListener("click", function (e) {
  e.preventDefault();
  loginScreen.classList.add("hidden");
  signupScreen.classList.remove("hidden");
});

showLoginLink.addEventListener("click", function (e) {
  e.preventDefault();
  signupScreen.classList.add("hidden");
  loginScreen.classList.remove("hidden");
});

/* =========================================================
   5c. EVENT: STAFF SIGN UP
========================================================= */

function getInitials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.map((p) => p[0]).join("").toUpperCase();
  return letters.slice(0, 2) || "ST";
}

signupForm.addEventListener("submit", function (e) {
  e.preventDefault();

  let isValid = true;

  isValid = setFieldError(suFullName, document.getElementById("err-suFullName"),
    suFullName.value.trim() === "" ? "Full name is required." : "") && isValid;

  const usernameTaken = staffAccounts.some(
    (s) => s.username.toLowerCase() === suUsername.value.trim().toLowerCase()
  );
  isValid = setFieldError(suUsername, document.getElementById("err-suUsername"),
    suUsername.value.trim() === "" ? "Username is required."
      : usernameTaken ? "This username is already taken." : "") && isValid;

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  isValid = setFieldError(suEmail, document.getElementById("err-suEmail"),
    suEmail.value.trim() === "" ? "Email is required."
      : !emailPattern.test(suEmail.value.trim()) ? "Enter a valid email address." : "") && isValid;

  isValid = setFieldError(suRole, document.getElementById("err-suRole"),
    suRole.value === "" ? "Please select a staff role." : "") && isValid;

  isValid = setFieldError(suPassword, document.getElementById("err-suPassword"),
    suPassword.value.length < 6 ? "Password must be at least 6 characters." : "") && isValid;

  isValid = setFieldError(suConfirmPassword, document.getElementById("err-suConfirmPassword"),
    suConfirmPassword.value !== suPassword.value ? "Passwords do not match." : "") && isValid;

  if (!isValid) {
    showToast("error", "Sign Up Failed", "Please fix the highlighted fields and try again.");
    return;
  }

  const newAccount = {
    id: `STF-${Date.now()}`,
    name: suFullName.value.trim(),
    username: suUsername.value.trim(),
    email: suEmail.value.trim(),
    role: suRole.value,
    password: suPassword.value,
    initials: getInitials(suFullName.value.trim()),
  };

  staffAccounts.push(newAccount);
  persistStaff();

  showToast("success", "Account Created", `Welcome, ${newAccount.name}! You can now sign in.`);

  signupForm.reset();
  signupScreen.classList.add("hidden");
  loginScreen.classList.remove("hidden");
  loginUsername.value = newAccount.username;
});

// Live-clear individual signup field errors as the user types
[suFullName, suUsername, suEmail, suRole, suPassword, suConfirmPassword].forEach((field) => {
  const evt = field.tagName === "SELECT" ? "change" : "input";
  field.addEventListener(evt, function () {
    field.classList.remove("invalid");
    const errorEl = document.getElementById(`err-${field.id}`);
    if (errorEl) errorEl.textContent = "";
  });
});


/* =========================================================
   6. EVENT: SIDEBAR NAVIGATION (SPA-style view switching)
========================================================= */

navItems.forEach((btn) => {
  btn.addEventListener("click", function () {
    const viewName = btn.dataset.view;
    switchView(viewName);
    closeSidebarOnMobile();
  });
});

function switchView(viewName) {
  views.forEach((v) => v.classList.remove("active"));
  navItems.forEach((n) => n.classList.remove("active"));

  const targetView = document.getElementById(`view-${viewName}`);
  const targetNav = document.querySelector(`.nav-item[data-view="${viewName}"]`);

  if (targetView) targetView.classList.add("active");
  if (targetNav) targetNav.classList.add("active");

  const titles = {
    dashboard: "Dashboard",
    search: "Search Patient",
    register: "Register Patient",
    records: "Patient Records",
    upload: "Upload Medical Document",
    audit: "Audit Log",
  };
  pageTitle.textContent = titles[viewName] || "Dashboard";

  if (viewName === "dashboard") renderDashboardStats();
  if (viewName === "records") renderRecordsTable();
  if (viewName === "upload") { renderUploadPatientSelect(); renderUploadsTable(); }
  if (viewName === "audit") renderAuditTable();
}

// Mobile hamburger menu toggle event
menuToggle.addEventListener("click", function () {
  sidebar.classList.toggle("open");
  sidebarOverlay.classList.toggle("active");
});

sidebarOverlay.addEventListener("click", closeSidebarOnMobile);

function closeSidebarOnMobile() {
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("active");
}


/* =========================================================
   7. EVENT: SEARCH PATIENT
========================================================= */

searchBtn.addEventListener("click", performSearch);

// Also allow pressing Enter inside the search field
searchInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    performSearch();
  }
});

function performSearch() {
  const query = searchInput.value.trim().toLowerCase();

  if (!query) {
    showToast("error", "Search Error", "Please enter a name, ID, or contact number to search.");
    renderSearchResults([], false);
    return;
  }

  const results = patients.filter((p) =>
    p.id.toLowerCase().includes(query) ||
    p.name.toLowerCase().includes(query) ||
    p.contact.toLowerCase().includes(query)
  );

  renderSearchResults(results, true);

  if (results.length > 0) {
    showToast("success", "Search Complete", `Found ${results.length} matching record(s).`);
  } else {
    showToast("info", "No Results", "No patient records matched your search.");
  }
}

// Event delegation: handle dynamically generated buttons inside search results
searchResultsTable.addEventListener("click", function (e) {
  const deleteBtn = e.target.closest("button[data-action='delete']");
  if (deleteBtn) {
    openDeleteModal(deleteBtn.dataset.id);
    return;
  }

  const viewBtn = e.target.closest("button[data-action='view']");
  if (!viewBtn) return;
  openViewModal(viewBtn.dataset.id);
});

// Event delegation: handle view and delete buttons in recently added patients on dashboard
recentPatientsTable.addEventListener("click", function (e) {
  const deleteBtn = e.target.closest("button[data-action='delete']");
  if (deleteBtn) {
    openDeleteModal(deleteBtn.dataset.id);
    return;
  }

  const viewBtn = e.target.closest("button[data-action='view']");
  if (!viewBtn) return;
  openViewModal(viewBtn.dataset.id);
});

// Event delegation: handle preview buttons in uploads table
uploadsTable.addEventListener("click", function (e) {
  const previewBtn = e.target.closest("button.doc-preview-btn");
  if (!previewBtn) return;
  openDocViewer(previewBtn.dataset.patientId, parseInt(previewBtn.dataset.docIndex, 10));
});


/* =========================================================
   8. EVENT: REGISTER PATIENT
========================================================= */

// Auto-generate the next patient ID whenever the register view loads
function refreshRegisterId() {
  regId.value = `PT-${nextPatientNumber}`;
}
refreshRegisterId();

registerForm.addEventListener("submit", function (e) {
  e.preventDefault();

  let isValid = true;

  isValid = setFieldError(regName, document.getElementById("err-regName"),
    regName.value.trim() === "" ? "Full name is required." : "") && isValid;

  isValid = setFieldError(regAge, document.getElementById("err-regAge"),
    (!regAge.value || regAge.value < 0 || regAge.value > 120) ? "Enter a valid age (0–120)." : "") && isValid;

  isValid = setFieldError(regGender, document.getElementById("err-regGender"),
    regGender.value === "" ? "Please select a gender." : "") && isValid;

  isValid = setFieldError(regContact, document.getElementById("err-regContact"),
    regContact.value.trim() === "" ? "Contact number is required." : "") && isValid;

  isValid = setFieldError(regHouseNo, document.getElementById("err-regHouseNo"),
    regHouseNo.value.trim() === "" ? "House number is required." : "") && isValid;
  isValid = setFieldError(regStreet, document.getElementById("err-regStreet"),
    regStreet.value.trim() === "" ? "Street is required." : "") && isValid;
  isValid = setFieldError(regBarangay, document.getElementById("err-regBarangay"),
    regBarangay.value.trim() === "" ? "Barangay is required." : "") && isValid;
  isValid = setFieldError(regMunicipality, document.getElementById("err-regMunicipality"),
    regMunicipality.value.trim() === "" ? "Municipality/City is required." : "") && isValid;
  isValid = setFieldError(regProvince, document.getElementById("err-regProvince"),
    regProvince.value.trim() === "" ? "Province is required." : "") && isValid;
  isValid = setFieldError(regZipCode, document.getElementById("err-regZipCode"),
    !/^[0-9]{4,6}$/.test(regZipCode.value.trim()) ? "Enter a valid ZIP Code (4–6 digits)." : "") && isValid;

  if (!isValid) {
    showToast("error", "Validation Failed", "Please fill in all required fields correctly.");
    return;
  }

  const photoFile = regPhotoFile.files[0];

  function saveNewPatient(photoDataUrl) {
    const newPatient = {
      id: regId.value,
      name: regName.value.trim(),
      age: parseInt(regAge.value, 10),
      gender: regGender.value,
      contact: regContact.value.trim(),
      address: {
        houseNo: regHouseNo.value.trim(),
        street: regStreet.value.trim(),
        subdivision: regSubdivision.value.trim(),
        barangay: regBarangay.value.trim(),
        municipality: regMunicipality.value.trim(),
        province: regProvince.value.trim(),
        zipCode: regZipCode.value.trim(),
      },
      history: "",
      documents: [],
      photoUrl: photoDataUrl || "",
      queueStatus: "Waiting",
      registeredAt: new Date().toISOString(),
      lastConsultation: "",
      lastUpload: "",
    };

    patients.push(newPatient);
    nextPatientNumber++;
    persistPatients();
    persistNextId();

    addAuditEntry(newPatient.name, "Registered new patient record");

    showToast("success", "Patient Registered", `${newPatient.name} was added successfully with ID ${newPatient.id}.`);

    registerForm.reset();
    refreshRegisterId();
    renderAll();
  }

  if (photoFile) {
    readFileAsDataURL(photoFile)
      .then((dataUrl) => saveNewPatient(dataUrl))
      .catch(() => {
        showToast("error", "Image Upload Failed", "Could not read the selected patient photo.");
      });
    return;
  }

  saveNewPatient("");
});

// Live-clear individual field errors as the user types (better UX)
[regName, regAge, regGender, regContact, regHouseNo, regStreet, regSubdivision, regBarangay, regMunicipality, regProvince, regZipCode].forEach((field) => {
  const evt = field.tagName === "SELECT" ? "change" : "input";
  field.addEventListener(evt, function () {
    field.classList.remove("invalid");
    const errorEl = document.getElementById(`err-${field.id}`);
    if (errorEl) errorEl.textContent = "";
  });
});


/* =========================================================
   9. EVENT: UPLOAD MEDICAL DOCUMENT
========================================================= */

let selectedFile = null;

// Click on dropzone opens the hidden file input (native <label for> already does this,
// but we also wire it explicitly to demonstrate addEventListener usage)
dropzone.addEventListener("click", function (e) {
  // avoid double-trigger since label 'for' already opens the dialog
});

fileInput.addEventListener("change", function () {
  if (fileInput.files.length > 0) {
    selectedFile = fileInput.files[0];
    dropzoneText.textContent = `Selected file: ${selectedFile.name}`;
    dropzone.classList.add("dragover");
    document.getElementById("err-fileInput").textContent = "";
  }
});

// Drag & drop support
["dragover", "dragenter"].forEach((evt) => {
  dropzone.addEventListener(evt, function (e) {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach((evt) => {
  dropzone.addEventListener(evt, function (e) {
    e.preventDefault();
    if (evt === "dragleave") dropzone.classList.remove("dragover");
  });
});

dropzone.addEventListener("drop", function (e) {
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    selectedFile = files[0];
    fileInput.files = files;
    dropzoneText.textContent = `Selected file: ${selectedFile.name}`;
  }
});

uploadBtn.addEventListener("click", function () {
  const patientId = uploadPatientSelect.value;
  let valid = true;

  if (!patientId) {
    showToast("error", "Upload Failed", "Please select a patient before uploading.");
    valid = false;
  }

  if (!selectedFile) {
    setFieldError(fileInput, document.getElementById("err-fileInput"), "Please choose a PDF or image file.");
    valid = false;
  } else {
    document.getElementById("err-fileInput").textContent = "";
  }

  if (!valid) return;

  const patient = findPatientById(patientId);
  const fileExt = selectedFile.name.split(".").pop().toUpperCase();
  const dateUploaded = getTimestamp();
  const reader = new FileReader();

  reader.onload = function () {
    patient.documents.push({
      fileName: selectedFile.name,
      fileType: fileExt,
      dateUploaded: dateUploaded,
      fileData: reader.result,
    });

    const historyNote = `[${dateUploaded}] Document uploaded: ${selectedFile.name} (${fileExt})`;
    patient.history = patient.history
      ? `${patient.history}\n${historyNote}`
      : historyNote;
    patient.lastUpload = dateUploaded;

    persistPatients();
    addAuditEntry(patient.name, `Uploaded medical document: ${selectedFile.name}`);

    showToast("success", "Document Uploaded", `${selectedFile.name} was added to ${patient.name}'s medical history.`);

    selectedFile = null;
    fileInput.value = "";
    dropzoneText.textContent = "Click to select or drag a file here (PDF, JPG, PNG)";
    dropzone.classList.remove("dragover");
    uploadPatientSelect.value = "";

    renderAll();
  };

  reader.readAsDataURL(selectedFile);
  return;

     `${patient.history}\n${historyNote}`
    historyNote;

  persistPatients();

  addAuditEntry(patient.name, `Uploaded medical document: ${selectedFile.name}`);

  showToast("success", "Document Uploaded", `${selectedFile.name} was added to ${patient.name}'s medical history.`);

  // Reset upload form state
  selectedFile = null;
  fileInput.value = "";
  dropzoneText.textContent = "Click to select or drag a file here (PDF, JPG, PNG)";
  dropzone.classList.remove("dragover");
  uploadPatientSelect.value = "";

  renderAll();
});


/* =========================================================
   10. EVENT: UPDATE PATIENT RECORD (+ AUDIT LOG)
========================================================= */

// Event delegation for dynamically generated "Update" buttons in the records table
recordsTable.addEventListener("click", function (e) {
  const editBtn = e.target.closest("button[data-action='edit']");
  const viewBtn = e.target.closest("button[data-action='view']");
  const deleteBtn = e.target.closest("button[data-action='delete']");

  if (editBtn) openEditModal(editBtn.dataset.id);
  if (viewBtn) openViewModal(viewBtn.dataset.id);
  if (deleteBtn) openDeleteModal(deleteBtn.dataset.id);
});

function openEditModal(id) {
  const patient = findPatientById(id);
  if (!patient) return;

  activeEditId = id;
  editId.value = patient.id;
  editName.value = patient.name;
  editAge.value = patient.age;
  editGender.value = patient.gender;
  editContact.value = patient.contact;
  editPhotoUrl.value = patient.photoUrl || "";
  editQueueStatus.value = patient.queueStatus || "Waiting";
  editHouseNo.value = patient.address.houseNo;
  editStreet.value = patient.address.street;
  editSubdivision.value = patient.address.subdivision;
  editBarangay.value = patient.address.barangay;
  editMunicipality.value = patient.address.municipality;
  editProvince.value = patient.address.province;
  editZipCode.value = patient.address.zipCode;
  editHistory.value = patient.history;

  editModalOverlay.classList.add("active");
}

function closeEditModalFn() {
  editModalOverlay.classList.remove("active");
  activeEditId = null;
}

closeEditModal.addEventListener("click", closeEditModalFn);
cancelEditBtn.addEventListener("click", closeEditModalFn);
editModalOverlay.addEventListener("click", function (e) {
  if (e.target === editModalOverlay) closeEditModalFn();
});

editForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const patient = findPatientById(activeEditId);
  if (!patient) return;

  // Track which fields actually changed, for a more informative audit entry
  const changes = [];
  if (patient.name !== editName.value.trim()) changes.push("name");
  if (patient.age !== parseInt(editAge.value, 10)) changes.push("age");
  if (patient.gender !== editGender.value) changes.push("gender");
  if (patient.contact !== editContact.value.trim()) changes.push("contact number");
  if (patient.address.houseNo !== editHouseNo.value.trim()) changes.push("house number");
  if (patient.address.street !== editStreet.value.trim()) changes.push("street");
  if (patient.address.subdivision !== editSubdivision.value.trim()) changes.push("subdivision");
  if (patient.address.barangay !== editBarangay.value.trim()) changes.push("barangay");
  if (patient.address.municipality !== editMunicipality.value.trim()) changes.push("municipality/city");
  if (patient.address.province !== editProvince.value.trim()) changes.push("province");
  if (patient.address.zipCode !== editZipCode.value.trim()) changes.push("ZIP code");
  if (patient.history !== editHistory.value.trim()) changes.push("medical history");

  patient.name = editName.value.trim();
  patient.age = parseInt(editAge.value, 10);
  patient.gender = editGender.value;
  patient.contact = editContact.value.trim();
  patient.photoUrl = editPhotoUrl.value.trim();
  patient.queueStatus = editQueueStatus.value;
  patient.address = {
    houseNo: editHouseNo.value.trim(),
    street: editStreet.value.trim(),
    subdivision: editSubdivision.value.trim(),
    barangay: editBarangay.value.trim(),
    municipality: editMunicipality.value.trim(),
    province: editProvince.value.trim(),
    zipCode: editZipCode.value.trim(),
  };
  patient.history = editHistory.value.trim();

  if (editQueueStatus.value === "Completed") {
    patient.lastConsultation = getTimestamp();
  }

  persistPatients();

  // Automatically create the audit log entry required by spec:
  // Timestamp, Staff role, Patient name, Action performed
  const actionText = changes.length > 0
    ? `Updated patient record (${changes.join(", ")})`
    : "Updated patient record (no field changes)";
  addAuditEntry(patient.name, actionText);

  showToast("success", "Record Updated", `${patient.name}'s record has been updated successfully.`);

  closeEditModalFn();
  renderAll();
});


/* =========================================================
   11. VIEW PATIENT DETAILS MODAL
========================================================= */

function openViewModal(id) {
  const patient = findPatientById(id);
  if (!patient) return;

  const docsListHtml = patient.documents.length > 0
    ? `<ul>${patient.documents.map((d, idx) => `<li>${d.fileName} (${d.fileType}) — ${d.dateUploaded} <button class="btn btn-sm btn-ghost doc-preview-btn" data-patient-id="${patient.id}" data-doc-index="${idx}">Preview</button></li>`).join("")}</ul>`
    : `<span>No documents uploaded.</span>`;

  viewModalBody.innerHTML = `
    <div class="detail-grid">
      <div class="detail-item" style="grid-column:1/-1;text-align:center;">
        <div class="patient-photo-wrapper">
          ${patient.photoUrl ? `<img src="${patient.photoUrl}" alt="${patient.name}" class="patient-photo" />` : `<div class="patient-photo placeholder">No photo</div>`}
        </div>
      </div>
      <div class="detail-item"><label>Patient ID</label><span>${patient.id}</span></div>
      <div class="detail-item"><label>Full Name</label><span>${patient.name}</span></div>
      <div class="detail-item"><label>Age</label><span>${patient.age}</span></div>
      <div class="detail-item"><label>Gender</label><span>${patient.gender}</span></div>
      <div class="detail-item"><label>Contact Number</label><span>${patient.contact}</span></div>
      <div class="detail-item"><label>Queue Status</label><span>${statusBadge(patient.queueStatus)}</span></div>
      <div class="detail-item"><label>Address</label><span>${formatAddressHtml(patient.address)}</span></div>
      <div class="detail-item"><label>Last Consultation</label><span>${patient.lastConsultation ? formatDateLabel(patient.lastConsultation) : "Not available"}</span></div>
      <div class="detail-item"><label>Last Upload</label><span>${patient.lastUpload ? formatDateLabel(patient.lastUpload) : "Not available"}</span></div>
      <div class="detail-item span-2" style="grid-column:1/-1;"><label>Medical History</label><span>${patient.history ? patient.history.replace(/\n/g, "<br>") : "No records yet."}</span></div>
      <div class="detail-item span-2" style="grid-column:1/-1;"><label>Uploaded Documents</label>${docsListHtml}</div>
    </div>
  `;

  viewModalBody.querySelectorAll(".doc-preview-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      openDocViewer(this.dataset.patientId, parseInt(this.dataset.docIndex, 10));
    });
  });

  viewModalOverlay.classList.add("active");
}

closeViewModal.addEventListener("click", function () {
  viewModalOverlay.classList.remove("active");
});
viewModalOverlay.addEventListener("click", function (e) {
  if (e.target === viewModalOverlay) viewModalOverlay.classList.remove("active");
});

docViewerOverlay.addEventListener("click", function (e) {
  if (e.target === docViewerOverlay) docViewerOverlay.classList.remove("active");
});

closeDocViewer.addEventListener("click", function () {
  docViewerOverlay.classList.remove("active");
});

function openDocViewer(patientId, docIndex) {
  const patient = findPatientById(patientId);
  if (!patient || !patient.documents[docIndex]) return;
  const doc = patient.documents[docIndex];
  let previewHtml = "";

  if (doc.fileData && doc.fileType) {
    const imageTypes = ["JPG", "JPEG", "PNG", "GIF", "WEBP"];
    if (imageTypes.includes(doc.fileType)) {
      previewHtml = `<img src="${doc.fileData}" alt="${doc.fileName}" class="doc-preview-img" />`;
    } else if (doc.fileType === "PDF") {
      previewHtml = `<iframe src="${doc.fileData}" class="doc-preview-iframe"></iframe>`;
    } else {
      previewHtml = `<div class="doc-preview-fallback"><a href="${doc.fileData}" target="_blank">Open ${doc.fileName}</a></div>`;
    }
  } else {
    previewHtml = `<div class="doc-preview-fallback">Preview is not available for this file.</div>`;
  }

  docViewerBody.innerHTML = `
    <div class="doc-preview-header">
      <div>
        <strong>${doc.fileName}</strong>
        <p>${doc.fileType} • ${doc.dateUploaded}</p>
      </div>
    </div>
    <div class="doc-preview-content">${previewHtml}</div>
  `;
  docViewerOverlay.classList.add("active");
}

/* =========================================================
   11b. DELETE PATIENT RECORD MODAL (+ AUDIT LOG)
========================================================= */

function openDeleteModal(id) {
  const patient = findPatientById(id);
  if (!patient) return;

  activeDeleteId = id;
  deletePatientName.textContent = patient.name;
  deleteModalOverlay.classList.add("active");
}

function closeDeleteModalFn() {
  deleteModalOverlay.classList.remove("active");
  activeDeleteId = null;
}

closeDeleteModal.addEventListener("click", closeDeleteModalFn);
cancelDeleteBtn.addEventListener("click", closeDeleteModalFn);
deleteModalOverlay.addEventListener("click", function (e) {
  if (e.target === deleteModalOverlay) closeDeleteModalFn();
});

confirmDeleteBtn.addEventListener("click", function () {
  const patient = findPatientById(activeDeleteId);
  if (!patient) return;

  patients = patients.filter((p) => p.id !== activeDeleteId);
  persistPatients();

  addAuditEntry(patient.name, "Deleted patient record");

  showToast("success", "Record Deleted", `${patient.name}'s record has been removed.`);

  closeDeleteModalFn();
  renderAll();
});


/* =========================================================
   12. GLOBAL KEYBOARD EVENT (Escape closes modals)
======================================================== */

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    closeEditModalFn();
    viewModalOverlay.classList.remove("active");
    closeDeleteModalFn();
  }
});


/* =========================================================
   13. INITIALIZATION
======================================================== */

restoreSession();
renderAll();

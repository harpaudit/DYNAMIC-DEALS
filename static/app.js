const STORAGE_KEY = "apex_dynamic_deals";
const TEAMS_STORAGE_KEY = "apex_dynamic_known_teams";
const CLOSERS_STORAGE_KEY = "apex_dynamic_known_closers";
const SETTERS_STORAGE_KEY = "apex_dynamic_known_setters";
const CLOSER_TEAM_MAP_KEY = "apex_dynamic_closer_team_map";
const STATUS_OPTIONS = ["M1", "Site Survey", "CAD", "AHJ", "Install Ready", "Install Scheduled", "Installing", "Post Install"];
const STATUS_MIGRATIONS = { "CAD AHJ Install Ready": "Install Ready" };
const PAY_DAYS_AFTER_INSTALL = 30;
const NEW_PAY_RULE_CUTOFF = "2026-05-14"; // deals sold on or after this date use 2-Friday rule

const form = document.getElementById("deal-form");
const formTitle = document.getElementById("form-title");
const submitBtn = document.getElementById("submit-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");
const dealModal = document.getElementById("deal-modal");
const modalBackdrop = document.getElementById("deal-modal-backdrop");
const closeModalBtn = document.getElementById("close-modal-btn");
const openCreateModalBtn = document.getElementById("open-create-modal-btn");
const searchInput = document.getElementById("search-input");
const sortSelect = document.getElementById("sort-select");
const tableBody = document.getElementById("deals-table-body");
const cardsContainer = document.getElementById("deals-cards");
const emptyStateDesktop = document.getElementById("empty-state-desktop");
const emptyStateMobile = document.getElementById("empty-state-mobile");
const teamSuggestionsEl = document.getElementById("team-suggestions");
const closerSuggestionsEl = document.getElementById("closer-suggestions");
const setterSuggestionsEl = document.getElementById("setter-suggestions");
const statusTabsContainer = document.getElementById("status-tabs");
const modalContent = document.getElementById("modal-content");
const datePickerPopup = document.getElementById("date-picker-popup");
const dpMonthLabel = document.getElementById("dp-month-label");
const dpDays = document.getElementById("dp-days");
const dpPrevBtn = document.getElementById("dp-prev");
const dpNextBtn = document.getElementById("dp-next");
const dpTodayBtn = document.getElementById("dp-today");
const dpClearBtn = document.getElementById("dp-clear");
const rowActionsMenu = document.getElementById("row-actions-menu");
const overdueBanner = document.getElementById("overdue-banner");
const overdueBannerText = document.getElementById("overdue-banner-text");
const reportRoleSelect = document.getElementById("report-role-select");
const reportRepSelect = document.getElementById("report-rep-select");
const reportDownloadPngBtn = document.getElementById("report-download-png-btn");
const reportDownloadPdfBtn = document.getElementById("report-download-pdf-btn");
const reportEmptyState = document.getElementById("report-empty-state");
const reportPreviewWrapper = document.getElementById("report-preview-wrapper");
const reportPreview = document.getElementById("report-preview");
const reportRepNameEl = document.getElementById("report-rep-name");
const reportRepRoleEl = document.getElementById("report-rep-role");
const reportGeneratedDateEl = document.getElementById("report-generated-date");
const reportTableBody = document.getElementById("report-table-body");
const detailModal = document.getElementById("detail-modal");
const detailModalBackdrop = document.getElementById("detail-modal-backdrop");
const closeDetailModalBtn = document.getElementById("close-detail-modal-btn");
const detailModalTitle = document.getElementById("detail-modal-title");
const detailInfoGrid = document.getElementById("detail-info-grid");
const detailCommentInput = document.getElementById("detail-comment-input");
const detailCommentSubmit = document.getElementById("detail-comment-submit");
const detailCommentsList = document.getElementById("detail-comments-list");
const detailCommentsEmpty = document.getElementById("detail-comments-empty");

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

let editingId = null;
let statusFilter = "";
let datePickerInput = null;
let datePickerViewYear = null;
let datePickerViewMonth = null;
let actionsMenuTargetId = null;
let actionsMenuTriggerEl = null;
let overdueOnly = false;
let detailModalId = null;

function loadDeals() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDeals(deals) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(deals));
}

function createKnownValuesStore(storageKey) {
  function load() {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function save() {
    localStorage.setItem(storageKey, JSON.stringify(Array.from(known)));
  }

  function remember(value) {
    if (!value || known.has(value)) return;
    known.add(value);
    save();
  }

  const known = new Set(load());
  return { known, save, remember };
}

let activeSuggestionsEl = null;

function closeSuggestions() {
  if (!activeSuggestionsEl) return;
  activeSuggestionsEl.classList.add("hidden");
  activeSuggestionsEl.innerHTML = "";
  activeSuggestionsEl = null;
}

function setupAutocomplete(inputEl, suggestionsEl, store, onSelect) {
  function renderSuggestions() {
    const query = inputEl.value.trim().toLowerCase();
    const matches = Array.from(store.known)
      .filter((value) => !query || value.toLowerCase().includes(query))
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 8);

    if (matches.length === 0) {
      closeSuggestions();
      return;
    }

    suggestionsEl.innerHTML = matches
      .map(
        (value) =>
          `<button type="button" class="block w-full text-left px-3 py-1.5 text-sm hover:bg-slate-100" data-suggestion="${escapeHtml(value)}">${escapeHtml(value)}</button>`
      )
      .join("");
    suggestionsEl.classList.remove("hidden");
    activeSuggestionsEl = suggestionsEl;
  }

  inputEl.addEventListener("input", renderSuggestions);
  inputEl.addEventListener("focus", renderSuggestions);

  suggestionsEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-suggestion]");
    if (!btn) return;
    inputEl.value = btn.dataset.suggestion;
    inputEl.focus();
    closeSuggestions();
    if (onSelect) onSelect(btn.dataset.suggestion);
  });
}

let deals = loadDeals();

let statusMigrated = false;
deals.forEach((d) => {
  if (STATUS_MIGRATIONS[d.status]) {
    d.status = STATUS_MIGRATIONS[d.status];
    statusMigrated = true;
  }
});
if (statusMigrated) saveDeals(deals);

const teamsStore = createKnownValuesStore(TEAMS_STORAGE_KEY);
const closersStore = createKnownValuesStore(CLOSERS_STORAGE_KEY);
const settersStore = createKnownValuesStore(SETTERS_STORAGE_KEY);
deals.forEach((d) => {
  if (d.team) teamsStore.known.add(d.team);
  if (d.closer) closersStore.known.add(d.closer);
  if (d.setter) settersStore.known.add(d.setter);
});
teamsStore.save();
closersStore.save();
settersStore.save();

function loadCloserTeamMap() {
  try {
    const raw = localStorage.getItem(CLOSER_TEAM_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCloserTeamMap() {
  localStorage.setItem(CLOSER_TEAM_MAP_KEY, JSON.stringify(closerTeamMap));
}

function rememberCloserTeam(closer, team) {
  if (!closer || !team) return;
  closerTeamMap[closer] = team;
  saveCloserTeamMap();
}

const closerTeamMap = loadCloserTeamMap();
deals.forEach((d) => {
  if (d.closer && d.team) closerTeamMap[d.closer] = d.team;
});
saveCloserTeamMap();

function isoToDisplayDate(iso) {
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return "";
  return `${month}/${day}/${year}`;
}

function displayDateToIso(display) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(display.trim());
  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  const check = new Date(year, month - 1, day);
  if (check.getFullYear() !== year || check.getMonth() !== month - 1 || check.getDate() !== day) return null;

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function maskDateInput(e) {
  const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
  if (digits.length > 4) {
    e.target.value = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  } else if (digits.length > 2) {
    e.target.value = `${digits.slice(0, 2)}/${digits.slice(2)}`;
  } else {
    e.target.value = digits;
  }
}

function positionDatePicker(input) {
  const rect = input.getBoundingClientRect();
  const popupWidth = datePickerPopup.offsetWidth || 256;
  let left = rect.left;
  if (left + popupWidth > window.innerWidth - 8) {
    left = Math.max(8, window.innerWidth - popupWidth - 8);
  }
  datePickerPopup.style.top = `${rect.bottom + 6}px`;
  datePickerPopup.style.left = `${left}px`;
}

function renderDatePicker() {
  dpMonthLabel.textContent = `${MONTH_NAMES[datePickerViewMonth]} ${datePickerViewYear}`;

  const firstWeekday = new Date(datePickerViewYear, datePickerViewMonth, 1).getDay();
  const daysInMonth = new Date(datePickerViewYear, datePickerViewMonth + 1, 0).getDate();
  const today = new Date();
  const selectedIso = datePickerInput ? displayDateToIso(datePickerInput.value.trim()) : null;

  let cellsHtml = "";
  for (let i = 0; i < firstWeekday; i++) {
    cellsHtml += `<span></span>`;
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${datePickerViewYear}-${String(datePickerViewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const isSelected = selectedIso === iso;
    const isToday = today.getFullYear() === datePickerViewYear && today.getMonth() === datePickerViewMonth && today.getDate() === day;
    const classes = isSelected
      ? "bg-slate-900 text-white"
      : isToday
        ? "border border-slate-400 text-slate-900"
        : "text-slate-700 hover:bg-slate-100";
    cellsHtml += `<button type="button" data-day="${day}" class="w-8 h-8 rounded-md ${classes}">${day}</button>`;
  }
  dpDays.innerHTML = cellsHtml;
}

function openDatePicker(input) {
  datePickerInput = input;
  const iso = displayDateToIso(input.value.trim());
  const base = iso ? new Date(`${iso}T00:00:00`) : new Date();
  datePickerViewYear = base.getFullYear();
  datePickerViewMonth = base.getMonth();
  renderDatePicker();
  datePickerPopup.classList.remove("hidden");
  positionDatePicker(input);
}

function closeDatePicker() {
  datePickerPopup.classList.add("hidden");
  datePickerInput = null;
}

function selectDatePickerDay(day) {
  const mm = String(datePickerViewMonth + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  datePickerInput.value = `${mm}/${dd}/${datePickerViewYear}`;
  closeDatePicker();
}

function positionActionsMenu(button) {
  const rect = button.getBoundingClientRect();
  const menuWidth = rowActionsMenu.offsetWidth || 128;
  let left = rect.right - menuWidth;
  if (left < 8) left = 8;
  rowActionsMenu.style.top = `${rect.bottom + 4}px`;
  rowActionsMenu.style.left = `${left}px`;
}

function openActionsMenu(button, id) {
  actionsMenuTargetId = id;
  actionsMenuTriggerEl = button;
  rowActionsMenu.classList.remove("hidden");
  positionActionsMenu(button);
}

function closeActionsMenu() {
  rowActionsMenu.classList.add("hidden");
  actionsMenuTargetId = null;
  actionsMenuTriggerEl = null;
}

function generateId() {
  return (crypto.randomUUID && crypto.randomUUID()) ||
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function dashIfEmpty(value) {
  if (value === null || value === undefined || value === "" || value === 0) return "-";
  return value;
}

function formatCurrency(value) {
  if (!value) return "-";
  return `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatKw(value) {
  if (!value) return "-";
  return `${Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 })} kW`;
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(`${value}T00:00:00`);
  if (isNaN(d)) return value;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function getNthFridayAfter(iso, n) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  // Find the Friday of the same Sun-Sat week (Sat wraps back to previous Friday)
  const dow = date.getDay();
  date.setDate(date.getDate() + (dow === 6 ? -1 : 5 - dow));
  // Skip n full weeks: don't count this week's Friday, start from the following weeks
  date.setDate(date.getDate() + n * 7);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDaysToIso(iso, days) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function todayIso() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function getExpectedPayDate(deal) {
  if (!deal.installedDate) return null;
  if (deal.dateSold && deal.dateSold >= NEW_PAY_RULE_CUTOFF) {
    return getNthFridayAfter(deal.installedDate, 2);
  }
  return addDaysToIso(deal.installedDate, PAY_DAYS_AFTER_INSTALL);
}

function isOverdue(deal) {
  const expectedPayDate = getExpectedPayDate(deal);
  if (!expectedPayDate) return false;
  if (Number(deal.paidValue) > 0) return false;
  return expectedPayDate < todayIso();
}

function formatCommentTimestamp(isoStr) {
  const d = new Date(isoStr);
  if (isNaN(d)) return "";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function renderDetailComments(deal) {
  const comments = deal.comments || [];
  if (comments.length === 0) {
    detailCommentsList.innerHTML = "";
    detailCommentsEmpty.classList.remove("hidden");
    return;
  }
  detailCommentsEmpty.classList.add("hidden");
  detailCommentsList.innerHTML = comments
    .slice()
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map(
      (c) => `
        <div class="bg-slate-50 rounded-md px-4 py-3">
          <p class="text-xs text-slate-400 mb-1">${escapeHtml(formatCommentTimestamp(c.createdAt))}</p>
          <p class="text-sm text-slate-700 whitespace-pre-wrap">${escapeHtml(c.text)}</p>
        </div>
      `
    )
    .join("");
  detailCommentsList.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function renderDetailModal(deal) {
  detailModalTitle.textContent = deal.dealName;
  const overdue = isOverdue(deal);
  const expectedPayDate = getExpectedPayDate(deal);

  const infoFields = [
    { label: "Status", value: deal.status, badge: true },
    { label: "Date Sold", value: formatDate(deal.dateSold) },
    { label: "Installed", value: formatDate(deal.installedDate) },
    { label: "Expected Pay", value: formatDate(expectedPayDate), overdue },
    { label: "Size (kW)", value: formatKw(deal.systemSize) },
    { label: "Closer", value: dashIfEmpty(deal.closer) },
    { label: "Setter", value: dashIfEmpty(deal.setter) },
    { label: "Team", value: dashIfEmpty(deal.team) },
    { label: "Paid ($)", value: formatCurrency(deal.paidValue) },
  ];

  detailInfoGrid.innerHTML = infoFields
    .map((f) => {
      let valueHtml;
      if (f.badge) {
        valueHtml = `<span class="text-xs font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">${escapeHtml(f.value)}</span>`;
      } else if (f.overdue) {
        valueHtml = `<span class="text-sm text-slate-800">${escapeHtml(f.value)}</span>
                     <span class="ml-1 inline-block text-[10px] font-semibold uppercase tracking-wide text-red-700 bg-red-100 px-1.5 py-0.5 rounded">Overdue</span>`;
      } else {
        valueHtml = `<span class="text-sm text-slate-800">${escapeHtml(f.value)}</span>`;
      }
      return `
        <div>
          <p class="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">${escapeHtml(f.label)}</p>
          <div>${valueHtml}</div>
        </div>
      `;
    })
    .join("");

  renderDetailComments(deal);
}

function openDetailModal(id) {
  const deal = deals.find((d) => d.id === id);
  if (!deal) return;
  detailModalId = id;
  detailCommentInput.value = "";
  renderDetailModal(deal);
  detailModal.classList.remove("hidden");
}

function closeDetailModal() {
  detailModal.classList.add("hidden");
  detailModalId = null;
  detailCommentInput.value = "";
}

function addComment() {
  if (!detailModalId) return;
  const text = detailCommentInput.value.trim();
  if (!text) return;
  const deal = deals.find((d) => d.id === detailModalId);
  if (!deal) return;
  if (!deal.comments) deal.comments = [];
  deal.comments.push({ id: generateId(), text, createdAt: new Date().toISOString() });
  saveDeals(deals);
  detailCommentInput.value = "";
  renderDetailComments(deal);
}

function renderKPIs() {
  const totalDeals = deals.length;
  const dealsWithPayments = deals.filter((d) => Number(d.paidValue) > 0).length;
  const totalCollected = deals.reduce((sum, d) => sum + (Number(d.paidValue) || 0), 0);
  const totalKw = deals.reduce((sum, d) => sum + (Number(d.systemSize) || 0), 0);

  document.getElementById("kpi-total-deals").textContent = totalDeals;
  document.getElementById("kpi-deals-with-payments").textContent = dealsWithPayments;
  document.getElementById("kpi-total-collected").textContent =
    `$${totalCollected.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  document.getElementById("kpi-total-kw").textContent =
    `${totalKw.toLocaleString("en-US", { maximumFractionDigits: 2 })} kW`;
}

function renderStatusTabs() {
  const tabs = [{ label: "All", value: "", count: deals.length }];
  STATUS_OPTIONS.forEach((status) => {
    tabs.push({ label: status, value: status, count: deals.filter((d) => d.status === status).length });
  });

  statusTabsContainer.innerHTML = tabs
    .map((tab) => {
      const isActive = tab.value === statusFilter;
      const classes = isActive
        ? "border-slate-900 text-slate-900"
        : "border-transparent text-slate-500 hover:text-slate-700";
      return `
        <button type="button" data-status="${escapeHtml(tab.value)}"
                class="shrink-0 px-3 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${classes}">
          ${escapeHtml(tab.label)} <span class="text-xs text-slate-400">(${tab.count})</span>
        </button>
      `;
    })
    .join("");
}

function renderOverdueBanner() {
  const overdueCount = deals.filter(isOverdue).length;
  if (overdueCount === 0) {
    overdueOnly = false;
    overdueBanner.classList.add("hidden");
    return;
  }

  overdueBanner.classList.remove("hidden");
  overdueBanner.classList.toggle("bg-red-100", overdueOnly);
  overdueBannerText.textContent = overdueOnly
    ? `Showing ${overdueCount} overdue deal${overdueCount === 1 ? "" : "s"} only — click to show all deals.`
    : `${overdueCount} deal${overdueCount === 1 ? "" : "s"} ${overdueCount === 1 ? "has" : "have"} an overdue payment — past expected pay date with no payment recorded. Click to view.`;
}

function getFilteredSortedDeals() {
  const query = searchInput.value.trim().toLowerCase();
  let result = deals.filter((d) => {
    if (overdueOnly && !isOverdue(d)) return false;
    if (statusFilter && d.status !== statusFilter) return false;
    if (!query) return true;
    return [d.dealName, d.closer, d.setter, d.team]
      .filter(Boolean)
      .some((field) => field.toLowerCase().includes(query));
  });

  const sortKey = sortSelect.value;
  if (sortKey === "paidValueDesc") {
    result = result.slice().sort((a, b) => (Number(b.paidValue) || 0) - (Number(a.paidValue) || 0));
  } else if (sortKey === "systemSizeDesc") {
    result = result.slice().sort((a, b) => (Number(b.systemSize) || 0) - (Number(a.systemSize) || 0));
  } else if (sortKey === "dateSoldAsc") {
    result = result.slice().sort((a, b) => new Date(a.dateSold) - new Date(b.dateSold));
  } else if (sortKey === "dateSoldDesc") {
    result = result.slice().sort((a, b) => new Date(b.dateSold) - new Date(a.dateSold));
  }

  return result;
}

function renderTable(list) {
  tableBody.innerHTML = "";
  emptyStateDesktop.classList.toggle("hidden", list.length > 0);

  list.forEach((d) => {
    const overdue = isOverdue(d);
    const tr = document.createElement("tr");
    tr.className = "hover:bg-slate-50";
    tr.innerHTML = `
      <td class="py-2 pr-4">
        <button type="button" data-action="detail" data-id="${d.id}"
                class="font-medium text-slate-900 text-left hover:underline cursor-pointer">
          ${escapeHtml(d.dealName)}
        </button>
      </td>
      <td class="py-2 pr-4">${escapeHtml(d.status)}</td>
      <td class="py-2 pr-4">${formatDate(d.dateSold)}</td>
      <td class="py-2 pr-4">${formatDate(d.installedDate)}</td>
      <td class="py-2 pr-4">
        ${formatDate(getExpectedPayDate(d))}
        ${overdue ? '<span class="ml-1 inline-block text-[10px] font-semibold uppercase tracking-wide text-red-700 bg-red-100 px-1.5 py-0.5 rounded">Overdue</span>' : ""}
      </td>
      <td class="py-2 pr-4">${formatKw(d.systemSize)}</td>
      <td class="py-2 pr-4">${escapeHtml(dashIfEmpty(d.closer))}</td>
      <td class="py-2 pr-4">${escapeHtml(dashIfEmpty(d.setter))}</td>
      <td class="py-2 pr-4">${escapeHtml(dashIfEmpty(d.team))}</td>
      <td class="py-2 pr-4">${formatCurrency(d.paidValue)}</td>
      <td class="py-2 pr-4 text-right whitespace-nowrap">
        <button type="button" data-action="menu" data-id="${d.id}" aria-label="Actions" aria-haspopup="true"
                class="actions-menu-trigger text-slate-500 hover:text-slate-900 p-1.5 rounded hover:bg-slate-100">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="1.6"></circle>
            <circle cx="12" cy="12" r="1.6"></circle>
            <circle cx="12" cy="19" r="1.6"></circle>
          </svg>
        </button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

function renderCards(list) {
  cardsContainer.innerHTML = "";
  emptyStateMobile.classList.toggle("hidden", list.length > 0);

  list.forEach((d) => {
    const overdue = isOverdue(d);
    const card = document.createElement("div");
    card.className = "border border-slate-200 rounded-md p-4 space-y-1.5";
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <button type="button" data-action="detail" data-id="${d.id}"
                class="font-semibold text-slate-900 text-left hover:underline cursor-pointer">
          ${escapeHtml(d.dealName)}
        </button>
        <span class="text-xs font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">${escapeHtml(d.status)}</span>
      </div>
      <div class="grid grid-cols-2 gap-1 text-sm text-slate-600">
        <p><span class="text-slate-400">Date Sold:</span> ${formatDate(d.dateSold)}</p>
        <p><span class="text-slate-400">Installed:</span> ${formatDate(d.installedDate)}</p>
        <p>
          <span class="text-slate-400">Expected Pay:</span> ${formatDate(getExpectedPayDate(d))}
          ${overdue ? '<span class="ml-1 inline-block text-[10px] font-semibold uppercase tracking-wide text-red-700 bg-red-100 px-1.5 py-0.5 rounded">Overdue</span>' : ""}
        </p>
        <p><span class="text-slate-400">Size:</span> ${formatKw(d.systemSize)}</p>
        <p><span class="text-slate-400">Closer:</span> ${escapeHtml(dashIfEmpty(d.closer))}</p>
        <p><span class="text-slate-400">Setter:</span> ${escapeHtml(dashIfEmpty(d.setter))}</p>
        <p><span class="text-slate-400">Team:</span> ${escapeHtml(dashIfEmpty(d.team))}</p>
        <p><span class="text-slate-400">Paid:</span> ${formatCurrency(d.paidValue)}</p>
      </div>
      <div class="flex justify-end pt-1">
        <button type="button" data-action="menu" data-id="${d.id}" aria-label="Actions" aria-haspopup="true"
                class="actions-menu-trigger text-slate-500 hover:text-slate-900 p-1.5 rounded hover:bg-slate-100">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="1.6"></circle>
            <circle cx="12" cy="12" r="1.6"></circle>
            <circle cx="12" cy="19" r="1.6"></circle>
          </svg>
        </button>
      </div>
    `;
    cardsContainer.appendChild(card);
  });
}

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  const div = document.createElement("div");
  div.textContent = String(value);
  return div.innerHTML;
}

function rerenderList() {
  closeActionsMenu();
  const list = getFilteredSortedDeals();
  renderTable(list);
  renderCards(list);
}

function getUniqueRepNames(role) {
  const field = role === "setter" ? "setter" : "closer";
  const names = new Set();
  deals.forEach((d) => {
    const value = (d[field] || "").trim();
    if (value) names.add(value);
  });
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

function renderReport() {
  const role = reportRoleSelect.value;
  const repName = reportRepSelect.value;

  if (!repName) {
    reportPreviewWrapper.classList.add("hidden");
    reportEmptyState.classList.remove("hidden");
    reportDownloadPngBtn.disabled = true;
    reportDownloadPdfBtn.disabled = true;
    return;
  }

  const field = role === "setter" ? "setter" : "closer";
  const repDeals = deals
    .filter((d) => (d[field] || "").trim() === repName)
    .slice()
    .sort((a, b) => new Date(b.dateSold) - new Date(a.dateSold));

  reportTableBody.innerHTML = repDeals
    .map(
      (d) => `
        <tr class="border-b border-slate-100">
          <td class="py-2 pr-4 font-medium text-slate-900">${escapeHtml(d.dealName)}</td>
          <td class="py-2 pr-4">${escapeHtml(d.status)}</td>
          <td class="py-2 pr-4">${formatDate(d.dateSold)}</td>
          <td class="py-2 pr-4">${formatDate(d.installedDate)}</td>
          <td class="py-2 pr-4">${formatDate(getExpectedPayDate(d))}</td>
          <td class="py-2 pr-4">${formatKw(d.systemSize)}</td>
          <td class="py-2 pr-4">${escapeHtml(dashIfEmpty(d.team))}</td>
          <td class="py-2 pr-4">${formatCurrency(d.paidValue)}</td>
        </tr>
      `
    )
    .join("");

  reportRepNameEl.textContent = repName;
  reportRepRoleEl.textContent = role === "setter" ? "Setter" : "Closer";
  reportGeneratedDateEl.textContent = `Generated ${formatDate(todayIso())}`;

  reportEmptyState.classList.add("hidden");
  reportPreviewWrapper.classList.remove("hidden");
  reportDownloadPngBtn.disabled = false;
  reportDownloadPdfBtn.disabled = false;
}

function renderReportRepOptions() {
  const names = getUniqueRepNames(reportRoleSelect.value);
  const previousValue = reportRepSelect.value;
  reportRepSelect.innerHTML =
    `<option value="">Select a rep…</option>` +
    names.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
  reportRepSelect.value = names.includes(previousValue) ? previousValue : "";
  renderReport();
}

function buildReportFilename(extension) {
  const role = reportRoleSelect.value === "setter" ? "Setter" : "Closer";
  const repName = reportRepSelect.value.replace(/[^a-z0-9]+/gi, "_");
  return `DealReport_${role}_${repName}_${todayIso()}.${extension}`;
}

async function captureReportCanvas() {
  return html2canvas(reportPreview, { backgroundColor: "#ffffff", scale: 2 });
}

function downloadCanvasAsPng(canvas, filename) {
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  });
}

function rerenderAll() {
  renderKPIs();
  renderStatusTabs();
  renderOverdueBanner();
  renderReportRepOptions();
  rerenderList();
}

function openModal() {
  dealModal.classList.remove("hidden");
  form.dealName.focus();
}

function closeModal() {
  dealModal.classList.add("hidden");
  closeDatePicker();
  closeSuggestions();
  editingId = null;
  form.reset();
  formTitle.textContent = "New Deal";
  submitBtn.textContent = "Add Deal";
  clearFieldErrors();
}

function startEdit(id) {
  const deal = deals.find((d) => d.id === id);
  if (!deal) return;

  editingId = id;
  form.dealName.value = deal.dealName;
  form.status.value = deal.status;
  form.dateSold.value = isoToDisplayDate(deal.dateSold);
  form.installedDate.value = isoToDisplayDate(deal.installedDate);
  form.systemSize.value = deal.systemSize || "";
  form.closer.value = deal.closer || "";
  form.setter.value = deal.setter || "";
  form.team.value = deal.team || "";
  form.paidValue.value = deal.paidValue || "";

  formTitle.textContent = "Edit Deal";
  submitBtn.textContent = "Save Changes";
  clearFieldErrors();
  openModal();
}

function deleteDeal(id) {
  const deal = deals.find((d) => d.id === id);
  if (!deal) return;
  if (!window.confirm(`Delete deal "${deal.dealName}"? This cannot be undone.`)) return;

  deals = deals.filter((d) => d.id !== id);
  saveDeals(deals);
  if (editingId === id) closeModal();
  rerenderAll();
}

function handleListClick(e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const { action, id } = btn.dataset;

  if (action === "detail") {
    openDetailModal(id);
    return;
  }

  if (action !== "menu") return;

  if (actionsMenuTargetId === id && !rowActionsMenu.classList.contains("hidden")) {
    closeActionsMenu();
  } else {
    openActionsMenu(btn, id);
  }
}

function clearFieldErrors() {
  form.querySelectorAll("[data-error-for]").forEach((el) => el.classList.add("hidden"));
}

function showFieldError(name) {
  const el = form.querySelector(`[data-error-for="${name}"]`);
  if (el) el.classList.remove("hidden");
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  clearFieldErrors();

  const dealName = form.dealName.value.trim();
  const status = form.status.value;
  const dateSoldDisplay = form.dateSold.value.trim();
  const installedDateDisplay = form.installedDate.value.trim();
  const dateSold = displayDateToIso(dateSoldDisplay);
  const installedDate = installedDateDisplay ? displayDateToIso(installedDateDisplay) : "";

  let hasError = false;
  if (!dealName) {
    showFieldError("dealName");
    hasError = true;
  }
  if (!status) {
    showFieldError("status");
    hasError = true;
  }
  if (!dateSoldDisplay || !dateSold) {
    showFieldError("dateSold");
    hasError = true;
  }
  if (installedDateDisplay && !installedDate) {
    showFieldError("installedDate");
    hasError = true;
  }
  if (hasError) return;

  const dealData = {
    dealName,
    status,
    dateSold,
    installedDate,
    systemSize: Number(form.systemSize.value) || 0,
    closer: form.closer.value.trim(),
    setter: form.setter.value.trim(),
    team: form.team.value.trim(),
    paidValue: Number(form.paidValue.value) || 0,
  };

  if (editingId) {
    const index = deals.findIndex((d) => d.id === editingId);
    if (index !== -1) deals[index] = { ...deals[index], ...dealData };
  } else {
    deals.push({ id: generateId(), ...dealData });
  }

  saveDeals(deals);
  closersStore.remember(dealData.closer);
  settersStore.remember(dealData.setter);
  teamsStore.remember(dealData.team);
  rememberCloserTeam(dealData.closer, dealData.team);
  closeModal();
  rerenderAll();
});

form.dateSold.addEventListener("input", maskDateInput);
form.installedDate.addEventListener("input", maskDateInput);
openCreateModalBtn.addEventListener("click", openModal);
cancelEditBtn.addEventListener("click", closeModal);
closeModalBtn.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", closeModal);
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!rowActionsMenu.classList.contains("hidden")) {
    closeActionsMenu();
  } else if (!datePickerPopup.classList.contains("hidden")) {
    closeDatePicker();
  } else if (activeSuggestionsEl) {
    closeSuggestions();
  } else if (!detailModal.classList.contains("hidden")) {
    closeDetailModal();
  } else if (!dealModal.classList.contains("hidden")) {
    closeModal();
  }
});
tableBody.addEventListener("click", handleListClick);
cardsContainer.addEventListener("click", handleListClick);
searchInput.addEventListener("input", rerenderList);
sortSelect.addEventListener("change", rerenderList);
reportRoleSelect.addEventListener("change", renderReportRepOptions);
reportRepSelect.addEventListener("change", renderReport);

reportDownloadPngBtn.addEventListener("click", async () => {
  const canvas = await captureReportCanvas();
  downloadCanvasAsPng(canvas, buildReportFilename("png"));
});

reportDownloadPdfBtn.addEventListener("click", async () => {
  const canvas = await captureReportCanvas();
  const imgData = canvas.toDataURL("image/png");
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({
    orientation: canvas.width > canvas.height ? "landscape" : "portrait",
    unit: "px",
    format: [canvas.width, canvas.height],
  });
  pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
  pdf.save(buildReportFilename("pdf"));
});

overdueBanner.addEventListener("click", () => {
  overdueOnly = !overdueOnly;
  if (overdueOnly) {
    statusFilter = "";
    searchInput.value = "";
  }
  rerenderAll();
});
statusTabsContainer.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-status]");
  if (!btn) return;
  statusFilter = btn.dataset.status;
  renderStatusTabs();
  rerenderList();
});

document.querySelectorAll(".date-picker-trigger").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    const input = document.getElementById(btn.dataset.dateTarget);
    if (datePickerInput === input && !datePickerPopup.classList.contains("hidden")) {
      closeDatePicker();
    } else {
      openDatePicker(input);
    }
  });
});

dpDays.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-day]");
  if (!btn) return;
  selectDatePickerDay(Number(btn.dataset.day));
});

dpPrevBtn.addEventListener("click", () => {
  datePickerViewMonth -= 1;
  if (datePickerViewMonth < 0) {
    datePickerViewMonth = 11;
    datePickerViewYear -= 1;
  }
  renderDatePicker();
});

dpNextBtn.addEventListener("click", () => {
  datePickerViewMonth += 1;
  if (datePickerViewMonth > 11) {
    datePickerViewMonth = 0;
    datePickerViewYear += 1;
  }
  renderDatePicker();
});

dpTodayBtn.addEventListener("click", () => {
  const today = new Date();
  datePickerViewYear = today.getFullYear();
  datePickerViewMonth = today.getMonth();
  selectDatePickerDay(today.getDate());
});

dpClearBtn.addEventListener("click", () => {
  datePickerInput.value = "";
  closeDatePicker();
});

document.addEventListener("mousedown", (e) => {
  if (datePickerPopup.classList.contains("hidden")) return;
  if (datePickerPopup.contains(e.target)) return;
  if (e.target.closest(".date-picker-trigger")) return;
  closeDatePicker();
});

document.addEventListener("mousedown", (e) => {
  if (rowActionsMenu.classList.contains("hidden")) return;
  if (rowActionsMenu.contains(e.target)) return;
  if (e.target.closest(".actions-menu-trigger")) return;
  closeActionsMenu();
});

document.addEventListener("mousedown", (e) => {
  if (!activeSuggestionsEl) return;
  if (activeSuggestionsEl.contains(e.target)) return;
  if (e.target === form.team || e.target === form.closer || e.target === form.setter) return;
  closeSuggestions();
});

rowActionsMenu.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-menu-action]");
  if (!btn) return;
  const id = actionsMenuTargetId;
  closeActionsMenu();
  if (btn.dataset.menuAction === "edit") startEdit(id);
  if (btn.dataset.menuAction === "delete") deleteDeal(id);
});

modalContent.addEventListener("scroll", () => {
  if (!datePickerPopup.classList.contains("hidden")) closeDatePicker();
});

window.addEventListener("scroll", () => {
  if (!rowActionsMenu.classList.contains("hidden")) positionActionsMenu(actionsMenuTriggerEl);
}, true);

setupAutocomplete(form.team, teamSuggestionsEl, teamsStore);
setupAutocomplete(form.closer, closerSuggestionsEl, closersStore, (closer) => {
  const team = closerTeamMap[closer];
  if (team) form.team.value = team;
});
setupAutocomplete(form.setter, setterSuggestionsEl, settersStore);

closeDetailModalBtn.addEventListener("click", closeDetailModal);
detailModalBackdrop.addEventListener("click", closeDetailModal);
detailCommentSubmit.addEventListener("click", addComment);
detailCommentInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) addComment();
});

rerenderAll();

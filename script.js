(() => {
  const STORAGE_KEY = "fintrack_transactions_v1";
  const ROLE_STORAGE_KEY = "fintrack_role_v1";
  const THEME_STORAGE_KEY = "fintrack_theme_v1";

  const state = {
    transactions: [],
    filteredTransactions: [],
    role: "viewer",
    themeMode: "auto",
    searchQuery: "",
    typeFilter: "all",
    sortBy: "date_desc",
    editingId: null,
    charts: {
      line: null,
      pie: null
    },
    timers: {
      dateTime: null,
      autoTheme: null
    }
  };

  const el = {
    themeSwitcher: document.getElementById("themeSwitcher"),
    themeButtons: document.querySelectorAll("[data-theme-mode]"),
    dateTimeDisplay: document.getElementById("dateTimeDisplay"),
    heroNetWorth: document.getElementById("heroNetWorth"),
    totalBalance: document.getElementById("totalBalance"),
    totalIncome: document.getElementById("totalIncome"),
    totalExpenses: document.getElementById("totalExpenses"),
    transactionsBody: document.getElementById("transactionsBody"),
    emptyState: document.getElementById("emptyState"),
    actionsHeader: document.getElementById("actionsHeader"),
    searchInput: document.getElementById("searchInput"),
    typeFilter: document.getElementById("typeFilter"),
    sortBy: document.getElementById("sortBy"),
    addTransactionBtn: document.getElementById("addTransactionBtn"),
    accessModeBadge: document.getElementById("accessModeBadge"),
    modal: document.getElementById("transactionModal"),
    modalTitle: document.getElementById("modalTitle"),
    closeModalBtn: document.getElementById("closeModalBtn"),
    cancelBtn: document.getElementById("cancelBtn"),
    transactionForm: document.getElementById("transactionForm"),
    txDate: document.getElementById("txDate"),
    txAmount: document.getElementById("txAmount"),
    txCategory: document.getElementById("txCategory"),
    txType: document.getElementById("txType"),
    topCategory: document.getElementById("topCategory"),
    monthlyTrend: document.getElementById("monthlyTrend"),
    totalSavings: document.getElementById("totalSavings"),
    insightSavingsRate: document.getElementById("insightSavingsRate"),
    insightSavingsHint: document.getElementById("insightSavingsHint"),
    savingsRateFill: document.getElementById("savingsRateFill"),
    insightDailyPace: document.getElementById("insightDailyPace"),
    insightDailyHint: document.getElementById("insightDailyHint"),
    insightLargestExpense: document.getElementById("insightLargestExpense"),
    insightLargestHint: document.getElementById("insightLargestHint"),
    insightVelocity: document.getElementById("insightVelocity"),
    insightVelocityHint: document.getElementById("insightVelocityHint"),
    insightHealthLabel: document.getElementById("insightHealthLabel"),
    insightHealthHint: document.getElementById("insightHealthHint")
  };

  function formatCurrency(value) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);
  }

  function toISODate(value) {
    return new Date(value).toISOString().slice(0, 10);
  }

  function loadState() {
    const storedTransactions = localStorage.getItem(STORAGE_KEY);
    const storedRole = localStorage.getItem(ROLE_STORAGE_KEY);
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);

    state.transactions = storedTransactions
      ? JSON.parse(storedTransactions)
      : structuredClone(INITIAL_TRANSACTIONS);
    state.role = storedRole === "admin" ? "admin" : "viewer";
    state.themeMode = ["dark", "light", "auto"].includes(storedTheme) ? storedTheme : "auto";
  }

  function persistState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.transactions));
    localStorage.setItem(ROLE_STORAGE_KEY, state.role);
    localStorage.setItem(THEME_STORAGE_KEY, state.themeMode);
  }

  function getEffectiveTheme() {
    if (state.themeMode === "auto") {
      const currentHour = new Date().getHours();
      return currentHour >= 7 && currentHour < 19 ? "light" : "dark";
    }
    return state.themeMode;
  }

  function applyTheme() {
    const activeTheme = getEffectiveTheme();
    document.body.setAttribute("data-theme", activeTheme);
    el.themeButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.themeMode === state.themeMode);
    });
  }

  function updateDateTimeDisplay() {
    const now = new Date();
    el.dateTimeDisplay.textContent = now.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    });
  }

  function startDateTimeTicker() {
    if (state.timers.dateTime) clearInterval(state.timers.dateTime);
    updateDateTimeDisplay();
    state.timers.dateTime = setInterval(updateDateTimeDisplay, 1000);
  }

  function startAutoThemeTicker() {
    if (state.timers.autoTheme) clearInterval(state.timers.autoTheme);
    state.timers.autoTheme = setInterval(() => {
      if (state.themeMode === "auto") {
        const previousTheme = document.body.getAttribute("data-theme");
        applyTheme();
        const newTheme = document.body.getAttribute("data-theme");
        if (previousTheme !== newTheme) render();
      }
    }, 60000);
  }

  function computeTotals(list = state.transactions) {
    let income = 0;
    let expenses = 0;
    for (const tx of list) {
      const amt = Number(tx.amount) || 0;
      if (tx.type === "income") income += amt;
      if (tx.type === "expense") expenses += amt;
    }
    return { income, expenses, balance: income - expenses };
  }

  function daysInclusiveRange(minYmd, maxYmd) {
    const a = minYmd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const b = maxYmd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!a || !b) return 1;
    const d0 = new Date(Number(a[1]), Number(a[2]) - 1, Number(a[3]));
    const d1 = new Date(Number(b[1]), Number(b[2]) - 1, Number(b[3]));
    const diff = Math.round((d1 - d0) / 86400000);
    return Math.max(1, diff + 1);
  }

  function normalizeTxDate(dateStr) {
    if (!dateStr || typeof dateStr !== "string") return null;
    const trimmed = dateStr.trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const t = Date.parse(dateStr);
    if (Number.isNaN(t)) return null;
    const d = new Date(t);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  /**
   * Chronological running balance so the line matches transaction flow and
   * the last point equals Total Balance (income − expenses).
   */
  function getBalanceTrendSeries() {
    const txs = state.transactions
      .map((tx) => ({
        id: tx.id,
        type: tx.type,
        amount: Number(tx.amount) || 0,
        dateKey: normalizeTxDate(tx.date)
      }))
      .filter((tx) => tx.dateKey);

    if (!txs.length) {
      return { labels: ["—"], data: [0] };
    }

    txs.sort((a, b) => {
      const byDate = a.dateKey.localeCompare(b.dateKey);
      if (byDate !== 0) return byDate;
      return String(a.id ?? "").localeCompare(String(b.id ?? ""));
    });

    const DAILY_THRESHOLD = 45;
    if (txs.length > DAILY_THRESHOLD) {
      const netByDay = {};
      for (const tx of txs) {
        if (!netByDay[tx.dateKey]) netByDay[tx.dateKey] = 0;
        netByDay[tx.dateKey] += tx.type === "income" ? tx.amount : -tx.amount;
      }
      const days = Object.keys(netByDay).sort();
      let running = 0;
      const labels = [];
      const data = [];
      for (const day of days) {
        running += netByDay[day];
        const [y, m, d] = day.split("-");
        const dt = new Date(Number(y), Number(m) - 1, Number(d));
        labels.push(
          dt.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "2-digit" })
        );
        data.push(running);
      }
      return { labels, data };
    }

    let running = 0;
    const labels = [];
    const data = [];
    for (const tx of txs) {
      running += tx.type === "income" ? tx.amount : -tx.amount;
      const [y, m, d] = tx.dateKey.split("-");
      const dt = new Date(Number(y), Number(m) - 1, Number(d));
      labels.push(
        dt.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "2-digit" })
      );
      data.push(running);
    }
    return { labels, data };
  }

  function getExpenseBreakdown() {
    const expenses = state.transactions.filter((tx) => tx.type === "expense");
    const map = {};
    for (const tx of expenses) {
      map[tx.category] = (map[tx.category] || 0) + tx.amount;
    }
    return {
      labels: Object.keys(map),
      values: Object.values(map)
    };
  }

  function updateSummaryCards() {
    const totals = computeTotals();
    el.totalBalance.textContent = formatCurrency(totals.balance);
    el.totalIncome.textContent = formatCurrency(totals.income);
    el.totalExpenses.textContent = formatCurrency(totals.expenses);
    el.heroNetWorth.textContent = formatCurrency(totals.balance);
  }

  function applyFiltersAndSort() {
    const search = state.searchQuery.trim().toLowerCase();

    let list = state.transactions.filter((tx) => {
      const matchesType = state.typeFilter === "all" || tx.type === state.typeFilter;
      const matchesSearch =
        tx.category.toLowerCase().includes(search) || tx.amount.toString().includes(search);
      return matchesType && matchesSearch;
    });

    list = list.sort((a, b) => {
      if (state.sortBy === "date_desc") return new Date(b.date) - new Date(a.date);
      if (state.sortBy === "date_asc") return new Date(a.date) - new Date(b.date);
      if (state.sortBy === "amount_desc") return b.amount - a.amount;
      return a.amount - b.amount;
    });

    state.filteredTransactions = list;
  }

  function renderTable() {
    const canEdit = state.role === "admin";
    el.actionsHeader.style.display = canEdit ? "table-cell" : "none";
    el.transactionsBody.innerHTML = "";

    if (!state.filteredTransactions.length) {
      el.emptyState.classList.remove("hidden");
      return;
    }

    el.emptyState.classList.add("hidden");

    for (const tx of state.filteredTransactions) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${toISODate(tx.date)}</td>
        <td class="${tx.type === "income" ? "amount-income" : "amount-expense"}">${formatCurrency(tx.amount)}</td>
        <td>${tx.category}</td>
        <td><span class="badge ${tx.type === "income" ? "badge-income" : "badge-expense"}">${tx.type}</span></td>
        <td style="display:${canEdit ? "table-cell" : "none"}">
          <div class="action-row">
            <button class="btn btn-ghost btn-tiny edit-btn" data-id="${tx.id}">Edit</button>
            <button class="btn btn-danger btn-tiny delete-btn" data-id="${tx.id}">Delete</button>
          </div>
        </td>
      `;
      el.transactionsBody.appendChild(tr);
    }
  }

  function updateCharts() {
    const lineSeries = getBalanceTrendSeries();
    const pieData = getExpenseBreakdown();

    if (state.charts.line) state.charts.line.destroy();
    if (state.charts.pie) state.charts.pie.destroy();

    const computed = getComputedStyle(document.body);
    const colors = {
      primary: computed.getPropertyValue("--primary").trim(),
      subtext: computed.getPropertyValue("--subtext").trim(),
      border: computed.getPropertyValue("--border").trim(),
      card: computed.getPropertyValue("--card").trim()
    };

    state.charts.line = new Chart(document.getElementById("lineChart"), {
      type: "line",
      data: {
        labels: lineSeries.labels,
        datasets: [
          {
            label: "Running balance",
            data: lineSeries.data,
            borderColor: colors.primary,
            backgroundColor: "rgba(99, 102, 241, 0.15)",
            fill: true,
            tension: 0.38,
            pointRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: colors.subtext } }
        },
        scales: {
          x: { ticks: { color: colors.subtext }, grid: { color: "rgba(148,163,184,0.15)" } },
          y: { ticks: { color: colors.subtext }, grid: { color: "rgba(148,163,184,0.15)" } }
        }
      }
    });

    state.charts.pie = new Chart(document.getElementById("pieChart"), {
      type: "pie",
      data: {
        labels: pieData.labels,
        datasets: [
          {
            data: pieData.values,
            backgroundColor: ["#ef4444", "#f97316", "#eab308", "#14b8a6", "#6366f1", "#22c55e"],
            borderColor: colors.card,
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: colors.subtext, boxWidth: 12 }
          }
        }
      }
    });
  }

  function updateInsights() {
    const expenseMap = {};
    for (const tx of state.transactions) {
      if (tx.type === "expense") {
        const amt = Number(tx.amount) || 0;
        expenseMap[tx.category] = (expenseMap[tx.category] || 0) + amt;
      }
    }
    const topExpense = Object.entries(expenseMap).sort((a, b) => b[1] - a[1])[0];
    el.topCategory.textContent = topExpense
      ? `${topExpense[0]} (${formatCurrency(topExpense[1])})`
      : "No expense data";

    const currentMonth = new Date().toISOString().slice(0, 7);
    const previousDate = new Date();
    previousDate.setMonth(previousDate.getMonth() - 1);
    const prevMonth = previousDate.toISOString().slice(0, 7);

    const current = computeTotals(state.transactions.filter((tx) => tx.date.startsWith(currentMonth)));
    const previous = computeTotals(state.transactions.filter((tx) => tx.date.startsWith(prevMonth)));
    const trendValue = current.balance - previous.balance;
    const trendText = trendValue >= 0 ? `▲ Up ${formatCurrency(trendValue)}` : `▼ Down ${formatCurrency(Math.abs(trendValue))}`;
    el.monthlyTrend.textContent = trendText;
    el.monthlyTrend.style.color = trendValue >= 0 ? "#22c55e" : "#ef4444";

    const totals = computeTotals();
    el.totalSavings.textContent = formatCurrency(totals.balance);
    el.totalSavings.style.color = totals.balance >= 0 ? "#22c55e" : "#ef4444";

    const dated = state.transactions
      .map((tx) => ({
        type: tx.type,
        category: tx.category,
        amt: Number(tx.amount) || 0,
        d: normalizeTxDate(tx.date)
      }))
      .filter((row) => row.d);

    if (totals.income > 0) {
      const ratePct = Math.round(((totals.income - totals.expenses) / totals.income) * 100);
      el.insightSavingsRate.textContent = `${ratePct}%`;
      el.savingsRateFill.style.width = `${Math.min(100, Math.max(0, ratePct))}%`;
      el.insightSavingsHint.textContent =
        ratePct >= 0
          ? `${formatCurrency(totals.income - totals.expenses)} retained from ${formatCurrency(totals.income)} inflows`
          : "Spend is above income on this dataset — rate is negative.";
    } else {
      el.insightSavingsRate.textContent = "—";
      el.savingsRateFill.style.width = "0%";
      el.insightSavingsHint.textContent = "Log income to unlock your savings rate.";
    }

    if (dated.length && totals.expenses > 0) {
      const sortedKeys = dated.map((r) => r.d).sort();
      const spanDays = daysInclusiveRange(sortedKeys[0], sortedKeys[sortedKeys.length - 1]);
      const daily = totals.expenses / spanDays;
      el.insightDailyPace.textContent = formatCurrency(daily);
      el.insightDailyHint.textContent = `Averaged across ${spanDays} day${spanDays === 1 ? "" : "s"} from first to last entry`;
    } else {
      el.insightDailyPace.textContent = "—";
      el.insightDailyHint.textContent =
        totals.expenses > 0 ? "Add valid dates on expenses to measure daily pace." : "No expenses yet.";
    }

    const expenseRows = dated.filter((r) => r.type === "expense");
    if (expenseRows.length) {
      const peak = expenseRows.reduce((best, r) => (r.amt > best.amt ? r : best));
      el.insightLargestExpense.textContent = formatCurrency(peak.amt);
      el.insightLargestHint.textContent = `${peak.category} · ${peak.d}`;
    } else {
      el.insightLargestExpense.textContent = "—";
      el.insightLargestHint.textContent = "No expenses to highlight.";
    }

    if (dated.length) {
      const sortedKeys = dated.map((r) => r.d).sort();
      const spanDays = daysInclusiveRange(sortedKeys[0], sortedKeys[sortedKeys.length - 1]);
      const perWeek = (dated.length / spanDays) * 7;
      el.insightVelocity.textContent = `${perWeek.toFixed(1)} / week`;
      el.insightVelocityHint.textContent = `${dated.length} ledger movements in that window`;
    } else {
      el.insightVelocity.textContent = "—";
      el.insightVelocityHint.textContent = "Add transactions to see activity rhythm.";
    }

    el.insightHealthLabel.style.color = "";
    if (!state.transactions.length) {
      el.insightHealthLabel.textContent = "Waiting";
      el.insightHealthHint.textContent = "Import a few transactions to generate a health read.";
    } else if (totals.income === 0 && totals.expenses === 0) {
      el.insightHealthLabel.textContent = "Quiet";
      el.insightHealthHint.textContent = "No money in or out yet.";
    } else if (totals.balance < 0) {
      el.insightHealthLabel.textContent = "Tight";
      el.insightHealthLabel.style.color = "#ef4444";
      el.insightHealthHint.textContent = "Outflows beat inflows — revisit spend or lift income.";
    } else if (totals.income > 0) {
      const sr = ((totals.income - totals.expenses) / totals.income) * 100;
      if (sr >= 38) {
        el.insightHealthLabel.textContent = "Excellent";
        el.insightHealthLabel.style.color = "#22c55e";
        el.insightHealthHint.textContent = "You keep most of what you earn — room to invest or save more.";
      } else if (sr >= 20) {
        el.insightHealthLabel.textContent = "Healthy";
        el.insightHealthLabel.style.color = "#22c55e";
        el.insightHealthHint.textContent = "Solid cushion between earning and spending.";
      } else if (sr >= 8) {
        el.insightHealthLabel.textContent = "Balanced";
        el.insightHealthHint.textContent = "Positive, but small margin — watch discretionary categories.";
      } else if (sr >= 0) {
        el.insightHealthLabel.textContent = "Lean";
        el.insightHealthHint.textContent = "Barely positive — small shocks could tip cashflow.";
      } else {
        el.insightHealthLabel.textContent = "Deficit";
        el.insightHealthLabel.style.color = "#ef4444";
        el.insightHealthHint.textContent = "Spend exceeds income on this ledger snapshot.";
      }
    } else {
      el.insightHealthLabel.textContent = "Spend-only";
      el.insightHealthHint.textContent = "No income logged — add salary or transfers in.";
    }
  }

  function getRoleSegmentButtons() {
    return document.querySelectorAll("#roleSwitcher button[data-role]");
  }

  function syncRoleSegmentUI(role) {
    getRoleSegmentButtons().forEach((button) => {
      const r = button.getAttribute("data-role");
      const on = r === role;
      button.classList.toggle("active", on);
      button.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function setRole(role) {
    if (!["viewer", "admin"].includes(role)) return;
    state.role = role;
    const isAdmin = role === "admin";
    document.body.classList.toggle("viewer-mode", !isAdmin);
    document.body.setAttribute("data-access", isAdmin ? "admin" : "viewer");
    el.addTransactionBtn.disabled = !isAdmin;
    el.addTransactionBtn.title = isAdmin ? "Add a new transaction" : "Only admins can add transactions";
    syncRoleSegmentUI(role);
    if (el.accessModeBadge) {
      el.accessModeBadge.textContent = isAdmin
        ? "Full access — add & edit"
        : "View only — read access";
      el.accessModeBadge.className = `access-badge ${isAdmin ? "admin" : "viewer"}`;
    }
    persistState();
    render();
  }

  function setThemeMode(mode) {
    if (!["dark", "light", "auto"].includes(mode)) return;
    state.themeMode = mode;
    applyTheme();
    persistState();
    render();
  }

  function openModal(editingTransaction = null) {
    if (state.role !== "admin") return;
    state.editingId = editingTransaction ? editingTransaction.id : null;
    el.modalTitle.textContent = state.editingId ? "Edit Transaction" : "Add Transaction";
    el.transactionForm.reset();

    if (editingTransaction) {
      el.txDate.value = toISODate(editingTransaction.date);
      el.txAmount.value = editingTransaction.amount;
      el.txCategory.value = editingTransaction.category;
      el.txType.value = editingTransaction.type;
    } else {
      el.txDate.value = toISODate(new Date());
    }

    el.modal.showModal();
  }

  function closeModal() {
    el.modal.close();
    state.editingId = null;
  }

  function saveTransaction(event) {
    event.preventDefault();
    if (state.role !== "admin") return;
    const payload = {
      date: el.txDate.value,
      amount: Number(el.txAmount.value),
      category: el.txCategory.value.trim(),
      type: el.txType.value
    };

    if (!payload.date || !payload.amount || !payload.category || !payload.type) return;

    if (state.editingId) {
      state.transactions = state.transactions.map((tx) =>
        tx.id === state.editingId ? { ...tx, ...payload } : tx
      );
    } else {
      state.transactions.push({
        id: `tx_${Date.now()}`,
        ...payload
      });
    }

    persistState();
    closeModal();
    render();
  }

  function onTableAction(event) {
    if (state.role !== "admin") return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const id = target.dataset.id;
    if (!id) return;

    if (target.classList.contains("delete-btn")) {
      state.transactions = state.transactions.filter((tx) => tx.id !== id);
      persistState();
      render();
      return;
    }

    if (target.classList.contains("edit-btn")) {
      const tx = state.transactions.find((item) => item.id === id);
      if (tx) openModal(tx);
    }
  }

  function bindRoleControls() {
    getRoleSegmentButtons().forEach((button) => {
      button.addEventListener("click", () => {
        const role = button.getAttribute("data-role");
        if (role === "viewer" || role === "admin") setRole(role);
      });
    });
  }

  function bindEvents() {
    bindRoleControls();
    el.themeSwitcher.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const button = target.closest("[data-theme-mode]");
      if (!(button instanceof HTMLElement)) return;
      const mode = button.dataset.themeMode;
      if (!mode) return;
      setThemeMode(mode);
    });
    el.searchInput.addEventListener("input", (e) => {
      state.searchQuery = e.target.value;
      render();
    });
    el.typeFilter.addEventListener("change", (e) => {
      state.typeFilter = e.target.value;
      render();
    });
    el.sortBy.addEventListener("change", (e) => {
      state.sortBy = e.target.value;
      render();
    });
    el.addTransactionBtn.addEventListener("click", () => openModal());
    el.closeModalBtn.addEventListener("click", closeModal);
    el.cancelBtn.addEventListener("click", closeModal);
    el.transactionForm.addEventListener("submit", saveTransaction);
    el.transactionsBody.addEventListener("click", onTableAction);
    el.modal.addEventListener("click", (e) => {
      const rect = el.modal.getBoundingClientRect();
      const clickedInside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      if (!clickedInside) closeModal();
    });
  }

  function render() {
    applyFiltersAndSort();
    updateSummaryCards();
    renderTable();
    updateCharts();
    updateInsights();
  }

  function init() {
    loadState();
    applyTheme();
    startDateTimeTicker();
    startAutoThemeTicker();
    bindEvents();
    setRole(state.role);
    render();
  }

  init();
})();

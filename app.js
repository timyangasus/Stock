/* =====================================================================
   DATA LAYER
   ===================================================================== */

const STORAGE_KEY_RECORDS = 'inv_records';
const STORAGE_KEY_SETTINGS = 'inv_settings';

const DEFAULT_SETTINGS = {
  tsmcShares: 3076,
  etf0050Shares: 68591,
  tsmcAvgCost: 0,
  etf0050AvgCost: 0
};

function loadSettings() {
  try {
    const s = localStorage.getItem(STORAGE_KEY_SETTINGS);
    return s ? { ...DEFAULT_SETTINGS, ...JSON.parse(s) } : { ...DEFAULT_SETTINGS };
  } catch { return { ...DEFAULT_SETTINGS }; }
}

function saveSettings(s) {
  localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(s));
}

function loadRecords() {
  try {
    const r = localStorage.getItem(STORAGE_KEY_RECORDS);
    return r ? JSON.parse(r) : [];
  } catch { return []; }
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
}

// Compute totalMarketValue for a record（扣手續費 0.9965）
function calcMarketValue(rec) {
  const gross = (rec.tsmcShares * rec.tsmcPrice) + (rec.etf0050Shares * rec.etf0050Price);
  return Math.round(gross * 0.9965);
}

// Sort records ascending by date
function sortedRecords() {
  return [...loadRecords()].sort((a, b) => a.date.localeCompare(b.date));
}

/* =====================================================================
   DEMO DATA
   ===================================================================== */

function seedDemoData() {
  // 不塞假資料，讓使用者自行新增第一筆
}

/* =====================================================================
   UTILITIES
   ===================================================================== */

function fmtMoney(n, decimals = 0) {
  if (n == null || isNaN(n)) return '—';
  return (n >= 0 ? '' : '-') + '$' + Math.abs(n).toLocaleString('zh-TW', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function fmtProfit(n) {
  if (n == null || isNaN(n)) return '—';
  const sign = n > 0 ? '▲' : n < 0 ? '▼' : '－';
  return `<span style="font-size:0.75em;">${sign}</span> ${fmtMoney(Math.abs(n))}`;
}

function profitClass(n) {
  if (!n || n === 0) return 'neutral';
  return n > 0 ? 'positive' : 'negative';
}

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function fmtDateFull(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

function weekLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d);
  mon.setDate(diff);
  const sun = new Date(mon);
  sun.setDate(sun.getDate() + 6);
  return `${mon.getMonth() + 1}/${mon.getDate()} – ${sun.getMonth() + 1}/${sun.getDate()}`;
}

function monthLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

function yearLabel(dateStr) {
  return dateStr.slice(0, 4) + '年';
}

function weekKey(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d);
  mon.setDate(diff);
  const y = mon.getFullYear();
  const m = String(mon.getMonth() + 1).padStart(2, '0');
  const dd = String(mon.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function monthKey(dateStr) { return dateStr.slice(0, 7); }
function yearKey(dateStr) { return dateStr.slice(0, 4); }

/* =====================================================================
   PROFIT CALCULATIONS
   ===================================================================== */

function getFirstRecordOfPeriod(records, date, period) {
  const d = new Date(date + 'T00:00:00');
  let start;
  if (period === 'week') {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    start = new Date(d); start.setDate(diff);
  } else if (period === 'month') {
    start = new Date(d.getFullYear(), d.getMonth(), 1);
  } else if (period === 'year') {
    start = new Date(d.getFullYear(), 0, 1);
  }
  const startStr = `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,'0')}-${String(start.getDate()).padStart(2,'0')}`;
  const before = records.filter(r => r.date < startStr);
  return before.length > 0 ? before[before.length - 1] : null;
}

function calcProfits(records) {
  // records sorted ascending
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((rec, idx) => {
    const mv = rec.totalMarketValue;
    const prev = idx > 0 ? sorted[idx - 1] : null;
    const dailyProfit = prev ? mv - prev.totalMarketValue : 0;

    const weekStart = getFirstRecordOfPeriod(sorted, rec.date, 'week');
    const weeklyProfit = weekStart ? mv - weekStart.totalMarketValue : (prev ? mv - sorted[0].totalMarketValue : 0);

    const monthStart = getFirstRecordOfPeriod(sorted, rec.date, 'month');
    const monthlyProfit = monthStart ? mv - monthStart.totalMarketValue : (prev ? mv - sorted[0].totalMarketValue : 0);

    const yearStart = getFirstRecordOfPeriod(sorted, rec.date, 'year');
    const yearlyProfit = yearStart ? mv - yearStart.totalMarketValue : (prev ? mv - sorted[0].totalMarketValue : 0);

    return { ...rec, dailyProfit, weeklyProfit, monthlyProfit, yearlyProfit };
  });
}

/* =====================================================================
   TAB NAVIGATION
   ===================================================================== */

let currentTab = 'home';

function switchTab(tab) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
  document.getElementById('page-' + tab).classList.add('active');
  document.getElementById('tab-' + tab).classList.add('active');
  currentTab = tab;

  if (tab === 'home') renderHome();
  if (tab === 'history') renderHistory();
  if (tab === 'charts') renderCharts();
  if (tab === 'settings') renderSettings();
}

/* =====================================================================
   HOME PAGE
   ===================================================================== */

let homePeriod = 'today';

function setHomePeriod(period) {
  homePeriod = period;
  document.querySelectorAll('#home-seg .seg-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.period === period);
  });
  renderHome();
}

function renderHome() {
  const records = sortedRecords();
  const enriched = calcProfits(records);
  const today = todayStr();
  const latest = enriched.length > 0 ? enriched[enriched.length - 1] : null;
  const settings = loadSettings();

  // Date subtitle
  const dateEl = document.getElementById('home-date-sub');
  const now = new Date();
  dateEl.textContent = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;

  // Recorded badge
  const badgeEl = document.getElementById('home-recorded-badge');
  const todayRecorded = records.some(r => r.date === today);
  badgeEl.innerHTML = `<span class="status-badge ${todayRecorded ? 'recorded' : 'not-recorded'}">
    ${todayRecorded ? '✓ 今日已記錄' : '• 今日未記錄'}
  </span>`;

  // Empty state
  const hasData = enriched.length > 0;

  if (!hasData) {
    document.getElementById('home-total-value').textContent = '—';
    document.getElementById('home-profit-badge').innerHTML = '';
    ['today','week','month','year'].forEach(p => {
      const el = document.getElementById('val-' + p);
      el.textContent = '—';
      el.style.color = '';
    });
    document.getElementById('stock-tsmc').innerHTML = stockCardEmpty('台積電', '2330');
    document.getElementById('stock-0050').innerHTML = stockCardEmpty('元大台灣50', '0050');
    return;
  }

  // Get period profit
  // 今日未記錄：today 顯示空，週/月/年取最新一筆
  const todayRec = enriched.find(r => r.date === today);

  // Total value — 今日無資料時顯示上一筆（標註日期）
  if (!todayRec) {
    document.getElementById('home-total-value').textContent = fmtMoney(latest.totalMarketValue);
    document.getElementById('home-total-value').className = 'metric-value neutral';
    document.getElementById('home-profit-badge').innerHTML =
      `<div style="font-size:11px;color:var(--label-tertiary);margin-top:4px;">上次紀錄 ${fmtDateFull(latest.date)}</div>`;
  } else {
    document.getElementById('home-total-value').textContent = fmtMoney(todayRec.totalMarketValue);
    document.getElementById('home-total-value').className = 'metric-value neutral';
    const badgeClass = profitClass(todayRec.dailyProfit);
    document.getElementById('home-profit-badge').innerHTML =
      `<div class="profit-badge ${badgeClass}">${fmtProfit(todayRec.dailyProfit)}</div>`;
  }

  // 4 metric cards
  const refRec = todayRec || latest;
  const vals = {
    today: todayRec ? todayRec.dailyProfit : null,
    week: refRec.weeklyProfit,
    month: refRec.monthlyProfit,
    year: refRec.yearlyProfit
  };
  ['today','week','month','year'].forEach(p => {
    const el = document.getElementById('val-' + p);
    const v = vals[p];
    if (v == null) {
      el.innerHTML = '—';
      el.style.color = '';
    } else {
      el.innerHTML = fmtMoney(Math.abs(v));
      const cls = profitClass(v);
      el.style.color = cls === 'positive' ? 'var(--red)' : cls === 'negative' ? 'var(--green)' : 'var(--label-primary)';
    }
  });

  // Stock cards — 今日無資料時顯示空
  if (!todayRec) {
    document.getElementById('stock-tsmc').innerHTML = stockCardEmpty('台積電', '2330');
    document.getElementById('stock-0050').innerHTML = stockCardEmpty('元大台灣50', '0050');
    return;
  }

  // Stock cards — 顯示可輸入價格版本
  const prevRec = enriched.length > 1 ? enriched[enriched.length - 2] : null;
  const tsmcCostBasis = settings.tsmcAvgCost > 0 ? settings.tsmcAvgCost * todayRec.tsmcShares : null;
  const etfCostBasis = settings.etf0050AvgCost > 0 ? settings.etf0050AvgCost * todayRec.etf0050Shares : null;

  document.getElementById('stock-tsmc').innerHTML = buildEditableStockCard(
    'tsmc', '台積電', '2330', todayRec.tsmcPrice, todayRec.tsmcShares, prevRec ? prevRec.tsmcPrice : null, tsmcCostBasis
  );
  document.getElementById('stock-0050').innerHTML = buildEditableStockCard(
    'etf', '元大台灣50', '0050', todayRec.etf0050Price, todayRec.etf0050Shares, prevRec ? prevRec.etf0050Price : null, etfCostBasis
  );
}

function buildEditableStockCard(id, name, code, price, shares, prevPrice, costBasis) {
  const value = shares * price;
  const diff = prevPrice != null ? (price - prevPrice) * shares : 0;
  const priceDiff = prevPrice != null ? Math.round((price - prevPrice) * 100) / 100 : 0;
  const cls = profitClass(diff);
  const costUnrealized = costBasis != null ? value - costBasis : null;
  const returnRate = costBasis != null && costBasis > 0
    ? ((value - costBasis) / costBasis * 100).toFixed(2)
    : null;
  const returnRateCls = returnRate != null ? profitClass(parseFloat(returnRate)) : '';
  return `
    <div class="stock-header">
      <div>
        <div style="display:inline-block;background:#414141;color:#fff;font-size:15px;font-weight:600;letter-spacing:-0.224px;padding:5px 14px;border-radius:980px;margin-bottom:4px;">${name}</div>
        <div class="stock-code">${code}</div>
      </div>
      <div class="stock-price-area">
        <div style="display:flex;align-items:center;gap:8px;justify-content:flex-end;">
          <input
            id="price-input-${id}"
            type="number"
            inputmode="decimal"
            step="0.1"
            value="${price}"
            style="border:none;background:none;font-size:20px;font-weight:700;letter-spacing:-0.3px;color:var(--label-primary);font-family:var(--font-system);text-align:right;width:110px;outline:none;-webkit-appearance:none;"
            oninput="onPriceInput()"
          >
          <div id="daily-diff-${id}" style="font-size:20px;font-weight:700;letter-spacing:-0.3px;color:${priceDiff > 0 ? 'var(--red)' : priceDiff < 0 ? 'var(--green)' : 'var(--label-secondary)'};">${priceDiff !== 0 ? (priceDiff > 0 ? '+' : '') + priceDiff.toFixed(2) : '—'}</div>
        </div>
        <div class="profit-badge ${cls}" style="justify-content:flex-end;" id="diff-badge-${id}">${fmtProfit(diff)}</div>
      </div>
    </div>
    <div class="stock-shares-row">
      <div class="stock-stat">
        <div class="stock-stat-label">股數</div>
        <div class="stock-stat-value">${shares.toLocaleString()}</div>
      </div>
      <div class="stock-stat" style="text-align:center;">
        <div class="stock-stat-label">市值</div>
        <div class="stock-stat-value" id="value-display-${id}">${fmtMoney(value)}</div>
      </div>
      <div class="stock-stat" style="text-align:right;">
        <div class="stock-stat-label">報酬率</div>
        <div style="font-size:13px;font-weight:700;color:${returnRate != null ? (parseFloat(returnRate) >= 0 ? 'var(--red)' : 'var(--green)') : 'var(--label-tertiary)'};">${returnRate != null ? ((parseFloat(returnRate) >= 0 ? '+' : '') + returnRate + '%') : '—'}</div>
      </div>
    </div>
    ${costUnrealized != null ? `
    <div style="border-top:0.5px solid var(--separator);padding-top:10px;margin-top:4px;display:flex;justify-content:space-between;align-items:center;">
      <div style="font-size:11px;color:var(--label-tertiary);">未實現</div>
      <div class="stock-stat-value ${profitClass(costUnrealized)}" id="unrealized-${id}">${fmtProfit(costUnrealized)}</div>
    </div>` : ''}
  `;
}

function stockCardEmpty(name, code) {
  return `
    <div class="stock-header">
      <div>
        <div class="stock-name">${name}</div>
        <div class="stock-code">${code}</div>
      </div>
    </div>
    <div style="color:var(--label-tertiary);font-size:14px;padding-top:8px;">尚無資料</div>
  `;
}

function onPriceInput() {
  const records = sortedRecords();
  const enriched = calcProfits(records);
  if (enriched.length === 0) return;
  const latest = enriched[enriched.length - 1];
  const prevRec = enriched.length > 1 ? enriched[enriched.length - 2] : null;
  const settings = loadSettings();

  const tsmcInput = document.getElementById('price-input-tsmc');
  const etfInput = document.getElementById('price-input-etf');
  if (!tsmcInput || !etfInput) return;

  const tsmcPrice = parseFloat(tsmcInput.value) || latest.tsmcPrice;
  const etfPrice = parseFloat(etfInput.value) || latest.etf0050Price;
  const tsmcShares = latest.tsmcShares;
  const etfShares = latest.etf0050Shares;

  const tsmcValue = tsmcShares * tsmcPrice;
  const etfValue = etfShares * etfPrice;
  const totalMV = Math.round((tsmcValue + etfValue) * 0.9965);

  // Update market value displays
  const tvTsmc = document.getElementById('value-display-tsmc');
  const tvEtf = document.getElementById('value-display-etf');
  if (tvTsmc) tvTsmc.textContent = fmtMoney(tsmcValue);
  if (tvEtf) tvEtf.textContent = fmtMoney(etfValue);

  // Update diff badges
  if (prevRec) {
    const tsmcDiff = (tsmcPrice - prevRec.tsmcPrice) * tsmcShares;
    const etfDiff = (etfPrice - prevRec.etf0050Price) * etfShares;
    const tsmcBadge = document.getElementById('diff-badge-tsmc');
    const etfBadge = document.getElementById('diff-badge-etf');
    if (tsmcBadge) {
      tsmcBadge.innerHTML = fmtProfit(tsmcDiff);
      tsmcBadge.className = 'profit-badge ' + profitClass(tsmcDiff);
    }
    if (etfBadge) {
      etfBadge.innerHTML = fmtProfit(etfDiff);
      etfBadge.className = 'profit-badge ' + profitClass(etfDiff);
    }
    // Update daily diff in shares row (per-share points)
    const tsmcPriceDiff = Math.round((tsmcPrice - prevRec.tsmcPrice) * 100) / 100;
    const etfPriceDiff  = Math.round((etfPrice  - prevRec.etf0050Price) * 100) / 100;
    const tsmcDD = document.getElementById('daily-diff-tsmc');
    const etfDD  = document.getElementById('daily-diff-etf');
    if (tsmcDD) { tsmcDD.innerHTML = tsmcPriceDiff !== 0 ? (tsmcPriceDiff > 0 ? '+' : '') + tsmcPriceDiff.toFixed(2) : '—'; tsmcDD.style.color = tsmcPriceDiff > 0 ? 'var(--red)' : tsmcPriceDiff < 0 ? 'var(--green)' : 'var(--label-secondary)'; }
    if (etfDD)  { etfDD.innerHTML  = etfPriceDiff  !== 0 ? (etfPriceDiff  > 0 ? '+' : '') + etfPriceDiff.toFixed(2)  : '—'; etfDD.style.color  = etfPriceDiff  > 0 ? 'var(--red)' : etfPriceDiff  < 0 ? 'var(--green)' : 'var(--label-secondary)'; }
  }

  // Update unrealized if cost set
  const tsmcCostBasis = settings.tsmcAvgCost > 0 ? settings.tsmcAvgCost * tsmcShares : null;
  const etfCostBasis = settings.etf0050AvgCost > 0 ? settings.etf0050AvgCost * etfShares : null;
  if (tsmcCostBasis != null) {
    const el = document.getElementById('unrealized-tsmc');
    if (el) { const u = tsmcValue - tsmcCostBasis; el.innerHTML = fmtProfit(u); el.className = 'stock-stat-value ' + profitClass(u); }
  }
  if (etfCostBasis != null) {
    const el = document.getElementById('unrealized-etf');
    if (el) { const u = etfValue - etfCostBasis; el.innerHTML = fmtProfit(u); el.className = 'stock-stat-value ' + profitClass(u); }
  }

  // Update total market value
  document.getElementById('home-total-value').textContent = fmtMoney(totalMV);

  // Recalculate profit summary against saved records
  const today = todayStr();
  const todayRec = enriched.find(r => r.date === today) || latest;

  // 今日損益：與前日最後市值比
  const dailyBase = prevRec ? prevRec.totalMarketValue : totalMV;
  const dailyProfit = totalMV - dailyBase;

  // 本週、本月、本年：找各期間起始點
  const allRecs = enriched;
  function getPeriodBase(period) {
    const d = new Date(today + 'T00:00:00');
    let start;
    if (period === 'week') {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(d); start.setDate(diff);
    } else if (period === 'month') {
      start = new Date(d.getFullYear(), d.getMonth(), 1);
    } else if (period === 'year') {
      start = new Date(d.getFullYear(), 0, 1);
    }
    const startStr = `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,'0')}-${String(start.getDate()).padStart(2,'0')}`;
    const before = allRecs.filter(r => r.date < startStr);
    return before.length > 0 ? before[before.length - 1].totalMarketValue : allRecs[0].totalMarketValue;
  }

  const profits = {
    today: dailyProfit,
    week: totalMV - getPeriodBase('week'),
    month: totalMV - getPeriodBase('month'),
    year: totalMV - getPeriodBase('year')
  };

  ['today','week','month','year'].forEach(p => {
    const el = document.getElementById('val-' + p);
    if (!el) return;
    const v = profits[p];
    el.innerHTML = fmtMoney(Math.abs(v));
    const cls = profitClass(v);
    el.style.color = cls === 'positive' ? 'var(--red)' : cls === 'negative' ? 'var(--green)' : 'var(--label-primary)';
  });

  // Update profit badge on total
  const overallCls = profitClass(dailyProfit);
  document.getElementById('home-profit-badge').innerHTML =
    `<div class="profit-badge ${overallCls}">${fmtProfit(dailyProfit)}</div>`;

  // 自動儲存今日價格到紀錄
  let allRecords = loadRecords();
  const todayIdx = allRecords.findIndex(r => r.date === today);
  const updatedRecord = {
    id: today,
    date: today,
    tsmcShares: latest.tsmcShares,
    tsmcPrice,
    etf0050Shares: latest.etf0050Shares,
    etf0050Price: etfPrice,
    totalMarketValue: totalMV,
    note: todayIdx >= 0 ? (allRecords[todayIdx].note || '') : ''
  };
  if (todayIdx >= 0) {
    allRecords[todayIdx] = updatedRecord;
  } else {
    allRecords.push(updatedRecord);
  }
  saveRecords(allRecords);
}

/* =====================================================================
   HISTORY PAGE
   ===================================================================== */

let historyPeriod = 'week';

function setHistoryPeriod(period) {
  historyPeriod = period;
  document.querySelectorAll('#history-seg .seg-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.period === period);
  });
  renderHistory();
}

function renderHistory() {
  const records = sortedRecords().reverse(); // Newest first
  const enriched = calcProfits([...records].reverse()).reverse();
  const wrapper = document.getElementById('history-list-wrapper');

  if (enriched.length === 0) {
    wrapper.innerHTML = `<div class="empty-state">
      <div class="empty-icon">📋</div>
      <div class="empty-title">尚無紀錄</div>
      <div class="empty-subtitle">今天還沒有記錄<br>點首頁右上角「＋」新增今日資料</div>
    </div>`;
    return;
  }

  if (historyPeriod === 'day') {
    renderHistoryDay(enriched, wrapper);
  } else {
    renderHistoryGrouped(enriched, wrapper);
  }
}

function renderHistoryDay(enriched, wrapper) {
  let html = '<div class="list-group">';
  enriched.forEach((rec) => {
    const profitCls = profitClass(rec.dailyProfit);
    html += `
      <div class="list-row" onclick="showDetail('${rec.date}')">
        <div class="list-row-content">
          <div class="list-row-title" style="font-weight:700;font-size:19px;">${fmtDateFull(rec.date)}</div>
          <div class="list-row-subtitle">$${rec.tsmcPrice.toLocaleString()} · $${rec.etf0050Price.toLocaleString()}</div>
        </div>
        <div class="list-row-right">
          <div class="list-row-value">${fmtMoney(rec.totalMarketValue)}</div>
          <span class="profit-badge ${profitCls}" style="font-size:13px;">${fmtProfit(rec.dailyProfit)}</span>
        </div>
        <span class="list-row-chevron">›</span>
      </div>
    `;
  });
  html += '</div>';
  wrapper.innerHTML = html;
}

function renderHistoryGrouped(enriched, wrapper) {
  const groups = {};
  const getKey = historyPeriod === 'week' ? weekKey
    : historyPeriod === 'month' ? monthKey : yearKey;
  const getLabel = historyPeriod === 'week' ? weekLabel
    : historyPeriod === 'month' ? monthLabel : yearLabel;

  enriched.forEach(rec => {
    const k = getKey(rec.date);
    if (!groups[k]) groups[k] = { key: k, label: getLabel(rec.date), records: [] };
    groups[k].records.push(rec);
  });

  const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  let html = '';
  sortedKeys.forEach((k, idx) => {
    const g = groups[k];
    const latest = g.records[0];
    let periodProfit = 0;
    if (historyPeriod === 'week') periodProfit = g.records[0].weeklyProfit;
    else if (historyPeriod === 'month') periodProfit = g.records[0].monthlyProfit;
    else periodProfit = g.records[0].yearlyProfit;

    const cls = profitClass(periodProfit);
    const safeKey = k.replace(/[^a-zA-Z0-9]/g, '_');

    // 預設：第一個（最新）展開，其餘折起；使用者手動操作過以 sessionStorage 為準
    const storedStates = (() => { try { return JSON.parse(sessionStorage.getItem('groupStates') || '{}'); } catch(e) { return {}; } })();
    const defaultOpen = safeKey in storedStates ? storedStates[safeKey] : (idx === 0);

    html += `
    <div class="list-group" style="margin-bottom:16px;">
      <!-- 群組標題列（可收折） -->
      <div class="list-row" style="cursor:pointer;min-height:62px;" onclick="toggleGroup('${safeKey}')">
        <div class="list-row-content">
          <div style="display:inline-block;background:#414141;color:#fff;font-size:12px;font-weight:400;letter-spacing:-0.08px;padding:3px 10px;border-radius:980px;margin-bottom:4px;">${g.label}</div>
          <div style="font-size:12px;color:var(--label-tertiary);margin-top:1px;">${g.records.length} 筆紀錄</div>
        </div>
        <div class="list-row-right">
          <div style="font-size:17px;font-weight:700;letter-spacing:-0.374px;">${fmtMoney(latest.totalMarketValue)}</div>
          <span class="profit-badge ${cls}" style="font-size:13px;">${fmtProfit(periodProfit)}</span>
        </div>
        <span id="arrow-${safeKey}" style="margin-left:10px;font-size:22px;color:var(--label-secondary);transition:transform 0.2s;display:inline-block;flex-shrink:0;">▾</span>
      </div>
      <!-- 展開內容 -->
      <div id="group-${safeKey}" style="display:${defaultOpen ? '' : 'none'}">
    `;

    // 設定箭頭初始方向
    setTimeout(() => {
      const arrow = document.getElementById('arrow-' + safeKey);
      if (arrow) arrow.style.transform = defaultOpen ? 'rotate(0deg)' : 'rotate(-90deg)';
    }, 0);

    g.records.forEach(rec => {
      const dcls = profitClass(rec.dailyProfit);
      html += `
        <div class="list-row" onclick="showDetail('${rec.date}')" style="padding-left:20px;min-height:54px;border-top:0.5px solid var(--separator);">
          <div class="list-row-content">
            <div style="font-size:19px;font-weight:700;letter-spacing:-0.224px;">${fmtDateFull(rec.date)}</div>
            <div style="font-size:12px;color:var(--label-tertiary);margin-top:2px;">$${rec.tsmcPrice.toLocaleString()} · $${rec.etf0050Price.toLocaleString()}</div>
          </div>
          <div class="list-row-right">
            <span class="profit-badge ${dcls}" style="font-size:13px;">${fmtProfit(rec.dailyProfit)}</span>
          </div>
          <span class="list-row-chevron">›</span>
        </div>
      `;
    });

    html += `</div></div>`;
  });

  wrapper.innerHTML = html || '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">無資料</div></div>';
}

function toggleGroup(safeKey) {
  const content = document.getElementById('group-' + safeKey);
  const arrow   = document.getElementById('arrow-' + safeKey);
  if (!content) return;
  const isOpen = content.style.display !== 'none';
  content.style.display = isOpen ? 'none' : '';
  arrow.style.transform = isOpen ? 'rotate(-90deg)' : 'rotate(0deg)';
  // 記錄狀態
  try {
    const states = JSON.parse(sessionStorage.getItem('groupStates') || '{}');
    states[safeKey] = !isOpen; // true = open
    sessionStorage.setItem('groupStates', JSON.stringify(states));
  } catch(e) {}
}

function getGroupState(safeKey) {
  try {
    const states = JSON.parse(sessionStorage.getItem('groupStates') || '{}');
    return safeKey in states ? states[safeKey] : true; // 預設展開
  } catch(e) { return true; }
}

/* =====================================================================
   DETAIL SHEET
   ===================================================================== */

let currentDetailDate = null;

function showDetail(dateStr) {
  currentDetailDate = dateStr;
  const records = sortedRecords();
  const enriched = calcProfits(records);
  const rec = enriched.find(r => r.date === dateStr);
  if (!rec) return;

  // 找前一筆算漲跌
  const idx = enriched.findIndex(r => r.date === dateStr);
  const prev = idx > 0 ? enriched[idx - 1] : null;

  const tsmcDelta = prev ? Math.round((rec.tsmcPrice - prev.tsmcPrice) * 100) / 100 : 0;
  const etfDelta  = prev ? Math.round((rec.etf0050Price - prev.etf0050Price) * 100) / 100 : 0;
  const tsmcPct   = prev && prev.tsmcPrice > 0 ? (tsmcDelta / prev.tsmcPrice * 100).toFixed(2) : null;
  const etfPct    = prev && prev.etf0050Price > 0 ? (etfDelta / prev.etf0050Price * 100).toFixed(2) : null;

  function stockColor(n) {
    return n > 0 ? 'var(--red)' : n < 0 ? 'var(--green)' : 'var(--label-secondary)';
  }

  function fmtDelta(n) {
    if (n === 0) return '－';
    return (n > 0 ? '▲ +' : '▼ ') + Math.abs(n).toLocaleString('zh-TW', {minimumFractionDigits:2, maximumFractionDigits:2});
  }

  function colorVal(n) {
    const cls = profitClass(n);
    const color = cls === 'positive' ? 'var(--red)' : cls === 'negative' ? 'var(--green)' : 'var(--label-primary)';
    return `<span style="color:${color};font-weight:600;">${fmtProfit(n)}</span>`;
  }

  function stockCard(name, code, price, delta, pct) {
    const col = stockColor(delta);
    const borderCol = delta > 0 ? 'var(--red)' : delta < 0 ? 'var(--green)' : '#8e8e93';
    const bgGrad = delta > 0
      ? 'linear-gradient(145deg, #fff5f5 0%, #ffe8e8 100%)'
      : delta < 0
      ? 'linear-gradient(145deg, #f0fdf4 0%, #dcfce7 100%)'
      : 'var(--bg-secondary)';
    return `
    <div style="background:${bgGrad};border-radius:var(--radius-card);padding:14px;border:1px solid ${borderCol};box-shadow:var(--shadow-card);">
      <div style="display:inline-block;background:${borderCol};color:#fff;font-size:13px;font-weight:600;letter-spacing:-0.12px;padding:3px 10px;border-radius:980px;margin-bottom:8px;">${name}</div>
      <div style="font-size:11px;color:#414141;font-weight:600;margin-bottom:10px;">${code}</div>
      <div style="text-align:left;">
        <div style="font-size:20px;font-weight:700;letter-spacing:-0.374px;">$ ${(Math.round(price * 100) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</div>
        <div style="font-size:20px;font-weight:700;letter-spacing:-0.374px;color:${col};margin-top:8px;">
          ${fmtDelta(delta)}
        </div>
        ${pct !== null ? `<div style="font-size:12px;font-weight:600;color:${col};margin-top:2px;">${parseFloat(pct) > 0 ? '+' : ''}${pct}%</div>` : ''}
      </div>
    </div>`;
  }

  let html = '';

  // 日期 + 備註（無框線）
  html += `<div style="padding:0 16px 16px;">
    <div style="font-size:22px;font-weight:700;letter-spacing:-0.374px;">${fmtDateFull(rec.date)}</div>
    ${rec.note ? `<div style="font-size:14px;color:var(--label-secondary);margin-top:6px;letter-spacing:-0.224px;">${rec.note}</div>` : ''}
  </div>`;

  // 個股 — 左右並排
  html += `<div style="padding:0 16px;margin-bottom:20px;">
    <div style="font-size:12px;color:var(--label-tertiary);letter-spacing:0.3px;text-transform:uppercase;margin-bottom:8px;">個股</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      ${stockCard('台積電', '2330', rec.tsmcPrice, tsmcDelta, tsmcPct)}
      ${stockCard('元大台灣50', '0050', rec.etf0050Price, etfDelta, etfPct)}
    </div>
  </div>`;

  // 總市值 — 獨立卡片
  html += `<div style="padding:0 16px;margin-bottom:20px;">
    <div style="font-size:12px;color:var(--label-tertiary);letter-spacing:0.3px;text-transform:uppercase;margin-bottom:8px;">總市值</div>
    <div class="card card-padding">
      <div style="font-size:20px;font-weight:700;letter-spacing:-0.374px;">$ ${fmtMoney(rec.totalMarketValue).replace('$','').trim()}</div>
    </div>
  </div>`;

  // 損益 — 獨立卡片
  html += `<div style="padding:0 16px;margin-bottom:48px;">
    <div style="font-size:12px;color:var(--label-tertiary);letter-spacing:0.3px;text-transform:uppercase;margin-bottom:8px;">損益</div>
    <div class="card">
      <div class="detail-item">
        <span class="detail-item-label">當日損益</span>
        <span class="detail-item-value">${colorVal(rec.dailyProfit)}</span>
      </div>
      <div class="detail-item" style="border-bottom:none;">
        <span class="detail-item-label">今年損益</span>
        <span class="detail-item-value">${colorVal(rec.yearlyProfit)}</span>
      </div>
    </div>
  </div>`;

  // 刪除 — 橘色線框膠囊文字按鈕
  html += `<div style="padding:0 16px 24px;display:flex;justify-content:center;">
    <button onclick="confirmDelete('${rec.date}')" style="
      padding:8px 24px;border-radius:980px;
      border:1px solid rgba(255,59,48,0.4);background:#ffffff;
      color:var(--red);font-size:14px;font-weight:600;
      font-family:var(--font-system);letter-spacing:-0.12px;
      cursor:pointer;transition:opacity 0.15s;
    " onmousedown="this.style.opacity=0.6" onmouseup="this.style.opacity=1" ontouchstart="this.style.opacity=0.6" ontouchend="this.style.opacity=1">
      刪除
    </button>
  </div>`;

  document.getElementById('detail-body').innerHTML = html;
  openModal('detail-modal');
}

function editFromDetail() {
  closeDetailModal();
  setTimeout(() => openAddModal(currentDetailDate), 350);
}

function closeDetailModal() {
  closeModal('detail-modal');
}

/* =====================================================================
   ADD / EDIT MODAL
   ===================================================================== */

let editingDate = null;

function openAddModal(editDate = null) {
  editingDate = editDate;
  const settings = loadSettings();
  const records = sortedRecords();
  const isEdit = !!editDate;
  const existing = isEdit ? records.find(r => r.date === editDate) : null;
  const today = todayStr();

  document.getElementById('modal-title').textContent = isEdit ? '編輯紀錄' : '新增紀錄';

  // 昨日資料
  const prevRecords = isEdit
    ? records.filter(r => r.date < editDate)
    : records.filter(r => r.date < today);
  const prev = prevRecords.length > 0 ? prevRecords[prevRecords.length - 1] : null;

  const prevTsmcPrice = prev ? prev.tsmcPrice : null;
  const prevEtfPrice  = prev ? prev.etf0050Price : null;
  const tsmcShares    = isEdit ? existing.tsmcShares : settings.tsmcShares;
  const etfShares     = isEdit ? existing.etf0050Shares : settings.etf0050Shares;

  // 若編輯：顯示已存的漲跌（四捨五入到小數2位）
  const editTsmcDeltaRaw = isEdit && prevTsmcPrice ? Math.round((existing.tsmcPrice - prevTsmcPrice) * 100) / 100 : '';
  const editEtfDeltaRaw  = isEdit && prevEtfPrice  ? Math.round((existing.etf0050Price - prevEtfPrice) * 100) / 100 : '';
  const editTsmcDelta = editTsmcDeltaRaw;
  const editEtfDelta  = editEtfDeltaRaw;
  const defaultNote   = isEdit ? (existing.note || '') : '';
  const defaultDate   = isEdit ? existing.date : today;

  const prevTsmcDisp = prevTsmcPrice != null ? `$${prevTsmcPrice.toLocaleString('zh-TW',{minimumFractionDigits:1,maximumFractionDigits:2})}` : '—';
  const prevEtfDisp  = prevEtfPrice  != null ? `$${prevEtfPrice.toLocaleString('zh-TW',{minimumFractionDigits:2,maximumFractionDigits:2})}` : '—';

  // 漲跌初始正負
  const tsmcSign = editTsmcDelta !== '' ? (parseFloat(editTsmcDelta) >= 0 ? 1 : -1) : 1;
  const etfSign  = editEtfDelta  !== '' ? (parseFloat(editEtfDelta)  >= 0 ? 1 : -1) : 1;
  const tsmcAbs  = editTsmcDelta !== '' ? Math.abs(parseFloat(editTsmcDelta)) : '';
  const etfAbs   = editEtfDelta  !== '' ? Math.abs(parseFloat(editEtfDelta))  : '';

  const html = `
    <div class="form-section-header">日期</div>
    <div class="form-group" style="margin:0 16px;">
      <div class="form-row">
        <span class="form-label">日期</span>
        <input class="form-input" type="date" id="f-date" value="${defaultDate}" max="${today}">
      </div>
    </div>

    <div class="form-section-header">台積電 (2330)　股數 ${tsmcShares.toLocaleString()}</div>
    <div class="form-group" style="margin:0 16px;">
      <div class="form-row">
        <span class="form-label" style="color:var(--label-tertiary);">昨日收盤</span>
        <span class="form-input" style="color:var(--label-tertiary);">${prevTsmcDisp}</span>
      </div>
      <div class="form-row" style="gap:8px;">
        <span class="form-label">漲跌</span>
        <div style="display:flex;align-items:center;gap:6px;flex:1;justify-content:flex-end;">
          <button id="tsmc-sign-btn" onclick="toggleSign('tsmc')" style="
            min-width:40px;height:32px;border-radius:8px;border:none;cursor:pointer;
            font-size:17px;font-weight:700;font-family:var(--font-system);
            background:${tsmcSign === 1 ? 'rgba(255,59,48,0.12)' : 'rgba(52,199,89,0.12)'};
            color:${tsmcSign === 1 ? 'var(--red)' : 'var(--green)'};
            transition:all 0.15s;
          ">${tsmcSign === 1 ? '＋' : '－'}</button>
          <input class="form-input" type="number" id="f-tsmc-delta" value="${tsmcAbs}" placeholder="0" inputmode="decimal" step="0.1" oninput="updateModalPreview()" style="text-align:right;max-width:80px;">
        </div>
      </div>
      <div class="form-row">
        <span class="form-label" style="color:var(--label-tertiary);">今日成交</span>
        <span id="f-tsmc-today-display" style="font-size:17px;font-weight:700;color:var(--label-primary);text-align:right;flex:1;">—</span>
      </div>
    </div>

    <div class="form-section-header">元大台灣50 (0050)　股數 ${etfShares.toLocaleString()}</div>
    <div class="form-group" style="margin:0 16px;">
      <div class="form-row">
        <span class="form-label" style="color:var(--label-tertiary);">昨日收盤</span>
        <span class="form-input" style="color:var(--label-tertiary);">${prevEtfDisp}</span>
      </div>
      <div class="form-row" style="gap:8px;">
        <span class="form-label">漲跌</span>
        <div style="display:flex;align-items:center;gap:6px;flex:1;justify-content:flex-end;">
          <button id="etf-sign-btn" onclick="toggleSign('etf')" style="
            min-width:40px;height:32px;border-radius:8px;border:none;cursor:pointer;
            font-size:17px;font-weight:700;font-family:var(--font-system);
            background:${etfSign === 1 ? 'rgba(255,59,48,0.12)' : 'rgba(52,199,89,0.12)'};
            color:${etfSign === 1 ? 'var(--red)' : 'var(--green)'};
            transition:all 0.15s;
          ">${etfSign === 1 ? '＋' : '－'}</button>
          <input class="form-input" type="number" id="f-etf-delta" value="${etfAbs}" placeholder="0" inputmode="decimal" step="0.01" oninput="updateModalPreview()" style="text-align:right;max-width:80px;">
        </div>
      </div>
      <div class="form-row">
        <span class="form-label" style="color:var(--label-tertiary);">今日成交</span>
        <span id="f-etf-today-display" style="font-size:17px;font-weight:700;color:var(--label-primary);text-align:right;flex:1;">—</span>
      </div>
    </div>

    <div class="form-section-header">備註</div>
    <div class="form-group" style="margin:0 16px;">
      <textarea class="form-input-full" id="f-note" placeholder="選填">${defaultNote}</textarea>
    </div>

    <div style="margin:16px 0 8px;">
      <div class="live-preview" id="live-preview">
        <div class="live-preview-title">即時試算</div>
        <div class="live-preview-row">
          <span class="live-preview-label">今日總市值</span>
          <span class="live-preview-value" id="lp-total">—</span>
        </div>
        <div class="live-preview-row">
          <span class="live-preview-label">今日損益</span>
          <span class="live-preview-value" id="lp-diff">—</span>
        </div>
      </div>
    </div>
    <div style="height:24px;"></div>
  `;

  document.getElementById('modal-body').innerHTML = html;
  // Store prev prices for JS access
  document.getElementById('modal-body').dataset.prevTsmc = prevTsmcPrice || '';
  document.getElementById('modal-body').dataset.prevEtf  = prevEtfPrice  || '';
  document.getElementById('modal-body').dataset.tsmcShares = tsmcShares;
  document.getElementById('modal-body').dataset.etfShares  = etfShares;
  openModal('add-modal');
  if (isEdit) updateModalPreview();
}

function toggleSign(id) {
  const btn = document.getElementById(id + '-sign-btn');
  const isPositive = btn.textContent.trim() === '＋';
  btn.textContent = isPositive ? '－' : '＋';
  btn.style.background = isPositive ? 'rgba(52,199,89,0.12)' : 'rgba(255,59,48,0.12)';
  btn.style.color = isPositive ? 'var(--green)' : 'var(--red)';
  updateModalPreview();
}

function getSignedDelta(id) {
  const btn = document.getElementById(id + '-sign-btn');
  const sign = (btn && btn.textContent.trim() === '＋') ? 1 : -1;
  const abs = parseFloat(document.getElementById('f-' + id + '-delta').value) || 0;
  return sign * abs;
}

function updateModalPreview() {
  const body = document.getElementById('modal-body');
  const prevTsmc   = parseFloat(body.dataset.prevTsmc) || 0;
  const prevEtf    = parseFloat(body.dataset.prevEtf)  || 0;
  const tsmcShares = parseFloat(body.dataset.tsmcShares) || 0;
  const etfShares  = parseFloat(body.dataset.etfShares)  || 0;

  const tsmcDelta = getSignedDelta('tsmc');
  const etfDelta  = getSignedDelta('etf');

  const tsmcPrice = Math.round((prevTsmc ? prevTsmc + tsmcDelta : tsmcDelta) * 100) / 100;
  const etfPrice  = Math.round((prevEtf  ? prevEtf  + etfDelta  : etfDelta)  * 100) / 100;
  const tsmcDisp = document.getElementById('f-tsmc-today-display');
  const etfDisp  = document.getElementById('f-etf-today-display');
  tsmcDisp.textContent = tsmcPrice > 0 ? `$${tsmcPrice.toLocaleString('zh-TW',{minimumFractionDigits:1,maximumFractionDigits:2})}` : '—';
  etfDisp.textContent  = etfPrice  > 0 ? `$${etfPrice.toLocaleString('zh-TW',{minimumFractionDigits:2,maximumFractionDigits:2})}` : '—';

  // Live preview
  if (tsmcPrice <= 0 && etfPrice <= 0) {
    document.getElementById('lp-total').textContent = '—';
    document.getElementById('lp-diff').textContent  = '—';
    return;
  }
  const total = (tsmcShares * tsmcPrice) + (etfShares * etfPrice);
  document.getElementById('lp-total').textContent = fmtMoney(total);

  const prevTotal = (tsmcShares * prevTsmc) + (etfShares * prevEtf);
  if (prevTotal > 0) {
    const diff = total - prevTotal;
    const el = document.getElementById('lp-diff');
    el.innerHTML = fmtProfit(diff);
    el.className = 'live-preview-value ' + profitClass(diff);
  }
}

function saveRecord() {
  const date       = document.getElementById('f-date').value;
  const body       = document.getElementById('modal-body');
  const prevTsmc   = parseFloat(body.dataset.prevTsmc) || 0;
  const prevEtf    = parseFloat(body.dataset.prevEtf)  || 0;
  const tsmcShares = parseInt(body.dataset.tsmcShares) || 0;
  const etfShares  = parseInt(body.dataset.etfShares)  || 0;
  const tsmcDelta  = getSignedDelta('tsmc');
  const etfDelta   = getSignedDelta('etf');
  const note       = document.getElementById('f-note').value.trim();

  if (!date) { showToast('請選擇日期'); return; }
  if (tsmcDelta === 0 && etfDelta === 0 && !prevTsmc && !prevEtf) { showToast('請輸入漲跌值'); return; }

  const tsmcPrice = Math.round((prevTsmc ? prevTsmc + tsmcDelta : tsmcDelta) * 100) / 100;
  const etfPrice  = Math.round((prevEtf  ? prevEtf  + etfDelta  : etfDelta)  * 100) / 100;

  if (tsmcPrice <= 0 || etfPrice <= 0) { showToast('計算後價格不合理，請確認漲跌值'); return; }
  if (tsmcShares <= 0 || etfShares <= 0) { showToast('股數設定有誤，請至設定頁確認'); return; }

  const totalMarketValue = (tsmcShares * tsmcPrice) + (etfShares * etfPrice);
  const record = {
    id: date,
    date,
    tsmcShares,
    tsmcPrice,
    etf0050Shares: etfShares,
    etf0050Price: etfPrice,
    totalMarketValue,
    note
  };

  let records = loadRecords();
  const existing = records.findIndex(r => r.date === date);
  if (existing >= 0) {
    records[existing] = record;
  } else {
    records.push(record);
  }
  saveRecords(records);
  closeAddModal();
  showToast(editingDate ? '紀錄已更新 ✓' : '紀錄已儲存 ✓');
  haptic('medium');

  // Refresh current tab
  setTimeout(() => {
    if (currentTab === 'history') renderHistory();
    renderHome();
  }, 100);
}

function closeAddModal() {
  closeModal('add-modal');
  editingDate = null;
}

/* =====================================================================
   DELETE
   ===================================================================== */

let pendingDeleteDate = null;
let confirmCallback = null;

function confirmDelete(dateStr) {
  pendingDeleteDate = dateStr;
  document.getElementById('confirm-title').textContent = '確認刪除';
  document.getElementById('confirm-msg').textContent = `確定要刪除 ${fmtDateFull(dateStr)} 的紀錄嗎？此操作無法復原。`;
  document.getElementById('confirm-ok-btn').textContent = '刪除';
  document.getElementById('confirm-ok-btn').className = 'confirm-btn destructive';
  confirmCallback = () => {
    let records = loadRecords();
    records = records.filter(r => r.date !== pendingDeleteDate);
    saveRecords(records);
    closeModal('detail-modal');
    showToast('紀錄已刪除');
    haptic('heavy');
    setTimeout(() => {
      renderHome();
      if (currentTab === 'history') renderHistory();
      if (currentTab === 'charts') renderCharts();
    }, 100);
  };
  openConfirm();
}

function openConfirm() {
  document.getElementById('confirm-overlay').classList.add('open');
}

function confirmCancel() {
  document.getElementById('confirm-overlay').classList.remove('open');
  confirmCallback = null;
}

function confirmOk() {
  document.getElementById('confirm-overlay').classList.remove('open');
  if (confirmCallback) { confirmCallback(); confirmCallback = null; }
}

function openAddOrEdit() {
  const today = todayStr();
  const records = loadRecords();
  const todayRecord = records.find(r => r.date === today);
  openAddModal(todayRecord ? today : null);
}

/* Swipe-to-delete */
let _swipeStartX = 0;
let _swipeActive = null;

function swipeStart(e, date) {
  _swipeStartX = e.touches[0].clientX;
  _swipeActive = date;
}

function swipeMove(e, date) {
  const dx = e.touches[0].clientX - _swipeStartX;
  const el = document.getElementById('inner-' + date);
  if (!el) return;
  if (dx < 0) {
    const clamped = Math.max(dx, -80);
    el.style.transform = `translateX(${clamped}px)`;
    el.style.transition = 'none';
  } else if (el.classList.contains('swiped')) {
    const clamped = Math.min(dx - 80, 0);
    el.style.transform = `translateX(${clamped}px)`;
    el.style.transition = 'none';
  }
}

function swipeEnd(e, date) {
  const dx = e.changedTouches[0].clientX - _swipeStartX;
  const el = document.getElementById('inner-' + date);
  if (!el) return;
  el.style.transition = '';
  if (dx < -40) {
    el.style.transform = 'translateX(-80px)';
    el.classList.add('swiped');
    // Close other open rows
    document.querySelectorAll('.swipe-row-inner.swiped').forEach(other => {
      if (other.id !== 'inner-' + date) {
        other.style.transform = '';
        other.classList.remove('swiped');
      }
    });
  } else if (dx > 20) {
    el.style.transform = '';
    el.classList.remove('swiped');
  } else {
    // Snap back if not enough swipe
    el.style.transform = el.classList.contains('swiped') ? 'translateX(-80px)' : '';
  }
  _swipeActive = null;
}

function clearTodayRecord() {
  const today = todayStr();
  const records = loadRecords();
  const hasTodayRecord = records.some(r => r.date === today);
  if (!hasTodayRecord) {
    showToast('今日尚無資料');
    return;
  }
  confirmCallback = () => {
    const updated = records.filter(r => r.date !== today);
    saveRecords(updated);
    renderHome();
    showToast('今日資料已清除');
    haptic('heavy');
  };
  document.getElementById('confirm-title').textContent = '清除今日資料';
  document.getElementById('confirm-msg').textContent = `確定要清除 ${todayStr()} 的紀錄嗎？`;
  document.getElementById('confirm-ok-btn').textContent = '清除';
  document.getElementById('confirm-ok-btn').className = 'confirm-btn destructive';
  openConfirm();
}

/* =====================================================================
   CHARTS PAGE
   ===================================================================== */

let chartRange = 7;

function setChartRange(range) {
  chartRange = range;
  document.querySelectorAll('#chart-range-seg .seg-btn').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.range) === range);
  });
  renderCharts();
}

function renderCharts() {
  const records = sortedRecords();
  const enriched = calcProfits(records);

  const chartsEmpty = document.getElementById('charts-empty');
  if (enriched.length < 2) {
    chartsEmpty.style.display = 'block';
    return;
  }
  chartsEmpty.style.display = 'none';

  let data = enriched;
  if (chartRange > 0) {
    data = enriched.slice(-chartRange);
  }

  const baseVal = enriched[0].totalMarketValue;
  const profitData = data.map(r => r.totalMarketValue - baseVal);
  const valueData = data.map(r => r.totalMarketValue);

  // Value chart
  renderLineChart('chart-value-main', data, r => r.totalMarketValue, '#0071e3', true);
  const vals = valueData;
  const maxV = Math.max(...vals), minV = Math.min(...vals), curV = vals[vals.length - 1];
  document.getElementById('chart-value-stats').innerHTML = buildChartStats([
    ['目前值', fmtMoney(curV), 'neutral'],
    ['區間最高', fmtMoney(maxV), 'positive'],
    ['區間最低', fmtMoney(minV), 'negative'],
    ['區間變化', fmtProfit(curV - vals[0]), profitClass(curV - vals[0])]
  ]);

  // Profit chart — Claude 橘色
  renderLineChart('chart-profit-main', data, r => r.totalMarketValue - baseVal, '#FE9E9E', true);
  const profs = profitData;
  const maxP = Math.max(...profs), minP = Math.min(...profs), curP = profs[profs.length - 1];
  document.getElementById('chart-profit-stats').innerHTML = buildChartStats([
    ['目前累積', fmtProfit(curP), profitClass(curP)],
    ['區間最高', fmtProfit(maxP), profitClass(maxP)],
    ['區間最低', fmtProfit(minP), profitClass(minP)],
    ['區間變化', fmtProfit(curP - profs[0]), profitClass(curP - profs[0])]
  ]);
}

function buildChartStats(items) {
  return items.map(([label, value, cls]) => `
    <div class="chart-stat">
      <div class="chart-stat-label">${label}</div>
      <div class="chart-stat-value ${cls}">${value}</div>
    </div>
  `).join('');
}

/* =====================================================================
   LINE CHART (Vanilla Canvas)
   ===================================================================== */

function renderLineChart(canvasId, records, valueGetter, color, showLabels = false) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const W = rect.width || 300;
  const H = rect.height || 140;

  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  if (!records || records.length < 2) {
    ctx.fillStyle = '#8e8e93';
    ctx.font = '13px -apple-system';
    ctx.textAlign = 'center';
    ctx.fillText('資料不足', W / 2, H / 2);
    return;
  }

  const values = records.map(valueGetter);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const padL = 8;
  const padR = 8;
  const padT = 12;
  const padB = showLabels ? 22 : 16;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const xStep = chartW / (values.length - 1);

  const getX = i => padL + i * xStep;
  const getY = v => padT + chartH - ((v - minVal) / range) * chartH;

  // Gradient fill
  const grad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
  grad.addColorStop(0, color + '33');
  grad.addColorStop(1, color + '00');

  ctx.beginPath();
  ctx.moveTo(getX(0), getY(values[0]));
  for (let i = 1; i < values.length; i++) {
    // Smooth curve
    const x0 = getX(i - 1), y0 = getY(values[i - 1]);
    const x1 = getX(i), y1 = getY(values[i]);
    const cpx = (x0 + x1) / 2;
    ctx.bezierCurveTo(cpx, y0, cpx, y1, x1, y1);
  }
  ctx.lineTo(getX(values.length - 1), padT + chartH);
  ctx.lineTo(getX(0), padT + chartH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(getX(0), getY(values[0]));
  for (let i = 1; i < values.length; i++) {
    const x0 = getX(i - 1), y0 = getY(values[i - 1]);
    const x1 = getX(i), y1 = getY(values[i]);
    const cpx = (x0 + x1) / 2;
    ctx.bezierCurveTo(cpx, y0, cpx, y1, x1, y1);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Last point dot
  const lastX = getX(values.length - 1);
  const lastY = getY(values[values.length - 1]);
  ctx.beginPath();
  ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(lastX, lastY, 2, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();

  // X labels
  if (showLabels && records.length > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.36)';
    ctx.font = `9px -apple-system`;
    const labelY = H - 4;

    // First label — left-align to avoid left clip
    ctx.textAlign = 'left';
    ctx.fillText(fmtDate(records[0].date), padL, labelY);

    // Last label — right-align to avoid right clip
    ctx.textAlign = 'right';
    ctx.fillText(fmtDate(records[records.length - 1].date), W - padR, labelY);

    // Middle labels centered
    if (records.length > 2) {
      ctx.textAlign = 'center';
      const step = Math.ceil(records.length / 4);
      for (let i = step; i < records.length - 1; i += step) {
        ctx.fillText(fmtDate(records[i].date), getX(i), labelY);
      }
    }
  }
}

/* =====================================================================
   SETTINGS PAGE
   ===================================================================== */

function renderSettings() {
  const s = loadSettings();
  const html = `
    <div style="padding-top:4px;"></div>

    <!-- 台積電卡片 -->
    <div class="form-section-header">台積電</div>
    <div class="form-group" style="margin:0 16px;">
      <div class="form-row">
        <span class="form-label">股數</span>
        <input class="form-input" type="number" id="s-tsmc-shares" value="${s.tsmcShares}" inputmode="numeric" onchange="saveSettingField('tsmcShares','s-tsmc-shares')">
      </div>
      <div class="form-row">
        <span class="form-label">成本</span>
        <input class="form-input" type="number" id="s-tsmc-cost" value="${s.tsmcAvgCost || ''}" placeholder="未設定" inputmode="decimal" step="0.1" onchange="saveSettingField('tsmcAvgCost','s-tsmc-cost')">
      </div>
    </div>

    <!-- 元大台灣50卡片 -->
    <div class="form-section-header">元大台灣50</div>
    <div class="form-group" style="margin:0 16px;">
      <div class="form-row">
        <span class="form-label">股數</span>
        <input class="form-input" type="number" id="s-etf-shares" value="${s.etf0050Shares}" inputmode="numeric" onchange="saveSettingField('etf0050Shares','s-etf-shares')">
      </div>
      <div class="form-row">
        <span class="form-label">成本</span>
        <input class="form-input" type="number" id="s-etf-cost" value="${s.etf0050AvgCost || ''}" placeholder="未設定" inputmode="decimal" step="0.01" onchange="saveSettingField('etf0050AvgCost','s-etf-cost')">
      </div>
    </div>

    <div class="form-section-header">資料管理</div>
    <div class="list-group" style="margin:0 16px;">
      <div class="list-row" onclick="exportData()">
        <div class="list-row-content"><div class="list-row-title">匯出 JSON</div></div>
        <span class="list-row-chevron">›</span>
      </div>
      <div class="list-row" onclick="importData()">
        <div class="list-row-content"><div class="list-row-title">匯入 JSON</div></div>
        <span class="list-row-chevron">›</span>
      </div>
      <div class="list-row" onclick="clearAllData()">
        <div class="list-row-content"><div class="list-row-title" style="color:var(--red);">清除所有資料</div></div>
        <span class="list-row-chevron" style="color:var(--red);">›</span>
      </div>
    </div>

    <div style="padding:24px 16px 16px;text-align:center;font-size:12px;letter-spacing:-0.12px;color:var(--label-quaternary);">
      資料僅存於本機，不會上傳雲端
    </div>
  `;
  document.getElementById('settings-content').innerHTML = html;
}

function saveSettingField(key, inputId) {
  const raw = document.getElementById(inputId).value.trim();
  const n = parseFloat(raw.replace(/,/g, ''));
  if (raw === '' && (key === 'tsmcAvgCost' || key === 'etf0050AvgCost')) {
    const s = loadSettings(); s[key] = 0; saveSettings(s);
    showToast('已清除成本設定'); return;
  }
  if (isNaN(n) || n < 0) { showToast('請輸入有效數字'); return; }
  const s = loadSettings(); s[key] = n; saveSettings(s);
  haptic('light');
  showToast('已儲存 ✓');
}

function exportData() {
  const data = {
    exportedAt: new Date().toISOString(),
    settings: loadSettings(),
    records: loadRecords()
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `investment_records_${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('已匯出 JSON');
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const data = JSON.parse(evt.target.result);
        if (data.records && Array.isArray(data.records)) {
          confirmCallback = () => {
            if (data.settings) saveSettings({ ...DEFAULT_SETTINGS, ...data.settings });
            saveRecords(data.records);
            renderSettings();
            renderHome();
            showToast('匯入成功 ✓');
          };
          document.getElementById('confirm-title').textContent = '確認匯入';
          document.getElementById('confirm-msg').textContent = `將匯入 ${data.records.length} 筆紀錄，現有資料將被覆蓋。`;
          document.getElementById('confirm-ok-btn').textContent = '匯入';
          document.getElementById('confirm-ok-btn').className = 'confirm-btn primary';
          openConfirm();
        } else {
          showToast('JSON 格式錯誤');
        }
      } catch { showToast('檔案解析失敗'); }
    };
    reader.readAsText(file);
  };
  input.click();
}

function clearAllData() {
  confirmCallback = () => {
    localStorage.removeItem(STORAGE_KEY_RECORDS);
    renderHome();
    renderSettings();
    showToast('所有資料已清除');
  };
  document.getElementById('confirm-title').textContent = '清除所有資料';
  document.getElementById('confirm-msg').textContent = '所有紀錄將被永久刪除，此操作無法復原。';
  document.getElementById('confirm-ok-btn').textContent = '清除';
  document.getElementById('confirm-ok-btn').className = 'confirm-btn destructive';
  openConfirm();
}

function showHelp() {
  alert(`使用說明

1. 點首頁右上角「＋」新增每日紀錄
2. 輸入台積電與0050的收盤價，股數可套用預設
3. 首頁可切換今日/週/月/年損益
4. 歷史頁可查看、編輯、刪除紀錄
5. 圖表頁可查看走勢
6. 設定頁可修改股數與平均成本
7. 建議每個交易日收盤後記錄一次

顏色說明：
🔴 紅色 = 漲（台灣習慣）
🟢 綠色 = 跌`);
}

/* =====================================================================
   MODAL HELPERS
   ===================================================================== */

function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}

/* =====================================================================
   TOAST
   ===================================================================== */

function haptic(type = 'light') {
  if (window.navigator && window.navigator.vibrate) {
    const pattern = type === 'heavy' ? [30] : type === 'medium' ? [15] : [8];
    window.navigator.vibrate(pattern);
  }
}

let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2000);
}

/* =====================================================================
   INIT
   ===================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // 版本標記：若版本不符則強制清除舊資料
  const DATA_VERSION = 'v2';
  if (localStorage.getItem('inv_version') !== DATA_VERSION) {
    localStorage.removeItem(STORAGE_KEY_RECORDS);
    localStorage.removeItem(STORAGE_KEY_SETTINGS);
    localStorage.setItem('inv_version', DATA_VERSION);
  }

  renderHome();

  // Close modals by tapping overlay
  document.getElementById('add-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('add-modal')) closeAddModal();
  });
  document.getElementById('detail-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('detail-modal')) closeDetailModal();
  });

  // Handle resize for charts
  window.addEventListener('resize', () => {
    if (currentTab === 'home') renderHome();
    if (currentTab === 'charts') renderCharts();
  });
});


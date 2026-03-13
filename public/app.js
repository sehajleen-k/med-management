'use strict';

const REFRESH_INTERVAL = 30_000; // 30 seconds

const app         = document.getElementById('app');
const dateDisplay = document.getElementById('date-display');
const progress    = document.getElementById('progress-display');
const refresh     = document.getElementById('refresh-indicator');
const toast       = document.getElementById('toast');

let toastTimer = null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function showToast(msg, duration = 3000) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
}

function formatTime(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Los_Angeles',
  });
}

function formatDate(dateStr) {
  // dateStr is YYYY-MM-DD in PT
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// ── Render ─────────────────────────────────────────────────────────────────────

function renderMedCard(med) {
  const card = document.createElement('div');
  card.className = `med-card${med.taken ? ' taken' : ''}`;
  card.dataset.medId = med.id;

  const info = document.createElement('div');
  info.className = 'med-info';

  const name = document.createElement('div');
  name.className = 'med-name';
  name.textContent = med.name;
  info.appendChild(name);

  if (med.instructions) {
    const instr = document.createElement('div');
    instr.className = 'med-instructions';
    instr.textContent = med.instructions;
    info.appendChild(instr);
  }

  if (med.taken && med.taken_at) {
    const time = document.createElement('div');
    time.className = 'med-taken-time';
    time.textContent = `Taken at ${formatTime(med.taken_at)}`;
    info.appendChild(time);
  }

  // For as_needed: show count of times taken today if > 1
  if (med.category === 'as_needed' && med.logs_today && med.logs_today.length > 1) {
    const extra = document.createElement('div');
    extra.className = 'as-needed-logs';
    const times = med.logs_today.map(l => formatTime(l.taken_at)).join(', ');
    extra.textContent = `Taken ${med.logs_today.length}× today — ${times}`;
    info.appendChild(extra);
  }

  card.appendChild(info);

  // Action: checkmark if scheduled+taken, button otherwise
  if (med.category !== 'as_needed' && med.taken) {
    const check = document.createElement('div');
    check.className = 'checkmark';
    check.textContent = '✓';
    check.setAttribute('aria-label', 'Taken');
    card.appendChild(check);
  } else {
    const btn = document.createElement('button');
    btn.className = 'btn-take';
    btn.textContent = 'Take';
    btn.setAttribute('aria-label', `Mark ${med.name} as taken`);
    btn.addEventListener('click', () => handleTake(med.id, med.name, btn));
    card.appendChild(btn);
  }

  return card;
}

function renderSection(title, icon, meds) {
  const section = document.createElement('section');
  section.className = 'section';

  const header = document.createElement('div');
  header.className = 'section-header';

  const iconEl = document.createElement('span');
  iconEl.className = 'section-icon';
  iconEl.textContent = icon;

  const titleEl = document.createElement('h2');
  titleEl.className = 'section-title';
  titleEl.textContent = title;

  const count = document.createElement('span');
  count.className = 'section-count';
  const taken = meds.filter(m => m.taken).length;
  count.textContent =
    title === 'As Needed'
      ? `${meds.length} available`
      : `${taken} / ${meds.length} taken`;

  header.append(iconEl, titleEl, count);
  section.appendChild(header);

  if (meds.length === 0) {
    const empty = document.createElement('p');
    empty.style.cssText = 'color: var(--text-muted); font-size: 0.95rem; padding: 0.5rem 0';
    empty.textContent = 'No medications in this category.';
    section.appendChild(empty);
  } else {
    for (const med of meds) {
      section.appendChild(renderMedCard(med));
    }
  }

  return section;
}

function render(data) {
  app.innerHTML = '';

  const allScheduled = [...data.morning, ...data.evening];
  const takenCount = allScheduled.filter(m => m.taken).length;

  dateDisplay.textContent = formatDate(data.date);
  progress.textContent =
    allScheduled.length > 0
      ? `${takenCount} of ${allScheduled.length} scheduled taken`
      : 'No scheduled medications today';

  app.appendChild(renderSection('Morning', '🌅', data.morning));
  app.appendChild(renderSection('Evening', '🌙', data.evening));
  app.appendChild(renderSection('As Needed', '💊', data.as_needed));
}

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchStatus(isAutoRefresh = false) {
  try {
    const res = await fetch('/api/status');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    render(data);
    if (isAutoRefresh) {
      refresh.textContent = `Updated ${new Date().toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true,
        timeZone: 'America/Los_Angeles',
      })}`;
    }
  } catch (err) {
    console.error('Failed to load status:', err);
    if (app.innerHTML.includes('loading') || app.innerHTML === '') {
      app.innerHTML = `<div class="error-banner">Could not load medications. Please refresh.</div>`;
    }
    // Don't wipe existing data on auto-refresh failure
    refresh.textContent = 'Update failed — retrying…';
  }
}

async function handleTake(medId, medName, btn) {
  btn.disabled = true;
  btn.textContent = '…';

  try {
    const res = await fetch('/api/take', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ med_id: medId }),
    });
    const data = await res.json();

    if (res.ok) {
      showToast(`✓ ${medName} marked as taken`);
      await fetchStatus(); // re-render immediately
    } else if (data.already_taken) {
      showToast(`${medName} was already logged today`);
      btn.disabled = false;
      btn.textContent = 'Take';
    } else {
      showToast(`Could not log ${medName} — try again`);
      btn.disabled = false;
      btn.textContent = 'Take';
    }
  } catch (err) {
    console.error('Take error:', err);
    showToast('Network error — please try again');
    btn.disabled = false;
    btn.textContent = 'Take';
  }
}

// ── History ───────────────────────────────────────────────────────────────────

const historyPanel = document.getElementById('history-panel');
const footer       = document.getElementById('footer');

const CATEGORY_LABEL = { morning: 'Morning', evening: 'Evening', as_needed: 'As Needed' };

function renderHistory(logs, days) {
  historyPanel.innerHTML = '';

  // Controls row
  const controls = document.createElement('div');
  controls.className = 'history-controls';
  controls.innerHTML = `
    <label for="days-select">Show last</label>
    <select id="days-select">
      <option value="7"  ${days === 7  ? 'selected' : ''}>7 days</option>
      <option value="14" ${days === 14 ? 'selected' : ''}>14 days</option>
      <option value="30" ${days === 30 ? 'selected' : ''}>30 days</option>
      <option value="90" ${days === 90 ? 'selected' : ''}>90 days</option>
    </select>
  `;
  controls.querySelector('select').addEventListener('change', (e) => {
    fetchHistory(Number(e.target.value));
  });
  historyPanel.appendChild(controls);

  if (logs.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'history-empty';
    empty.textContent = 'No medications logged in this period.';
    historyPanel.appendChild(empty);
    return;
  }

  // Group by date
  const byDate = {};
  for (const log of logs) {
    if (!byDate[log.date]) byDate[log.date] = [];
    byDate[log.date].push(log);
  }

  for (const date of Object.keys(byDate).sort().reverse()) {
    const dayEl = document.createElement('div');
    dayEl.className = 'history-day';

    const header = document.createElement('div');
    header.className = 'history-day-header';
    header.textContent = formatDate(date);
    dayEl.appendChild(header);

    for (const log of byDate[date]) {
      const row = document.createElement('div');
      row.className = 'history-row';

      const dot = document.createElement('div');
      dot.className = `history-dot${log.category === 'as_needed' ? ' as-needed' : ''}`;

      const name = document.createElement('div');
      name.className = 'history-med-name';
      name.textContent = log.name;

      const cat = document.createElement('div');
      cat.className = 'history-category';
      cat.textContent = CATEGORY_LABEL[log.category] || log.category;

      const time = document.createElement('div');
      time.className = 'history-time';
      time.textContent = formatTime(log.taken_at);

      row.append(dot, name, cat, time);
      dayEl.appendChild(row);
    }

    historyPanel.appendChild(dayEl);
  }
}

async function fetchHistory(days = 14) {
  historyPanel.innerHTML = '<div class="loading">Loading history...</div>';
  try {
    const res = await fetch(`/api/history?days=${days}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const logs = await res.json();
    renderHistory(logs, days);
  } catch (err) {
    console.error('Failed to load history:', err);
    historyPanel.innerHTML = '<div class="error-banner">Could not load history. Please try again.</div>';
  }
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');

    const isHistory = tab.dataset.tab === 'history';
    app.hidden = isHistory;
    historyPanel.hidden = !isHistory;
    footer.hidden = isHistory;

    if (isHistory) fetchHistory(14);
  });
});

// ── Init ──────────────────────────────────────────────────────────────────────

fetchStatus();
setInterval(() => fetchStatus(true), REFRESH_INTERVAL);

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// Automatic practice log: modules call Log.record(type); streaks and a
// 4-week activity grid render on the Log tab. Data lives in localStorage.
const Log = (() => {
  const KEY = "practice-log";

  const TYPE_LABELS = {
    tuner: "🎯 Tuning",
    changes: "🔁 Chord changes",
    practice: "🎵 Play-along",
    ear: "👂 Ear training",
    metronome: "⏱️ Metronome",
    check: "🎤 Chord checks",
  };

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch { return {}; }
  }
  function save(data) { localStorage.setItem(KEY, JSON.stringify(data)); }

  function todayKey(offset = 0) {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    return d.toISOString().slice(0, 10);
  }

  function record(type) {
    const data = load();
    const day = todayKey();
    data[day] = data[day] || {};
    data[day][type] = (data[day][type] || 0) + 1;
    save(data);
    render();
  }

  function dayTotal(data, key) {
    return Object.values(data[key] || {}).reduce((a, b) => a + b, 0);
  }

  function streaks(data) {
    // Current streak: consecutive days ending today (or yesterday, so an
    // unstarted today doesn't zero the streak).
    let current = 0;
    let offset = dayTotal(data, todayKey(0)) > 0 ? 0 : 1;
    while (dayTotal(data, todayKey(offset + current)) > 0) current++;

    // Best streak across all logged days.
    const days = Object.keys(data).filter((k) => dayTotal(data, k) > 0).sort();
    let best = 0, run = 0, prev = null;
    for (const k of days) {
      if (prev) {
        const gap = (new Date(k) - new Date(prev)) / 86400000;
        run = gap === 1 ? run + 1 : 1;
      } else {
        run = 1;
      }
      best = Math.max(best, run);
      prev = k;
    }
    return { current, best, totalDays: days.length };
  }

  function render() {
    const grid = document.getElementById("log-grid");
    if (!grid) return;
    const data = load();
    const s = streaks(data);

    document.getElementById("log-streak").textContent = s.current;
    document.getElementById("log-best").textContent = s.best;
    document.getElementById("log-days").textContent = s.totalDays;

    // 28-day grid, oldest first, today last.
    grid.innerHTML = "";
    for (let i = 27; i >= 0; i--) {
      const key = todayKey(i);
      const total = dayTotal(data, key);
      const cell = document.createElement("div");
      cell.className = "log-cell" +
        (total >= 6 ? " l3" : total >= 3 ? " l2" : total >= 1 ? " l1" : "") +
        (i === 0 ? " today" : "");
      cell.title = `${key}: ${total} ${total === 1 ? "activity" : "activities"}`;
      grid.appendChild(cell);
    }

    // All-time totals per activity type.
    const totals = {};
    Object.values(data).forEach((day) => {
      Object.entries(day).forEach(([t, n]) => (totals[t] = (totals[t] || 0) + n));
    });
    const typesEl = document.getElementById("log-types");
    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    typesEl.innerHTML = entries.length
      ? entries.map(([t, n]) =>
          `<div class="log-type-row"><span>${TYPE_LABELS[t] || t}</span><span>${n}</span></div>`
        ).join("")
      : `<p class="hint">Nothing logged yet — go practice! Every drill, play-along, and ear question counts automatically.</p>`;
  }

  render();
  return { record, render };
})();

// One-minute chord-change drill with per-pair best scores in localStorage.
const Changes = (() => {
  const STORE_KEY = "cct-scores";

  const selA = document.getElementById("cc-chord-a");
  const selB = document.getElementById("cc-chord-b");
  const durSel = document.getElementById("cc-duration");
  const pairEl = document.getElementById("cc-pair");
  const timerEl = document.getElementById("cc-timer");
  const startBtn = document.getElementById("cc-start");
  const resultEl = document.getElementById("cc-result");
  const countInput = document.getElementById("cc-count");
  const saveBtn = document.getElementById("cc-save");
  const bestEl = document.getElementById("cc-best");
  const historyEl = document.getElementById("cc-history");

  let running = false;
  let intervalId = null;
  let remaining = 60;
  let lastDrillSeconds = 60;

  Chords.CHORDS.forEach((c) => {
    selA.add(new Option(c.name, c.name));
    selB.add(new Option(c.name, c.name));
  });
  selA.value = "E minor";
  selB.value = "A minor";

  function pairKey() {
    // Order-independent so Em→Am and Am→Em share a best score.
    return [selA.value, selB.value].sort().join(" ⇄ ");
  }

  function loadScores() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
    catch { return []; }
  }

  function saveScores(scores) {
    localStorage.setItem(STORE_KEY, JSON.stringify(scores));
  }

  function refreshDisplay() {
    pairEl.textContent = `${Chords.byName(selA.value).sub || selA.value} ⇄ ${Chords.byName(selB.value).sub || selB.value}`;
    const scores = loadScores();
    const forPair = scores.filter((s) => s.pair === pairKey());
    if (forPair.length) {
      // Normalize to a per-60s rate so 30s and 60s drills compare fairly.
      const best = Math.max(...forPair.map((s) => (s.count * 60) / s.seconds));
      bestEl.textContent = `🏆 Best for this pair: ${Math.round(best)} changes/min (${forPair.length} attempts)`;
    } else {
      bestEl.textContent = "No attempts yet for this pair.";
    }

    const recent = scores.slice(-8).reverse();
    historyEl.innerHTML = recent.length
      ? "<h3>Recent drills</h3>" + recent.map((s) =>
          `<div class="cc-row"><span>${s.pair}</span><span>${s.count} in ${s.seconds}s</span><span>${s.date}</span></div>`
        ).join("")
      : "";
  }

  function tick() {
    remaining--;
    timerEl.textContent = remaining;
    if (remaining <= 3 && remaining > 0) Audio.playClick(Audio.getCtx().currentTime, false);
    if (remaining <= 0) finish();
  }

  function start() {
    running = true;
    lastDrillSeconds = parseInt(durSel.value, 10);
    remaining = lastDrillSeconds;
    timerEl.textContent = remaining;
    timerEl.classList.add("running");
    resultEl.hidden = true;
    startBtn.textContent = "Stop";
    startBtn.classList.add("running");
    Audio.playClick(Audio.getCtx().currentTime, true); // go!
    intervalId = setInterval(tick, 1000);
  }

  function finish() {
    stop();
    Audio.playClick(Audio.getCtx().currentTime, true);
    Audio.playClick(Audio.getCtx().currentTime + 0.15, true);
    timerEl.textContent = "Done!";
    resultEl.hidden = false;
    countInput.value = 0;
    countInput.focus();
  }

  function stop() {
    running = false;
    clearInterval(intervalId);
    timerEl.classList.remove("running");
    startBtn.textContent = "Start Drill";
    startBtn.classList.remove("running");
  }

  function reset() {
    stop();
    timerEl.textContent = durSel.value;
    resultEl.hidden = true;
  }

  startBtn.addEventListener("click", () => (running ? reset() : start()));

  saveBtn.addEventListener("click", () => {
    const count = parseInt(countInput.value, 10) || 0;
    const scores = loadScores();
    scores.push({
      pair: pairKey(),
      count,
      seconds: lastDrillSeconds,
      date: new Date().toISOString().slice(0, 10),
    });
    saveScores(scores);
    resultEl.hidden = true;
    timerEl.textContent = durSel.value;
    refreshDisplay();
  });

  [selA, selB].forEach((sel) => sel.addEventListener("change", refreshDisplay));
  durSel.addEventListener("change", reset);

  refreshDisplay();
  return { stop: reset };
})();

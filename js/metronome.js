// Metronome with look-ahead Web Audio scheduling for rock-solid timing.
const Metronome = (() => {
  let running = false;
  let bpm = 80;
  let beatsPerBar = 4;
  let nextNoteTime = 0;
  let beatIndex = 0;
  let timerId = null;

  const LOOKAHEAD_MS = 25;
  const SCHEDULE_AHEAD = 0.1; // seconds

  const bpmSlider = document.getElementById("metro-bpm");
  const bpmDisplay = document.getElementById("metro-bpm-display");
  const sigSel = document.getElementById("metro-sig");
  const beatsEl = document.getElementById("metro-beats");
  const toggleBtn = document.getElementById("metro-toggle");

  function renderBeats() {
    beatsEl.innerHTML = "";
    for (let i = 0; i < beatsPerBar; i++) {
      const d = document.createElement("div");
      d.className = "beat";
      beatsEl.appendChild(d);
    }
  }

  function flashBeat(index, when) {
    const delayMs = Math.max(0, (when - Audio.getCtx().currentTime) * 1000);
    setTimeout(() => {
      if (!running) return;
      beatsEl.querySelectorAll(".beat").forEach((b, i) => {
        b.classList.toggle("on", i === index);
        b.classList.toggle("downbeat", i === index && index === 0);
      });
    }, delayMs);
  }

  function scheduler() {
    const ac = Audio.getCtx();
    while (nextNoteTime < ac.currentTime + SCHEDULE_AHEAD) {
      Audio.playClick(nextNoteTime, beatIndex === 0);
      flashBeat(beatIndex, nextNoteTime);
      nextNoteTime += 60 / bpm;
      beatIndex = (beatIndex + 1) % beatsPerBar;
    }
    timerId = setTimeout(scheduler, LOOKAHEAD_MS);
  }

  function start() {
    running = true;
    beatIndex = 0;
    nextNoteTime = Audio.getCtx().currentTime + 0.05;
    scheduler();
    toggleBtn.textContent = "Stop";
    toggleBtn.classList.add("running");
  }

  function stop() {
    running = false;
    clearTimeout(timerId);
    toggleBtn.textContent = "Start";
    toggleBtn.classList.remove("running");
    beatsEl.querySelectorAll(".beat").forEach((b) => b.classList.remove("on", "downbeat"));
  }

  bpmSlider.addEventListener("input", () => {
    bpm = parseInt(bpmSlider.value, 10);
    bpmDisplay.textContent = bpm;
  });

  sigSel.addEventListener("change", () => {
    beatsPerBar = parseInt(sigSel.value, 10);
    beatIndex = 0;
    renderBeats();
  });

  toggleBtn.addEventListener("click", () => (running ? stop() : start()));

  renderBeats();
  return { stop };
})();

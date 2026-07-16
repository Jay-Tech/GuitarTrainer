// Play-along progression trainer: scheduled chords, clicks, and strum patterns.
const Practice = (() => {
  // Each chord entry lasts one bar (4 beats), multiplied by the bars-per-chord setting.
  const PROGRESSIONS = [
    { name: "G – D – Em – C (pop classic)", chords: ["G major", "D major", "E minor", "C major"] },
    { name: "C – G – Am – F (axis of awesome)", chords: ["C major", "G major", "A minor", "F major"] },
    { name: "C – Am – F – G (50s doo-wop)", chords: ["C major", "A minor", "F major", "G major"] },
    { name: "Em – C – G – D (minor pop)", chords: ["E minor", "C major", "G major", "D major"] },
    { name: "Am – F – C – G", chords: ["A minor", "F major", "C major", "G major"] },
    { name: "D – A – Bm – G (barre workout)", chords: ["D major", "A major", "B minor", "G major"] },
    { name: "E – A – D (three-chord rock)", chords: ["E major", "A major", "D major", "A major"] },
    { name: "12-bar blues in E", chords: ["E7", "E7", "E7", "E7", "A7", "A7", "E7", "E7", "B7", "A7", "E7", "B7"] },
  ];

  // 8 eighth-note slots per bar. D = downstroke, U = upstroke, null = miss.
  const PATTERNS = [
    { name: "Downs on the beat", slots: ["D", null, "D", null, "D", null, "D", null] },
    { name: "Folk (D DU UDU)", slots: ["D", null, "D", "U", null, "U", "D", "U"] },
    { name: "Pop (D DU UD)", slots: ["D", null, "D", "U", null, "U", "D", null] },
    { name: "Straight 8ths (DU DU DU DU)", slots: ["D", "U", "D", "U", "D", "U", "D", "U"] },
    { name: "Whole notes (one strum per bar)", slots: ["D", null, null, null, null, null, null, null] },
  ];

  const LOOKAHEAD_MS = 25;
  const SCHEDULE_AHEAD = 0.12; // seconds

  const progSel = document.getElementById("pr-prog");
  const patSel = document.getElementById("pr-pattern");
  const bpmSlider = document.getElementById("pr-bpm");
  const bpmVal = document.getElementById("pr-bpm-val");
  const barsSel = document.getElementById("pr-bars");
  const soundChk = document.getElementById("pr-sound");
  const currentEl = document.getElementById("pr-current");
  const upcomingEl = document.getElementById("pr-upcoming");
  const diagramEl = document.getElementById("pr-diagram");
  const diagramNextEl = document.getElementById("pr-diagram-next");
  const beatsEl = document.getElementById("pr-beats");
  const strokesEl = document.getElementById("pr-strokes");
  const toggleBtn = document.getElementById("pr-toggle");

  PROGRESSIONS.forEach((p, i) => progSel.add(new Option(p.name, i)));
  PATTERNS.forEach((p, i) => patSel.add(new Option(p.name, i)));

  let running = false;
  let timerId = null;
  let nextTime = 0;
  let eighth = 0;    // 0..7 within the bar
  let bar = 0;       // absolute bar counter
  let chordIdx = 0;

  function prog() { return PROGRESSIONS[progSel.value]; }
  function pattern() { return PATTERNS[patSel.value]; }
  function barsPerChord() { return parseInt(barsSel.value, 10); }

  function chordAt(idx) {
    const chords = prog().chords;
    return Chords.byName(chords[idx % chords.length]);
  }

  function shortName(chord) { return chord.sub && chord.sub.length <= 5 ? chord.sub : chord.name; }

  function renderStrokes() {
    strokesEl.innerHTML = "";
    pattern().slots.forEach((s, i) => {
      const d = document.createElement("div");
      d.className = "stroke" + (s ? "" : " rest");
      d.textContent = s === "D" ? "↓" : s === "U" ? "↑" : "·";
      d.dataset.slot = i;
      strokesEl.appendChild(d);
    });
  }

  function showChords() {
    const cur = chordAt(chordIdx);
    const nxt = chordAt(chordIdx + 1);
    currentEl.textContent = shortName(cur);
    upcomingEl.textContent = shortName(nxt);
    diagramEl.innerHTML = Chords.diagramSVG(cur);
    diagramNextEl.innerHTML = Chords.diagramSVG(nxt);
  }

  function flashAt(when, fn) {
    const delay = Math.max(0, (when - Audio.getCtx().currentTime) * 1000);
    setTimeout(() => { if (running) fn(); }, delay);
  }

  function scheduler() {
    const ac = Audio.getCtx();
    const eighthDur = 60 / parseInt(bpmSlider.value, 10) / 2;

    while (nextTime < ac.currentTime + SCHEDULE_AHEAD) {
      const slot = eighth;
      const when = nextTime;

      // Bar start: advance chord when this bar begins a new chord block.
      if (slot === 0) {
        if (bar > 0 && bar % barsPerChord() === 0) {
          chordIdx++;
          flashAt(when, showChords);
        }
        bar === 0 && flashAt(when, showChords);
        bar++;
      }

      // Click on quarter notes; accent the downbeat.
      if (slot % 2 === 0) {
        Audio.playClick(when, slot === 0);
        flashAt(when, () => {
          beatsEl.querySelectorAll(".beat").forEach((b, i) => {
            b.classList.toggle("on", i === slot / 2);
            b.classList.toggle("downbeat", i === 0 && slot === 0);
          });
        });
      }

      // Strum on pattern slots.
      const stroke = pattern().slots[slot];
      if (stroke && soundChk.checked) {
        Chords.strumAt(chordAt(chordIdx), when, stroke === "U", 0.45);
      }
      flashAt(when, () => {
        strokesEl.querySelectorAll(".stroke").forEach((s, i) => s.classList.toggle("on", i === slot));
      });

      nextTime += eighthDur;
      eighth = (eighth + 1) % 8;
    }
    timerId = setTimeout(scheduler, LOOKAHEAD_MS);
  }

  function start() {
    running = true;
    eighth = 0; bar = 0; chordIdx = 0;
    nextTime = Audio.getCtx().currentTime + 0.1;
    showChords();
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
    strokesEl.querySelectorAll(".stroke").forEach((s) => s.classList.remove("on"));
  }

  toggleBtn.addEventListener("click", () => (running ? stop() : start()));
  bpmSlider.addEventListener("input", () => (bpmVal.textContent = bpmSlider.value));
  patSel.addEventListener("change", renderStrokes);
  progSel.addEventListener("change", () => { chordIdx = 0; showChords(); });

  renderStrokes();
  showChords();
  return { stop };
})();

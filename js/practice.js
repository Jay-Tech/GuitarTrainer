// Play-along trainer: progressions and public-domain songs with scheduled
// chords, clicks, and strum patterns. Supports 3/4 and 4/4 meters.
const Practice = (() => {
  // Each chord entry lasts one bar of `beats` beats, times the bars-per-chord
  // setting. Songs can pin a recommended bpm and pattern.
  const PROGRESSIONS = [
    { group: "Progressions", name: "G – D – Em – C (pop classic)", beats: 4, chords: ["G major", "D major", "E minor", "C major"] },
    { group: "Progressions", name: "C – G – Am – F (axis of awesome)", beats: 4, chords: ["C major", "G major", "A minor", "F major"] },
    { group: "Progressions", name: "C – Am – F – G (50s doo-wop)", beats: 4, chords: ["C major", "A minor", "F major", "G major"] },
    { group: "Progressions", name: "Em – C – G – D (minor pop)", beats: 4, chords: ["E minor", "C major", "G major", "D major"] },
    { group: "Progressions", name: "Am – F – C – G", beats: 4, chords: ["A minor", "F major", "C major", "G major"] },
    { group: "Progressions", name: "D – A – Bm – G (barre workout)", beats: 4, chords: ["D major", "A major", "B minor", "G major"] },
    { group: "Progressions", name: "E – A – D (three-chord rock)", beats: 4, chords: ["E major", "A major", "D major", "A major"] },
    { group: "Progressions", name: "12-bar blues in E", beats: 4, chords: ["E7", "E7", "E7", "E7", "A7", "A7", "E7", "E7", "B7", "A7", "E7", "B7"] },

    { group: "Songs (public domain)", name: "House of the Rising Sun", beats: 3, bpm: 65, pattern: "Waltz (D du du)",
      chords: ["A minor", "C major", "D major", "F major", "A minor", "C major", "E major", "E major",
               "A minor", "C major", "D major", "F major", "A minor", "E major", "A minor", "E major"] },
    { group: "Songs (public domain)", name: "Amazing Grace", beats: 3, bpm: 72, pattern: "Waltz downs (D D D)",
      chords: ["G major", "G major", "C major", "G major", "G major", "G major", "D7", "D7",
               "G major", "G major", "C major", "G major", "G major", "D7", "G major", "G major"] },
    { group: "Songs (public domain)", name: "When the Saints Go Marching In", beats: 4, bpm: 96, pattern: "Pop (D DU UD)",
      chords: ["G major", "G major", "G major", "G major", "G major", "G major", "D7", "D7",
               "G major", "G7", "C major", "C major", "G major", "D7", "G major", "G major"] },
    { group: "Songs (public domain)", name: "Happy Birthday", beats: 3, bpm: 84, pattern: "Waltz downs (D D D)",
      chords: ["G major", "D7", "D7", "G major", "G major", "C major", "D7", "G major"] },
    { group: "Songs (public domain)", name: "Scarborough Fair", beats: 3, bpm: 80, pattern: "Waltz (D du du)",
      chords: ["E minor", "E minor", "D major", "E minor", "G major", "G major", "E minor", "E minor",
               "E minor", "E minor", "G major", "D major", "E minor", "D major", "E minor", "E minor"] },
  ];

  // Eighth-note slots per bar = beats * 2. D = down, U = up, null = miss.
  const PATTERNS = [
    { name: "Downs on the beat", beats: 4, slots: ["D", null, "D", null, "D", null, "D", null] },
    { name: "Folk (D DU UDU)", beats: 4, slots: ["D", null, "D", "U", null, "U", "D", "U"] },
    { name: "Pop (D DU UD)", beats: 4, slots: ["D", null, "D", "U", null, "U", "D", null] },
    { name: "Straight 8ths (DU DU DU DU)", beats: 4, slots: ["D", "U", "D", "U", "D", "U", "D", "U"] },
    { name: "Whole notes (one strum per bar)", beats: 4, slots: ["D", null, null, null, null, null, null, null] },
    { name: "Waltz downs (D D D)", beats: 3, slots: ["D", null, "D", null, "D", null] },
    { name: "Waltz (D du du)", beats: 3, slots: ["D", null, "D", "U", "D", "U"] },
    { name: "Waltz whole bar", beats: 3, slots: ["D", null, null, null, null, null] },
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

  // Progression select with optgroups.
  {
    let currentGroup = null, groupEl = null;
    PROGRESSIONS.forEach((p, i) => {
      if (p.group !== currentGroup) {
        currentGroup = p.group;
        groupEl = document.createElement("optgroup");
        groupEl.label = currentGroup;
        progSel.appendChild(groupEl);
      }
      groupEl.appendChild(new Option(p.name, i));
    });
  }

  let running = false;
  let timerId = null;
  let nextTime = 0;
  let eighth = 0;    // 0..slotsPerBar-1 within the bar
  let bar = 0;       // absolute bar counter
  let chordIdx = 0;

  function prog() { return PROGRESSIONS[progSel.value]; }
  function pattern() { return PATTERNS[patSel.value]; }
  function beatsPerBar() { return prog().beats; }
  function slotsPerBar() { return beatsPerBar() * 2; }
  function barsPerChord() { return parseInt(barsSel.value, 10); }

  function chordAt(idx) {
    const chords = prog().chords;
    return Chords.byName(chords[idx % chords.length]);
  }

  function shortName(chord) { return chord.sub && chord.sub.length <= 5 ? chord.sub : chord.name; }

  function rebuildPatternOptions() {
    const meter = beatsPerBar();
    const prevName = pattern() ? pattern().name : null;
    patSel.innerHTML = "";
    PATTERNS.forEach((p, i) => {
      if (p.beats === meter) patSel.add(new Option(p.name, i));
    });
    // Prefer the song's recommended pattern, then the previous choice.
    const wanted = prog().pattern || prevName;
    const match = [...patSel.options].find((o) => PATTERNS[o.value].name === wanted);
    if (match) patSel.value = match.value;
  }

  function rebuildBeatDots() {
    beatsEl.innerHTML = "";
    for (let i = 0; i < beatsPerBar(); i++) {
      const d = document.createElement("div");
      d.className = "beat";
      beatsEl.appendChild(d);
    }
  }

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
    const slots = slotsPerBar();

    while (nextTime < ac.currentTime + SCHEDULE_AHEAD) {
      const slot = eighth;
      const when = nextTime;

      // Bar start: advance chord when this bar begins a new chord block.
      if (slot === 0) {
        if (bar > 0 && bar % barsPerChord() === 0) {
          chordIdx++;
          flashAt(when, showChords);
        }
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
      eighth = (eighth + 1) % slots;
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
    if (window.Log) Log.record("practice");
  }

  function stop() {
    running = false;
    clearTimeout(timerId);
    toggleBtn.textContent = "Start";
    toggleBtn.classList.remove("running");
    beatsEl.querySelectorAll(".beat").forEach((b) => b.classList.remove("on", "downbeat"));
    strokesEl.querySelectorAll(".stroke").forEach((s) => s.classList.remove("on"));
  }

  function onProgChange() {
    stop();
    chordIdx = 0;
    const p = prog();
    if (p.bpm) {
      bpmSlider.value = p.bpm;
      bpmVal.textContent = p.bpm;
    }
    rebuildPatternOptions();
    rebuildBeatDots();
    renderStrokes();
    showChords();
  }

  toggleBtn.addEventListener("click", () => (running ? stop() : start()));
  bpmSlider.addEventListener("input", () => (bpmVal.textContent = bpmSlider.value));
  patSel.addEventListener("change", renderStrokes);
  progSel.addEventListener("change", onProgChange);

  rebuildPatternOptions();
  rebuildBeatDots();
  renderStrokes();
  showChords();
  return { stop };
})();

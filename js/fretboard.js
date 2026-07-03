// Interactive SVG fretboard: note names, scale highlighting, note-finding quiz.
const Fretboard = (() => {
  const NUM_FRETS = 12;
  // Standard tuning, low E (6th string) first. Value = semitones from A4 at open string.
  const OPEN_STRINGS = [
    { label: "E", semis: -29 }, // E2
    { label: "A", semis: -24 }, // A2
    { label: "D", semis: -19 }, // D3
    { label: "G", semis: -14 }, // G3
    { label: "B", semis: -10 }, // B3
    { label: "e", semis: -5 },  // E4
  ];

  const SCALES = {
    "E-minor-pentatonic": { root: "E", notes: ["E", "G", "A", "B", "D"] },
    "A-minor-pentatonic": { root: "A", notes: ["A", "C", "D", "E", "G"] },
    "G-major-pentatonic": { root: "G", notes: ["G", "A", "B", "D", "E"] },
    "E-blues": { root: "E", notes: ["E", "G", "A", "A#", "B", "D"] },
    "A-blues": { root: "A", notes: ["A", "C", "D", "D#", "E", "G"] },
    "C-major": { root: "C", notes: ["C", "D", "E", "F", "G", "A", "B"] },
    "G-major": { root: "G", notes: ["G", "A", "B", "C", "D", "E", "F#"] },
    "D-major": { root: "D", notes: ["D", "E", "F#", "G", "A", "B", "C#"] },
    "A-major": { root: "A", notes: ["A", "B", "C#", "D", "E", "F#", "G#"] },
  };

  const container = document.getElementById("fretboard-container");
  const modeSel = document.getElementById("fb-mode");
  const scaleSel = document.getElementById("fb-scale");
  const quizBar = document.getElementById("fb-quiz");
  const quizQ = document.getElementById("fb-quiz-question");
  const quizScore = document.getElementById("fb-quiz-score");

  const FRET_W = 62, STR_H = 30, LEFT = 46, TOP = 30;
  const WIDTH = LEFT + FRET_W * (NUM_FRETS + 1) + 10;
  const HEIGHT = TOP + STR_H * 6 + 26;

  let quiz = { active: false, target: null, right: 0, total: 0 };

  function noteAt(stringIdx, fret) {
    const semis = OPEN_STRINGS[stringIdx].semis + fret;
    const midi = semis + 69;
    return {
      name: Audio.NOTE_NAMES[((midi % 12) + 12) % 12],
      freq: Audio.noteFreq(semis),
    };
  }

  function fretX(fret) {
    // Fret 0 (open) sits left of the nut; fretted notes centered in their fret.
    return fret === 0 ? LEFT - 18 : LEFT + FRET_W * (fret - 0.5);
  }

  function render() {
    const mode = modeSel.value;
    const scale = SCALES[scaleSel.value] || null;

    let svg = `<svg viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">`;

    // Fret wires (nut is thicker).
    for (let f = 0; f <= NUM_FRETS; f++) {
      const x = LEFT + FRET_W * f;
      svg += `<line x1="${x}" y1="${TOP}" x2="${x}" y2="${TOP + STR_H * 5}" stroke="#4a5468" stroke-width="${f === 0 ? 6 : 2}"/>`;
    }

    // Fret markers.
    [3, 5, 7, 9].forEach((f) => {
      svg += `<circle cx="${LEFT + FRET_W * (f - 0.5)}" cy="${TOP + STR_H * 2.5}" r="7" fill="#2c3547"/>`;
    });
    svg += `<circle cx="${LEFT + FRET_W * 11.5}" cy="${TOP + STR_H * 1.5}" r="7" fill="#2c3547"/>`;
    svg += `<circle cx="${LEFT + FRET_W * 11.5}" cy="${TOP + STR_H * 3.5}" r="7" fill="#2c3547"/>`;

    // Fret numbers.
    for (let f = 1; f <= NUM_FRETS; f++) {
      svg += `<text x="${LEFT + FRET_W * (f - 0.5)}" y="${TOP + STR_H * 5 + 20}" fill="#8b94a5" font-size="11" text-anchor="middle">${f}</text>`;
    }

    // Strings (drawn top = high e visually reversed: show low E at bottom like tab).
    for (let s = 0; s < 6; s++) {
      const y = TOP + STR_H * (5 - s); // string 0 (low E) at bottom
      svg += `<line x1="${LEFT}" y1="${y}" x2="${LEFT + FRET_W * NUM_FRETS}" y2="${y}" stroke="#6b7688" stroke-width="${1 + (5 - s) * 0.35}"/>`;
    }

    // Notes.
    for (let s = 0; s < 6; s++) {
      const y = TOP + STR_H * (5 - s);
      for (let f = 0; f <= NUM_FRETS; f++) {
        const note = noteAt(s, f);
        const isNatural = !note.name.includes("#");
        const inScale = scale && scale.notes.includes(note.name);
        const isRoot = scale && note.name === scale.root;

        let cls = "fret-note";
        let show = true;
        if (mode === "naturals" && !isNatural) show = false;
        if (mode === "quiz") show = false;
        if (scale && !inScale && mode !== "quiz") show = show && mode === "all";
        if (!show && !inScale) cls += " hidden-note";
        if (inScale) cls += " scale-note";
        if (isRoot) cls += " root-note";

        svg += `<g class="${cls}" data-string="${s}" data-fret="${f}" data-note="${note.name}" data-freq="${note.freq.toFixed(2)}">
          <circle cx="${fretX(f)}" cy="${y}" r="12"/>
          <text x="${fretX(f)}" y="${y}">${note.name}</text>
        </g>`;
      }
    }

    svg += "</svg>";
    container.innerHTML = svg;

    container.querySelectorAll(".fret-note").forEach((g) => {
      g.addEventListener("click", () => onNoteClick(g));
    });
  }

  function onNoteClick(g) {
    Audio.playTone(parseFloat(g.dataset.freq));
    if (!quiz.active) return;

    quiz.total++;
    if (g.dataset.note === quiz.target) {
      quiz.right++;
      g.classList.add("quiz-correct");
      g.classList.remove("hidden-note");
      setTimeout(nextQuizQuestion, 700);
    } else {
      g.classList.add("quiz-wrong");
      g.classList.remove("hidden-note");
      setTimeout(() => {
        g.classList.remove("quiz-wrong");
        g.classList.add("hidden-note");
      }, 700);
    }
    quizScore.textContent = `${quiz.right} / ${quiz.total}`;
  }

  function nextQuizQuestion() {
    const naturals = ["A", "B", "C", "D", "E", "F", "G"];
    quiz.target = naturals[Math.floor(Math.random() * naturals.length)];
    quizQ.innerHTML = `Find: <b>${quiz.target}</b>`;
    render();
  }

  function onModeChange() {
    quiz.active = modeSel.value === "quiz";
    quizBar.hidden = !quiz.active;
    if (quiz.active) {
      quiz.right = 0;
      quiz.total = 0;
      quizScore.textContent = "0 / 0";
      scaleSel.value = "";
      nextQuizQuestion();
    } else {
      render();
    }
  }

  modeSel.addEventListener("change", onModeChange);
  scaleSel.addEventListener("change", () => {
    if (modeSel.value === "quiz") modeSel.value = "all";
    onModeChange();
  });

  render();
  return { render };
})();

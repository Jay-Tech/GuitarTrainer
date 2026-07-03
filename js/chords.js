// Beginner open-chord library with SVG diagrams and playback.
const Chords = (() => {
  // frets: 6 values low E → high e. -1 = mute, 0 = open, n = fret.
  // fingers: same order, 0 = none.
  const CHORDS = [
    { name: "E minor", sub: "Em — start here", frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0] },
    { name: "E major", sub: "E", frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0] },
    { name: "A minor", sub: "Am", frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0] },
    { name: "A major", sub: "A", frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0] },
    { name: "D major", sub: "D", frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
    { name: "D minor", sub: "Dm", frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1] },
    { name: "C major", sub: "C", frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
    { name: "G major", sub: "G", frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3] },
  ];

  // Semitones from A4 for each open string, low E → high e.
  const OPEN_SEMIS = [-29, -24, -19, -14, -10, -5];

  function diagramSVG(chord) {
    const W = 130, H = 150, LEFT = 20, TOP = 28, COLS = 5, ROWS = 4;
    const colW = (W - LEFT - 10) / COLS;
    const rowH = (H - TOP - 14) / ROWS;
    let s = `<svg class="chord-diagram" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;

    // Nut + frets (horizontal lines).
    s += `<line class="cd-nut" x1="${LEFT}" y1="${TOP}" x2="${LEFT + colW * COLS}" y2="${TOP}"/>`;
    for (let r = 1; r <= ROWS; r++) {
      s += `<line class="cd-line" x1="${LEFT}" y1="${TOP + rowH * r}" x2="${LEFT + colW * COLS}" y2="${TOP + rowH * r}"/>`;
    }
    // Strings (vertical lines), low E on the left.
    for (let c = 0; c <= COLS; c++) {
      s += `<line class="cd-line" x1="${LEFT + colW * c}" y1="${TOP}" x2="${LEFT + colW * c}" y2="${TOP + rowH * ROWS}"/>`;
    }

    chord.frets.forEach((f, i) => {
      const x = LEFT + colW * i;
      if (f === -1) {
        s += `<text class="cd-mute" x="${x}" y="${TOP - 8}">✕</text>`;
      } else if (f === 0) {
        s += `<circle class="cd-open" cx="${x}" cy="${TOP - 12}" r="5"/>`;
      } else {
        const y = TOP + rowH * (f - 0.5);
        s += `<circle class="cd-dot" cx="${x}" cy="${y}" r="8"/>`;
        if (chord.fingers[i]) s += `<text class="cd-finger" x="${x}" y="${y}">${chord.fingers[i]}</text>`;
      }
    });

    return s + "</svg>";
  }

  function strum(chord) {
    chord.frets.forEach((f, i) => {
      if (f < 0) return;
      const freq = Audio.noteFreq(OPEN_SEMIS[i] + f);
      setTimeout(() => Audio.playTone(freq, 1.6), i * 55);
    });
  }

  const grid = document.getElementById("chord-grid");
  CHORDS.forEach((chord, idx) => {
    const card = document.createElement("div");
    card.className = "chord-card";
    card.innerHTML = `<h3>${chord.name}</h3><div class="chord-sub">${chord.sub}</div>${diagramSVG(chord)}<button>▶ Play</button>`;
    card.querySelector("button").addEventListener("click", () => strum(chord));
    grid.appendChild(card);
  });

  return {};
})();

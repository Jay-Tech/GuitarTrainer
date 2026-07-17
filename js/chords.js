// Chord library with SVG diagrams and playback, grouped by difficulty.
const Chords = (() => {
  // frets: 6 values low E → high e. -1 = mute, 0 = open, n = fret.
  // fingers: same order, 0 = none.
  // barre: optional { fret, from, to } (string indexes, low E = 0).
  const CHORDS = [
    // --- Open chords ---
    { group: "Open chords", name: "E minor", sub: "Em", frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0] },
    { group: "Open chords", name: "E major", sub: "E", frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0] },
    { group: "Open chords", name: "A minor", sub: "Am", frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0] },
    { group: "Open chords", name: "A major", sub: "A", frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0] },
    { group: "Open chords", name: "D major", sub: "D", frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
    { group: "Open chords", name: "D minor", sub: "Dm", frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1] },
    { group: "Open chords", name: "C major", sub: "C", frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
    { group: "Open chords", name: "G major", sub: "G", frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3] },

    // --- 7ths & color chords ---
    { group: "7ths & color", name: "E7", sub: "blues staple", frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0] },
    { group: "7ths & color", name: "A7", sub: "blues staple", frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 2, 0, 3, 0] },
    { group: "7ths & color", name: "D7", sub: "", frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3] },
    { group: "7ths & color", name: "G7", sub: "", frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1] },
    { group: "7ths & color", name: "B7", sub: "blues in E needs it", frets: [-1, 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4] },
    { group: "7ths & color", name: "Am7", sub: "", frets: [-1, 0, 2, 0, 1, 0], fingers: [0, 0, 2, 0, 1, 0] },
    { group: "7ths & color", name: "Cadd9", sub: "G's best friend", frets: [-1, 3, 2, 0, 3, 3], fingers: [0, 2, 1, 0, 3, 4] },
    { group: "7ths & color", name: "Dsus4", sub: "", frets: [-1, -1, 0, 2, 3, 3], fingers: [0, 0, 0, 1, 3, 4] },
    { group: "7ths & color", name: "Asus2", sub: "", frets: [-1, 0, 2, 2, 0, 0], fingers: [0, 0, 1, 2, 0, 0] },

    // --- Barre & power ---
    { group: "Barre & power", name: "F major", sub: "the rite of passage", frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1], barre: { fret: 1, from: 0, to: 5 } },
    { group: "Barre & power", name: "B minor", sub: "Bm barre", frets: [-1, 2, 4, 4, 3, 2], fingers: [0, 1, 3, 4, 2, 1], barre: { fret: 2, from: 1, to: 5 } },
    { group: "Barre & power", name: "F# minor", sub: "F#m barre", frets: [2, 4, 4, 2, 2, 2], fingers: [1, 3, 4, 1, 1, 1], barre: { fret: 2, from: 0, to: 5 } },
    { group: "Barre & power", name: "B major", sub: "B barre", frets: [-1, 2, 4, 4, 4, 2], fingers: [0, 1, 2, 3, 4, 1], barre: { fret: 2, from: 1, to: 5 } },
    { group: "Barre & power", name: "E5", sub: "power chord", frets: [0, 2, 2, -1, -1, -1], fingers: [0, 1, 2, 0, 0, 0] },
    { group: "Barre & power", name: "A5", sub: "power chord", frets: [-1, 0, 2, 2, -1, -1], fingers: [0, 0, 1, 2, 0, 0] },
    { group: "Barre & power", name: "D5", sub: "power chord", frets: [-1, -1, 0, 2, 3, -1], fingers: [0, 0, 0, 1, 3, 0] },
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

    // Barre bar first so finger dots render on top of it.
    if (chord.barre) {
      const y = TOP + rowH * (chord.barre.fret - 0.5);
      const x1 = LEFT + colW * chord.barre.from;
      const x2 = LEFT + colW * chord.barre.to;
      s += `<rect class="cd-dot" x="${x1 - 8}" y="${y - 7}" width="${x2 - x1 + 16}" height="14" rx="7"/>`;
    }

    chord.frets.forEach((f, i) => {
      const x = LEFT + colW * i;
      if (f === -1) {
        s += `<text class="cd-mute" x="${x}" y="${TOP - 8}">✕</text>`;
      } else if (f === 0) {
        s += `<circle class="cd-open" cx="${x}" cy="${TOP - 12}" r="5"/>`;
      } else {
        const y = TOP + rowH * (f - 0.5);
        const onBarre = chord.barre && f === chord.barre.fret && i >= chord.barre.from && i <= chord.barre.to;
        if (!onBarre) s += `<circle class="cd-dot" cx="${x}" cy="${y}" r="8"/>`;
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

  // Precisely scheduled strum for play-along. up = upstroke (high strings first).
  function strumAt(chord, when, up = false, duration = 0.5) {
    const sounding = chord.frets
      .map((f, i) => (f < 0 ? null : Audio.noteFreq(OPEN_SEMIS[i] + f)))
      .filter((f) => f !== null);
    if (up) sounding.reverse();
    sounding.forEach((freq, idx) => Audio.playTone(freq, duration, when + idx * 0.012));
  }

  function byName(name) {
    return CHORDS.find((c) => c.name === name);
  }

  const container = document.getElementById("chord-sections");
  const groups = [...new Set(CHORDS.map((c) => c.group))];
  groups.forEach((group) => {
    const h = document.createElement("h2");
    h.className = "chord-group-title";
    h.textContent = group;
    container.appendChild(h);

    const grid = document.createElement("div");
    grid.className = "chord-grid";
    CHORDS.filter((c) => c.group === group).forEach((chord) => {
      const card = document.createElement("div");
      card.className = "chord-card";
      card.innerHTML = `<h3>${chord.name}</h3><div class="chord-sub">${chord.sub || "&nbsp;"}</div>${diagramSVG(chord)}
        <div class="chord-actions">
          <button class="play-btn">▶ Play</button>
          <button class="check-btn">🎤 Check</button>
        </div>
        <div class="check-result"></div>`;
      card.querySelector(".play-btn").addEventListener("click", () => strum(chord));
      const checkBtn = card.querySelector(".check-btn");
      const resultEl = card.querySelector(".check-result");
      checkBtn.addEventListener("click", () => Checker.check(chord, card, checkBtn, resultEl));
      grid.appendChild(card);
    });
    container.appendChild(grid);
  });

  return { CHORDS, strum, strumAt, byName, diagramSVG };
})();

// Interval ear training: hear root + interval, name the interval.
const Ear = (() => {
  const INTERVALS = [
    { semis: 1, name: "Minor 2nd", hint: "Jaws" },
    { semis: 2, name: "Major 2nd", hint: "Happy Birthday" },
    { semis: 3, name: "Minor 3rd", hint: "Smoke on the Water" },
    { semis: 4, name: "Major 3rd", hint: "Oh When the Saints" },
    { semis: 5, name: "Perfect 4th", hint: "Here Comes the Bride" },
    { semis: 6, name: "Tritone", hint: "The Simpsons" },
    { semis: 7, name: "Perfect 5th", hint: "Star Wars" },
    { semis: 8, name: "Minor 6th", hint: "The Entertainer" },
    { semis: 9, name: "Major 6th", hint: "My Bonnie" },
    { semis: 10, name: "Minor 7th", hint: "Star Trek theme" },
    { semis: 11, name: "Major 7th", hint: "Take On Me" },
    { semis: 12, name: "Octave", hint: "Somewhere Over the Rainbow" },
  ];

  const LEVELS = {
    easy: [2, 4, 5, 7, 12],
    medium: [2, 3, 4, 5, 7, 9, 12, 6],
    hard: INTERVALS.map((i) => i.semis),
  };

  const levelSel = document.getElementById("ear-level");
  const descChk = document.getElementById("ear-descending");
  const feedbackEl = document.getElementById("ear-feedback");
  const newBtn = document.getElementById("ear-new");
  const replayBtn = document.getElementById("ear-replay");
  const answersEl = document.getElementById("ear-answers");
  const scoreEl = document.getElementById("ear-score");

  let current = null; // { rootSemis, semis, descending }
  let right = 0, total = 0, answered = true;

  function activeIntervals() {
    const allowed = LEVELS[levelSel.value];
    return INTERVALS.filter((i) => allowed.includes(i.semis));
  }

  function renderAnswers() {
    answersEl.innerHTML = "";
    activeIntervals().forEach((iv) => {
      const btn = document.createElement("button");
      btn.className = "ear-answer";
      btn.innerHTML = `${iv.name}<small>${iv.hint}</small>`;
      btn.addEventListener("click", () => answer(iv, btn));
      answersEl.appendChild(btn);
    });
  }

  function play() {
    if (!current) return;
    const second = current.rootSemis + (current.descending ? -current.semis : current.semis);
    Audio.playTone(Audio.noteFreq(current.rootSemis), 0.9);
    setTimeout(() => Audio.playTone(Audio.noteFreq(second), 0.9), 800);
  }

  function newQuestion() {
    const pool = activeIntervals();
    const iv = pool[Math.floor(Math.random() * pool.length)];
    // Root between A2 and A4 keeps everything in guitar range.
    const rootSemis = -24 + Math.floor(Math.random() * 25);
    const descending = descChk.checked && Math.random() < 0.5;
    current = { rootSemis, semis: iv.semis, descending };
    answered = false;
    feedbackEl.textContent = descending ? "🎧 Listening… (descending)" : "🎧 Listening…";
    feedbackEl.className = "ear-feedback";
    replayBtn.disabled = false;
    answersEl.querySelectorAll(".ear-answer").forEach((b) => b.classList.remove("correct", "wrong"));
    play();
  }

  function answer(iv, btn) {
    if (!current || answered) return;
    answered = true;
    total++;
    const correct = INTERVALS.find((i) => i.semis === current.semis);
    if (iv.semis === current.semis) {
      right++;
      btn.classList.add("correct");
      feedbackEl.textContent = `✅ ${correct.name}!`;
      feedbackEl.className = "ear-feedback good";
    } else {
      btn.classList.add("wrong");
      answersEl.querySelectorAll(".ear-answer").forEach((b) => {
        if (b.textContent.startsWith(correct.name)) b.classList.add("correct");
      });
      feedbackEl.textContent = `❌ It was a ${correct.name} (think "${correct.hint}")`;
      feedbackEl.className = "ear-feedback bad";
    }
    scoreEl.textContent = `Score: ${right} / ${total}`;
  }

  newBtn.addEventListener("click", newQuestion);
  replayBtn.addEventListener("click", play);
  levelSel.addEventListener("change", () => { renderAnswers(); });

  renderAnswers();
  return {};
})();

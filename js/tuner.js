// Tuner: mic capture + autocorrelation pitch detection.
const Tuner = (() => {
  let running = false;
  let stream = null;
  let analyser = null;
  let rafId = null;
  let buf = null;

  const noteEl = document.getElementById("tuner-note");
  const freqEl = document.getElementById("tuner-freq");
  const needleEl = document.getElementById("tuner-needle");
  const centsEl = document.getElementById("tuner-cents");
  const statusEl = document.getElementById("tuner-status");
  const toggleBtn = document.getElementById("tuner-toggle");

  const STRINGS = [
    { name: "E2", freq: 82.41 },
    { name: "A2", freq: 110.0 },
    { name: "D3", freq: 146.83 },
    { name: "G3", freq: 196.0 },
    { name: "B3", freq: 246.94 },
    { name: "E4", freq: 329.63 },
  ];

  // Autocorrelation pitch detection (ACF2+). Returns frequency in Hz or -1.
  function detectPitch(buffer, sampleRate) {
    const SIZE = buffer.length;

    // Signal strength gate — ignore silence.
    let rms = 0;
    for (let i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i];
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) return -1;

    // Trim leading/trailing low-amplitude samples.
    let r1 = 0, r2 = SIZE - 1;
    const thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++) {
      if (Math.abs(buffer[i]) < thres) r1 = i; else break;
    }
    for (let i = 1; i < SIZE / 2; i++) {
      if (Math.abs(buffer[SIZE - i]) < thres) r2 = SIZE - i; else break;
    }
    const trimmed = buffer.slice(r1, r2);
    const N = trimmed.length;
    if (N < 2) return -1;

    // Autocorrelation.
    const c = new Float32Array(N);
    for (let lag = 0; lag < N; lag++) {
      let sum = 0;
      for (let i = 0; i < N - lag; i++) sum += trimmed[i] * trimmed[i + lag];
      c[lag] = sum;
    }

    // Skip the initial peak, find the first real maximum.
    let d = 0;
    while (d < N - 1 && c[d] > c[d + 1]) d++;
    let maxVal = -1, maxPos = -1;
    for (let i = d; i < N; i++) {
      if (c[i] > maxVal) { maxVal = c[i]; maxPos = i; }
    }
    if (maxPos <= 0) return -1;

    // Parabolic interpolation around the peak for sub-sample accuracy.
    let T0 = maxPos;
    const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1] || x2;
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);

    return sampleRate / T0;
  }

  function nearestString(freq) {
    let best = STRINGS[0], bestDiff = Infinity;
    for (const s of STRINGS) {
      const diff = Math.abs(Math.log2(freq / s.freq));
      if (diff < bestDiff) { bestDiff = diff; best = s; }
    }
    return best;
  }

  function update() {
    if (!running) return;
    analyser.getFloatTimeDomainData(buf);
    const ac = Audio.getCtx();
    const freq = detectPitch(buf, ac.sampleRate);

    if (freq > 60 && freq < 1200) {
      const note = Audio.freqToNote(freq);
      noteEl.textContent = note.name + note.octave;
      freqEl.textContent = freq.toFixed(1) + " Hz";
      centsEl.textContent = (note.cents > 0 ? "+" : "") + note.cents + " cents";

      // Map cents (-50..+50) to needle position (0..100%).
      const clamped = Math.max(-50, Math.min(50, note.cents));
      needleEl.style.left = (50 + clamped) + "%";

      const inTune = Math.abs(note.cents) <= 5;
      noteEl.classList.toggle("in-tune", inTune);
      needleEl.classList.toggle("in-tune", inTune);

      const target = nearestString(freq);
      if (inTune) {
        statusEl.textContent = "✅ In tune!";
      } else if (note.cents < 0) {
        statusEl.textContent = "⬆️ Too low — tighten toward " + target.name;
      } else {
        statusEl.textContent = "⬇️ Too high — loosen toward " + target.name;
      }

      // Highlight the closest string button.
      document.querySelectorAll(".string-btn").forEach((btn) => {
        btn.classList.toggle("target", Math.abs(parseFloat(btn.dataset.freq) - target.freq) < 1);
      });
    }
    rafId = requestAnimationFrame(update);
  }

  async function start() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch (err) {
      statusEl.textContent = "⚠️ Microphone access denied — allow mic access to use the tuner.";
      return;
    }
    const ac = Audio.getCtx();
    const source = ac.createMediaStreamSource(stream);
    analyser = ac.createAnalyser();
    analyser.fftSize = 2048;
    buf = new Float32Array(analyser.fftSize);
    source.connect(analyser);
    running = true;
    toggleBtn.textContent = "Stop Tuner";
    toggleBtn.classList.add("running");
    statusEl.textContent = "🎧 Listening… pluck a string";
    if (window.Log) Log.record("tuner");
    update();
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
    toggleBtn.textContent = "Start Tuner";
    toggleBtn.classList.remove("running");
    noteEl.textContent = "—";
    noteEl.classList.remove("in-tune");
    freqEl.textContent = "Press Start and pluck a string";
    statusEl.textContent = "🎯 Tune each string: E A D G B E";
    needleEl.style.left = "50%";
    document.querySelectorAll(".string-btn").forEach((b) => b.classList.remove("target"));
  }

  toggleBtn.addEventListener("click", () => (running ? stop() : start()));

  // Reference tones.
  document.querySelectorAll(".string-btn").forEach((btn) => {
    btn.addEventListener("click", () => Audio.playTone(parseFloat(btn.dataset.freq), 1.5));
  });

  return { stop };
})();

// Mic-based chord checker: strum a chord, FFT → pitch-class chroma,
// compare against the chord's expected notes. Wired to the 🎤 button
// on each chord card.
const Checker = (() => {
  const OPEN_SEMIS = [-29, -24, -19, -14, -10, -5];
  const COLLECT_MS = 1100;  // listen window after the strum onset
  const WAIT_MS = 7000;     // give up if no strum heard

  let stream = null;
  let analyser = null;
  let timeBuf = null;
  let freqBuf = null;
  let rafId = null;
  let state = "idle";       // idle | waiting | collecting
  let collectUntil = 0;
  let waitUntil = 0;
  let chromaSum = null;
  let target = null;        // { chord, card, btn, resultEl }

  function expectedPCs(chord) {
    const set = new Set();
    chord.frets.forEach((f, i) => {
      if (f >= 0) set.add((((OPEN_SEMIS[i] + f + 69) % 12) + 12) % 12);
    });
    return set;
  }

  function currentChroma() {
    analyser.getFloatFrequencyData(freqBuf);
    const ac = Audio.getCtx();
    const binHz = ac.sampleRate / analyser.fftSize;
    const c = new Array(12).fill(0);
    const lo = Math.ceil(70 / binHz), hi = Math.min(freqBuf.length - 1, Math.floor(1100 / binHz));
    for (let bin = lo; bin <= hi; bin++) {
      const f = bin * binHz;
      const mag = Math.pow(10, freqBuf[bin] / 20);
      const pc = (((Math.round(12 * Math.log2(f / 440)) + 69) % 12) + 12) % 12;
      c[pc] += mag;
    }
    return c;
  }

  function rms() {
    analyser.getFloatTimeDomainData(timeBuf);
    let sum = 0;
    for (let i = 0; i < timeBuf.length; i++) sum += timeBuf[i] * timeBuf[i];
    return Math.sqrt(sum / timeBuf.length);
  }

  function setStatus(text, cls) {
    target.resultEl.textContent = text;
    target.resultEl.className = "check-result" + (cls ? " " + cls : "");
  }

  function loop() {
    if (state === "idle") return;
    const now = performance.now();

    if (state === "waiting") {
      if (rms() > 0.025) {
        state = "collecting";
        collectUntil = now + COLLECT_MS;
        chromaSum = new Array(12).fill(0);
        setStatus("🎧 Listening…", "");
      } else if (now > waitUntil) {
        setStatus("Didn't hear anything — check your mic and try again.", "bad");
        stop(false);
        return;
      }
    }

    if (state === "collecting") {
      const c = currentChroma();
      for (let i = 0; i < 12; i++) chromaSum[i] += c[i];
      if (now > collectUntil) {
        evaluate();
        stop(false);
        return;
      }
    }
    rafId = requestAnimationFrame(loop);
  }

  function evaluate() {
    const expected = expectedPCs(target.chord);
    const max = Math.max(...chromaSum, 1e-9);
    const missing = [...expected].filter((pc) => chromaSum[pc] < 0.12 * max);

    if (missing.length === 0) {
      target.card.classList.add("check-ok");
      setStatus("✅ Sounds clean — all chord tones ringing!", "good");
    } else {
      target.card.classList.add("check-bad");
      const names = missing.map((pc) => Audio.NOTE_NAMES[pc]).join(", ");
      setStatus(`⚠️ Weak or muted: ${names}. Check finger pressure and arch.`, "bad");
    }
    if (window.Log) Log.record("check");
  }

  async function check(chord, card, btn, resultEl) {
    stop(true); // cancel any other card's session
    target = { chord, card, btn, resultEl };
    card.classList.remove("check-ok", "check-bad");

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch {
      setStatus("⚠️ Microphone access denied.", "bad");
      return;
    }

    const ac = Audio.getCtx();
    const source = ac.createMediaStreamSource(stream);
    analyser = ac.createAnalyser();
    analyser.fftSize = 8192;
    analyser.smoothingTimeConstant = 0.5;
    timeBuf = new Float32Array(2048);
    freqBuf = new Float32Array(analyser.frequencyBinCount);
    source.connect(analyser);

    state = "waiting";
    waitUntil = performance.now() + WAIT_MS;
    btn.classList.add("running");
    setStatus("🎸 Strum the chord now…", "");
    loop();
  }

  // keepResult=true when another check supersedes this one mid-run.
  function stop(clearTarget) {
    state = "idle";
    if (rafId) cancelAnimationFrame(rafId);
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
    if (target) target.btn.classList.remove("running");
    if (clearTarget) target = null;
  }

  return { check, stop: () => stop(true) };
})();

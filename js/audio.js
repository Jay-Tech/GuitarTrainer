// Shared Web Audio context and tone playback.
const Audio = (() => {
  let ctx = null;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // Play a plucked-string-ish tone at the given frequency.
  // `when` allows precise Web Audio scheduling; defaults to now.
  function playTone(freq, duration = 1.2, when = null) {
    const ac = getCtx();
    const now = when ?? ac.currentTime;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.35, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    gain.connect(ac.destination);

    // Fundamental plus a couple of harmonics so it sounds less like a sine beep.
    [[1, 1], [2, 0.4], [3, 0.15]].forEach(([mult, amp]) => {
      const osc = ac.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq * mult;
      const g = ac.createGain();
      g.gain.value = amp;
      osc.connect(g).connect(gain);
      osc.start(now);
      osc.stop(now + duration);
    });
  }

  // Short click for the metronome. accent = downbeat.
  function playClick(time, accent) {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.frequency.value = accent ? 1600 : 1000;
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    osc.connect(gain).connect(ac.destination);
    osc.start(time);
    osc.stop(time + 0.06);
  }

  const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

  // Frequency of a note given semitones from A4 (440 Hz).
  function noteFreq(semisFromA4) {
    return 440 * Math.pow(2, semisFromA4 / 12);
  }

  // Nearest note to a frequency: returns { name, octave, cents }.
  function freqToNote(freq) {
    const semisFromA4 = 12 * Math.log2(freq / 440);
    const rounded = Math.round(semisFromA4);
    const cents = Math.round((semisFromA4 - rounded) * 100);
    const midi = rounded + 69;
    return {
      name: NOTE_NAMES[((midi % 12) + 12) % 12],
      octave: Math.floor(midi / 12) - 1,
      cents,
    };
  }

  return { getCtx, playTone, playClick, freqToNote, noteFreq, NOTE_NAMES };
})();

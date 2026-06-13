let audioCtx: AudioContext | null = null;
let isRinging = false;
let nextNoteTime = 0;
let timerId: any = null;

export function initAudio() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (Ctx) {
      audioCtx = new Ctx();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function scheduleRing() {
    if (!isRinging || !audioCtx) return;
    
    while (nextNoteTime < audioCtx.currentTime + 0.1) {
        // play two tones
        playTone(440, nextNoteTime, 0.1);
        playTone(480, nextNoteTime, 0.1);
        
        // play another two tones shortly after
        playTone(440, nextNoteTime + 0.2, 0.1);
        playTone(480, nextNoteTime + 0.2, 0.1);

        nextNoteTime += 2.0; // ring every 2 seconds
    }
    timerId = setTimeout(scheduleRing, 50);
}

function playTone(freq: number, time: number, duration: number) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.value = freq;
    
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.3, time + 0.02);
    gain.gain.linearRampToValueAtTime(0, time + duration);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start(time);
    osc.stop(time + duration);
}

export function startRingTone() {
    if (!audioCtx) initAudio();
    if (isRinging) return;
    isRinging = true;
    if (audioCtx) {
        nextNoteTime = audioCtx.currentTime + 0.1;
        scheduleRing();
    }
}

export function stopRingTone() {
    isRinging = false;
    if (timerId) {
        clearTimeout(timerId);
        timerId = null;
    }
}

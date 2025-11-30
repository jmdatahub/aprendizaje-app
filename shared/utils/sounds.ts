import * as Tone from 'tone'

// Click de botón
export const playClick = async () => {
  try {
    await Tone.start();
    const synth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 }
    }).toDestination();
    synth.volume.value = -15; // softer volume
    synth.triggerAttackRelease('C5', '0.05');
  } catch (error) {
    console.error('Error playing click sound:', error);
  }
};

// Éxito/Desbloqueo (acorde ascendente)
export const playSuccess = async () => {
  try {
    await Tone.start()
    const synth = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.2 }
    }).toDestination()
    synth.volume.value = -12 // softer volume
    
    synth.triggerAttackRelease('C5', '0.1')
    setTimeout(() => synth.triggerAttackRelease('E5', '0.1'), 100)
    setTimeout(() => synth.triggerAttackRelease('G5', '0.2'), 200)
  } catch (error) {
    console.error('Error playing success sound:', error)
  }
}

// Error suave
export const playError = async () => {
  try {
    await Tone.start()
    const synth = new Tone.Synth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0.1, release: 0.1 }
    }).toDestination()
    synth.triggerAttackRelease('C3', '0.15')
  } catch (error) {
    console.error('Error playing error sound:', error)
  }
}

// Notificación
export const playNotification = async () => {
  try {
    await Tone.start()
    const synth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.005, decay: 0.1, sustain: 0.2, release: 0.1 }
    }).toDestination()
    
    synth.triggerAttackRelease('G4', '0.1')
    setTimeout(() => synth.triggerAttackRelease('C5', '0.15'), 80)
  } catch (error) {
    console.error('Error playing notification sound:', error)
  }
}

// Mensaje de chat (suave, tipo WhatsApp)
export const playMessage = async () => {
  try {
    await Tone.start();
    const synth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
    }).toDestination();
    synth.volume.value = -10; 
    
    // Un simple "pop" suave
    synth.triggerAttackRelease('E5', '0.05');
  } catch (error) {
    console.error('Error playing message sound:', error);
  }
};



// Sonido de cuenta atrás (pitido clásico de reloj digital)
export const playTick = async () => {
  try {
    await Tone.start();
    const synth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
    }).toDestination();
    synth.volume.value = -5; 
    // Nota aguda y corta, típica de cronómetro
    synth.triggerAttackRelease('A5', '0.05');
  } catch (error) {
    console.error('Error playing tick sound:', error);
  }
};

// Música de fondo: Ambiente sintético suave (sin samples externos para evitar errores)
let backgroundMusic: Tone.Loop | null = null
let bgSynth: Tone.PolySynth | null = null
let isPlaying = false

export const startBackgroundMusic = async () => {
  if (isPlaying) return
  
  try {
    await Tone.start()
    await Tone.Transport.start()
    
    // Sintetizador polifónico para acordes suaves
    bgSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sine" },
      envelope: {
        attack: 2,
        decay: 1,
        sustain: 0.5,
        release: 2
      }
    }).toDestination();
    
    bgSynth.volume.value = -25; // Muy suave de fondo

    // Acordes largos y espaciados para ambiente "general"
    const chords = [
      { time: '0:0', notes: ["C3", "E3", "G3"] },
      { time: '4:0', notes: ["F3", "A3", "C4"] },
      { time: '8:0', notes: ["G3", "B3", "D4"] },
      { time: '12:0', notes: ["A3", "C4", "E4"] },
    ];

    const part = new Tone.Part((time, value) => {
      bgSynth?.triggerAttackRelease(value.notes, "4m", time);
    }, chords).start(0);

    part.loop = true;
    part.loopEnd = "16m";
    
    Tone.Transport.bpm.value = 60;
    isPlaying = true;
    
  } catch (error) {
    console.error('Error starting background music:', error)
  }
}

export const stopBackgroundMusic = () => {
  try {
    Tone.Transport.stop();
    Tone.Transport.cancel(); // Limpiar eventos programados
    
    if (bgSynth) {
      bgSynth.releaseAll();
      bgSynth.dispose();
      bgSynth = null;
    }
    
    isPlaying = false;
  } catch (error) {
    console.error('Error stopping background music:', error)
  }
}
// Sonido de procesamiento (whoosh suave)
export const playProcessing = async () => {
  try {
    await Tone.start();
    const filter = new Tone.Filter(200, "lowpass").toDestination();
    const noise = new Tone.Noise("pink").connect(filter);
    
    // Barrido de filtro
    filter.frequency.rampTo(800, 1);
    
    noise.start();
    noise.volume.rampTo(-10, 0.1);
    
    setTimeout(() => {
      noise.volume.rampTo(-Infinity, 0.5);
      setTimeout(() => noise.stop(), 500);
    }, 1000);

  } catch (error) {
    console.error('Error playing processing sound:', error);
  }
};

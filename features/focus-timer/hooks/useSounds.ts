"use client"

import { useState, useEffect, useCallback, useRef } from "react"

export type BuiltInSound = "bell" | "chime" | "ding" | "gentle" | "alarm-loop"
export type AmbientSound = "none" | "white-noise" | "rain-sim" | "waves" | "forest" | "fire"

interface SoundSettings {
  completionSound: BuiltInSound | string
  ambientSound: AmbientSound | string
  completionVolume: number
  ambientVolume: number
}

export function useSounds() {
  const [settings, setSettings] = useState<SoundSettings>({
    completionSound: "chime",
    ambientSound: "none",
    completionVolume: 0.5,
    ambientVolume: 0.3,
  })

  const [customSounds, setCustomSounds] = useState<Record<string, string>>({})
  const [customAmbientSounds, setCustomAmbientSounds] = useState<Record<string, string>>({})
  
  const audioCtxRef = useRef<AudioContext | null>(null)
  const ambientSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const ambientGainRef = useRef<GainNode | null>(null)
  const loopSourceRef = useRef<AudioBufferSourceNode | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem("focus_timer_sounds")
    if (saved) {
       const parsed = JSON.parse(saved)
       if (parsed.volume !== undefined && parsed.completionVolume === undefined) {
         parsed.completionVolume = parsed.volume
         parsed.ambientVolume = parsed.volume * 0.5
         delete parsed.volume
       }
       setSettings(parsed)
    }
    const savedCustom = localStorage.getItem("focus_timer_custom_sounds")
    if (savedCustom) setCustomSounds(JSON.parse(savedCustom))
    const savedCustomAmbient = localStorage.getItem("focus_timer_custom_ambient")
    if (savedCustomAmbient) setCustomAmbientSounds(JSON.parse(savedCustomAmbient))
  }, [])

  useEffect(() => {
    localStorage.setItem("focus_timer_sounds", JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    localStorage.setItem("focus_timer_custom_sounds", JSON.stringify(customSounds))
  }, [customSounds])

  useEffect(() => {
    localStorage.setItem("focus_timer_custom_ambient", JSON.stringify(customAmbientSounds))
  }, [customAmbientSounds])

  // Global Cleanup on unmount
  useEffect(() => {
    return () => {
      if (ambientSourceRef.current) ambientSourceRef.current.stop()
      if (loopSourceRef.current) (loopSourceRef.current as any).stop?.()
      if (audioCtxRef.current) audioCtxRef.current.close()
    }
  }, [])

  useEffect(() => {
    if (ambientGainRef.current && audioCtxRef.current) {
      ambientGainRef.current.gain.setTargetAtTime(
        settings.ambientVolume * (customAmbientSounds[settings.ambientSound] ? 1 : 1.0),
        audioCtxRef.current.currentTime,
        0.1
      )
    }
  }, [settings.ambientVolume, settings.ambientSound, customAmbientSounds])

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume()
    }
    return audioCtxRef.current
  }

  const playBuiltIn = (type: BuiltInSound, ctx: AudioContext, vol: number, loop = false) => {
    const masterGain = ctx.createGain()
    masterGain.gain.setValueAtTime(vol, ctx.currentTime)
    masterGain.connect(ctx.destination)

    if (type === "bell") {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = "sine"; osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.5, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
      osc.connect(gain).connect(masterGain); osc.start(); osc.stop(ctx.currentTime + 1.5);
    } else if (type === "chime") {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.frequency.setValueAtTime(f, ctx.currentTime + i * 0.1);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.8);
        osc.connect(gain).connect(masterGain); osc.start(ctx.currentTime + i * 0.1); osc.stop(ctx.currentTime + i * 0.1 + 0.8);
      });
    } else if (type === "ding") {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = "triangle"; osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0.4, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain).connect(masterGain); osc.start(); osc.stop(ctx.currentTime + 0.3);
    } else if (type === "gentle") {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = "sine"; osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime); gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.2); gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);
      osc.connect(gain).connect(masterGain); osc.start(); osc.stop(ctx.currentTime + 2);
    } else if (type === "alarm-loop") {
       const osc = ctx.createOscillator(); const gain = ctx.createGain();
       osc.type = "square"; osc.frequency.setValueAtTime(330, ctx.currentTime);
       gain.gain.setValueAtTime(0, ctx.currentTime);
       const now = ctx.currentTime;
       // Schedule beeps for 30 seconds
       for (let t = 0; t < 30; t += 0.5) {
          gain.gain.setValueAtTime(0.25, now + t);
          gain.gain.setValueAtTime(0, now + t + 0.2);
       }
       osc.connect(gain).connect(masterGain); osc.start(); osc.stop(now + 30);
       return { stop: () => { try { osc.stop(); } catch(e) {} } }
    }
  }

  const stopLoop = useCallback(() => {
    if (loopSourceRef.current) {
      try { (loopSourceRef.current as any).stop?.(); } catch(e) {}
      loopSourceRef.current = null
    }
  }, [])

  const playCompletion = useCallback(async (overriddenSound?: string, loop = false) => {
    const ctx = initAudio()
    const soundToPlay = overriddenSound || settings.completionSound
    const vol = settings.completionVolume

    if (loop) stopLoop();

    if (["bell", "chime", "ding", "gentle", "alarm-loop"].includes(soundToPlay)) {
      const source = playBuiltIn(soundToPlay as BuiltInSound, ctx, vol, loop)
      if (loop && source) (loopSourceRef as any).current = source;
    } else if (customSounds[soundToPlay]) {
      try {
        const resp = await fetch(customSounds[soundToPlay]); const arrayBuf = await resp.arrayBuffer();
        const audioBuf = await ctx.decodeAudioData(arrayBuf);
        const source = ctx.createBufferSource(); const gain = ctx.createGain();
        gain.gain.value = vol; source.buffer = audioBuf; 
        if (loop) source.loop = true;
        source.connect(gain).connect(ctx.destination);
        source.start(0);
        if (loop) loopSourceRef.current = source;
      } catch (e) { console.error("Error playing custom sound", e) }
    }
  }, [settings, customSounds, stopLoop])

  const stopAmbient = useCallback(() => {
    if (ambientSourceRef.current) {
      try { 
        ambientSourceRef.current.stop(); 
        ambientSourceRef.current.disconnect();
      } catch(e) {}
      ambientSourceRef.current = null
    }
    if (ambientGainRef.current) {
      try { ambientGainRef.current.disconnect(); } catch(e) {}
      ambientGainRef.current = null
    }
  }, [])

  const startAmbient = useCallback(async (overriddenAmbient?: string) => {
    const ctx = initAudio()
    stopAmbient()
    const ambientType = overriddenAmbient || settings.ambientSound
    if (ambientType === "none") return

    let audioBuffer: AudioBuffer | null = null

    if (customAmbientSounds[ambientType]) {
      try {
        const resp = await fetch(customAmbientSounds[ambientType]); const arrayBuf = await resp.arrayBuffer();
        audioBuffer = await ctx.decodeAudioData(arrayBuf);
      } catch (e) { console.error("Error decoding custom ambient", e); return; }
    } else {
      const bufferSize = 8 * ctx.sampleRate // Longer buffer for more variation
      audioBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = audioBuffer.getChannelData(0)

      if (ambientType === "white-noise") {
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
      } else if (ambientType === "rain-sim") {
        let b0, b1, b2, b3, b4, b5, b6; b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
        }
      } else if (ambientType === "waves") {
        for (let i = 0; i < bufferSize; i++) {
          const t = i / ctx.sampleRate;
          const slowWave = Math.sin(t * Math.PI * 0.08) * 0.5 + 0.5; // ~12s cycle
          const fastRipple = Math.sin(t * Math.PI * 4) * 0.02;
          const noise = Math.random() * 2 - 1;
          data[i] = noise * (slowWave * 0.35 + fastRipple * 0.05);
        }
      } else if (ambientType === "forest") {
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = white * 0.04; // mild wind
          if (Math.random() < 0.0002) {
             const t = i / ctx.sampleRate;
             const freq = 1200 + Math.sin(t * 40) * 400 + Math.random() * 200;
             data[i] += Math.sin(t * 2 * Math.PI * freq) * 0.12;
          }
        }
      } else if (ambientType === "fire") {
         let lastOut = 0.0;
         for (let i = 0; i < bufferSize; i++) {
           const white = Math.random() * 2 - 1;
           // Deeper Brown noise for low rumble
           const brown = (lastOut + (0.015 * white)) / 1.015; lastOut = brown;
           data[i] = brown * 4.5; 
           // Sharp, irregular crackles
           if (Math.random() < 0.0008) {
              const spike = (Math.random() * 2 - 1) * 0.9;
              // Add a small resonance to the crackle
              for (let j = 0; j < 10 && i + j < bufferSize; j++) {
                data[i + j] += spike * Math.exp(-j / 2);
              }
           }
         }
      }
    }

    if (!audioBuffer) return

    const source = ctx.createBufferSource(); source.buffer = audioBuffer; source.loop = true;
    const gain = ctx.createGain(); 
    // Normalize volume: procedural sounds are quieter by design, custom MP3s are loud
    const baseVol = customAmbientSounds[ambientType] ? 1.0 : 2.5;
    gain.gain.value = settings.ambientVolume * baseVol;
    
    source.connect(gain).connect(ctx.destination); source.start();
    ambientSourceRef.current = source; ambientGainRef.current = gain;
  }, [settings.ambientSound, settings.ambientVolume, stopAmbient, customAmbientSounds])

  const addCustomSound = (name: string, base64: string) => {
    setCustomSounds(prev => ({ ...prev, [name]: base64 }))
    setSettings(prev => ({ ...prev, completionSound: name }))
  }

  const addCustomAmbient = (name: string, base64: string) => {
    setCustomAmbientSounds(prev => ({ ...prev, [name]: base64 }))
    setSettings(prev => ({ ...prev, ambientSound: name }))
  }

  const removeCustomSound = (name: string) => {
    const newCustom = { ...customSounds }
    delete newCustom[name]; setCustomSounds(newCustom)
    if (settings.completionSound === name) setSettings(prev => ({ ...prev, completionSound: "chime" }))
  }

  const removeCustomAmbient = (name: string) => {
    const newCustom = { ...customAmbientSounds }
    delete newCustom[name]; setCustomAmbientSounds(newCustom)
    if (settings.ambientSound === name) setSettings(prev => ({ ...prev, ambientSound: "none" }))
  }

  return {
    settings,
    setSettings,
    playCompletion,
    stopLoop,
    startAmbient,
    stopAmbient,
    addCustomSound,
    addCustomAmbient,
    removeCustomSound,
    removeCustomAmbient,
    customSounds,
    customAmbientSounds,
  }
}

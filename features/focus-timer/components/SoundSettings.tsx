"use client"

import { useState, useRef } from "react"
import { Volume2, Music, Wind, Upload, Play, X, Info, Trash2, Speaker } from "lucide-react"
import { BuiltInSound, AmbientSound } from "../hooks/useSounds"

interface SoundSettingsProps {
  settings: any
  setSettings: (s: any) => void
  onClose: () => void
  onPlayPreview: (overriddenSound?: string) => void
  onStartAmbient: (overriddenAmbient?: string) => void
  onStopAmbient: () => void
  addCustomSound: (name: string, b64: string) => void
  addCustomAmbient: (name: string, b64: string) => void
  removeCustomSound: (name: string) => void
  removeCustomAmbient: (name: string) => void
  customSounds: Record<string, string>
  customAmbientSounds: Record<string, string>
}

export function SoundSettings({
  settings,
  setSettings,
  onClose,
  onPlayPreview,
  onStartAmbient,
  onStopAmbient,
  addCustomSound,
  addCustomAmbient,
  removeCustomSound,
  removeCustomAmbient,
  customSounds,
  customAmbientSounds,
}: SoundSettingsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const ambientFileInputRef = useRef<HTMLInputElement>(null)
  const [isPreviewingAmbient, setIsPreviewingAmbient] = useState<string | null>(null)
  
  const handleToggleAmbientPreview = (id: string) => {
    if (isPreviewingAmbient === id) {
      onStopAmbient()
      setIsPreviewingAmbient(null)
    } else {
      onStartAmbient(id)
      setIsPreviewingAmbient(id)
    }
  }

  const handleAmbientSelect = (id: string) => {
    setSettings({ ...settings, ambientSound: id })
    if (isPreviewingAmbient) {
      onStopAmbient()
      setIsPreviewingAmbient(null)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isAmbient: boolean) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert("El archivo es muy grande (máx 2MB)")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (isAmbient) {
        addCustomAmbient(file.name, reader.result as string)
      } else {
        addCustomSound(file.name, reader.result as string)
      }
    }
    reader.readAsDataURL(file)
  }

  const builtInSounds: { id: BuiltInSound; label: string }[] = [
    { id: "chime", label: "Armonía" },
    { id: "bell", label: "Campana" },
    { id: "ding", label: "Ding" },
    { id: "gentle", label: "Suave" },
  ]

  const builtInAmbient: { id: AmbientSound; label: string }[] = [
    { id: "none", label: "Ninguno" },
    { id: "white-noise", label: "Ruido Blanco" },
    { id: "rain-sim", label: "Lluvia" },
    { id: "waves", label: "Océano" },
    { id: "forest", label: "Bosque" },
    { id: "fire", label: "Chimenea" },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/50 rounded-3xl overflow-hidden shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Volume2 className="text-indigo-400 w-6 h-6" />
            Ajustes de Sonido
          </h2>
          <button 
            onClick={() => {
              onStopAmbient()
              onClose()
            }} 
            className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-8 max-h-[75vh] overflow-y-auto pr-2 scrollbar-hide">
          
          {/* Completion Sounds Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-200 uppercase tracking-widest flex items-center gap-2">
                <Music className="w-4 h-4 text-indigo-400" /> Al Finalizar
              </label>
              <div className="flex items-center gap-2 min-w-[120px]">
                <Speaker className="w-3 h-3 text-slate-500" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={settings.completionVolume}
                  onChange={(e) => setSettings({ ...settings, completionVolume: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {builtInSounds.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSettings({ ...settings, completionSound: s.id })
                    onPlayPreview(s.id)
                  }}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all text-left flex items-center justify-between group ${
                    settings.completionSound === s.id
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                      : "bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  {s.label}
                  <Play className={`w-3 h-3 ${settings.completionSound === s.id ? "opacity-100 fill-current" : "opacity-0 group-hover:opacity-100"}`} />
                </button>
              ))}

              {Object.keys(customSounds).map((name) => (
                <div
                  key={name}
                  className={`col-span-1 px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-between gap-2 group ${
                    settings.completionSound === name
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  <button 
                    onClick={() => {
                      setSettings({ ...settings, completionSound: name })
                      onPlayPreview(name)
                    }} 
                    className="flex-1 truncate text-left"
                  >
                    {name}
                  </button>
                  <button onClick={() => removeCustomSound(name)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-3 rounded-xl border border-dashed border-slate-700 text-slate-500 hover:border-indigo-500 hover:text-indigo-400 transition-all flex items-center gap-2 text-sm font-medium"
              >
                <Upload className="w-4 h-4" /> Subir MP3
              </button>
              <input type="file" ref={fileInputRef} onChange={(e) => handleFileUpload(e, false)} accept="audio/*" className="hidden" />
            </div>
          </div>

          {/* Ambient Sounds Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-200 uppercase tracking-widest flex items-center gap-2">
                <Wind className="w-4 h-4 text-emerald-400" /> Sonido Ambiente
              </label>
              <div className="flex items-center gap-2 min-w-[120px]">
                <Speaker className="w-3 h-3 text-slate-500" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={settings.ambientVolume}
                  onChange={(e) => setSettings({ ...settings, ambientVolume: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {builtInAmbient.map((s) => (
                <div
                  key={s.id}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-between gap-3 group ${
                    settings.ambientSound === s.id
                      ? "bg-emerald-600/20 border border-emerald-500/40 text-emerald-200"
                      : "bg-slate-800/40 border border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  <button 
                    onClick={() => {
                        handleAmbientSelect(s.id);
                        if(s.id !== "none") onStartAmbient(s.id);
                    }}
                    className="flex-1 flex items-center gap-2 text-left truncate"
                  >
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${settings.ambientSound === s.id ? "bg-emerald-400 animate-pulse" : "bg-slate-700"}`} />
                    {s.label}
                  </button>
                  
                  {s.id !== "none" && (
                    <button
                      onClick={(e) => {
                          e.stopPropagation();
                          handleToggleAmbientPreview(s.id);
                      }}
                      className={`p-1.5 rounded-lg transition-all ${
                        isPreviewingAmbient === s.id
                          ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30" 
                          : "bg-slate-700/50 text-slate-300 hover:text-white"
                      }`}
                    >
                      {isPreviewingAmbient === s.id ? <X className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
                    </button>
                  )}
                </div>
              ))}
              
              {Object.keys(customAmbientSounds).map((name) => (
                <div
                  key={name}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-between gap-3 group ${
                    settings.ambientSound === name
                      ? "bg-emerald-600/20 border border-emerald-500/40 text-emerald-200"
                      : "bg-slate-800/40 border border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  <button 
                    onClick={() => {
                        handleAmbientSelect(name);
                        onStartAmbient(name);
                    }}
                    className="flex-1 flex items-center gap-2 text-left truncate"
                  >
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${settings.ambientSound === name ? "bg-emerald-400 animate-pulse" : "bg-slate-700"}`} />
                    {name}
                  </button>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleAmbientPreview(name);
                      }}
                      className={`p-1.5 rounded-lg transition-all ${
                        isPreviewingAmbient === name
                          ? "bg-emerald-500 text-white" 
                          : "bg-slate-700/50 text-slate-300 hover:text-white"
                      }`}
                    >
                      {isPreviewingAmbient === name ? <X className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
                    </button>
                    <button 
                      onClick={(e) => {
                          e.stopPropagation();
                          removeCustomAmbient(name);
                      }}
                      className="p-1 px-2 text-slate-600 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={() => ambientFileInputRef.current?.click()}
                className="px-4 py-3 rounded-xl border border-dashed border-slate-700 text-slate-500 hover:border-emerald-500 hover:text-emerald-400 transition-all flex items-center gap-2 text-sm font-medium group"
              >
                <Upload className="w-4 h-4 group-hover:scale-110 transition-transform" /> Subir MP3
              </button>
              <input type="file" ref={ambientFileInputRef} onChange={(e) => handleFileUpload(e, true)} accept="audio/*" className="hidden" />
            </div>

            <div className="flex items-start gap-2 p-4 bg-slate-800/20 rounded-2xl border border-slate-700/30">
              <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-500 leading-relaxed font-bold uppercase tracking-widest opacity-60">
                Los sonidos se reproducen al hacer clic directamente para probarlos. Cada sección tiene su propio control de volumen.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

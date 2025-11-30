"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { playClick } from "@/shared/utils/sounds"
import { generateLearningPath } from "@/features/learning-paths/services/pathGenerator"
import { getActivePath, saveLearningPath, updatePathProgress } from "@/features/learning-paths/services/learningPathsStorage"
import { LearningPath } from "@/features/learning-paths/types"

import { motion, AnimatePresence } from "framer-motion"

export default function RutasPage() {
  const router = useRouter()
  const [topic, setTopic] = useState("")
  const [loading, setLoading] = useState(false)
  const [activePath, setActivePath] = useState<LearningPath | null>(null)
  const [error, setError] = useState("")


  // Load active path on mount
  useEffect(() => {
    const path = getActivePath()
    if (path && !path.completed) {
      setActivePath(path)
    }
  }, [])

  const handleGenerate = async () => {
    if (!topic.trim()) return
    
    playClick()
    setLoading(true)
    setError("")

    try {
      const newPath = await generateLearningPath(topic)
      saveLearningPath(newPath)
      setActivePath(newPath)
      setTopic("")
    } catch (err) {
        if (activePath) {
            const updated = { ...activePath, completed: true };
            saveLearningPath(updated);
        }
        setActivePath(null);
    }
  }

  const handleStartStep = (step: any) => {
    playClick()
    
    let summary = `Aprendiendo sobre ${step.title}`;
    
    try {
        const key = `sector_data_${step.sectorName.toLowerCase()}`;
        const stored = localStorage.getItem(key);
        if (stored) {
            const data = JSON.parse(stored);
            const item = data.items.find((i: any) => i.id === step.learningId);
            if (item) {
                summary = item.summary;
            }
        }
    } catch {}
    
    const params = new URLSearchParams();
    if (step.title) params.set('tema', step.title);
    if (summary) params.set('continueContext', summary);
    if (step.sectorName) params.set('sector', step.sectorName);
    router.push(`/aprender?${params.toString()}`);
  }

  const handleReset = () => {
    if (confirm("¿Quieres borrar esta ruta y crear una nueva?")) {
        if (activePath) {
            const updated = { ...activePath, completed: true };
            saveLearningPath(updated);
        }
        setActivePath(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6 flex flex-col items-center dark:from-slate-900 dark:to-slate-800 transition-colors duration-500">
      
      {/* Chat Overlay */}


      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
            <Link href="/">
                <Button variant="ghost" className="gap-2 text-gray-600 hover:text-gray-900">
                    ← Volver
                </Button>
            </Link>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">Rutas de Aprendizaje</h1>
            <div className="w-20" /> {/* Spacer */}
        </div>

        {!activePath ? (
            /* INPUT VIEW */
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center text-center space-y-8 mt-10"
            >
                <div className="text-6xl mb-4">🗺️</div>
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white">
                    ¿Qué quieres aprender hoy?
                </h2>
                <p className="text-gray-500 dark:text-gray-400 max-w-md">
                    Escribe un tema y crearemos una ruta personalizada de 3 pasos con tus contenidos guardados.
                </p>

                <div className="w-full max-w-md space-y-4">
                    <Input 
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="Ej: nutrición, historia romana, álgebra..."
                        className="text-lg p-6 rounded-xl shadow-sm border-2 border-indigo-100 focus:border-indigo-500 transition-all"
                        onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                        disabled={loading}
                        autoFocus
                    />
                    <Button 
                        onClick={handleGenerate}
                        size="lg"
                        className="w-full text-lg py-6 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all hover:scale-[1.02]"
                        disabled={!topic.trim() || loading}
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <span className="animate-spin">⏳</span> Generando ruta...
                            </span>
                        ) : (
                            "Crear Ruta"
                        )}
                    </Button>
                    {error && (
                        <p className="text-red-500 text-sm animate-in fade-in">{error}</p>
                    )}
                </div>
            </motion.div>
        ) : (
            /* PATH VIEW */
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
            >
                <div className="text-center mb-8">
                    <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider bg-indigo-50 px-3 py-1 rounded-full">
                        Ruta Activa
                    </span>
                    <h2 className="text-3xl font-bold text-gray-800 mt-4 dark:text-white">{activePath.title}</h2>
                    <button 
                        onClick={handleReset}
                        className="text-xs text-gray-400 hover:text-red-500 mt-2 underline"
                    >
                        Borrar y crear nueva
                    </button>
                </div>

                <div className="space-y-6 relative">
                    {/* Connecting Line */}
                    <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-indigo-100 dark:bg-slate-700 -z-10" />

                    {activePath.steps.map((step, index) => (
                        <motion.div 
                            key={step.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.2 }}
                        >
                            <Card className={`overflow-hidden transition-all duration-300 ${
                                index === 0 ? 'border-indigo-500 shadow-md ring-4 ring-indigo-50 dark:ring-indigo-900/20' : 'border-gray-200 opacity-90'
                            }`}>
                                <CardContent className="p-0 flex">
                                    <div className={`w-16 flex items-center justify-center font-bold text-xl ${
                                        index === 0 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'
                                    }`}>
                                        {index + 1}
                                    </div>
                                    <div className="p-6 flex-1">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-lg text-gray-800 dark:text-white">{step.title}</h3>
                                            <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                {step.sectorName}
                                            </span>
                                        </div>
                                        <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium mb-4">
                                            💡 {step.description}
                                        </p>
                                        <Button 
                                            onClick={() => handleStartStep(step)}
                                            size="sm"
                                            variant={index === 0 ? "default" : "outline"}
                                            className={index === 0 ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                                        >
                                            Aprender
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center text-green-800 text-sm">
                    <span className="font-bold">🎯 Objetivo:</span> Completa estos 3 pasos para dominar los conceptos básicos de este tema.
                </div>
            </motion.div>
        )}
      </div>
    </div>
  )
}

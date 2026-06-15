"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { playClick } from "@/shared/utils/sounds"
import { generateLearningPath } from "@/features/learning-paths/services/pathGenerator"
import { getActivePath, getLearningPaths, saveLearningPath } from "@/features/learning-paths/services/learningPathsStorage"
import { LearningPath, PathStep } from "@/features/learning-paths/types"

import { motion } from "framer-motion"

export default function RutasPage() {
  const router = useRouter()
  const [topic, setTopic] = useState("")
  const [loading, setLoading] = useState(false)
  const [activePath, setActivePath] = useState<LearningPath | null>(null)
  const [completedPaths, setCompletedPaths] = useState<LearningPath[]>([])
  const [error, setError] = useState("")


  // Load active + completed paths on mount
  useEffect(() => {
    const path = getActivePath()
    if (path && !path.completed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrates the active learning path once on mount from getActivePath() (reads localStorage, client-only/undefined during SSR) so a lazy useState initializer isn't usable
      setActivePath(path)
    }
    const done = getLearningPaths()
      .filter((p) => p.completed)
      .sort((a, b) => b.updatedAt - a.updatedAt)
    if (done.length > 0) {
      setCompletedPaths(done)
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
    } catch {
        if (activePath) {
            const updated = { ...activePath, completed: true };
            saveLearningPath(updated);
        }
        setActivePath(null);
    }
  }

  const handleStartStep = (step: PathStep) => {
    playClick()

    let summary = `Aprendiendo sobre ${step.title}`;

    try {
        // step.sectorName ahora trae el sector id (p.ej. 'health'); fallback al lowercase para datos antiguos.
        const sectorKey = step.sectorName ?? '';
        const candidates = [
          `sector_data_${sectorKey}`,
          `sector_data_${String(sectorKey).toLowerCase()}`,
        ];
        for (const key of candidates) {
          const stored = localStorage.getItem(key);
          if (!stored) continue;
          const data = JSON.parse(stored);
          const item = data.items?.find((i: { id: string; summary: string }) => i.id === step.learningId);
          if (item) {
            summary = item.summary;
            break;
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
            const updated = { ...activePath, completed: true, updatedAt: Date.now() };
            saveLearningPath(updated);
            setCompletedPaths((prev) => [updated, ...prev.filter((p) => p.id !== updated.id)]);
        }
        setActivePath(null);
    }
  }

  const formatDate = (timestamp: number): string => {
    try {
      return new Date(timestamp).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-3 sm:p-6 pb-mobile-nav flex flex-col items-center dark:from-slate-900 dark:to-slate-800 transition-colors duration-500">
      
      {/* Chat Overlay */}


      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 sm:mb-12 gap-2">
            <Link href="/" className="shrink-0" aria-label="Volver al inicio">
                <Button variant="ghost" size="sm" className="gap-2 text-gray-600 hover:text-gray-900 min-w-[44px] sm:min-w-0 px-3">
                    ← <span className="hidden sm:inline">Volver</span>
                </Button>
            </Link>
            <h1 className="text-base sm:text-xl font-bold text-gray-800 dark:text-white truncate">Rutas de Aprendizaje</h1>
            <div className="w-10 sm:w-20 shrink-0" />
        </div>

        {!activePath ? (
            /* INPUT VIEW */
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center text-center space-y-8 mt-10"
            >
                <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">🗺️</div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white text-balance px-2">
                    ¿Qué quieres aprender hoy?
                </h2>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-md px-2">
                    Escribe un tema y crearemos una ruta personalizada de 3 pasos con tus contenidos guardados.
                </p>

                <div className="w-full max-w-md space-y-3 sm:space-y-4 px-2 sm:px-0">
                    <Input
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="Ej: nutrición, historia romana, álgebra..."
                        className="text-base sm:text-lg p-4 sm:p-6 rounded-xl shadow-sm border-2 border-indigo-100 focus:border-indigo-500 transition-all h-auto"
                        onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                        disabled={loading}
                        autoFocus
                    />
                    <Button
                        onClick={handleGenerate}
                        size="lg"
                        className="w-full text-base sm:text-lg py-4 sm:py-6 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all hover:scale-[1.02] h-auto"
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

                    {/* Progreso de la ruta */}
                    {(() => {
                        const total = activePath.steps.length;
                        const done = activePath.steps.filter((s) => s.completed).length;
                        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                        return (
                            <div className="max-w-sm mx-auto mt-5">
                                <div className="flex justify-between items-center text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                                    <span>Progreso</span>
                                    <span>{done}/{total} ({pct}%)</span>
                                </div>
                                <div
                                    className="h-2.5 w-full bg-indigo-100 dark:bg-slate-700 rounded-full overflow-hidden"
                                    role="progressbar"
                                    aria-valuenow={pct}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-label={`Progreso de la ruta: ${done} de ${total} pasos completados`}
                                >
                                    <div
                                        className="h-full bg-indigo-600 transition-all duration-500"
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })()}
                </div>

                <div className="space-y-6 relative">
                    {/* Connecting Line */}
                    <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-indigo-100 dark:bg-slate-700 -z-10" />

                    {activePath.steps.map((step, index) => {
                        const completed = step.completed;
                        const isCurrent = index === activePath.currentStepIndex && !completed;
                        return (
                        <motion.div
                            key={step.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.2 }}
                        >
                            <Card className={`overflow-hidden transition-all duration-300 ${
                                completed
                                  ? 'border-green-500 ring-2 ring-green-50 dark:ring-green-900/20'
                                  : isCurrent
                                    ? 'border-indigo-500 shadow-md ring-4 ring-indigo-50 dark:ring-indigo-900/20'
                                    : 'border-gray-200 opacity-90'
                            }`}>
                                <CardContent className="p-0 flex">
                                    <div className={`w-12 sm:w-16 shrink-0 flex items-center justify-center font-bold text-lg sm:text-xl ${
                                        completed ? 'bg-green-600 text-white' : isCurrent ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'
                                    }`}>
                                        {completed ? '✓' : index + 1}
                                    </div>
                                    <div className="p-4 sm:p-6 flex-1 min-w-0">
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                                            <h3 className="font-bold text-base sm:text-lg text-gray-800 dark:text-white break-words">{step.title}</h3>
                                            <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-1 rounded self-start truncate max-w-full">
                                                {step.sectorName}
                                            </span>
                                        </div>
                                        <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium mb-4">
                                            💡 {step.description}
                                        </p>
                                        <Button
                                            onClick={() => handleStartStep(step)}
                                            size="sm"
                                            variant={isCurrent ? "default" : "outline"}
                                            className={isCurrent ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                                        >
                                            {completed ? 'Repasar' : 'Aprender'}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                        );
                    })}
                </div>

                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center text-green-800 text-sm">
                    <span className="font-bold">🎯 Objetivo:</span> Completa estos 3 pasos para dominar los conceptos básicos de este tema.
                </div>
            </motion.div>
        )}

        {/* RUTAS COMPLETADAS */}
        {completedPaths.length > 0 && (
            <section className="mt-12" aria-labelledby="rutas-completadas-heading">
                <div className="flex items-center gap-2 mb-4">
                    <h2 id="rutas-completadas-heading" className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                        🏆 Rutas completadas
                    </h2>
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-slate-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
                        {completedPaths.length}
                    </span>
                </div>
                <ul className="space-y-3">
                    {completedPaths.map((path) => (
                        <li key={path.id}>
                            <Card className="border-gray-200 dark:border-slate-700">
                                <CardContent className="p-4 flex items-center gap-3">
                                    <div className="shrink-0 w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 text-lg" aria-hidden="true">
                                        ✓
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-semibold text-sm sm:text-base text-gray-800 dark:text-white truncate">
                                            {path.title}
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            {path.steps.length} {path.steps.length === 1 ? 'paso' : 'pasos'}
                                            {path.updatedAt ? ` · ${formatDate(path.updatedAt)}` : ''}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </li>
                    ))}
                </ul>
            </section>
        )}
      </div>
    </div>
  )
}

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { playClick } from '@/shared/utils/sounds';
import { LearningPath } from '../types';
import { getActivePath, getLearningPaths, deleteLearningPath } from '../services/learningPathsStorage';
import { generateLearningPath } from '../services/pathGenerator';
import { PathDetailModal } from './PathDetailModal';

interface LearningPathsBlockProps {
  onStartLearning: (topic: string, sector: string, learningId: string, pathId: string, stepId: string) => void;
}

const TOPICS = [
  "Nutrición", "Anatomía", "Historia Universal", 
  "Física Cuántica", "Programación", "Economía Básica",
  "Psicología", "Arte Moderno", "Astronomía"
];

export function LearningPathsBlock({ onStartLearning }: LearningPathsBlockProps) {
  const [activePath, setActivePath] = useState<LearningPath | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load active path on mount
  useEffect(() => {
    loadActivePath();
  }, []);

  const loadActivePath = () => {
    const path = getActivePath();
    setActivePath(path || null);
  };

  const handleCreatePath = async (topic: string) => {
    playClick();
    setIsGenerating(true);
    setError(null);
    try {
      const newPath = await generateLearningPath(topic);
      // Save is handled inside generateLearningPath? No, it returns the object.
      // We need to save it.
      const { saveLearningPath } = await import('../services/learningPathsStorage');
      saveLearningPath(newPath);
      
      setActivePath(newPath);
      setShowModal(true);
    } catch (err: any) {
      setError(err.message || "Error al generar la ruta");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeletePath = (id: string) => {
    deleteLearningPath(id);
    setActivePath(null);
    setShowModal(false);
  };

  return (
    <section className="mb-8 animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          🗺️ Rutas de Aprendizaje
          <span className="text-xs font-normal bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Beta</span>
        </h2>
      </div>

      {activePath ? (
        <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
          </div>
          
          <CardContent className="p-6 relative z-10">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-indigo-200 text-sm font-medium mb-1 uppercase tracking-wider">Ruta Activa</div>
                <h3 className="text-2xl font-bold mb-2">{activePath.title}</h3>
                <div className="flex items-center gap-4 text-sm text-indigo-100">
                  <span>{activePath.steps.filter(s => s.completed).length} / {activePath.steps.length} pasos</span>
                  <div className="w-32 h-2 bg-indigo-900/30 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white/90 transition-all duration-500"
                      style={{ width: `${(activePath.steps.filter(s => s.completed).length / activePath.steps.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              <Button 
                onClick={() => { playClick(); setShowModal(true); }}
                className="bg-white text-indigo-600 hover:bg-indigo-50 font-bold shadow-lg"
                size="lg"
              >
                Continuar Ruta
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white dark:bg-slate-800 border-dashed border-2 border-gray-200 dark:border-slate-700">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Crea tu primera ruta inteligente</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                La IA organizará tus aprendizajes en un plan de estudio paso a paso.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center">
                {error}
              </div>
            )}

            {isGenerating ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
                <p className="text-indigo-600 font-medium animate-pulse">Diseñando tu plan de estudios...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {TOPICS.map(topic => (
                  <button
                    key={topic}
                    onClick={() => handleCreatePath(topic)}
                    className="p-3 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-colors border border-gray-100 hover:border-indigo-200 text-left"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showModal && activePath && (
        <PathDetailModal 
          path={activePath} 
          onClose={() => setShowModal(false)}
          onDeletePath={handleDeletePath}
          onStartStep={(step) => {
            setShowModal(false);
            onStartLearning(activePath.title, step.sectorName, step.learningId, activePath.id, step.id);
          }}
        />
      )}
    </section>
  );
}

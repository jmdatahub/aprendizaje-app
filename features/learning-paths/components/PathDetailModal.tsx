import React from 'react';
import { LearningPath, PathStep } from '../types';
import { Button } from '@/components/ui/button';
import { playClick } from '@/shared/utils/sounds';

interface PathDetailModalProps {
  path: LearningPath;
  onClose: () => void;
  onStartStep: (step: PathStep) => void;
  onDeletePath: (pathId: string) => void;
}

export function PathDetailModal({ path, onClose, onStartStep, onDeletePath }: PathDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-start bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800">
          <div>
            <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
              Ruta de Aprendizaje
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
              {path.title}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {path.steps.filter(s => s.completed).length} de {path.steps.length} pasos completados
            </p>
          </div>
          <button 
            onClick={() => { playClick(); onClose(); }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Steps List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {path.steps.map((step, index) => {
            const isCurrent = index === path.currentStepIndex && !path.completed;
            const isLocked = index > path.currentStepIndex && !step.completed;
            
            return (
              <div 
                key={step.id} 
                className={`relative pl-8 border-l-2 transition-all ${
                  step.completed ? 'border-green-500' : isCurrent ? 'border-blue-500' : 'border-gray-200 dark:border-slate-700'
                }`}
              >
                {/* Connector Dot */}
                <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 transition-colors ${
                  step.completed 
                    ? 'bg-green-500 border-green-500' 
                    : isCurrent 
                      ? 'bg-white border-blue-500 animate-pulse' 
                      : 'bg-white border-gray-300 dark:bg-slate-800 dark:border-slate-600'
                }`}>
                  {step.completed && (
                    <svg className="w-3 h-3 text-white absolute top-0 left-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                <div className={`p-4 rounded-xl border transition-all ${
                  isCurrent 
                    ? 'bg-blue-50 border-blue-200 shadow-md dark:bg-slate-800 dark:border-blue-900' 
                    : step.completed
                      ? 'bg-green-50/50 border-green-100 dark:bg-slate-800/50 dark:border-green-900/30'
                      : 'bg-gray-50 border-gray-100 opacity-70 dark:bg-slate-800/30 dark:border-slate-700'
                }`}>
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h3 className={`font-bold text-lg ${step.completed ? 'text-green-700 dark:text-green-400' : 'text-gray-800 dark:text-gray-200'}`}>
                        {step.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 italic">
                        "{step.description}"
                      </p>
                      <div className="mt-2 text-xs font-medium text-gray-400 uppercase">
                        {step.sectorName}
                      </div>
                    </div>
                    
                    {isCurrent && (
                      <Button 
                        onClick={() => { playClick(); onStartStep(step); }}
                        className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 dark:shadow-none"
                      >
                        Estudiar ahora
                      </Button>
                    )}
                    
                    {step.completed && (
                      <span className="shrink-0 text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                        Completado
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          
          {path.completed && (
            <div className="text-center p-8 bg-green-50 rounded-xl border border-green-200 dark:bg-green-900/20 dark:border-green-800">
              <div className="text-4xl mb-2">🏆</div>
              <h3 className="text-xl font-bold text-green-800 dark:text-green-300">¡Ruta Completada!</h3>
              <p className="text-green-600 dark:text-green-400">Has dominado este camino de aprendizaje.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 flex justify-between items-center">
          <button 
            onClick={() => { 
                if(confirm('¿Estás seguro de que quieres eliminar esta ruta?')) {
                    playClick(); 
                    onDeletePath(path.id); 
                }
            }}
            className="text-red-500 hover:text-red-700 text-sm font-medium px-4 py-2 hover:bg-red-50 rounded-lg transition-colors"
          >
            Eliminar ruta
          </button>
          <Button variant="outline" onClick={() => { playClick(); onClose(); }}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}

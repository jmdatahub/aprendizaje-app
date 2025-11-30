'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { sendChatMessage } from '@/lib/apiClient'
import { startBackgroundMusic, stopBackgroundMusic, playTick, playClick } from '@/shared/utils/sounds'
import { useApp, Pregunta } from '@/shared/contexts/AppContext'

// Pregunta type is now imported from AppContext

type Resultado = { total: number; aciertos: number } | null

type Phase = 'loading' | 'intro' | 'test' | 'review' | 'grading' | 'results' | 'restore_prompt'


export default function RepasoPage() {
  const router = useRouter()
  const { testData, testStatus, startTest, resetTest, t } = useApp()

  // Estado principal
  const [phase, setPhase] = useState<Phase>('loading')
  const [preguntas, setPreguntas] = useState<Pregunta[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [resultado, setResultado] = useState<Resultado>(null)
  const [error, setError] = useState('')
  
  // Sincronización de carga
  const [dataReady, setDataReady] = useState(false)
  
  // Estado de transición entre preguntas
  const [isTransitioning, setIsTransitioning] = useState(false)

  // New features state
  const [markedForReview, setMarkedForReview] = useState<number[]>([])
  const [restored, setRestored] = useState(false)

  const TEST_VERSION = 'v2';
  const STORAGE_KEY = 'testProgress_v2';

  // Auto-save logic
  useEffect(() => {
    if (phase === 'test' || phase === 'review') {
      const progress = {
        version: TEST_VERSION,
        phase,
        preguntas,
        currentIndex,
        timeLeft,
        markedForReview,
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } else if (phase === 'results') {
       // Clear on results is handled by clearProgress called on exit
    }
  }, [phase, preguntas, currentIndex, timeLeft, markedForReview]);

  // Load progress on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && !restored && phase === 'loading') {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.version === TEST_VERSION) {
           setPhase('restore_prompt' as any); 
           return;
        }
      } catch (e) {
        console.error("Error parsing saved test", e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const clearProgress = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const musicStartedRef = useRef(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Transición a intro cuando todo esté listo
  useEffect(() => {
    if (dataReady) {
      setPhase('intro');
    }
  }, [dataReady]);

  // Auto-focus al cambiar de pregunta
  useEffect(() => {
    if (phase === 'test' && inputRef.current) {
        inputRef.current.focus();
    }
  }, [currentIndex, phase]);

  // Cargar preguntas desde el contexto
  useEffect(() => {
    // If we are already in progress (from global state), load data directly
    if ((testStatus === 'ready' || testStatus === 'in_progress') && testData.length > 0) {
      setPreguntas(testData);
      setDataReady(true);
    } else {
      // Si no hay datos o no está listo, redirigir o mostrar error
      if (testStatus === 'idle' || testStatus === 'generating') {
        router.push('/');
      } else if (testStatus === 'ready' && testData.length === 0) {
         // Caso de error: dice que está listo pero no hay datos
         console.error("Test status is ready but no data found");
         router.push('/');
      }
    }
  }, [testStatus, testData, router]);

  // Manejo del Temporizador
  useEffect(() => {
    if (phase === 'test' || phase === 'review') {
        if (!musicStartedRef.current) {
          startBackgroundMusic();
          musicStartedRef.current = true;
        }
        
        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 10 && prev > 0) playTick();
                if (prev <= 1) {
                    handleTimeUp();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    } else {
        if (musicStartedRef.current) {
          stopBackgroundMusic();
          musicStartedRef.current = false;
        }
    }
    return () => {
        if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, currentIndex]);

  const handleTimeUp = () => {
      if (phase === 'test') {
          handleNextQuestion();
      } else if (phase === 'review') {
          corregir();
      }
  };

  const startTestSession = () => {
      startTest(); // Update global state to in_progress
      setPhase('test');
      setCurrentIndex(0);
      setTimeLeft(preguntas[0].tiempoLimite);
  };

  const handleNextQuestion = () => {
      if (isTransitioning) return;

      // Iniciar animación de salida
      setIsTransitioning(true);
      
      // Esperar a que termine la animación antes de cambiar de pregunta
      setTimeout(() => {
          if (currentIndex < preguntas.length - 1) {
              setCurrentIndex(prev => prev + 1);
              setTimeLeft(preguntas[currentIndex + 1].tiempoLimite);
          } else {
              startReview();
          }
          // Resetear estado de transición para la animación de entrada
          setIsTransitioning(false);
      }, 300); // Duración de la animación de salida
  };

  const startReview = () => {
      setPhase('review');
      setTimeLeft(60); // 1 minuto
  };

  const onChangeRespuesta = (idx: number, valor: string) => {
    const nuevas = [...preguntas];
    nuevas[idx].respuestaUsuario = valor;
    setPreguntas(nuevas);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleNextQuestion();
      }
  };

  const corregir = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('grading');
    
    let aciertos = 0;
    const preguntasCorregidas = [...preguntas];
    const failedItems: string[] = [];

    await Promise.all(preguntasCorregidas.map(async (p) => {
        const r = p.respuestaUsuario || '';
        
        // Siempre pedimos la respuesta correcta con explicación
        try {
            const prompt = `
            Pregunta: "${p.enunciado}"
            ${p.tipo === 'test' ? `Opciones: ${p.opciones?.join(', ')}` : ''}
            Respuesta del alumno: ${r.trim() ? `"${r}"` : 'Sin respuesta'}
            
            Evalúa la respuesta y proporciona feedback educativo.
            IMPORTANTE: SIEMPRE debes incluir cuál es la respuesta correcta y una breve explicación.
            
            Devuelve SOLO un JSON con este formato:
            {
                "esCorrecta": boolean,
                "respuestaCorrecta": "La respuesta correcta aquí",
                "explicacion": "Breve explicación de por qué es correcta o qué concepto evalúa"
            }`;

            const response = await sendChatMessage([
                { role: 'user', content: prompt }
            ], 'Profesor evaluador que siempre proporciona la respuesta correcta. JSON Only.', { verbosity: 'concise' });
            
            let result = { esCorrecta: false, respuestaCorrecta: '', explicacion: '' };
            const text = response.respuesta || response.content || "{}";
            try {
                const jsonMatch = text.match(/\{.*\}/s);
                result = JSON.parse(jsonMatch ? jsonMatch[0] : text);
            } catch {
                result.esCorrecta = text.toLowerCase().includes('correcta": true');
                result.respuestaCorrecta = "No disponible";
                result.explicacion = text;
            }

            // Construir feedback completo
            if (!r.trim()) {
                p.feedback = `✓ ${t('weekly_test.feedback')} ${result.respuestaCorrecta}\n${result.explicacion}`;
                p.esCorrecta = false;
                failedItems.push(p.aprendizajeId);
            } else if (result.esCorrecta) {
                p.feedback = `¡${t('weekly_test.correct')}! ${result.explicacion}`;
                p.esCorrecta = true;
                aciertos++;
            } else {
                p.feedback = `✓ ${t('weekly_test.feedback')} ${result.respuestaCorrecta}\n${result.explicacion}`;
                p.esCorrecta = false;
                failedItems.push(p.aprendizajeId);
            }
        } catch {
            p.esCorrecta = false;
            p.feedback = t('common.error');
            failedItems.push(p.aprendizajeId);
        }
    }));

    try {
        const storedDecayed = localStorage.getItem('decayed_items');
        const currentDecayed = storedDecayed ? JSON.parse(storedDecayed) : [];
        const newDecayed = [...new Set([...currentDecayed, ...failedItems])];
        localStorage.setItem('decayed_items', JSON.stringify(newDecayed));
    } catch {}

    setPreguntas(preguntasCorregidas);
    setResultado({ total: preguntas.length, aciertos });
    setPhase('results');
    
    try {
      const now = new Date()
      const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
      localStorage.setItem(`repaso_done_${ym}`, '1')
    } catch {}
  };

  // Renders
  if (phase === 'loading') return null;

  if (phase === ('restore_prompt' as any)) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-6 text-white">
      <div className="max-w-md text-center space-y-6 bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-700">
        <div className="text-6xl">💾</div>
        <h1 className="text-2xl font-bold">{t('weekly_test.incomplete_title')}</h1>
        <p className="text-slate-300">
          {t('weekly_test.incomplete_desc')}
        </p>
        <div className="flex flex-col gap-3 pt-4">
          <button 
            onClick={() => {
              const saved = localStorage.getItem(STORAGE_KEY);
              if (saved) {
                const parsed = JSON.parse(saved);
                setPreguntas(parsed.preguntas);
                setCurrentIndex(parsed.currentIndex);
                setTimeLeft(parsed.timeLeft);
                setMarkedForReview(parsed.markedForReview || []);
                setPhase(parsed.phase);
                setRestored(true);
                playClick();
              }
            }}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors"
          >
            {t('weekly_test.continue')}
          </button>
          <button 
            onClick={() => {
              clearProgress();
              setPhase('intro'); // Go to intro instead of loading
              playClick();
            }}
            className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium py-3 rounded-xl transition-colors"
          >
            {t('weekly_test.start_new')}
          </button>
        </div>
      </div>
    </div>
  );

  if (phase === 'intro') return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white">
          <div className="max-w-md text-center space-y-6">
              <div className="text-8xl animate-pulse">⚡</div>
              <h1 className="text-4xl font-bold">{t('weekly_test.intro_title')}</h1>
              <p className="text-lg opacity-90">
                  {t('weekly_test.intro_desc')}
              </p>
              {preguntas.length === 0 ? (
                  <div className="bg-white/20 p-4 rounded-xl">
                      {t('weekly_test.need_more_learnings')}
                      <Link href="/aprender" className="block mt-2 underline font-bold">{t('weekly_test.go_to_learn')}</Link>
                  </div>
              ) : (
                  <button onClick={() => { playClick(); startTestSession() }} className="w-full bg-white text-indigo-600 font-bold text-xl py-4 rounded-2xl shadow-lg hover:scale-105 transition-transform">
                      {t('weekly_test.start_now')}
                  </button>
              )}
          </div>
      </div>
  );

  if (phase === 'test') {
      const p = preguntas[currentIndex];
      // Safety check to prevent runtime error if index is out of bounds during transition
      if (!p) return null;
      
      const totalTime = p.tiempoLimite;
      const progress = (timeLeft / totalTime) * 100;
      const circumference = 2 * Math.PI * 54;
      const strokeDashoffset = circumference - (progress / 100) * circumference;
      
      return (
          <div className="min-h-screen bg-slate-900 text-white flex flex-col">
              <Link 
                  href="/" 
                  onClick={() => { playClick(); stopBackgroundMusic() }}
                  className="fixed top-4 left-4 z-50 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg"
              >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {t('weekly_test.exit')}
              </Link>
              
              <div className="p-6 flex justify-between items-center">
                  <div className="text-sm font-medium text-slate-400">
                      {t('weekly_test.question_counter', { current: currentIndex + 1, total: preguntas.length })}
                  </div>
                  
                  <div className="relative flex items-center justify-center">
                      <svg className="transform -rotate-90" width="120" height="120">
                          <circle cx="60" cy="60" r="54" stroke="currentColor" strokeWidth="8" fill="none" className="text-slate-700" />
                          <circle
                              cx="60" cy="60" r="54" stroke="currentColor" strokeWidth="8" fill="none"
                              strokeDasharray={circumference}
                              strokeDashoffset={strokeDashoffset}
                              className={`transition-all duration-1000 ${timeLeft <= 5 ? 'text-red-500' : timeLeft <= 10 ? 'text-orange-500' : 'text-blue-500'}`}
                              strokeLinecap="round"
                          />
                      </svg>
                      <div className={`absolute inset-0 flex flex-col items-center justify-center ${timeLeft <= 5 ? 'animate-pulse' : ''}`}>
                          <div className={`text-3xl font-bold font-mono ${timeLeft <= 5 ? 'text-red-400' : timeLeft <= 10 ? 'text-orange-400' : 'text-blue-400'}`}>
                              {timeLeft}
                          </div>
                      </div>
                  </div>
              </div>

              {/* Question Container with Animation */}
              <div 
                  key={currentIndex} 
                  className={`flex-1 flex flex-col justify-center px-6 max-w-3xl mx-auto w-full space-y-8 ${
                      isTransitioning ? 'animate-slide-out-left' : 'animate-slide-in-right'
                  }`}
              >
                  <div className="space-y-2">
                      <span className="text-xs font-bold tracking-wider text-indigo-400 uppercase">{p.titulo}</span>
                      <h2 className="text-3xl md:text-4xl font-bold leading-tight">{p.enunciado}</h2>
                  </div>
                  
                  {p.tipo === 'test' && p.opciones ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {p.opciones.map((opcion, idx) => (
                              <button
                                  key={idx}
                                  onClick={() => {
                                      playClick();
                                      onChangeRespuesta(currentIndex, opcion);
                                      setTimeout(handleNextQuestion, 200);
                                  }}
                                  className={`p-6 rounded-xl text-left transition-all ${
                                      p.respuestaUsuario === opcion 
                                      ? 'bg-blue-600 text-white shadow-lg scale-105' 
                                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-2 border-slate-700 hover:border-blue-500'
                                  }`}
                              >
                                  <span className="font-bold mr-2">{String.fromCharCode(65 + idx)}.</span> {opcion}
                              </button>
                          ))}
                      </div>
                  ) : (
                      <textarea
                          ref={inputRef}
                          autoFocus
                          value={p.respuestaUsuario || ''}
                          onChange={(e) => onChangeRespuesta(currentIndex, e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder={t('chat.input_placeholder')}
                          className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl p-6 text-xl text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none transition-colors h-48 resize-none"
                      />
                  )}

                  <button 
                      onClick={() => { playClick(); handleNextQuestion() }}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg py-4 rounded-xl transition-colors"
                  >
                      {currentIndex === preguntas.length - 1 ? t('weekly_test.finish_session') : t('weekly_test.next_question')}
                  </button>
                  
                  <button
                    onClick={() => {
                        playClick();
                        setMarkedForReview(prev => 
                            prev.includes(currentIndex) 
                                ? prev.filter(i => i !== currentIndex)
                                : [...prev, currentIndex]
                        );
                    }}
                    className={`w-full py-2 rounded-full text-sm font-medium transition-colors ${
                        markedForReview.includes(currentIndex)
                            ? 'bg-yellow-500/20 text-yellow-200 hover:bg-yellow-500/30'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {markedForReview.includes(currentIndex) ? t('weekly_test.marked_review') : t('weekly_test.mark_review')}
                  </button>

                  <p className="text-center text-xs text-slate-500">{t('weekly_test.press_enter')}</p>
              </div>
          </div>
      );
  }

  if (phase === 'review') {
      const totalTime = 60; // 1 minuto
      const progress = (timeLeft / totalTime) * 100;
      const circumference = 2 * Math.PI * 45;
      const strokeDashoffset = circumference - (progress / 100) * circumference;
      
      return (
      <div className="min-h-screen bg-amber-50 flex flex-col">
          <Link 
              href="/" 
              onClick={() => { playClick(); stopBackgroundMusic() }}
              className="fixed top-4 left-4 z-50 bg-amber-800 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg"
          >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              {t('weekly_test.exit')}
          </Link>
          
          <div className="sticky top-0 z-10 bg-amber-100 border-b border-amber-200 p-4 flex justify-between items-center shadow-sm">
              <div>
                  <h2 className="text-xl font-bold text-amber-900">{t('weekly_test.review_title')}</h2>
                  <p className="text-xs text-amber-700">{t('weekly_test.review_desc')}</p>
              </div>
              
              <div className="relative flex items-center justify-center">
                  <svg className="transform -rotate-90" width="100" height="100">
                      <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="6" fill="none" className="text-amber-200" />
                      <circle
                          cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="6" fill="none"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          className={`transition-all duration-1000 ${timeLeft <= 15 ? 'text-red-500' : 'text-amber-600'}`}
                          strokeLinecap="round"
                      />
                  </svg>
                  <div className={`absolute inset-0 flex flex-col items-center justify-center ${timeLeft <= 15 ? 'animate-pulse' : ''}`}>
                      <div className={`text-2xl font-bold font-mono ${timeLeft <= 15 ? 'text-red-600' : 'text-amber-900'}`}>
                          {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                      </div>
                  </div>
              </div>
              
              {markedForReview.length > 0 && (
                  <div className="mt-2 px-4 pb-2 flex gap-2 overflow-x-auto">
                      <span className="text-xs font-bold text-amber-800 self-center shrink-0">{t('weekly_test.review_question')}</span>
                      {markedForReview.map(idx => (
                          <button
                              key={idx}
                              onClick={() => {
                                  const element = document.getElementById(`question-${idx}`);
                                  element?.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="w-6 h-6 rounded-full bg-yellow-500 text-white text-xs font-bold flex items-center justify-center shrink-0 hover:bg-yellow-600"
                          >
                              {idx + 1}
                          </button>
                      ))}
                  </div>
              )}
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl mx-auto w-full">
              {preguntas.map((p, idx) => (
                  <div key={idx} id={`question-${idx}`} className={`bg-white p-6 rounded-xl shadow-sm border ${markedForReview.includes(idx) ? 'border-yellow-400 ring-2 ring-yellow-100' : 'border-amber-100'}`}>
                      <div className="flex justify-between mb-2">
                          <span className="text-xs font-bold text-amber-500">{t('weekly_test.question_counter', { current: idx + 1, total: preguntas.length })}</span>
                          <span className="text-xs text-gray-400">{p.titulo}</span>
                      </div>
                      <p className="font-medium text-gray-800 mb-3">{p.enunciado}</p>
                      {p.tipo === 'test' && p.opciones ? (
                          <div className="grid grid-cols-2 gap-2">
                              {p.opciones.map((op, i) => (
                                  <button 
                                      key={i} 
                                      onClick={() => { playClick(); onChangeRespuesta(idx, op) }}
                                      className={`p-2 rounded border text-sm transition-all ${
                                          p.respuestaUsuario === op 
                                          ? 'bg-amber-500 border-amber-600 text-white font-medium' 
                                          : 'bg-gray-50 hover:bg-amber-50 hover:border-amber-300'
                                      }`}
                                  >
                                      {op}
                                  </button>
                              ))}
                          </div>
                      ) : (
                          <textarea
                              value={p.respuestaUsuario || ''}
                              onChange={(e) => onChangeRespuesta(idx, e.target.value)}
                              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-700 focus:border-amber-500 focus:outline-none"
                              rows={2}
                          />
                      )}
                  </div>
              ))}
          </div>

          <div className="p-6 border-t border-amber-200 bg-amber-50">
              <button 
                  onClick={() => { playClick(); corregir() }}
                  className="w-full max-w-3xl mx-auto block bg-green-600 hover:bg-green-700 text-white font-bold text-xl py-4 rounded-xl shadow-md transition-colors"
              >
                  {t('weekly_test.evaluate')}
              </button>
          </div>
      </div>
      );
  }

  if (phase === 'grading') return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-indigo-900 overflow-hidden relative">
          <div className="absolute inset-0 opacity-10">
              <svg className="w-full h-full">
                  {[...Array(5)].map((_, i) => (
                      <line key={i} x1="0" y1={`${i * 25}%`} x2="100%" y2={`${i * 25}%`} stroke="white" strokeWidth="1" strokeDasharray="5,5" style={{ animation: `dash 2s linear infinite` }} />
                  ))}
              </svg>
          </div>

          <div className="relative z-10 flex flex-col items-center">
              <div className="relative w-48 h-48 mb-8">
                  <div className="absolute top-0 left-0 text-7xl animate-spin" style={{ animationDuration: '3s' }}>⚙️</div>
                  <div className="absolute bottom-0 right-0 text-5xl" style={{ animation: 'spin-reverse 2s linear infinite' }}>⚙️</div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl animate-pulse">🤖</div>
              </div>

              <h2 className="text-2xl font-bold text-white mb-4">{t('weekly_test.analyzing')}</h2>
              
              <div className="w-64 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500" style={{ animation: 'progress 2s ease-in-out infinite' }} />
              </div>
          </div>
          <style jsx>{`
              @keyframes spin-reverse { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
              @keyframes progress { 0% { width: 0%; } 50% { width: 70%; } 100% { width: 100%; } }
              @keyframes dash { to { stroke-dashoffset: -10; } }
          `}</style>
      </div>
  );

  return (
      <div className="min-h-screen bg-slate-50 p-6">
          <div className="max-w-3xl mx-auto">
              <div className="text-center mb-8">
                  <div className="text-6xl mb-2">
                      {resultado && resultado.aciertos >= 5 ? '🎉' : '💪'}
                  </div>
                  <h1 className="text-3xl font-bold text-slate-800">{t('weekly_test.results_title')}</h1>
                  <p className="text-xl text-slate-600 mt-2">
                      {t('weekly_test.score')} <span className="font-bold text-blue-600">{resultado?.aciertos}</span> / <span className="font-bold">{resultado?.total}</span>
                  </p>
                  <Link href="/" onClick={() => { playClick(); resetTest(); clearProgress(); }} className="inline-block mt-6 px-6 py-3 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700">
                      {t('weekly_test.back_home')}
                  </Link>
              </div>

              <div className="space-y-4">
                  {preguntas.map((p, idx) => (
                      <div key={idx} className={`p-6 rounded-xl border-l-4 shadow-sm bg-white ${p.esCorrecta ? 'border-green-500' : 'border-red-500'}`}>
                          <div className="flex justify-between items-start mb-2">
                              <h3 className="font-bold text-slate-800">{p.enunciado}</h3>
                              <div className="flex gap-2">
                                {markedForReview.includes(idx) && (
                                  <span className="text-xs font-bold px-2 py-1 rounded bg-yellow-100 text-yellow-700 border border-yellow-200">
                                    {t('weekly_test.marked')}
                                  </span>
                                )}
                                <span className={`text-xs font-bold px-2 py-1 rounded ${p.esCorrecta ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {p.esCorrecta ? t('weekly_test.correct') : t('weekly_test.improvable')}
                                </span>
                              </div>
                          </div>
                          <div className="mb-3">
                              <p className="text-xs text-slate-400 mb-1">{t('weekly_test.your_answer')}</p>
                              <p className="text-slate-700 italic">"{p.respuestaUsuario}"</p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded text-sm text-slate-600">
                              <strong>{t('weekly_test.feedback')}</strong> {p.feedback}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </div>
  );
}

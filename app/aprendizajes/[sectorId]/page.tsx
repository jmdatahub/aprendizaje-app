"use client"

// Pagina: aprendizajes por sector
// - Lee sectorId con useParams
// - Llama a /api/aprendizajes y filtra por sector_id
// - Renderiza cards tipo carpeta; al hacer clic, muestra el resumen completo en un panel sencillo
// - Incluye volver al mapa e ir al chat con el tema del sector

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import ReactMarkdown from 'react-markdown'
import { motion, AnimatePresence } from 'framer-motion'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useApp } from "@/shared/contexts/AppContext"

import { SECTORES_DATA } from "@/shared/constants/sectores"

const COLOR_CLASSES: Record<string, string> = {
  green: 'bg-green-50 text-green-900 border-green-200',
  blue: 'bg-blue-50 text-blue-900 border-blue-200',
  purple: 'bg-purple-50 text-purple-900 border-purple-200',
  yellow: 'bg-yellow-50 text-yellow-900 border-yellow-200',
  red: 'bg-red-50 text-red-900 border-red-200',
  orange: 'bg-orange-50 text-orange-900 border-orange-200',
  pink: 'bg-pink-50 text-pink-900 border-pink-200',
  teal: 'bg-teal-50 text-teal-900 border-teal-200',
  indigo: 'bg-indigo-50 text-indigo-900 border-indigo-200',
}

type Aprendizaje = {
  id: string
  title: string
  summary: string
  date: string
}

type SortOption = 'date' | 'title'
type DateSortDirection = 'desc' | 'asc'

export default function SectorAprendizajesPage() {
  const params = useParams<{ sectorId: string }>()
  const router = useRouter()
  const { t, formatDate } = useApp()
  const sectorId = params?.sectorId;
  
  const sectorInfo: any = useMemo(() => {
    if (!sectorId) return null;
    // Find by ID (string)
    let found = SECTORES_DATA.find(s => s.id === sectorId);
    // Fallback for old numeric IDs if they come in the URL
    if (!found) {
       const numericIdMap: Record<string, string> = {
          '1': 'health', '2': 'nature', '3': 'physics', '4': 'math',
          '5': 'tech', '6': 'history', '7': 'arts', '8': 'economy', '9': 'society'
       };
       const coreId = numericIdMap[sectorId];
       if (coreId) found = SECTORES_DATA.find(s => s.id === coreId);
    }
    
    if (found) {
       return { ...found, nombre: t(`sectors.${found.key}`) };
    }
    return null;
  }, [sectorId, t]);

  const [items, setItems] = useState<Aprendizaje[]>([])
  const [loading, setLoading] = useState(true)
  const [seleccionado, setSeleccionado] = useState<Aprendizaje | null>(null)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('date')
  const [dateSortDirection, setDateSortDirection] = useState<DateSortDirection>('desc')
  const [showOnlyPendingReview, setShowOnlyPendingReview] = useState(false)
  const [pendingReviewIds, setPendingReviewIds] = useState<string[]>([])

  useEffect(() => {
    if (!sectorInfo) {
      setLoading(false);
      return;
    }

    // Leer de LocalStorage
    try {
      const key = `sector_data_${sectorInfo.id}`;
      let stored = localStorage.getItem(key);

      // Migration: fallback to old key (localized name based)
      if (!stored) {
        const oldKey = `sector_data_${sectorInfo.nombre.toLowerCase()}`;
        stored = localStorage.getItem(oldKey);
        if (stored) {
           localStorage.setItem(key, stored);
        }
      }

      if (stored) {
        const data = JSON.parse(stored);
        if (data && Array.isArray(data.items)) {
          setItems(data.items);
        }
      }
    } catch (e) {
      console.error("Error loading sector data", e);
    } finally {
      setLoading(false);
    }
  }, [sectorInfo]);

  // Load pending review items
  useEffect(() => {
    try {
      const decayedIds = JSON.parse(localStorage.getItem('decayed_items') || '[]');
      setPendingReviewIds(decayedIds);
    } catch (e) {
      console.error("Error loading pending review items", e);
    }
  }, []);

  // Estado para edición de títulos
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const handleStartEdit = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    setEditingId(item.id);
    setEditTitle(item.title);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
  };

  const handleSaveEdit = (id: string) => {
    if (!editTitle.trim()) return;

    // 1. Actualizar estado local
    const updatedItems = items.map(it => 
      it.id === id ? { ...it, title: editTitle.trim() } : it
    );
    setItems(updatedItems);

    // 2. Actualizar localStorage
    try {
      const sectorKey = `sector_data_${sectorInfo?.id}`;
      const stored = localStorage.getItem(sectorKey);
      if (stored) {
        const data = JSON.parse(stored);
        data.items = data.items.map((it: any) => 
          it.id === id ? { ...it, title: editTitle.trim() } : it
        );
        localStorage.setItem(sectorKey, JSON.stringify(data));
      }
    } catch (e) {
      console.error("Error saving edited title", e);
    }

    setEditingId(null);
    setEditTitle("");
  };

  // Filtrado y ordenamiento
  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.title.toLowerCase().includes(query) ||
        item.summary.toLowerCase().includes(query)
      );
    }

    // Filtrar por pendientes de repaso
    if (showOnlyPendingReview) {
      result = result.filter(item => pendingReviewIds.includes(item.id));
    }

    // Ordenar
    switch (sortBy) {
      case 'date':
        if (dateSortDirection === 'desc') {
          result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        } else {
          result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }
        break;
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    return result;
  }, [items, searchQuery, sortBy, dateSortDirection, showOnlyPendingReview, pendingReviewIds]);


  const handleCloseModal = () => {
    setSeleccionado(null)
  }

  if (!sectorInfo) {
    return <div className="p-8 text-center">Sector no encontrado</div>
  }

  const themeClass = COLOR_CLASSES[sectorInfo.color] || 'bg-gray-50 text-gray-900';

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 md:p-12">
      <div className="mx-auto max-w-7xl"> {/* Increased max-width */}
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al mapa
            </Button>
          </Link>
        </motion.div>

        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-10 rounded-3xl p-8 shadow-sm border ${themeClass}`}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="text-6xl bg-white/50 p-4 rounded-2xl shadow-sm backdrop-blur-sm">
                {sectorInfo.icono}
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-2">{t(`sectors.${sectorInfo.key}`)}</h1>
                <p className="opacity-80 text-sm max-w-md">
                  Tu colección de conocimientos sobre este tema.
                </p>
              </div>
            </div>
            
            <div>
              <Button 
                variant="outline" 
                size="lg" 
                className="bg-white/80 hover:bg-white"
                onClick={() => {
                  const params = new URLSearchParams();
                  if (sectorInfo.key) params.set('tema', t(`sectors.${sectorInfo.key}`));
                  if (sectorInfo.key) params.set('sector', sectorInfo.key);
                  router.push(`/aprender?${params.toString()}`);
                }}
              >
                {t('sector_page.start_chat', { sector: t(`sectors.${sectorInfo.key}`) })}
              </Button>
            </div>
          </div>
        </motion.header>

        {loading ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-20 text-center opacity-50"
          >
            Cargando conocimientos...
          </motion.div>
        ) : items.length > 0 ? (
          <>
            {/* Filtros y búsqueda */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6"
            >
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Buscador */}
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                      <Input
                        type="text"
                        placeholder="Buscar por título o contenido..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {/* Selector de ordenamiento */}
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant={sortBy === 'date' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          if (sortBy === 'date') {
                            // Toggle direction if already on date sort
                            setDateSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
                          } else {
                            // Switch to date sort with default descending
                            setSortBy('date');
                            setDateSortDirection('desc');
                          }
                        }}
                        className="gap-1 h-8 text-xs px-3"
                      >
                        📅 {sortBy === 'date' 
                          ? (dateSortDirection === 'desc' ? 'Más reciente' : 'Más antiguo') 
                          : 'Fecha'}
                      </Button>
                      <Button
                        variant={sortBy === 'title' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSortBy('title')}
                      >
                        🔤 Título
                      </Button>
                      <div className="w-px bg-gray-200" />
                      <Button
                        variant={showOnlyPendingReview ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setShowOnlyPendingReview(prev => !prev)}
                        className="gap-1"
                      >
                        ⚠️ Pendientes de Repaso
                        {showOnlyPendingReview && pendingReviewIds.length > 0 && (
                          <span className="ml-1 text-xs bg-white/20 px-1.5 py-0.5 rounded-full">
                            {pendingReviewIds.length}
                          </span>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Contador de resultados */}
                  <motion.div 
                    key={filteredAndSortedItems.length}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-3 text-sm text-gray-500"
                  >
                    {searchQuery || showOnlyPendingReview ? (
                      <span>
                        {filteredAndSortedItems.length} resultado{filteredAndSortedItems.length !== 1 ? 's' : ''} encontrado{filteredAndSortedItems.length !== 1 ? 's' : ''}
                        {showOnlyPendingReview && ' (pendientes de repaso)'}
                      </span>
                    ) : (
                      <span>{filteredAndSortedItems.length} aprendizaje{filteredAndSortedItems.length !== 1 ? 's' : ''}</span>
                    )}
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Grid de aprendizajes */}
            <AnimatePresence mode="popLayout">
              {filteredAndSortedItems.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-12 text-gray-500"
                >
                  No se encontraron resultados para "{searchQuery}"
                </motion.div>
              ) : (
                <motion.div 
                  layout
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                >
                  {filteredAndSortedItems.map((it, index) => {
                    const needsReview = pendingReviewIds.includes(it.id);
                    return (
                      <motion.div
                        key={it.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ 
                          delay: index * 0.05,
                          duration: 0.3,
                          layout: { duration: 0.3 }
                        }}
                        whileHover={{ scale: 1.02, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setSeleccionado(it)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              setSeleccionado(it);
                            }
                          }}
                          className={`group relative flex flex-col text-left rounded-2xl p-4 shadow-sm hover:shadow-md transition-all border h-full w-full overflow-hidden cursor-pointer ${
                            needsReview 
                              ? 'bg-amber-50/70 border-amber-200 hover:border-amber-300' 
                              : 'bg-white border-gray-100 hover:border-blue-100'
                          }`}
                        >
                          {/* Worn effect overlay for items needing review */}
                          {needsReview && (
                            <div className="absolute inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] opacity-30 mix-blend-multiply"></div>
                          )}
                          
                          <div className="relative z-10">
                            <div className="mb-3 flex items-center justify-between gap-2">
                              <span className={`text-[10px] font-medium px-2 py-1 rounded-md ${
                                needsReview ? 'text-amber-600 bg-amber-100' : 'text-gray-400 bg-gray-50'
                              }`}>
                                {formatDate(it.date)}
                              </span>
                              {needsReview && (
                                <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full animate-pulse">
                                  Repasar
                                </span>
                              )}
                            </div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              {editingId === it.id ? (
                                <div className="flex-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveEdit(it.id);
                                      if (e.key === 'Escape') handleCancelEdit();
                                    }}
                                    className="flex-1 text-base font-bold border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleSaveEdit(it.id)}
                                    className="p-1 text-green-600 hover:bg-green-100 rounded-full"
                                    title="Guardar"
                                  >
                                    ✓
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="p-1 text-red-600 hover:bg-red-100 rounded-full"
                                    title="Cancelar"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <div className="flex-1 flex items-start justify-between group/title">
                                  <h3 className={`text-base font-bold transition-colors line-clamp-2 ${
                                    needsReview 
                                      ? 'text-amber-900 group-hover:text-amber-700' 
                                      : 'text-gray-800 group-hover:text-blue-600'
                                  }`}>
                                    {it.title}
                                  </h3>
                                  <button
                                    onClick={(e) => handleStartEdit(e, it)}
                                    className="opacity-0 group-hover/title:opacity-100 p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                                    title="Editar título"
                                  >
                                    ✏️
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className={`text-xs line-clamp-4 leading-relaxed ${
                              needsReview ? 'text-amber-800' : 'text-gray-500'
                            }`}>
                              <ReactMarkdown allowedElements={['p', 'strong', 'em']}>
                                {it.summary}
                              </ReactMarkdown>
                            </div>
                            <div className={`mt-auto pt-3 text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity ${
                              needsReview ? 'text-amber-600' : 'text-blue-500'
                            }`}>
                              Leer completo →
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200"
          >
            <div className="text-4xl mb-4 opacity-30">📭</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">{t('sector_page.empty_state')}</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              {t('sector_page.start_chat', { sector: t(`sectors.${sectorInfo.key}`) })}
            </p>
            <Button 
              size="lg"
              onClick={() => {
                const params = new URLSearchParams();
                if (sectorInfo.key) params.set('tema', t(`sectors.${sectorInfo.key}`));
                if (sectorInfo.key) params.set('sector', sectorInfo.key);
                router.push(`/aprender?${params.toString()}`);
              }}
            >
              Empezar ahora
            </Button>
          </motion.div>
        )}

        {/* Modal de Detalle */}
        <AnimatePresence>
          {seleccionado && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" 
              onClick={handleCloseModal}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", duration: 0.3 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
              >
                {/* Header del Modal */}
                <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">{sectorInfo.icono}</span>
                      <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md ${themeClass.split(' ')[0]} ${themeClass.split(' ')[1]}`}>
                        {t(`sectors.${sectorInfo.key}`)}
                      </span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-800 leading-tight">{seleccionado.title}</h2>
                    <p className="text-sm text-gray-500 mt-2 flex items-center gap-2">
                      <span>📅 {formatDate(seleccionado.date)}</span>
                    </p>
                  </div>
                  <button 
                    onClick={handleCloseModal}
                    className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                
                {/* Contenido del Modal */}
                <div className="p-8 md:p-10 overflow-y-auto prose prose-lg prose-slate max-w-none flex-1 text-gray-800">
                  <ReactMarkdown>{seleccionado.summary}</ReactMarkdown>
                </div>
                
                {/* Footer del Modal con Acciones */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-end gap-3">
                  <Button 
                    variant="outline"
                    onClick={handleCloseModal}
                  >
                    Cerrar
                  </Button>
                  <Button
                    onClick={() => {
                      const params = new URLSearchParams();
                      if (seleccionado.title) params.set('tema', seleccionado.title);
                      if (seleccionado.summary) params.set('continueContext', seleccionado.summary);
                      if (sectorInfo.key) params.set('sector', sectorInfo.key);
                      router.push(`/aprender?${params.toString()}`);
                      setSeleccionado(null);
                    }}
                    className="flex items-center justify-center gap-2"
                  >
                    <span>💬</span>
                    <span>{t('chat.continue_intent', { topic: '' }).replace(':', '')}</span>
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Overlay */}

      </div>
    </div>
  )
}

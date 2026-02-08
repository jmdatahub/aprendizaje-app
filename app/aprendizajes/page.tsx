'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import { motion, AnimatePresence } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { UnifiedTutorChat } from "@/features/chat/components/UnifiedTutorChat"
import { playClick } from "@/shared/utils/sounds"
import { CollapsibleReviewSection } from "@/features/repaso/components/CollapsibleReviewSection"
import { chatStorage } from "@/features/chat/services/chatStorage"
import { MiniTimeline } from "@/features/aprendizajes/components/MiniTimeline"
import { TrashModal } from "@/shared/components/TrashModal"
import { useApp } from "@/shared/contexts/AppContext"

import { SECTORES_DATA } from "@/shared/constants/sectores"

type ReviewEntry = {
  date: string;
  notes?: string;
}

type Item = { 
  id: string
  title: string
  summary: string
  tags?: string[]
  date: string
  learnedDate?: string
  reviewHistory?: ReviewEntry[]
  sectorId: string
  sectorName: string
  sectorIcon: string
  isFavorite?: boolean
}

type SortOption = 'date' | 'category' | 'title'
type DateSortDirection = 'desc' | 'asc'

// Wrapper component to handle Suspense boundary for useSearchParams
export default function AprendizajesPage() {
  return (
    <Suspense fallback={<AprendizajesLoadingFallback />}>
      <AprendizajesContent />
    </Suspense>
  )
}

function AprendizajesLoadingFallback() {
  return (
    <div className="min-h-screen bg-background p-6 md:p-12 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    </div>
  )
}

function AprendizajesContent() {
  const { t, formatDate } = useApp()
  const searchParams = useSearchParams()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [seleccionado, setSeleccionado] = useState<Item | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('date')
  const [dateSortDirection, setDateSortDirection] = useState<DateSortDirection>('desc')
  const [showOnlyPendingReview, setShowOnlyPendingReview] = useState(false)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [pendingReviewIds, setPendingReviewIds] = useState<string[]>([])
  const [isChatting, setIsChatting] = useState(false)
  const [isFocusMode, setIsFocusMode] = useState(false)
  const [viewMode, setViewMode] = useState<'normal' | 'compact'>('normal')

  const [questions, setQuestions] = useState<string[]>([])
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [chatIdToOpen, setChatIdToOpen] = useState<string | undefined>(undefined)
  const [showTrashModal, setShowTrashModal] = useState(false)

  // Auto-activate pending filter from URL parameter
  useEffect(() => {
    if (searchParams.get('pending') === 'true') {
      setShowOnlyPendingReview(true)
    }
  }, [searchParams])

  useEffect(() => {
    const allItems: Item[] = [];

    SECTORES_DATA.forEach(sector => {
      try {
        // Try new key (ID-based)
        const key = `sector_data_${sector.id}`;
        let stored = localStorage.getItem(key);

        // Migration: fallback to old key (localized name based)
        if (!stored) {
          const oldKey = `sector_data_${t(`sectors.${sector.key}`).toLowerCase()}`;
          stored = localStorage.getItem(oldKey);
          if (stored) {
             localStorage.setItem(key, stored);
          }
        }

        if (stored) {
          const data = JSON.parse(stored);
          if (data && Array.isArray(data.items)) {
            data.items.forEach((it: any) => {
              allItems.push({
                id: it.id,
                title: it.title || "Sin título",
                summary: it.summary || "",
                tags: it.tags || [],
                date: it.date || new Date().toISOString(),
                learnedDate: it.learnedDate || it.date || new Date().toISOString(),
                reviewHistory: it.reviewHistory || [],
                sectorId: sector.id,
                sectorName: t(`sectors.${sector.key}`),
                sectorIcon: sector.icono,
                isFavorite: it.isFavorite || false
              });
            });
          }
        }
      } catch (e) {
        console.error(`Error loading data for sector ${sector.key}`, e);
      }
    });

    setItems(allItems);
    setLoading(false);
  }, [])

  const handleToggleFavorite = (e: React.MouseEvent, item: Item) => {
    e.stopPropagation();
    const newStatus = !item.isFavorite;
    
    // Update local state
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, isFavorite: newStatus } : i));
    if (seleccionado?.id === item.id) {
        setSeleccionado(prev => prev ? { ...prev, isFavorite: newStatus } : null);
    }

    // Update localStorage
    try {
        const key = `sector_data_${item.sectorName.toLowerCase()}`;
        const stored = localStorage.getItem(key);
        if (stored) {
            const data = JSON.parse(stored);
            if (data && Array.isArray(data.items)) {
                const updatedItems = data.items.map((it: any) => 
                    it.id === item.id ? { ...it, isFavorite: newStatus } : it
                );
                localStorage.setItem(key, JSON.stringify({ ...data, items: updatedItems }));
            }
        }
        playClick();
    } catch (e) {
        console.error("Error updating favorite status", e);
    }
  };

  const handleMarkAsReviewed = (e: React.MouseEvent, item: Item) => {
    e.stopPropagation();
    
    const now = new Date().toISOString();
    const newReviewEntry: ReviewEntry = { date: now };
    const updatedHistory = [...(item.reviewHistory || []), newReviewEntry];
    
    // Update local state
    setItems(prev => prev.map(i => 
      i.id === item.id ? { ...i, reviewHistory: updatedHistory } : i
    ));
    if (seleccionado?.id === item.id) {
      setSeleccionado(prev => prev ? { ...prev, reviewHistory: updatedHistory } : null);
    }

    // Remove from pending list
    const newPendingIds = pendingReviewIds.filter(id => id !== item.id);
    setPendingReviewIds(newPendingIds);
    localStorage.setItem('decayed_items', JSON.stringify(newPendingIds));

    // Update localStorage sector data
    try {
      const key = `sector_data_${item.sectorId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const data = JSON.parse(stored);
        if (data && Array.isArray(data.items)) {
          const updatedItems = data.items.map((it: any) =>
            it.id === item.id ? { ...it, reviewHistory: updatedHistory } : it
          );
          localStorage.setItem(key, JSON.stringify({ ...data, items: updatedItems }));
        }
      }
      playClick();
    } catch (e) {
      console.error("Error updating review history", e);
    }
  };

  // Load pending review items
  useEffect(() => {
    try {
      const decayedIds = JSON.parse(localStorage.getItem('decayed_items') || '[]');
      setPendingReviewIds(decayedIds);
      
      const savedViewMode = localStorage.getItem('learnings_view_mode');
      if (savedViewMode === 'compact' || savedViewMode === 'normal') {
          setViewMode(savedViewMode);
      }
    } catch (e) {
      console.error("Error loading preferences", e);
    }
  }, []);

  // Filtrado y ordenamiento
  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.title.toLowerCase().includes(query) ||
        item.summary.toLowerCase().includes(query) ||
        item.sectorName.toLowerCase().includes(query)
      );
    }

    // Filtrar por pendientes de repaso
    if (showOnlyPendingReview) {
      result = result.filter(item => pendingReviewIds.includes(item.id));
    }

    // Filtrar por favoritos
    if (showFavoritesOnly) {
      result = result.filter(item => item.isFavorite);
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
      case 'category':
        result.sort((a, b) => a.sectorName.localeCompare(b.sectorName));
        break;
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    return result;
  }, [items, searchQuery, sortBy, dateSortDirection, showOnlyPendingReview, pendingReviewIds, showFavoritesOnly]);

  const monthlyStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const thisMonthItems = items.filter(item => {
        const d = new Date(item.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const total = thisMonthItems.length;
    
    // Active days
    const days = new Set(thisMonthItems.map(i => new Date(i.date).toDateString()));
    const activeDays = days.size;

    // Top sectors
    const sectorCounts: Record<string, number> = {};
    thisMonthItems.forEach(i => {
        sectorCounts[i.sectorName] = (sectorCounts[i.sectorName] || 0) + 1;
    });
    const topSectors = Object.entries(sectorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name);

    return { total, activeDays, topSectors };
  }, [items]);


  const handleCloseModal = () => {
    setSeleccionado(null)
    setIsChatting(false)
    setQuestions([]) // Reset questions when closing
    setLoadingQuestions(false)
    setChatIdToOpen(undefined)
  }

  const handleTestMe = async () => {
    if (!seleccionado) return
    
    setLoadingQuestions(true)
    setQuestions([])
    
    try {
      const res = await fetch('/api/test-me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: seleccionado.summary })
      })
      
      const data = await res.json()
      if (data.success && data.data?.questions && Array.isArray(data.data.questions)) {
        setQuestions(data.data.questions)
      }
    } catch (error) {
      console.error("Error generating questions:", error)
    } finally {
      setLoadingQuestions(false)
    }
  }

  const handleDownload = () => {
    if (items.length === 0) return;

    const date = new Date().toLocaleDateString("es-ES", { year: 'numeric', month: 'long', day: 'numeric' });
    let mdContent = `# Mis conocimientos\nFecha de exportación: ${date}\n\n`;

    // Group by sector
    const grouped = items.reduce((acc, item) => {
      if (!acc[item.sectorName]) acc[item.sectorName] = [];
      acc[item.sectorName].push(item);
      return acc;
    }, {} as Record<string, Item[]>);

    // Sort sectors by ID (using SECTORES_DATA order)
    SECTORES_DATA.forEach(sector => {
      const sectorName = t(`sectors.${sector.key}`);
      const sectorItems = grouped[sectorName];
      if (sectorItems && sectorItems.length > 0) {
        mdContent += `# ${sectorName}\n\n`;
        
        // Sort items by date desc
        sectorItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        sectorItems.forEach(item => {
          const status = pendingReviewIds.includes(item.id) ? "Pendiente de repaso" : "Aprendido";
          const itemDate = new Date(item.date).toLocaleDateString("es-ES", { year: 'numeric', month: 'long', day: 'numeric' });
          
          mdContent += `## ${item.title}\n\n`;
          // As we only have 'summary' which acts as content, we use it here.
          // If we had a separate short summary, we would add "Resumen: ..." here.
          mdContent += `${item.summary}\n\n`;
          
          // Footer metadata
          mdContent += `> **Creado:** ${itemDate} | **Estado:** ${status}\n`;
          mdContent += `\n---\n\n`;
        });
      }
    });

    // Create blob and download
    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mis-conocimientos-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="mx-auto max-w-7xl"> {/* Increased max-width for more cards */}
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
              {t('chat.back_to_map')}
            </Button>
          </Link>
        </motion.div>

        {/* Mini Timeline */}
        <MiniTimeline 
          items={items} 
          onItemClick={(item) => {
            setSeleccionado(item);
            playClick();
          }} 
        />

        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">{t('learnings.title')}</h1>
            <p className="text-muted-foreground">{t('home.subtitle')}</p>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => {
                playClick()
                setShowTrashModal(true)
              }}
              className="gap-1"
            >
              🗑️ Papelera
            </Button>
            <Button 
              onClick={handleDownload}
              disabled={items.length === 0}
              variant="outline"
              className="gap-2 shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {t('learnings.download_all')}
            </Button>
          </div>
        </motion.div>

        {/* Monthly Summary */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-muted/30 border border-border/50 rounded-lg px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-3"
        >
            <div className="flex items-center gap-3">
                <div className="text-lg">📅</div>
                <div>
                    <h3 className="font-semibold text-foreground text-sm inline-block mr-2">Tu mes:</h3>
                    <span className="text-xs text-muted-foreground">
                        <strong className="text-foreground">{monthlyStats.total}</strong> aprendizajes en {monthlyStats.activeDays} días activos.
                    </span>
                </div>
            </div>
            
            {monthlyStats.topSectors.length > 0 && (
                <div className="flex gap-2">
                    {monthlyStats.topSectors.map((sector, i) => (
                        <span key={i} className="px-2 py-0.5 bg-background border border-border rounded-full text-[10px] font-medium text-muted-foreground">
                            {sector}
                        </span>
                    ))}
                </div>
            )}
        </motion.div>

        {/* Pending Reviews Block - Collapsible */}
        {pendingReviewIds.length > 0 && items.some(i => pendingReviewIds.includes(i.id)) && (
          <CollapsibleReviewSection 
            items={items.filter(item => pendingReviewIds.includes(item.id))} 
          />
        )}

        {loading ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 opacity-50 text-muted-foreground"
          >
            {t('common.loading')}
          </motion.div>
        ) : items.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20 bg-card rounded-3xl border border-dashed border-border"
          >
            <div className="text-4xl mb-4 opacity-30">📚</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">{t('learnings.empty_state')}</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Completa conversaciones y guárdalas para empezar a llenar tu biblioteca de conocimientos.
            </p>
            <Link href="/aprender">
              <Button size="lg">
                {t('learnings.start_learning')}
              </Button>
            </Link>
          </motion.div>
        ) : (
          <>
            {/* Filtros y búsqueda */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6 space-y-4"
            >
              <div className="mb-6 space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4 items-center">
                    {/* Buscador */}
                    <div className="relative w-full sm:max-w-xs">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">🔍</span>
                      <Input
                        type="text"
                        placeholder={t('learnings.search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 text-sm bg-card"
                      />
                    </div>

                    {/* Selector de ordenamiento */}
                    <div className="flex gap-2 flex-wrap items-center flex-1 justify-end">
                      <Button
                        variant={sortBy === 'date' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => {
                          if (sortBy === 'date') {
                            setDateSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
                          } else {
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
                        variant={sortBy === 'category' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setSortBy('category')}
                        className="h-8 text-xs px-3"
                      >
                        🗂️ Categoría
                      </Button>
                      <Button
                        variant={sortBy === 'title' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setSortBy('title')}
                        className="h-8 text-xs px-3"
                      >
                        🔤 Título
                      </Button>
                      <div className="w-px h-4 bg-border mx-1" />
                      <Button
                        variant={showFavoritesOnly ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setShowFavoritesOnly(prev => !prev)}
                        className={`gap-1 h-8 text-xs px-3 ${showFavoritesOnly ? 'text-yellow-600 dark:text-yellow-400' : ''}`}
                      >
                        ⭐ Favoritos
                      </Button>
                      <div className="w-px h-4 bg-border mx-1" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            const newMode = viewMode === 'normal' ? 'compact' : 'normal';
                            setViewMode(newMode);
                            localStorage.setItem('learnings_view_mode', newMode);
                        }}
                        title={viewMode === 'normal' ? "Cambiar a vista compacta" : "Cambiar a vista normal"}
                        className="h-8 text-xs px-3"
                      >
                        {viewMode === 'normal' ? '🤏 Compacto' : '🃏 Tarjetas'}
                      </Button>
                      <Button
                        variant={showOnlyPendingReview ? 'destructive' : 'ghost'}
                        size="sm"
                        onClick={() => setShowOnlyPendingReview(prev => !prev)}
                        className="gap-1 h-8 text-xs px-3"
                      >
                        ⚠️ Pendientes
                        {showOnlyPendingReview && pendingReviewIds.length > 0 && (
                          <span className="ml-1 text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">
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
                    className="text-xs text-muted-foreground text-right"
                  >
                    {searchQuery || showOnlyPendingReview ? (
                      <span>
                        {filteredAndSortedItems.length} resultado{filteredAndSortedItems.length !== 1 ? 's' : ''} encontrado{filteredAndSortedItems.length !== 1 ? 's' : ''}
                        {showOnlyPendingReview && ' (pendientes de repaso)'}
                      </span>
                    ) : (
                      <span>{filteredAndSortedItems.length} aprendizaje{filteredAndSortedItems.length !== 1 ? 's' : ''} total{filteredAndSortedItems.length !== 1 ? 'es' : ''}</span>
                    )}
                  </motion.div>
              </div>
            </motion.div>

            {/* Grid de aprendizajes */}
            <AnimatePresence mode="popLayout">
              {filteredAndSortedItems.length === 0 ? (
                showOnlyPendingReview && !searchQuery ? (
                  /* Empty State for Pending Reviews */
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                      <CardContent className="p-8 text-center">
                        <div className="text-6xl mb-4">✨</div>
                        <h3 className="text-xl font-bold text-foreground mb-2">
                          ¡Todo al día!
                        </h3>
                        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                          Ahora mismo no tienes nada para repasar. Puedes aprender cosas nuevas pinchando aquí:
                        </p>
                        <Link href="/aprender">
                          <Button 
                            size="lg" 
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all"
                          >
                            💬 Ir al Chat General
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center py-12 text-muted-foreground"
                  >
                    No se encontraron resultados para "{searchQuery}"
                  </motion.div>
                )
              ) : (
                <motion.div 
                  layout
                  className={`grid gap-4 ${viewMode === 'compact' ? 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6' : 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}
                >
                  {filteredAndSortedItems.map((it, index) => (
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
                        onClick={() => { playClick(); setSeleccionado(it) }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { playClick(); setSeleccionado(it) } }}
                        className={`group bg-card rounded-2xl shadow-sm hover:shadow-md transition-all border border-border hover:border-primary/30 text-left flex flex-col h-full w-full cursor-pointer ${viewMode === 'compact' ? 'p-3' : 'p-4'}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">
                            <span>{it.sectorIcon}</span>
                          </div>
                          {/* Date removed from here as it is now absolute positioned */}
                        </div>
                        
                        <div className={`absolute top-2 right-2 z-10 flex flex-col items-end gap-1 ${viewMode === 'compact' ? 'scale-75 origin-top-right' : ''}`}>
                            <span className="text-[10px] text-muted-foreground/70 bg-background/80 px-1.5 py-0.5 rounded backdrop-blur-sm shadow-sm">
                                {formatDate(it.date)}
                            </span>
                            <button
                                onClick={(e) => handleToggleFavorite(e, it)}
                                className={`p-1.5 rounded-full transition-all ${
                                    it.isFavorite 
                                    ? 'text-yellow-400 hover:text-yellow-500 bg-yellow-400/10' 
                                    : 'text-muted-foreground/20 hover:text-yellow-400 hover:bg-muted'
                                }`}
                            >
                                <svg className="w-4 h-4" fill={it.isFavorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                            </button>
                        </div>
                        
                        <h3 className={`font-bold text-foreground mb-1 group-hover:text-primary transition-colors line-clamp-2 pr-16 ${viewMode === 'compact' ? 'text-sm' : 'text-base'}`}>
                          {it.title}
                        </h3>
                        
                        {viewMode === 'normal' && (
                            <div className="text-xs text-muted-foreground line-clamp-3 mb-2 flex-1">
                            <ReactMarkdown allowedElements={['p', 'strong', 'em']}>
                                {it.summary}
                            </ReactMarkdown>
                            </div>
                        )}

                        {/* Tags */}
                        {it.tags && it.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-auto pt-2">
                            {it.tags.slice(0, viewMode === 'compact' ? 2 : 10).map((tag, i) => (
                              <span 
                                key={i}
                                className="px-2 py-0.5 bg-muted text-muted-foreground text-[10px] rounded-full font-medium"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Review History & Pending Action */}
                        <div className={`flex items-center justify-between mt-auto pt-2 border-t border-border/50 ${viewMode === 'compact' ? 'text-[9px]' : 'text-[10px]'}`}>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            {it.reviewHistory && it.reviewHistory.length > 0 ? (
                              <span className="flex items-center gap-1">
                                🔄 {it.reviewHistory.length} repaso{it.reviewHistory.length !== 1 ? 's' : ''}
                              </span>
                            ) : (
                              <span className="opacity-50">Sin repasos aún</span>
                            )}
                          </div>
                          
                          {pendingReviewIds.includes(it.id) && (
                            <button
                              onClick={(e) => handleMarkAsReviewed(e, it)}
                              className="flex items-center gap-1 px-2 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors font-medium"
                            >
                              ✓ Repasado
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* Modal de Detalle */}
        <AnimatePresence>
          {seleccionado && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" 
              onClick={handleCloseModal}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", duration: 0.3 }}
                className="bg-card rounded-2xl shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
              >
                {isChatting ? (
                  <UnifiedTutorChat 
                    initialContext={seleccionado.summary}
                    initialSector={seleccionado.sectorName}
                    initialChatId={chatIdToOpen}
                    linkedLearningId={seleccionado.id}
                    onClose={() => setIsChatting(false)}
                    embedded={true}
                    autostart={true}
                  />
                ) : (
                  <>
                    <div className={`p-6 border-b border-border flex justify-between items-start transition-all duration-300 ${isFocusMode ? 'bg-background border-transparent' : 'bg-muted/30'}`}>
                      {!isFocusMode && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">{seleccionado.sectorIcon}</span>
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{seleccionado.sectorName}</span>
                          </div>
                          <h2 className="text-xl font-bold text-foreground pr-8">{seleccionado.title}</h2>
                        </div>
                      )}
                      
                      <div className={`flex items-center gap-2 ${isFocusMode ? 'w-full justify-between' : ''}`}>
                        {isFocusMode && (
                           <h2 className="text-lg font-bold text-foreground opacity-50">{seleccionado.title}</h2>
                        )}

                        <div className="flex items-center gap-2 ml-auto">
                            <button
                                onClick={() => setIsFocusMode(!isFocusMode)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                    isFocusMode 
                                    ? 'bg-primary/10 text-primary hover:bg-primary/20' 
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                }`}
                                title={isFocusMode ? "Salir del modo enfoque" : "Modo enfoque"}
                            >
                                <span>{isFocusMode ? '👁️' : '👁️‍🗨️'}</span>
                                <span>{isFocusMode ? 'Salir' : 'Enfoque'}</span>
                            </button>

                            {!isFocusMode && (
                                <button
                                    onClick={(e) => handleToggleFavorite(e, seleccionado)}
                                    className={`p-2 rounded-full transition-all ${
                                        seleccionado.isFavorite 
                                        ? 'text-yellow-400 hover:text-yellow-500 bg-yellow-400/10' 
                                        : 'text-muted-foreground/40 hover:text-yellow-400 hover:bg-muted'
                                    }`}
                                    title={seleccionado.isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                                >
                                    <svg className="w-6 h-6" fill={seleccionado.isFavorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                    </svg>
                                </button>
                            )}
                            
                            <button 
                              onClick={() => { playClick(); handleCloseModal(); setIsFocusMode(false); }}
                              className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted transition-colors"
                            >
                              ✕
                            </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className={`overflow-y-auto prose prose-slate dark:prose-invert max-w-none text-foreground flex-1 transition-all duration-300 ${isFocusMode ? 'p-12 md:px-24 lg:px-32 text-lg leading-loose' : 'p-8'}`}>
                      <ReactMarkdown>{seleccionado.summary}</ReactMarkdown>

                      {/* Sección de preguntas de prueba - Hide in Focus Mode */}
                      {!isFocusMode && (loadingQuestions || questions.length > 0) && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-8 p-6 bg-primary/5 rounded-xl border border-primary/10"
                        >
                          <h4 className="text-primary font-bold mb-4 flex items-center gap-2">
                            <span>🧠</span> Ponte a prueba
                          </h4>
                          
                          {loadingQuestions ? (
                            <div className="flex items-center gap-2 text-primary">
                              <span className="animate-spin">⏳</span> Generando preguntas...
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {questions.map((q, i) => (
                                <div key={i} className="bg-card p-4 rounded-lg shadow-sm border border-primary/10">
                                  <span className="text-primary font-bold mr-2">{i + 1}.</span>
                                  {q}
                                </div>
                              ))}
                              <p className="text-xs text-primary/70 mt-4 italic">
                                * Estas preguntas son temporales y desaparecerán al cerrar.
                              </p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>
                    
                    {!isFocusMode && (
                        <div className="p-4 border-t border-border bg-muted/30 flex flex-wrap justify-between gap-3">
                        <Button 
                            variant="ghost"
                            onClick={handleTestMe}
                            disabled={loadingQuestions || questions.length > 0}
                            className="text-primary hover:text-primary/80 hover:bg-primary/10 gap-2"
                        >
                            <span>🤔</span> Ponme a prueba
                        </Button>

                        <div className="flex gap-3">
                            <Button 
                            variant="outline"
                            onClick={handleCloseModal}
                            >
                            Cerrar
                            </Button>
                            <Button
                            onClick={() => {
                                setChatIdToOpen(undefined); // Force new chat
                                setIsChatting(true);
                            }}
                            variant="outline"
                            className="flex items-center justify-center gap-2"
                            >
                            <span>✨</span>
                            <span>Nuevo chat sobre esto</span>
                            </Button>
                            <Button
                            onClick={() => {
                                // Find existing chat linked to this learning item
                                const linkedChat = chatStorage.getAllChats().find(c => c.linkedLearningId === seleccionado.id);
                                setChatIdToOpen(linkedChat?.id); // If undefined, it will be a new chat anyway, but logically correct
                                setIsChatting(true);
                            }}
                            className="flex items-center justify-center gap-2"
                            >
                            <span>💬</span>
                            <span>Continuar aprendiendo sobre esto</span>
                            </Button>
                        </div>
                        </div>
                    )}
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <TrashModal
        isOpen={showTrashModal}
        onClose={() => setShowTrashModal(false)}
        type="aprendizajes"
        onRestored={() => {
          fetch('/api/aprendizajes')
            .then(res => res.json())
            .then(data => {
              if (data.success && data.data?.items) {
                const mappedItems = data.data.items.map((a: any) => {
                  const sec = SECTORES_DATA.find(s => s.id === a.sector_id)
                  return {
                    id: String(a.id),
                    title: a.titulo,
                    summary: a.resumen,
                    date: a.created_at,
                    sectorId: String(a.sector_id ?? ''),
                    sectorName: sec?.key ?? 'Sin sector',
                    sectorIcon: sec?.icono ?? '📚'
                  }
                })
                setItems(mappedItems)
              }
            })
        }}
      />
    </div>
  )
}

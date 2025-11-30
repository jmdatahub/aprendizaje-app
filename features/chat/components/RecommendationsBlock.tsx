'use client'

import { motion } from 'framer-motion'
import { useApp } from '@/shared/contexts/AppContext'

interface RecommendationsBlockProps {
  relatedTopics: string[]
  subtopics: string[]
  onTopicClick: (topic: string) => void
  loading?: boolean
}

export function RecommendationsBlock({
  relatedTopics,
  subtopics,
  onTopicClick,
  loading = false
}: RecommendationsBlockProps) {
  const { t } = useApp()

  // No mostrar nada si no hay recomendaciones y no está cargando
  if (!loading && relatedTopics.length === 0 && subtopics.length === 0) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full max-w-3xl mx-auto mt-8 mb-4"
    >
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="px-6 py-8 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              {t('common.loading')}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {/* Temas relacionados */}
            {relatedTopics.length > 0 && (
              <div className="px-6 py-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">🔗</span>
                  <h3 className="text-sm font-semibold text-foreground">
                    {t('chat.related_topics')}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {relatedTopics.map((topic, index) => (
                    <button
                      key={index}
                      onClick={() => onTopicClick(topic)}
                      className="px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium border border-primary/20 hover:bg-primary/20 hover:border-primary/40 transition-all hover:shadow-sm active:scale-95"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Subtemas */}
            {subtopics.length > 0 && (
              <div className="px-6 py-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">📚</span>
                  <h3 className="text-sm font-semibold text-foreground">
                    {t('chat.suggested_subtopics')}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {subtopics.map((topic, index) => (
                    <button
                      key={index}
                      onClick={() => onTopicClick(topic)}
                      className="px-4 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-sm font-medium border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all hover:shadow-sm active:scale-95"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

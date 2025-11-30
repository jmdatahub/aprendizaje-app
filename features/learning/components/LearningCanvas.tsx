import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/shared/contexts/AppContext';
import ReactMarkdown from 'react-markdown';

interface LearningCanvasProps {
  initialContent: string;
  onContentChange: (content: string) => void;
  onExpand: (section: string) => Promise<string>;
  onRestore?: () => void;
  loading?: boolean;
}

export function LearningCanvas({ initialContent, onContentChange, onExpand, onRestore, loading }: LearningCanvasProps) {
  const { t } = useApp();
  const [content, setContent] = useState(initialContent);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    onContentChange(newContent);
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <span>📝</span> {t('learnings.canvas_title')}
        </h3>
        <div className="flex items-center gap-2">
          {onRestore && (
            <button
              onClick={onRestore}
              className="text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors mr-2"
              title={t('learnings.restore_original')}
            >
              ↺ {t('learnings.restore_original')}
            </button>
          )}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
              isEditing 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            {isEditing ? t('learnings.preview') : t('learnings.edit_text')}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 relative">
        {loading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-muted-foreground">{t('learnings.generating')}</span>
            </div>
          </div>
        )}

        {isEditing ? (
          <textarea
            value={content}
            onChange={handleTextChange}
            className="w-full h-full min-h-[400px] bg-transparent border-none focus:ring-0 resize-none font-mono text-sm leading-relaxed"
            placeholder={t('learnings.placeholder')}
          />
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-4 text-primary" {...props} />,
                h2: ({node, ...props}) => (
                  <div className="group flex items-center justify-between mt-6 mb-3 pb-2 border-b border-border">
                    <h2 className="text-lg font-semibold m-0" {...props} />
                    <button
                      onClick={() => onExpand(props.children?.toString() || '')}
                      className="opacity-0 group-hover:opacity-100 text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 transition-all"
                    >
                      ✨ {t('learnings.expand')}
                    </button>
                  </div>
                ),
                p: ({node, ...props}) => <p className="mb-4 leading-relaxed text-muted-foreground" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-1" {...props} />,
                li: ({node, ...props}) => <li className="text-muted-foreground" {...props} />,
                strong: ({node, ...props}) => <strong className="font-semibold text-foreground" {...props} />,
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

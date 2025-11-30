import { motion } from 'framer-motion';
import { playClick } from "@/shared/utils/sounds";
import { useApp } from "@/shared/contexts/AppContext";

type TimelineItem = {
  id: string;
  title: string;
  date: string;
  sectorIcon: string;
};

interface MiniTimelineProps {
  items: TimelineItem[];
  onItemClick: (item: any) => void;
}

export function MiniTimeline({ items, onItemClick }: MiniTimelineProps) {
  const { t, formatDate } = useApp();
  if (items.length === 0) return null;

  // Process items to find candidates for buckets
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const oneDay = 24 * 60 * 60 * 1000;

  const sorted = [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const timelineData: { label: string; item: TimelineItem }[] = [];

  // 1. Today
  const todayItem = sorted.find(i => {
    const d = new Date(i.date).getTime();
    return d >= today;
  });
  if (todayItem) {
    timelineData.push({ label: formatDate(todayItem.date), item: todayItem });
  }

  // 2. This Week (excluding today item if it's the same, but we want distinct buckets)
  const usedIds = new Set<string>();
  if (todayItem) usedIds.add(todayItem.id);

  // 2. Yesterday
  const yesterdayItem = sorted.find(i => {
    if (usedIds.has(i.id)) return false;
    const d = new Date(i.date).getTime();
    return d < today && d >= today - oneDay;
  });

  if (yesterdayItem) {
    timelineData.push({ label: formatDate(yesterdayItem.date), item: yesterdayItem });
    usedIds.add(yesterdayItem.id);
  }

  // 3. Recent (last 7 days)
  const recentItem = sorted.find(i => {
    if (usedIds.has(i.id)) return false;
    const d = new Date(i.date).getTime();
    return d < today - oneDay && d >= today - (7 * oneDay);
  });

  if (recentItem) {
    timelineData.push({ label: formatDate(recentItem.date), item: recentItem });
    usedIds.add(recentItem.id);
  }

  // 4. Older (last 30 days)
  const olderItem = sorted.find(i => {
    if (usedIds.has(i.id)) return false;
    const d = new Date(i.date).getTime();
    return d < today - (7 * oneDay) && d >= today - (30 * oneDay);
  });

  if (olderItem) {
    timelineData.push({ label: formatDate(olderItem.date), item: olderItem });
    usedIds.add(olderItem.id);
  }

  if (timelineData.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 mb-8 overflow-x-auto pb-2 scrollbar-hide"
    >
      {timelineData.map((entry, idx) => (
        <div key={entry.item.id} className="flex items-center gap-3 shrink-0">
          {idx > 0 && <div className="w-8 h-px bg-border" />}
          
          <button
            onClick={() => { playClick(); onItemClick(entry.item); }}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors group"
          >
            <div className="w-2 h-2 rounded-full bg-primary group-hover:scale-125 transition-transform" />
            <span className="font-medium text-muted-foreground uppercase tracking-wide text-[10px]">{entry.label}</span>
            <span className="font-semibold text-foreground group-hover:underline truncate max-w-[150px]">
              {entry.item.title}
            </span>
          </button>
        </div>
      ))}
    </motion.div>
  );
}

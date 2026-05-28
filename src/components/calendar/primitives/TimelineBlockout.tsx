import { Lock } from "lucide-react";
import type { CalendarBlockout } from "../types";

interface TimelineBlockoutProps {
  blockout: CalendarBlockout;
  style: React.CSSProperties;
  onDelete?: (id: string | number) => void;
  compact?: boolean;
}

export function TimelineBlockout({ blockout, style, onDelete, compact = false }: TimelineBlockoutProps) {
  return (
    <div
      className="absolute rounded border-l-4 border-l-red-500 bg-red-500/10 select-none group overflow-hidden"
      style={{
        ...style,
        backgroundImage:
          "repeating-linear-gradient(45deg,rgba(239,68,68,.04) 0,rgba(239,68,68,.04) 5px,transparent 5px,transparent 10px)",
        ...(compact ? { insetInline: "2px", padding: "4px" } : { left: "8px", right: "8px", padding: "8px" }),
      }}
    >
      <div className={`flex items-center gap-1 text-red-400 font-semibold ${compact ? "text-[8px]" : "text-[10px]"}`}>
        <Lock className={compact ? "size-2.5 shrink-0" : "size-3 shrink-0"} />
        <span>{compact ? "LOCKED" : "NO AVAILABILITY"}</span>
        {compact && <span className="ml-auto">{blockout.time}</span>}
      </div>
      <p className={`font-semibold text-foreground truncate ${compact ? "text-[9px]" : "text-xs"}`}>
        {blockout.title}
      </p>
      {!compact && (
        <p className="text-[9px] text-muted-foreground">
          {blockout.time} · {blockout.duration}m{" "}
          {blockout.recurring && blockout.recurring !== "none" && `· ${blockout.recurring}`}
        </p>
      )}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete "${blockout.title}"?`)) onDelete(blockout.id);
          }}
          className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity text-[10px] px-0.5"
        >
          ✕
        </button>
      )}
    </div>
  );
}

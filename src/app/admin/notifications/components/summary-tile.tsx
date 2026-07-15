import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "@/styles/notifications.module.css";

export function SummaryTile( {
  icon: Icon,
  label,
  value,
  detail,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  detail: string;
  tone?: "default" | "destructive";
} ) {
  return (
    <div className={styles.summaryTile}>
      <div className={styles.summaryTileHead}>
        <div>
          <p className={styles.summaryLabel}>{label}</p>
          <p className={styles.summaryValue}>{value}</p>
        </div>
        <Icon className={cn( styles.summaryIcon, tone === "destructive" && styles.summaryIconDestructive )} />
      </div>
      <p className={styles.summaryDetail}>{detail}</p>
    </div>
  );
}

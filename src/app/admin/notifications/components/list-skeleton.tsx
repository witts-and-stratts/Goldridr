import { Skeleton } from "@/components/admin-ui/skeleton";
import styles from "@/styles/notification-list.module.css";

export function ListSkeleton( { count = 8 }: { count?: number } ) {
  return (
    <div aria-hidden="true">
      {Array.from( { length: count } ).map( ( _, index ) => (
        <div key={index} className={styles.notificationRow}>
          <Skeleton className="mt-1.5 size-2 shrink-0 rounded-full" />
          <span className={styles.rowBody}>
            <span className={styles.rowHead}>
              <Skeleton className="h-3.5 w-2/5" />
              <Skeleton className="h-3 w-10 shrink-0" />
            </span>
            <Skeleton className="mt-2 h-3 w-full" />
            <Skeleton className="mt-1.5 h-3 w-1/4" />
          </span>
        </div>
      ) )}
    </div>
  );
}

import styles from "@/styles/notifications.module.css";

export function EmptyList( { label }: { label: string } ) {
  return <p className={styles.emptyList}>{label}</p>;
}

export function EmptyDetail( { label }: { label: string } ) {
  return (
    <div className={styles.emptyDetail}>
      {label}
    </div>
  );
}

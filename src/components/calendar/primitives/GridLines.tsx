import { TOTAL_HOURS } from "../utils";

export function GridLines() {
  return (
    <>
      {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
        <div
          key={i}
          className="absolute left-0 right-0 border-b border-border/30 pointer-events-none"
          style={{ top: `${(i / TOTAL_HOURS) * 100}%`, height: "1px" }}
        />
      ))}
    </>
  );
}

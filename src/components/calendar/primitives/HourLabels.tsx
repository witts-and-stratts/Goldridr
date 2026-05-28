import { TOTAL_HOURS } from "../utils";

export function HourLabels() {
  return (
    <>
      {Array.from({ length: TOTAL_HOURS }, (_, h) => {
        const ampm = h >= 12 ? "PM" : "AM";
        const disp = h > 12 ? h - 12 : h === 0 ? 12 : h;
        return (
          <div
            key={h}
            className="h-16 flex items-start justify-end pr-2 pt-0.5 text-[10px] text-muted-foreground select-none -mt-2"
          >
            {`${disp} ${ampm}`}
          </div>
        );
      })}
    </>
  );
}

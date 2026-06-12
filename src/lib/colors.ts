// Goldridr wardrobe: warm near-blacks layered tonally, hairline separation,
// and Burnished Gold reserved for actions and active state.
export const colors = {
  background: "#0E0D0C", // cabin black, warmed toward the brand hue
  panel: "#1B1916", // one tonal step up; panels, inputs, pressed rows
  raised: "#262320", // second tonal step; scan result sheet
  hairline: "rgba(255, 252, 245, 0.08)",
  hairlineStrong: "rgba(255, 252, 245, 0.16)",
  gold: "#C29E66", // burnished gold — primary CTA, active tab, reference marks
  ivory: "#F5F2EC",
  muted: "#8D887F",
  faint: "#5C5851",
  onGold: "#16140F", // text on gold fills
  amber: "#CB9D4D", // pending / attention states
  red: "#C9473A", // cancelled / errors only
} as const;

export interface StatusStyle {
  label: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
}

// Status pills stay within the restrained palette: warm amber for attention,
// neutral ivory for live/completed states, and red only for terminal failures.
const statusStyles: Record<string, StatusStyle> = {
  pending: {
    label: "Awaiting confirmation",
    color: colors.amber,
    backgroundColor: "rgba(203, 157, 77, 0.12)",
    borderColor: "rgba(203, 157, 77, 0.24)",
  },
  confirmed: {
    label: "Confirmed",
    color: colors.ivory,
    backgroundColor: "rgba(245, 242, 236, 0.08)",
    borderColor: "rgba(245, 242, 236, 0.14)",
  },
  accepted: {
    label: "Accepted",
    color: colors.ivory,
    backgroundColor: "rgba(245, 242, 236, 0.08)",
    borderColor: "rgba(245, 242, 236, 0.14)",
  },
  completed: {
    label: "Completed",
    color: colors.muted,
    backgroundColor: "rgba(141, 136, 127, 0.10)",
    borderColor: "rgba(141, 136, 127, 0.18)",
  },
  cancelled: {
    label: "Cancelled",
    color: colors.red,
    backgroundColor: "rgba(201, 71, 58, 0.10)",
    borderColor: "rgba(201, 71, 58, 0.22)",
  },
  rejected: {
    label: "Rejected",
    color: colors.red,
    backgroundColor: "rgba(201, 71, 58, 0.10)",
    borderColor: "rgba(201, 71, 58, 0.22)",
  },
};

export function statusStyle( status: string ): StatusStyle {
  return statusStyles[ status ] ?? {
    label: status,
    color: colors.muted,
    backgroundColor: "rgba(141, 136, 127, 0.10)",
    borderColor: "rgba(141, 136, 127, 0.18)",
  };
}

// The Engraved Plate voice, approximated with the system face: small, wide,
// uppercase. Used for buttons, section labels, and wayfinding only.
export const plate = {
  fontSize: 11,
  fontWeight: "600" as const,
  letterSpacing: 1.8,
  textTransform: "uppercase" as const,
};

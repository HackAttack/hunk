/** Lists the source logos and generated download variants used by the brand page. */
export const brandLogos = [
  {
    id: "logo-mark",
    name: "Flat mark",
    description: "The everyday mark. Use for icons, avatars, and small placements.",
    width: 100,
    height: 99,
  },
  {
    id: "logo-mark-3d",
    name: "3D mark",
    description: "The block with its offset outline. Use at 40px and up.",
    width: 86,
    height: 86,
  },
  {
    id: "logo-wordmark",
    name: "Wordmark",
    description: "Just the lowercase letters, drawn as paths. No font needed.",
    width: 113,
    height: 38,
  },
  {
    id: "logo-lockup",
    name: "Full lockup",
    description: "Mark and wordmark together. For slides, articles, and larger placements.",
    width: 215,
    height: 86,
  },
] as const;

export const brandColors = [
  { id: "ink", name: "Ink", value: "#16140f", background: "#f4f1ea" },
  { id: "paper", name: "Paper", value: "#fffdf8", background: "#16140f" },
] as const;

export const brandFormats = ["svg", "png", "pdf"] as const;

/** Resolves an original ink SVG or a generated color/format variant. */
export function brandDownloadPath(id: string, color: string, format: string): string {
  return color === "ink" && format === "svg"
    ? `/brand/${id}.svg`
    : `/brand/downloads/${id}-${color}.${format}`;
}

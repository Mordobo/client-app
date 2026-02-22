import type { Category } from "@/services/categories";

const DEFAULT_COLOR = "#6B7280";
const DEFAULT_EMOJI = "📋";

/** Map API icon name (from DB) to emoji for display. No category list hardcoding. */
const ICON_TO_EMOJI: Record<string, string> = {
  wrench: "🔧",
  sparkles: "🧹",
  scissors: "✂️",
  car: "🚗",
  laptop: "💻",
  truck: "📦",
  leaf: "🌿",
  paw: "🐾",
  calendar: "📅",
  heart: "❤️",
  book: "📚",
  briefcase: "💼",
  cog: "⚙️",
  home: "🏠",
  ellipsis: "⋯",
};

export function getCategoryEmoji(category: Category): string {
  if (category.icon) {
    const key = category.icon.toLowerCase();
    if (ICON_TO_EMOJI[key]) return ICON_TO_EMOJI[key];
    if (/[\u{1F300}-\u{1F9FF}]/u.test(category.icon)) return category.icon;
  }
  return DEFAULT_EMOJI;
}

export function getCategoryColor(category: Category): string {
  return category.color || DEFAULT_COLOR;
}

type TranslateFn = (key: string) => string;

export function getCategoryDisplayName(category: Category, t: TranslateFn): string {
  if (!category.name_key) return category.name;
  const key = `categories.items.${category.name_key}`;
  const translated = t(key);
  if (typeof translated !== "string" || translated.includes("[missing") || translated.includes("translation]") || translated === key) {
    return category.name;
  }
  return translated;
}

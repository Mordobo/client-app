import type { Category } from "@/services/categories";
import type { SupplierService } from "@/services/suppliers";

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

function isMissingTranslation(translated: unknown, fullKey: string): boolean {
  if (typeof translated !== "string") return true;
  if (translated === fullKey) return true;
  if (translated.includes("[missing")) return true;
  if (translated.includes("translation]")) return true;
  return false;
}

/** When the API sends a human label (often English) instead of name_key, map slug → catalog key. */
const SERVICE_CATEGORY_SLUG_ALIASES: Record<string, string> = {
  electrician: "electrical",
  plumber: "plumbing",
  plumbers: "plumbing",
  cleaning_services: "cleaning",
  house_cleaning: "cleaning",
  home_cleaning: "cleaning",
};

function slugifyCatalogLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[''`]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function expandSlugKeyCandidates(slug: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (s: string) => {
    if (!s || seen.has(s)) return;
    seen.add(s);
    out.push(s);
  };
  let current = slug;
  for (let i = 0; i < 16 && current; i++) {
    push(current);
    const withoutAnd = current.replace(/_and_/g, "_");
    if (withoutAnd === current) break;
    current = withoutAnd;
  }
  return out;
}

function tryTranslateCategoryItem(nameKey: string, t: TranslateFn): string | null {
  const fullKey = `categories.items.${nameKey}`;
  const translated = t(fullKey);
  if (isMissingTranslation(translated, fullKey)) return null;
  return translated;
}

/**
 * Localizes a supplier's main category label when the API sends English display text or a catalog name_key.
 * Falls back to the original string if no matching `categories.items.*` entry exists.
 */
export function getTranslatedServiceCategory(label: string | undefined | null, t: TranslateFn): string {
  if (label == null || typeof label !== "string") return "";
  const trimmed = label.trim();
  if (!trimmed) return "";

  if (/^[a-z][a-z0-9_]*$/.test(trimmed)) {
    const direct = tryTranslateCategoryItem(trimmed, t);
    if (direct) return direct;
    const aliased = SERVICE_CATEGORY_SLUG_ALIASES[trimmed];
    if (aliased) {
      const viaAlias = tryTranslateCategoryItem(aliased, t);
      if (viaAlias) return viaAlias;
    }
  }

  let slug = slugifyCatalogLabel(trimmed);
  slug = SERVICE_CATEGORY_SLUG_ALIASES[slug] ?? slug;

  for (const candidate of expandSlugKeyCandidates(slug)) {
    const resolved = tryTranslateCategoryItem(candidate, t);
    if (resolved) return resolved;
  }

  return trimmed;
}

/** Row title for a catalog service: custom provider name wins; otherwise translated category, then description. */
export function getSupplierServiceDisplayName(
  service: Pick<SupplierService, "name" | "category_name" | "category_key" | "description">,
  t: TranslateFn
): string {
  const custom = service.name?.trim();
  if (custom) return custom;
  const fromKey = getTranslatedServiceCategory(service.category_key, t);
  if (fromKey) return fromKey;
  const fromName = getTranslatedServiceCategory(service.category_name, t);
  if (fromName) return fromName;
  const desc = service.description?.trim();
  if (desc) return desc;
  return t("supplier.defaultServiceLabel");
}

export function getCategoryDisplayName(category: Category, t: TranslateFn): string {
  if (!category.name_key) return category.name;
  const key = `categories.items.${category.name_key}`;
  const translated = t(key);
  if (isMissingTranslation(translated, key)) {
    return category.name;
  }
  return translated;
}

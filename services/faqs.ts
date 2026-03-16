import { API_BASE } from '@/utils/apiConfig';

/** API response: one answer per question (first published answer) */
export interface FaqAnswer {
  id: string;
  answer: string | null;
  order: number;
}

export interface FaqQuestion {
  id: string;
  question: string | null;
  order: number;
  answers: FaqAnswer[];
}

export interface FaqCategory {
  id: string;
  title: string | null;
  order: number;
  questions: FaqQuestion[];
}

export interface FaqsResponse {
  categories: FaqCategory[];
}

/** Flattened item for the help center list: one row per question with first answer text */
export interface FaqListItem {
  id: string;
  categoryId: string;
  categoryTitle: string | null;
  question: string;
  answer: string;
  icon: string;
}

const DEFAULT_ICONS = ['📅', '💳', '❌', '⭐', '🔒', '💰', '📋', '❓'];

/**
 * Fetches published FAQs from the API (parametrized via CRM/Backoffice).
 * @param locale - 'en' | 'es'. Should match app language.
 */
export async function fetchFaqs(locale: 'en' | 'es'): Promise<FaqsResponse> {
  const url = `${API_BASE}/api/content/faqs?locale=${locale}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = (body && typeof body.message === 'string') ? body.message : `Request failed (${response.status})`;
    throw new Error(message);
  }

  const data = (await response.json()) as FaqsResponse;
  if (!data || !Array.isArray(data.categories)) {
    return { categories: [] };
  }
  return data;
}

/**
 * Flattens API categories into a list of FAQ items (one per question).
 * Uses the first published answer per question. Assigns a default icon per category.
 */
export function flattenFaqsToItems(categories: FaqCategory[]): FaqListItem[] {
  const items: FaqListItem[] = [];
  categories.forEach((cat, catIndex) => {
    const icon = DEFAULT_ICONS[catIndex % DEFAULT_ICONS.length];
    (cat.questions || []).forEach((q) => {
      const firstAnswer = (q.answers && q.answers[0]) ? (q.answers[0].answer ?? '').trim() : '';
      items.push({
        id: q.id,
        categoryId: cat.id,
        categoryTitle: cat.title ?? null,
        question: (q.question ?? '').trim() || '—',
        answer: firstAnswer || '—',
        icon,
      });
    });
  });
  return items;
}

import { API_BASE } from "@/utils/apiConfig";

export interface Promotion {
  id: string;
  type: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  cta_label: string | null;
  cta_route: string | null;
  gradient_start: string;
  gradient_end: string;
  icon: string | null;
  image_url: string | null;
  target_tier: string | null;
  priority: number;
}

export interface PromotionsResponse {
  promotions: Promotion[];
}

export const fetchPromotions = async (
  lang: "en" | "es",
  tier?: string
): Promise<Promotion[]> => {
  try {
    const params = new URLSearchParams({ lang });
    if (tier) params.append("tier", tier);

    const response = await fetch(
      `${API_BASE}/api/promotions?${params.toString()}`,
      { method: "GET", headers: { "Content-Type": "application/json" } }
    );

    if (!response.ok) return [];

    const data: PromotionsResponse = await response.json();
    return Array.isArray(data.promotions) ? data.promotions : [];
  } catch {
    return [];
  }
};

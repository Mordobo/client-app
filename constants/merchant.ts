/**
 * Merchant identity shown on Azul compliance surfaces (policies, checkout, receipt).
 * Set EXPO_PUBLIC_COMPANY_ADDRESS to the full registered street address of MORDOBO EIRL
 * (street, city, country). Required for Azul merchant website review.
 */
export const MERCHANT = {
  commercialName: "Mordobo",
  legalName: "MORDOBO EIRL",
  rnc: "133529531",
  currency: "DOP",
  currencySymbol: "RD$",
  supportEmail: "soporte@mordobo.com",
  supportPhoneDisplay: "+1 809-496-8687",
  supportPhoneE164: "18094968687",
  address:
    process.env.EXPO_PUBLIC_COMPANY_ADDRESS?.trim() ||
    "Santo Domingo, Distrito Nacional, República Dominicana",
} as const;

export function formatDop(amount: number): string {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: MERCHANT.currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

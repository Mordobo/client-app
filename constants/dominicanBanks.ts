/** Banks available for provider payout accounts in the Dominican Republic. */
export interface DominicanBank {
  id: string;
  name: string;
}

/** Main DR commercial banks and savings associations. "other" lets providers type a bank not listed. */
export const DOMINICAN_BANKS: DominicanBank[] = [
  { id: "popular", name: "Banco Popular Dominicano" },
  { id: "banreservas", name: "Banreservas" },
  { id: "bhd", name: "Banco BHD" },
  { id: "scotiabank", name: "Scotiabank" },
  { id: "santa_cruz", name: "Banco Santa Cruz" },
  { id: "promerica", name: "Banco Promerica" },
  { id: "caribe", name: "Banco Caribe" },
  { id: "lopez_de_haro", name: "Banco López de Haro" },
  { id: "banesco", name: "Banesco" },
  { id: "ademi", name: "Banco Ademi" },
  { id: "bdi", name: "Banco BDI" },
  { id: "vimenca", name: "Banco Vimenca" },
  { id: "apap", name: "Asociación Popular de Ahorros y Préstamos (APAP)" },
  { id: "acap", name: "Asociación Cibao (ACAP)" },
  { id: "alnap", name: "Asociación La Nacional (ALNAP)" },
  { id: "other", name: "Otro" },
];

/**
 * Public-facing catalog for Azul merchant website review.
 * Clear service descriptions + example prices in RD$ / DOP (not dependent on live suppliers).
 */
export type PublicServiceItem = {
  key: string;
  name: string;
  description: string;
  examples: string[];
  fromPriceDop: number;
};

export const PUBLIC_SERVICE_CATALOG: PublicServiceItem[] = [
  {
    key: "home_repairs",
    name: "Hogar y Reparaciones",
    description:
      "Servicios de plomería, electricidad, carpintería, pintura, cerrajería y reparaciones generales en el hogar.",
    examples: ["Plomería", "Electricidad", "Pintura", "Cerrajería", "Reparación de techos"],
    fromPriceDop: 800,
  },
  {
    key: "cleaning",
    name: "Limpieza",
    description:
      "Limpieza residencial, profunda, de oficinas, post-construcción, alfombras, muebles, ventanas y piscinas.",
    examples: ["Limpieza residencial", "Limpieza profunda", "Limpieza de oficinas", "Limpieza de piscinas"],
    fromPriceDop: 1200,
  },
  {
    key: "beauty_personal_care",
    name: "Belleza y Cuidado Personal",
    description:
      "Barbería móvil, peluquería, maquillaje, manicure/pedicure, depilación, masajes y tratamientos a domicilio.",
    examples: ["Barbería móvil", "Manicure / Pedicure", "Masajes", "Maquillaje profesional"],
    fromPriceDop: 700,
  },
  {
    key: "vehicles",
    name: "Vehículos",
    description:
      "Lavado de autos, detallado premium, mecánica ligera, cambio de aceite, diagnóstico, electricidad automotriz y asistencia vial.",
    examples: ["Lavado de autos", "Cambio de aceite", "Detallado premium", "Asistencia vial"],
    fromPriceDop: 500,
  },
  {
    key: "technology_tech_support",
    name: "Tecnología y Soporte Técnico",
    description:
      "Reparación de computadoras y celulares, instalación de software, redes Wi-Fi, cámaras de seguridad y soporte técnico.",
    examples: ["Reparación de computadoras", "Redes / Wi-Fi", "Cámaras de seguridad", "Soporte técnico"],
    fromPriceDop: 900,
  },
  {
    key: "moving_transportation",
    name: "Mudanzas y Transporte",
    description:
      "Mudanzas residenciales y comerciales, transporte de carga, empaque, desarme/armado de muebles y objetos pesados.",
    examples: ["Mudanza residencial", "Empaque", "Transporte de carga", "Armado de muebles"],
    fromPriceDop: 2500,
  },
  {
    key: "gardening_outdoors",
    name: "Jardinería y Exteriores",
    description:
      "Jardinería general, corte de césped, poda, paisajismo, riego, limpieza de patios y diseño de jardines.",
    examples: ["Corte de césped", "Poda de árboles", "Paisajismo", "Limpieza de patios"],
    fromPriceDop: 1000,
  },
  {
    key: "pets",
    name: "Mascotas",
    description:
      "Paseo de perros, baño y grooming, adiestramiento básico, pet sitting, transporte de mascotas y veterinaria móvil.",
    examples: ["Paseo de perros", "Baño y grooming", "Pet sitting", "Veterinaria móvil"],
    fromPriceDop: 600,
  },
  {
    key: "events",
    name: "Eventos",
    description:
      "Decoración, planificación, fotografía, videografía, DJ/música, catering y entretenimiento para eventos.",
    examples: ["Fotografía", "Decoración", "Catering", "DJ / Música"],
    fromPriceDop: 3000,
  },
  {
    key: "health_wellness",
    name: "Salud y Bienestar",
    description:
      "Enfermería a domicilio, fisioterapia, psicología, nutrición, masaje terapéutico y cuidado de adultos mayores.",
    examples: ["Fisioterapia", "Enfermería a domicilio", "Nutrición", "Cuidado de adultos mayores"],
    fromPriceDop: 1500,
  },
  {
    key: "education_classes",
    name: "Educación y Clases",
    description:
      "Tutoría académica, idiomas, música, fitness, clases en línea y capacitación técnica con profesionales independientes.",
    examples: ["Tutoría académica", "Clases de idiomas", "Clases de música", "Fitness"],
    fromPriceDop: 800,
  },
  {
    key: "business_professional_services",
    name: "Servicios Empresariales y Profesionales",
    description:
      "Contabilidad, consultoría legal y financiera, marketing digital, diseño gráfico, desarrollo web y community management.",
    examples: ["Contabilidad", "Marketing digital", "Diseño gráfico", "Desarrollo web"],
    fromPriceDop: 2000,
  },
  {
    key: "specialized_installations",
    name: "Instalaciones Especializadas",
    description:
      "Instalación y mantenimiento de aire acondicionado, paneles solares, generadores, CCTV, alarmas y domótica.",
    examples: ["Aire acondicionado", "Paneles solares", "CCTV", "Sistemas de alarma"],
    fromPriceDop: 1800,
  },
  {
    key: "domestic_services",
    name: "Servicios Domésticos",
    description:
      "Apoyo doméstico, niñera/canguro, cuidador, chef personal y organización del hogar según disponibilidad del proveedor.",
    examples: ["Empleada doméstica", "Niñera / Canguro", "Chef personal", "Organización del hogar"],
    fromPriceDop: 1000,
  },
];

export const PUBLIC_CATALOG_INTRO =
  "Mordobo conecta clientes con proveedores independientes de servicios para el hogar y la vida diaria en la República Dominicana. A continuación se describen las categorías principales disponibles en la plataforma. Los precios se muestran y cobran en pesos dominicanos (RD$ / DOP) y pueden variar según proveedor, alcance y ubicación.";

import type { PublicPolicy } from "@/components/legal/PublicPolicyPage";
import { MERCHANT } from "@/constants/merchant";

const updated = "17 de julio de 2026";

export const TERMS_POLICY: PublicPolicy = {
  title: "Términos y Condiciones",
  updated,
  intro:
    "Estos términos regulan el acceso y uso de Mordobo, una plataforma digital que conecta clientes con proveedores independientes de servicios en la República Dominicana.",
  sections: [
    {
      heading: "1. Identidad y función de la plataforma",
      paragraphs: [
        `${MERCHANT.commercialName} es operada por ${MERCHANT.legalName}, RNC ${MERCHANT.rnc}. Mordobo facilita la búsqueda, contratación, comunicación y pago de servicios ofrecidos por proveedores independientes.`,
        "Salvo que se indique expresamente lo contrario, los proveedores no son empleados de Mordobo y son responsables de ejecutar los servicios aceptados.",
      ],
    },
    {
      heading: "2. Reservas y precios",
      paragraphs: [
        "Antes de pagar, el cliente podrá revisar el servicio, proveedor, fecha, dirección y precio total. Todos los importes se muestran y procesan en pesos dominicanos (DOP).",
        "La reserva queda sujeta a disponibilidad y confirmación del proveedor. Mordobo informará el estado de la solicitud dentro de la aplicación.",
      ],
    },
    {
      heading: "3. Pagos",
      paragraphs: [
        "El cliente autoriza el cargo mostrado en el checkout al confirmar el pago. Los datos sensibles de la tarjeta son procesados por el proveedor de pagos y Mordobo no almacena el número completo de tarjeta ni el CVV.",
        "Después de una transacción exitosa se mostrará un comprobante con el monto, moneda, referencia y tarjeta enmascarada.",
      ],
    },
    {
      heading: "4. Cancelaciones, reclamaciones y reembolsos",
      paragraphs: [
        "Las cancelaciones y reembolsos se rigen por la Política de Cancelaciones y Reembolsos publicada por Mordobo. El cliente puede iniciar una solicitud desde su reserva o mediante Atención al Cliente.",
      ],
    },
    {
      heading: "5. Uso responsable",
      paragraphs: [
        "Los usuarios deben proporcionar información correcta, proteger sus credenciales y abstenerse de utilizar la plataforma para actividades ilícitas, fraudulentas o que afecten a terceros.",
      ],
    },
    {
      heading: "6. Contacto",
      paragraphs: [
        `Atención al cliente: ${MERCHANT.supportEmail} y ${MERCHANT.supportPhoneDisplay}. Domicilio comercial: ${MERCHANT.address}.`,
      ],
    },
  ],
};

export const PRIVACY_POLICY: PublicPolicy = {
  title: "Política de Privacidad",
  updated,
  intro:
    "Explicamos qué información recopilamos, para qué la utilizamos y cómo protegemos los datos de clientes y proveedores de Mordobo.",
  sections: [
    {
      heading: "1. Información recopilada",
      paragraphs: [
        "Podemos recopilar nombre, correo, teléfono, dirección de servicio, ubicación, información de perfil, conversaciones, reservas, reclamaciones y datos técnicos del dispositivo.",
        "Mordobo no almacena el número completo de tarjeta ni el código CVV. El proveedor de pagos procesa la información sensible necesaria para autorizar la transacción.",
      ],
    },
    {
      heading: "2. Finalidades",
      paragraphs: [
        "Utilizamos la información para crear y proteger cuentas, conectar clientes con proveedores, gestionar reservas y pagos, prestar soporte, prevenir fraude, enviar comunicaciones operativas y mejorar la plataforma.",
      ],
    },
    {
      heading: "3. Información compartida",
      paragraphs: [
        "Compartimos únicamente la información necesaria con el proveedor seleccionado, proveedores tecnológicos, procesadores de pago y autoridades cuando exista una obligación legal.",
        "No vendemos datos personales.",
      ],
    },
    {
      heading: "4. Geolocalización y conservación",
      paragraphs: [
        "La ubicación se utiliza, con autorización del usuario, para mostrar servicios cercanos y coordinar la prestación. Conservamos la información durante el tiempo necesario para operar, cumplir obligaciones legales y resolver disputas.",
      ],
    },
    {
      heading: "5. Derechos y solicitudes",
      paragraphs: [
        `Puedes solicitar acceso, corrección o eliminación de tus datos escribiendo a ${MERCHANT.supportEmail}. Algunas transacciones deberán conservarse cuando la ley lo requiera.`,
      ],
    },
    {
      heading: "6. Seguridad",
      paragraphs: [
        "Aplicamos controles de acceso, cifrado en tránsito y medidas técnicas y organizativas razonables. Ningún sistema es absolutamente infalible, por lo que revisamos y mejoramos continuamente nuestros controles.",
      ],
    },
  ],
};

export const REFUND_POLICY: PublicPolicy = {
  title: "Cancelaciones y Reembolsos",
  updated,
  intro:
    "Esta política explica cómo cancelar una reserva, cuándo corresponde un reembolso y cómo presentar una reclamación.",
  sections: [
    {
      heading: "1. Antes de comenzar el servicio",
      paragraphs: [
        "El cliente puede solicitar la cancelación antes de que el proveedor comience el servicio. La elegibilidad y el monto dependerán del estado de la reserva, el tiempo transcurrido y cualquier trabajo o gasto previamente autorizado.",
      ],
    },
    {
      heading: "2. Después del servicio",
      paragraphs: [
        "Una reserva completada no se cancela automáticamente. Si el servicio no fue prestado o presenta un incumplimiento, el cliente puede abrir una reclamación para revisión de Mordobo.",
      ],
    },
    {
      heading: "3. Forma y plazo del reembolso",
      paragraphs: [
        "Cuando proceda, el reembolso se enviará al mismo método utilizado en el pago. Mordobo gestionará la solicitud aprobada dentro de cinco días laborables; el tiempo de acreditación adicional dependerá del banco emisor.",
        "Mordobo comunicará por escrito si el reembolso es total, parcial o no procede, junto con la razón de la decisión.",
      ],
    },
    {
      heading: "4. Cómo solicitarlo",
      paragraphs: [
        `Inicia la solicitud desde la reserva correspondiente o contacta a ${MERCHANT.supportEmail} / ${MERCHANT.supportPhoneDisplay}, indicando número de reserva, motivo y evidencia disponible.`,
      ],
    },
  ],
};

export const DELIVERY_POLICY: PublicPolicy = {
  title: "Política de Prestación del Servicio",
  updated,
  intro:
    "Mordobo facilita servicios presenciales y, cuando corresponda, remotos. No realizamos envíos de productos físicos.",
  sections: [
    {
      heading: "1. Coordinación",
      paragraphs: [
        "El servicio será prestado por el proveedor seleccionado en la dirección, fecha y horario indicados en la reserva y confirmados dentro de la aplicación.",
      ],
    },
    {
      heading: "2. Confirmación",
      paragraphs: [
        "El cliente recibe electrónicamente el estado de la reserva, los detalles del proveedor, el lugar acordado y el comprobante del pago.",
      ],
    },
    {
      heading: "3. Cambios o imposibilidad de prestación",
      paragraphs: [
        "Si el proveedor no puede cumplir el horario o lugar acordado, deberá comunicarlo mediante la plataforma. El cliente podrá aceptar una reprogramación o solicitar revisión conforme a la política de cancelaciones.",
      ],
    },
  ],
};

export const SECURITY_POLICY: PublicPolicy = {
  title: "Políticas de Seguridad",
  updated: "20 de julio de 2026",
  intro:
    "Mordobo toma medidas razonables para proteger tu información personal y de pago, siguiendo prácticas de la industria y los estándares exigidos por nuestro procesador de pagos.",
  sections: [
    {
      heading: "Website",
      paragraphs: [
        "Tomamos todas las medidas y precauciones razonables para proteger tu información personal y seguimos las mejores prácticas de la industria para asegurar que tu información no sea utilizada de manera inapropiada, alterada o destruida. Ciframos la información de tu tarjeta de crédito utilizando la tecnología de capa de puertos seguros o Secure Sockets Layer (SSL), y la almacenamos con el cifrado AES-256. También, seguimos todos los requerimientos del PCI-DSS.",
      ],
    },
    {
      heading: "Pagos",
      paragraphs: [
        "Los métodos de pago utilizados por Mordobo son servicios de terceros. Estos servicios de terceros (AZUL) cumplen con todos los estándares de seguridad y cifrado para mantener tu información segura. Solo utilizarán la información necesaria para completar el proceso requerido. También recomendamos leer las Políticas de Privacidad de estos proveedores, para entender mejor cómo manejan la información suministrada.",
      ],
    },
    {
      heading: "Autenticación 3-D Secure",
      paragraphs: [
        "Las transacciones pueden estar sujetas a autenticación 3-D Secure, incluyendo Verified by Visa / Visa Secure y Mastercard ID Check, cuando corresponda.",
      ],
    },
    {
      heading: "Reporte de incidentes",
      paragraphs: [
        `Si detectas un cargo o actividad que no reconoces, comunícate inmediatamente con tu banco y notifícanos en ${MERCHANT.supportEmail} o al ${MERCHANT.supportPhoneDisplay}.`,
      ],
    },
  ],
};

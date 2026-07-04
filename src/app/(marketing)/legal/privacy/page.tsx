import type { Metadata } from "next";

export const metadata: Metadata = { title: "Aviso de privacidad" };

export default function PrivacyPage() {
  return (
    <>
      <h1>Aviso de privacidad</h1>
      <p>Última actualización: julio 2026. Borrador operativo para el MVP; requiere revisión legal (LFPDPPP) antes del lanzamiento.</p>

      <h2>1. Responsable</h2>
      <p>
        The Practice (thepractice.mx) es responsable del tratamiento de los datos personales
        recabados a través de la plataforma.
      </p>

      <h2>2. Datos que recabamos</h2>
      <ul>
        <li><strong>Practitioners:</strong> nombre, contacto, especialidad, experiencia, credenciales y documentos de verificación, datos de facturación.</li>
        <li><strong>Clientes:</strong> nombre, contacto y datos de reservas.</li>
        <li><strong>Ambos:</strong> datos de uso de la plataforma y de pago (procesados por proveedores externos; no almacenamos números de tarjeta).</li>
      </ul>

      <h2>3. Lo que NO recabamos</h2>
      <p>
        La plataforma no almacena expedientes clínicos, notas de sesión ni información de salud de
        los clientes de los practitioners. Dicha información es responsabilidad exclusiva de cada
        profesional, fuera de la plataforma.
      </p>

      <h2>4. Finalidades</h2>
      <ul>
        <li>Operar reservas, membresías, pagos y el directorio público.</li>
        <li>Verificar credenciales de practitioners.</li>
        <li>Enviar notificaciones transaccionales (confirmaciones, recordatorios).</li>
        <li>Comunicación comercial con consentimiento, revocable en cualquier momento.</li>
      </ul>

      <h2>5. Transferencias</h2>
      <p>
        Compartimos datos únicamente con proveedores necesarios para operar (procesadores de pago,
        email transaccional, almacenamiento de archivos e infraestructura), bajo acuerdos de
        confidencialidad.
      </p>

      <h2>6. Derechos ARCO</h2>
      <p>
        Puedes ejercer tus derechos de acceso, rectificación, cancelación y oposición escribiendo a
        hola@thepractice.mx.
      </p>
    </>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Política de cancelación" };

export default function CancellationPage() {
  return (
    <>
      <h1>Política de cancelación</h1>
      <p>Aplica a reservas de salas por parte de practitioners. Los parámetros exactos son configurables por ubicación y visibles en tu panel al reservar.</p>

      <h2>1. Cancelación estándar</h2>
      <p>
        Cancelando con <strong>24 horas o más</strong> de anticipación, los créditos u horas de la
        reserva se reintegran completos a tu cuenta.
      </p>

      <h2>2. Cancelación tardía</h2>
      <p>
        Cancelando con <strong>menos de 24 horas</strong>, los créditos de la reserva se consumen
        según la política vigente (por defecto, el 100%). La sala se libera para otros
        practitioners.
      </p>

      <h2>3. No-show</h2>
      <p>
        Si no te presentas y no hay check-in durante tu horario, la reserva se marca como no-show y
        los créditos se consumen completos.
      </p>

      <h2>4. Cancelaciones por parte de The Practice</h2>
      <p>
        Si una sala no está disponible por causas operativas (mantenimiento, incidentes), se
        reintegran los créditos completos y, de ser posible, se ofrece una sala equivalente.
      </p>

      <h2>5. Sesiones con clientes</h2>
      <p>
        Las políticas de cancelación entre practitioner y su cliente las define cada profesional y
        son visibles en su perfil antes de reservar.
      </p>

      <h2>6. Membresías</h2>
      <p>
        Las membresías se cancelan al final del periodo en curso desde tu panel. No hay reembolso
        proporcional del periodo iniciado, salvo lo dispuesto por la ley aplicable.
      </p>
    </>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Términos de uso" };

export default function TermsPage() {
  return (
    <>
      <h1>Términos de uso</h1>
      <p>Última actualización: julio 2026. Este es un borrador operativo para el MVP; debe ser revisado por asesoría legal antes del lanzamiento comercial.</p>

      <h2>1. Naturaleza del servicio</h2>
      <p>
        The Practice provee espacios físicos, tecnología, herramientas de reserva y un directorio
        de profesionales independientes. The Practice <strong>no presta servicios médicos,
        terapéuticos, psicológicos, nutricionales ni clínicos de ningún tipo</strong>.
      </p>

      <h2>2. Responsabilidad de los practitioners</h2>
      <p>Cada practitioner es un profesional independiente, responsable de:</p>
      <ul>
        <li>Sus servicios profesionales y la calidad de los mismos.</li>
        <li>Contar con las credenciales, cédulas, permisos y seguros aplicables.</li>
        <li>Su ética profesional y el cumplimiento regulatorio de su disciplina.</li>
        <li>El manejo y resguardo de la información de sus clientes/pacientes, incluida cualquier información clínica, que no se almacena en la plataforma.</li>
      </ul>

      <h2>3. Verificación</h2>
      <p>
        The Practice realiza una verificación documental razonable (identidad y credenciales) antes
        de publicar perfiles. Esta verificación no constituye garantía, aval ni supervisión de los
        servicios del practitioner.
      </p>

      <h2>4. Reservas de salas</h2>
      <ul>
        <li>Las reservas se rigen por la política de cancelación vigente (ver Política de cancelación).</li>
        <li>El acceso a las salas es personal e intransferible mediante el código de cada reserva.</li>
        <li>El usuario se obliga a dejar la sala en condiciones adecuadas y reportar cualquier incidente.</li>
      </ul>

      <h2>5. Reglas del espacio y daños</h2>
      <ul>
        <li>Prohibido exceder el aforo de cada sala y realizar actividades distintas a las declaradas.</li>
        <li>Los daños a mobiliario o instalaciones atribuibles al usuario serán cubiertos por éste, previo reporte de incidencia.</li>
        <li>The Practice puede suspender cuentas por mal uso del espacio, conducta inapropiada o incumplimiento de estos términos.</li>
      </ul>

      <h2>6. Pagos y facturación</h2>
      <p>
        Los pagos de membresías, paquetes y horas se procesan a través de proveedores de pago
        externos. Los precios están sujetos a cambio con aviso previo; los precios founder se
        conservan según las condiciones de su campaña.
      </p>

      <h2>7. Reseñas</h2>
      <p>
        Las reseñas requieren consentimiento del autor y pasan por moderación. No se publican datos
        sensibles ni información clínica.
      </p>

      <h2>8. Limitación de responsabilidad</h2>
      <p>
        En la máxima medida permitida por la ley, The Practice no es responsable por los servicios
        prestados por los practitioners ni por daños indirectos derivados del uso de la plataforma.
      </p>
    </>
  );
}

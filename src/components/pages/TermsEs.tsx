import Link from "next/link";
import { PRIVACY_EMAIL, PRIVACY_OPERATOR } from "@/content/privacy";
import { spanishDate } from "./PrivacyView";
import { TERMS_UPDATED } from "./TermsView";

// The Terms page in Spanish: the same terms as the English page, under the same setting, in the same order.
export function TermsEs({ accountsOn }: { accountsOn: boolean }) {
  return (
    <div className="prose terms">
      <h1>Términos</h1>
      <p className="updated">Última actualización: {spanishDate(TERMS_UPDATED)}</p>
      <p className="binding">
        La traducción al español es automática. Si difiere de la{" "}
        <a href="/terms" hrefLang="en">
          versión en inglés
        </a>
        , prevalece la versión en inglés.
      </p>

      <h2>El acuerdo</h2>
      <p>
        {PRIVACY_OPERATOR}, una sociedad de responsabilidad limitada de Texas, opera UrantiaHub. En esta página,
        “nosotros” significa {PRIVACY_OPERATOR}. Estos términos son un acuerdo entre tú y nosotros. Cuando usas
        urantiahub.com, los aceptas. Si no los aceptas, no uses el sitio.
      </p>

      <h2>Sin afiliación</h2>
      <p>
        UrantiaHub es un proyecto independiente. No está afiliado a Urantia Foundation, ni cuenta con su respaldo ni con
        su patrocinio. La palabra “Urantia” en este sitio nombra el tema del sitio, y nada más.
      </p>

      <h2>Qué es el sitio</h2>
      <p>
        UrantiaHub es un lugar para leer y estudiar los Documentos de Urantia: el texto, una narración en audio, la
        búsqueda, un glosario y pasajes de otras obras cercanos en significado.{accountsOn && " Con una cuenta, también puedes guardar párrafos, escribir notas y conservar tu lugar."}{" "}
        El sitio es gratuito. Está pensado para lectores de 18 años o más.
      </p>
      <p>
        Una computadora encuentra los pasajes relacionados de una búsqueda y los paralelos de un párrafo. Son una ayuda
        para el estudio. No son una guía, y no prometemos que cada uno sea correcto.
      </p>

      {accountsOn && (
        <>
          <h2>Tu cuenta</h2>
          <p>
            Puedes leer sin una cuenta. Si creas una, da un correo electrónico verdadero y no compartas tu acceso. Eres
            responsable de lo que pasa en tu cuenta. Podemos suspender o cerrar una cuenta que incumpla estos términos.
            Puedes borrar tu cuenta en cualquier momento.
          </p>

          <h2>Lo que es tuyo</h2>
          <p>
            Tus notas y tus párrafos guardados son tuyos. Solo tú los ves. Nos das permiso para guardarlos y para
            mostrártelos, que es lo que el sitio necesita para funcionar. No pedimos ningún otro derecho sobre ellos.
          </p>
        </>
      )}

      <h2>Lo que es nuestro, y lo que es abierto</h2>
      <p>
        El texto en inglés de los Documentos de Urantia es de dominio público. El texto en español de este sitio es una
        traducción automática que hicimos nosotros, y la liberamos al dominio público (CC0). El diseño de este sitio, su código y su
        narración en audio son obra nuestra o tenemos licencia para usarlos. Puedes usar el sitio para tu propia lectura
        y estudio, y puedes compartir un enlace, un párrafo o una imagen que el sitio hace para ti.
      </p>

      <h2>Lo que no debes hacer</h2>
      <ul>
        <li>Usar el sitio para un fin que la ley prohíbe.</li>
        <li>Intentar entrar en sistemas o cuentas que no son tuyos.</li>
        <li>Perturbar o sobrecargar el sitio.</li>
        <li>Copiar el sitio en masa con una herramienta automática. Los desarrolladores pueden usar la API abierta en <a href="https://urantia.dev">urantia.dev</a>.</li>
        <li>Hacerte pasar por otra persona.</li>
      </ul>

      <h2>Otros servicios</h2>
      <p>
        El sitio enlaza con otros sitios, por ejemplo la fuente de un pasaje de otra obra, y usa otros servicios para
        funcionar. No somos responsables de lo que esos sitios dicen o hacen. <Link href="/es/privacidad">La página de privacidad</Link>{" "}
        nombra cada servicio que maneja datos para nosotros.
      </p>

      <h2>Sin garantía</h2>
      <p>
        El sitio se ofrece “tal cual” y “según disponibilidad”, sin ninguna garantía, expresa o implícita. No
        prometemos que esté siempre disponible ni que no tenga fallos.
      </p>

      <h2>Límite de responsabilidad</h2>
      <p>
        En la mayor medida que la ley permite, {PRIVACY_OPERATOR} y sus miembros, empleados y agentes no son
        responsables de daños indirectos, incidentales, especiales, consecuenciales o punitivos que resulten de tu uso del
        sitio.
      </p>

      <h2>Indemnización</h2>
      <p>
        Aceptas mantener indemne a {PRIVACY_OPERATOR} frente a reclamaciones, daños y costos que resulten de tu uso del
        sitio{accountsOn && ", de lo que escribes en él,"} o de un incumplimiento de estos términos por tu parte.
      </p>

      <h2>La ley aplicable</h2>
      <p>
        Las leyes del Estado de Texas, Estados Unidos, rigen estos términos. Cualquier controversia se somete a los tribunales del
        condado de Travis, Texas, salvo que la ley que se te aplica exija otro lugar.
      </p>

      <h2>Cambios</h2>
      <p>
        Podemos cambiar estos términos. Cuando un cambio es importante, lo decimos en el sitio antes de que entre en vigor. Si
        usas el sitio después de un cambio, aceptas los nuevos términos.
      </p>

      <h2>Contacto</h2>
      <p>
        Preguntas: <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.
      </p>
    </div>
  );
}

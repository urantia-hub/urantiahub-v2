import { ACCOUNT_ITEMS_ES, ACCOUNT_LANGUAGE_ITEM_ES, ACCOUNT_POSTHOG, ACCOUNT_VENDORS, BROWSER_ITEMS, LANGUAGE_ITEM, LANGUAGE_UPDATED, NOTICE_ITEMS_ES, NOTICE_RESEND, PRIVACY_EMAIL, PRIVACY_OPERATOR, STREAK_BROWSER_ITEM, STREAK_ITEMS_ES, STREAK_SUPABASE_RECEIVES_ES, STREAK_TEXT_ITEM, VENDORS, VISIT_ITEM } from "@/content/privacy";
import { type PrivacyFlags, spanishDate } from "./PrivacyView";

const Email = () => <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>;

// The Privacy page in Spanish: the same facts as the English page, under the same settings, in the same
// order. The page exists only while Spanish is on, so the facts of the language are always here.
export function PrivacyEs({ accountsOn, noticesOn, streaksOn }: PrivacyFlags) {
  const accountVendors = ACCOUNT_VENDORS.map((vendor) => {
    if (noticesOn && vendor.name === NOTICE_RESEND.name) return NOTICE_RESEND;
    if (vendor.name !== "Supabase") return vendor;
    const receives = vendor.es.receives.replace(/ y tus notas\.$/, `, tus notas${streaksOn ? `, ${STREAK_SUPABASE_RECEIVES_ES}` : ""} y el idioma que elegiste.`);
    return { ...vendor, es: { ...vendor.es, receives } };
  });
  const browserItems = [...BROWSER_ITEMS, ...(streaksOn ? [STREAK_BROWSER_ITEM, STREAK_TEXT_ITEM] : []), LANGUAGE_ITEM, VISIT_ITEM];
  const vendors = accountsOn ? [...VENDORS.map((vendor) => (vendor.name === ACCOUNT_POSTHOG.name ? ACCOUNT_POSTHOG : vendor)), ...accountVendors] : VENDORS;
  return (
    <div className="prose privacy">
      <h1>Privacidad</h1>
      <p className="updated">Última actualización: {spanishDate(LANGUAGE_UPDATED)}</p>
      <p className="binding">
        La traducción al español es automática. Si difiere de la{" "}
        <a href="/privacy" hrefLang="en">
          versión en inglés
        </a>
        , prevalece la versión en inglés.
      </p>

      <h2>En pocas palabras</h2>
      <ul>
        <li>Puedes leer y escuchar sin una cuenta. El sitio no te pide tu nombre ni tu correo electrónico.</li>
        {accountsOn && <li>Una cuenta es opcional. Con una, tu lugar, tu idioma, tus párrafos guardados y tus notas te siguen a cada dispositivo. El tema y el tamaño del texto se quedan en cada dispositivo.</li>}
        <li>El sitio no muestra publicidad y no vende datos.</li>
        <li>Cuenta qué páginas y funciones usan los lectores, sin cookie{accountsOn ? ". Si inicias sesión, los conteos llevan un código que representa tu cuenta, no tu correo electrónico ni tu nombre." : " y sin identificador."}</li>
        <li>Registra lo que buscan los lectores, sin vínculo con el lector.</li>
        <li>
          Preguntas: <Email />.
        </li>
      </ul>

      <h2>Quiénes somos</h2>
      <p>
        {PRIVACY_OPERATOR} opera UrantiaHub. En esta página, “nosotros” significa {PRIVACY_OPERATOR}. UrantiaHub es un
        proyecto independiente. No está afiliado a Urantia Foundation.
      </p>

      <h2>Qué recoge el sitio, y para qué</h2>
      <h3>Analítica de las páginas</h3>
      <p>
        Cuando abres una página o usas una función, el sitio envía un evento a PostHog, nuestro proveedor de analítica.
        Un evento contiene la dirección de la página y una etiqueta, como el número de un documento. No contiene
        ningún texto que leas. La dirección de una página de búsqueda se envía sin las palabras de la búsqueda. El sitio
        no pone ninguna cookie de analítica ni guarda ningún identificador de analítica en tu navegador. PostHog
        procesa tu dirección IP cuando recibe una solicitud de tu navegador.
      </p>
      {accountsOn && (
        <p>
          Mientras tienes la sesión iniciada, cada evento lleva también un código que representa tu cuenta. Con él
          vemos cómo usan el sitio con el tiempo los lectores que tienen una cuenta. El código no es tu correo
          electrónico, ni tu nombre, ni el número de tu cuenta, y PostHog no recibe ninguno de ellos. Después de cerrar
          la sesión, los eventos no llevan ningún código. Los registros de las búsquedas nunca lo llevan.
        </p>
      )}
      <p>Usamos esto para ver qué partes del sitio ayudan a los lectores, y para encontrar fallos.</p>

      <h3>Preguntar a un asistente</h3>
      <p>
        Un documento ofrece “Preguntar a un asistente”. Cuando lo usas, tu navegador abre el sitio del asistente que
        elegiste (Claude, ChatGPT, Gemini o Grok) con tu pregunta y los párrafos a los que se refiere. UrantiaHub no
        recibe la pregunta ni la respuesta, y no le paga a ningún asistente. La empresa de ese asistente maneja las dos
        según sus propias condiciones. El sitio cuenta que se usó la función, nunca las palabras.
      </p>

      <h3>Búsquedas</h3>
      <p>
        Cuando buscas, el sitio registra las palabras de la búsqueda y cuántos resultados encontró, para que veamos qué
        buscan los lectores. El registro no está vinculado a ti. Lo envía nuestro servidor, no tu navegador, así que
        no contiene ninguna dirección IP, ninguna página que abriste ni nada sobre tu dispositivo.
      </p>
      <p>
        Para encontrar resultados, nuestro servidor envía las palabras de la búsqueda al servicio de contenido que
        guarda el texto. Para los pasajes relacionados, ese servicio envía las palabras a OpenAI, que compara su
        significado con el texto. Ninguno de los dos recibe tu dirección IP ni nada más sobre ti.
      </p>

      <h3>Registros de las solicitudes</h3>
      <p>
        Como en cualquier sitio web, nuestro proveedor de alojamiento guarda un registro de cada solicitud durante un
        tiempo limitado, para mantener seguro el sitio y para encontrar fallos. Una línea del registro contiene tu
        dirección IP y la dirección de la página. La dirección de una página de búsqueda contiene las palabras de la
        búsqueda.
      </p>

      {accountsOn && (
        <>
          <h3>Si inicias sesión</h3>
          <p>
            Puedes iniciar sesión con una cuenta de UrantiaHub. Es opcional, y nada en el sitio la necesita para leer
            ni para escuchar. Si inicias sesión, la cuenta guarda estas cosas, para que sean las mismas en cada uno de
            tus dispositivos:
          </p>
          <ul>
            {[...ACCOUNT_ITEMS_ES, ACCOUNT_LANGUAGE_ITEM_ES].map((item) => (
              <li key={item}>{item}.</li>
            ))}
          </ul>
          <p>
            Una cookie guarda tu sesión. Está cifrada, y un script de la página no puede leerla. Una segunda cookie dice
            solo que tienes la sesión iniciada, para que la página muestre los controles correctos. No usamos ninguna de
            las dos para analítica ni para publicidad. Los eventos de analítica no están vinculados a tu cuenta.
          </p>
          <p>
            Unas pocas cookies más sirven al inicio de sesión mismo: una guarda el comienzo de un inicio de sesión y el
            idioma de este navegador durante unos minutos, una recuerda que cerraste la sesión, para que el siguiente
            inicio de sesión te pregunte otra vez, y una dice durante un minuto que un inicio de sesión no terminó. El
            navegador guarda también una marca que dice a qué cuenta pertenece el lugar de este navegador.
          </p>
          <p>
            Cuando cierras la sesión en un dispositivo, el último lugar que leíste sale de ese navegador. Tu cuenta
            todavía lo guarda.
          </p>
          <p>
            En <a href="https://accounts.urantiahub.com">accounts.urantiahub.com</a> puedes ver cada aplicación que
            tiene acceso a tu cuenta, quitar una o borrar la cuenta. Cuando borras la cuenta, borramos lo que guarda.
          </p>
        </>
      )}

      {noticesOn && (
        <>
          <h3>Si activas un aviso</h3>
          <p>
            Un lector con la sesión iniciada puede recibir un pasaje cada día, un recordatorio de un lugar y una nota
            sobre una novedad. Cada uno está desactivado hasta que lo actives, y tú eliges correo, notificación o las
            dos. Una notificación llega a cada dispositivo donde tienes la sesión iniciada y permitiste las
            notificaciones. Si activas uno, la cuenta también guarda estas cosas:
          </p>
          <ul>
            {NOTICE_ITEMS_ES.map((item) => (
              <li key={item}>{item}.</li>
            ))}
          </ul>
          <p>
            Un correo de un aviso no carga ninguna imagen y no tiene ningún enlace de seguimiento, así que no vemos si lo
            abres. Cada uno tiene un enlace que desactiva ese correo con un toque y sin iniciar sesión. El enlace contiene
            un código que nombra tu cuenta y ese aviso, y nada más.
          </p>
          <p>
            Una notificación pasa por el servicio de notificaciones de tu navegador: Google para Chrome, Apple para
            Safari, Mozilla para Firefox. Está cifrada para tu dispositivo, así que ese servicio no puede leerla. Ve la
            dirección de tu dispositivo en ese servicio, y la hora. Tu navegador guarda un pequeño programa que muestra la
            notificación. Una notificación se muestra solo mientras tienes la sesión iniciada en ese dispositivo. Cuando
            cierras la sesión en un dispositivo, quitamos ese dispositivo de tu cuenta, y el navegador termina su
            registro. Vuelve cuando inicias sesión otra vez ahí.
          </p>
          <p>
            Puedes desactivar cada aviso en la página Avisos, y “Desactivar todo” ahí quita cada dispositivo. Cuando
            borras la cuenta, borramos todo esto.
          </p>
        </>
      )}

      {streaksOn && (
        <>
          <h3>Si llevas una racha</h3>
          <p>
            Un lector con la sesión iniciada puede llevar una racha: el número de días seguidos con una sección
            terminada. Está desactivada hasta que digas que sí. Si llevas una, la cuenta también guarda estas cosas:
          </p>
          <ul>
            {STREAK_ITEMS_ES.map((item) => (
              <li key={item}>{item}.</li>
            ))}
          </ul>
          <p>
            Puedes desactivar la racha en tu página. Lo que la cuenta guarda para ella se queda, así que una racha que
            vuelves a activar conserva su conteo. Cuando borras la cuenta, borramos todo esto.
          </p>
        </>
      )}

      <h2>Lo que se queda en tu navegador</h2>
      <p>
        El sitio guarda estas cosas en tu navegador.{" "}
        {accountsOn
          ? "Si inicias sesión, el lugar, el idioma y los párrafos que leíste también van a tu cuenta. El tema y el tamaño del texto nunca salen del dispositivo. Para cualquier otro lector, nada de esto sale del dispositivo."
          : "No salen de tu dispositivo."}
      </p>
      <ul>
        {browserItems.map((item) => (
          <li key={item.name}>
            {item.es.name}, {item.es.why}.
          </li>
        ))}
      </ul>
      <p>Puedes quitar cada una de ellas cuando borras los datos del sitio en tu navegador.</p>

      <h2>Quién maneja datos para nosotros</h2>
      <p>Estas empresas hacen trabajo para el sitio. Cada una recibe solo lo que su trabajo necesita.</p>
      <div className="table-wrap">
        <table aria-label="Empresas que manejan datos para UrantiaHub">
          <thead>
            <tr>
              <th scope="col">Empresa</th>
              <th scope="col">Qué hace</th>
              <th scope="col">Qué recibe</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((vendor) => (
              <tr key={vendor.name}>
                <th scope="row">
                  {vendor.name}
                  <a href={vendor.policy} rel="noopener" hrefLang="en" aria-label={`Política de privacidad de ${vendor.name}`}>
                    Política
                  </a>
                </th>
                <td>{vendor.es.purpose}</td>
                <td>{vendor.es.receives}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>No vendemos datos y no los compartimos para publicidad.</p>

      <h2>Lo que puedes elegir</h2>
      <ul>
        <li>
          Si tu navegador envía una señal Do Not Track o Global Privacy Control, el sitio no envía ningún evento de
          analítica y no registra tus búsquedas en su analítica.
        </li>
        <li>Puedes borrar los datos del sitio en tu navegador en cualquier momento. El sitio sigue funcionando.</li>
        <li>
          Puedes preguntar qué guardamos, o pedirnos que lo quitemos: <Email />. Sin una cuenta, no guardamos nada a tu
          nombre, así que dinos qué datos buscas.
        </li>
      </ul>

      <h2>Cambios en esta página</h2>
      <p>
        {accountsOn
          ? "El sitio va a crecer: están previstos los marcadores y las notas. Nuevo en esta fecha: puedes iniciar sesión con una cuenta de UrantiaHub. Cuando esta página cambia, cambia la fecha de arriba, y esta página dice qué es nuevo."
          : "El sitio va a crecer: están previstas las cuentas, los lugares guardados y las notas. Cuando esta página cambia, cambia la fecha de arriba, y esta página dice qué es nuevo."}
      </p>

      <h2>Contacto</h2>
      <p>
        Envía una pregunta sobre tu privacidad a <Email />.
      </p>
    </div>
  );
}

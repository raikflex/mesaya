import Link from 'next/link';

export const metadata = {
  title: 'Politica de Datos — EnPura',
  description: 'Politica de Tratamiento de Datos Personales de EnPura.',
};

/**
 * Pagina publica con la Politica de Tratamiento de Datos Personales (Ley 1581).
 * Estatica, accesible en /politica-datos. Se enlaza desde los avisos de los
 * formularios donde se piden datos del cliente.
 *
 * IMPORTANTE: completar los datos entre corchetes [ ] antes de publicar:
 * apellidos, cedula, ciudad y correo de contacto (aparece 2 veces).
 */
export default function PoliticaDatosPage() {
  return (
    <main className="min-h-screen" style={{ background: 'var(--color-paper)' }}>
      <div className="max-w-2xl mx-auto px-5 py-10">
        <Link
          href="/"
          className="text-sm inline-flex items-center gap-1 mb-6"
          style={{ color: 'var(--color-muted)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Volver
        </Link>

        <h1
          className="font-[family-name:var(--font-display)] text-3xl tracking-[-0.02em] mb-2"
          style={{ color: 'var(--color-ink)' }}
        >
          Politica de Tratamiento de Datos Personales
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--color-muted)' }}>
          Ultima actualizacion: [FECHA]
        </p>

        <p className="text-base leading-relaxed mb-6" style={{ color: 'var(--color-ink-soft)' }}>
          En cumplimiento de la Ley 1581 de 2012, el Decreto 1074 de 2015 y demas
          normas concordantes de la Republica de Colombia sobre proteccion de datos
          personales, se adopta la presente Politica de Tratamiento de Datos
          Personales.
        </p>

        <Seccion titulo="1. Identificacion del responsable / encargado">
          <ul className="space-y-1 mb-4">
            <Dato etiqueta="Nombre" valor="Felipe [APELLIDOS]" />
            <Dato etiqueta="Documento de identidad" valor="[CEDULA]" />
            <Dato etiqueta="Calidad" valor="Persona natural que opera la plataforma EnPura." />
            <Dato etiqueta="Correo de contacto" valor="[TU CORREO]" />
            <Dato etiqueta="Ciudad" valor="[CIUDAD], Colombia" />
          </ul>
          <p>
            EnPura es una plataforma tecnologica que permite a restaurantes recibir
            pedidos desde la mesa (mediante codigo QR), domicilios y pagos. En
            relacion con los datos de los comensales (clientes finales de los
            restaurantes), <strong>EnPura actua como Encargado del Tratamiento</strong>,
            procesando los datos por cuenta y bajo las instrucciones de cada
            restaurante, que es el Responsable del Tratamiento de los datos de sus
            clientes.
          </p>
        </Seccion>

        <Seccion titulo="2. Datos que se recolectan">
          <p className="mb-3">
            A traves de la plataforma se recolectan unicamente los datos necesarios
            para prestar el servicio:
          </p>
          <ul className="space-y-2 mb-4 list-disc pl-5">
            <li><strong>Nombre</strong> del comensal (para identificar el pedido en mesa o domicilio).</li>
            <li><strong>Telefono</strong> (para coordinar entregas a domicilio y contacto sobre el pedido).</li>
            <li><strong>Direccion de entrega</strong> (solo en pedidos a domicilio).</li>
            <li><strong>Datos de facturacion</strong> (tipo y numero de documento — cedula o NIT — y nombre), unicamente cuando el comensal solicita factura.</li>
          </ul>
          <p>
            No se recolectan datos sensibles (datos de salud, origen racial o etnico,
            orientacion politica, convicciones religiosas, datos biometricos, vida
            sexual, u otros definidos como sensibles por la ley).
          </p>
        </Seccion>

        <Seccion titulo="3. Finalidad del tratamiento">
          <p className="mb-3">Los datos se tratan exclusivamente para las siguientes finalidades:</p>
          <ul className="space-y-2 mb-4 list-disc pl-5">
            <li>Gestionar y procesar los pedidos realizados a traves de la plataforma.</li>
            <li>Coordinar la entrega de pedidos a domicilio o para recoger.</li>
            <li>Permitir el contacto entre el restaurante y el comensal en relacion con su pedido.</li>
            <li>Emitir la factura cuando el comensal lo solicite.</li>
            <li>Garantizar el funcionamiento, la seguridad y el soporte tecnico de la plataforma.</li>
          </ul>
          <p>
            Los datos <strong>no</strong> se utilizan para fines distintos a los aqui
            descritos, ni se venden, ceden o comercializan con terceros ajenos a la
            prestacion del servicio.
          </p>
        </Seccion>

        <Seccion titulo="4. Uso limitado de tus datos">
          <p className="mb-3">Queremos que tengas claridad sobre como se usan tus datos:</p>
          <ul className="space-y-2 list-disc pl-5">
            <li>Tus datos se guardan <strong>unicamente para procesar tu pedido</strong>: prepararlo, coordinar la entrega y emitir la factura si la solicitas.</li>
            <li><strong>No usamos tus datos para publicidad</strong> ni para fines propios de EnPura.</li>
            <li><strong>No vendemos</strong> tus datos ni los compartimos con terceros ajenos a tu pedido.</li>
            <li>Unicamente el <strong>restaurante donde realizaste tu pedido</strong> puede ver tus datos. Ningun otro restaurante de la plataforma tiene acceso a ellos.</li>
            <li>Conservamos tus datos solo el tiempo necesario para cumplir con tu pedido y con las obligaciones legales (por ejemplo, las de facturacion). Despues se suprimen o anonimizan.</li>
          </ul>
        </Seccion>

        <Seccion titulo="5. Derechos del titular">
          <p className="mb-3">
            De acuerdo con la Ley 1581 de 2012, como titular de sus datos personales
            usted tiene derecho a:
          </p>
          <ul className="space-y-2 list-disc pl-5">
            <li><strong>Conocer</strong> los datos personales que se tratan sobre usted.</li>
            <li><strong>Actualizar</strong> y <strong>rectificar</strong> sus datos cuando sean inexactos o esten desactualizados.</li>
            <li><strong>Solicitar prueba</strong> de la autorizacion otorgada para el tratamiento.</li>
            <li><strong>Ser informado</strong> sobre el uso que se ha dado a sus datos.</li>
            <li><strong>Presentar quejas</strong> ante la Superintendencia de Industria y Comercio (SIC) por infracciones a la ley.</li>
            <li><strong>Revocar la autorizacion</strong> y/o <strong>solicitar la supresion</strong> de sus datos, siempre que no exista un deber legal o contractual que impida eliminarlos.</li>
            <li><strong>Acceder de forma gratuita</strong> a sus datos personales.</li>
          </ul>
        </Seccion>

        <Seccion titulo="6. Como ejercer sus derechos">
          <p className="mb-3">
            Para ejercer cualquiera de estos derechos, puede comunicarse a traves del
            correo:
          </p>
          <p className="mb-4 font-medium" style={{ color: 'var(--color-ink)' }}>[TU CORREO]</p>
          <p className="mb-3">
            En su solicitud, indique su nombre, los datos de contacto, una descripcion
            clara del derecho que desea ejercer y la informacion sobre la que recae la
            solicitud.
          </p>
          <p className="mb-2"><strong>Plazos de respuesta</strong> (conforme a la ley):</p>
          <ul className="space-y-2 list-disc pl-5">
            <li><strong>Consultas:</strong> se responderan en un termino maximo de <strong>diez (10) dias habiles</strong>. Si no fuere posible atenderla en ese plazo, se le informara el motivo y la fecha en que se atendera, que no superara los <strong>cinco (5) dias habiles</strong> siguientes.</li>
            <li><strong>Reclamos:</strong> se atenderan en un termino maximo de <strong>quince (15) dias habiles</strong> contados a partir del dia siguiente a su recepcion. Si no fuere posible, se le informara el motivo y la fecha en que se atendera, que no superara los <strong>ocho (8) dias habiles</strong> siguientes.</li>
          </ul>
        </Seccion>

        <Seccion titulo="7. Autorizacion">
          <p>
            Al utilizar la plataforma EnPura y proporcionar sus datos para realizar un
            pedido o solicitar una factura, usted autoriza el tratamiento de sus datos
            personales conforme a las finalidades descritas en esta politica. El
            restaurante en el que realiza su pedido es el Responsable del Tratamiento
            de sus datos.
          </p>
        </Seccion>

        <Seccion titulo="8. Medidas de seguridad">
          <p className="mb-3">
            Se han adoptado medidas tecnicas y administrativas razonables para proteger
            los datos personales y evitar su adulteracion, perdida, consulta, uso o
            acceso no autorizado. Entre ellas:
          </p>
          <ul className="space-y-2 list-disc pl-5">
            <li>Almacenamiento de los datos en infraestructura con conexiones cifradas (HTTPS).</li>
            <li>Control de acceso: solo el personal autorizado del restaurante puede ver los datos de los pedidos de sus propios clientes.</li>
            <li>Confidencialidad: las personas que intervienen en el tratamiento estan obligadas a mantener la reserva de la informacion.</li>
          </ul>
        </Seccion>

        <Seccion titulo="9. Conservacion de los datos">
          <p>
            Los datos personales se conservaran durante el tiempo necesario para
            cumplir las finalidades descritas y las obligaciones legales aplicables
            (por ejemplo, las relativas a facturacion). Una vez cumplidas, los datos
            seran suprimidos o anonimizados, salvo deber legal de conservacion.
          </p>
        </Seccion>

        <Seccion titulo="10. Vigencia y cambios">
          <p>
            La presente politica rige a partir de su publicacion. Cualquier cambio
            sustancial sera informado a traves de la plataforma o del sitio web de
            EnPura. Se recomienda revisar periodicamente esta politica.
          </p>
        </Seccion>

        <footer className="mt-10 pt-6 border-t text-center" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-xs uppercase tracking-[0.14em]" style={{ color: 'var(--color-muted)' }}>
            Servido con <span style={{ color: 'var(--color-ink)' }}>EnPura</span>
          </p>
        </footer>
      </div>
    </main>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2
        className="font-[family-name:var(--font-display)] text-xl tracking-[-0.015em] mb-3"
        style={{ color: 'var(--color-ink)' }}
      >
        {titulo}
      </h2>
      <div className="text-base leading-relaxed space-y-2" style={{ color: 'var(--color-ink-soft)' }}>
        {children}
      </div>
    </section>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <li className="text-base" style={{ color: 'var(--color-ink-soft)' }}>
      <span style={{ color: 'var(--color-muted)' }}>{etiqueta}:</span>{' '}
      <span style={{ color: 'var(--color-ink)' }}>{valor}</span>
    </li>
  );
}

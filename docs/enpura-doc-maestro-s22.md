# EnPura — Doc Maestro / Cierre Sesion S22 (domicilios y pickup)

Fecha: 2026-05-28
Ultimo commit estable: `a785a29` (validacion telefono). Hay 1 fix sin commit (ver abajo).

---

## CONTEXTO BASE (verbatim — no cambia)

- **Path local**: `C:\Users\roafe\proyectos\mesaya`
- **Monorepo**: 3 apps Next.js — admin (3000), staff (3001: cocina/mesero/login), cliente (3002)
- **Stack**: pnpm 9.12.0 + Turborepo + Next 15.5.15 (Turbopack) + React 19 + Tailwind v4 + Supabase
- **Supabase project**: `jvifgtoahbtqdzymhaog`
- **Restaurante test**: `6c1ee7f0-38f5-4768-b0a8-3ac187d8ec0c` "Cafe cumbre", color `#9a3f6b` (en pruebas tambien aparecio `#ff0000`), slug `cafe-cumbre`
- **Mesa 4 token**: `64186668-8bdb-463b-a13f-998b44ff045b`
- **Dueno**: `ghostraikflex@gmail.com` / `cocina1234`
- **Repo**: https://github.com/raikflex/mesaya
- **Marca**: ENPURA. Dominios `enpura.co` / `enpura.app` disponibles, SIN comprar aun.
- Idioma: espanol. Codigo sin acentos.

### Patron PowerShell vigente
```powershell
# Abrir archivo en VS Code
code "apps\ruta\archivo.tsx"
# Mover descarga (OJO: la carpeta es "Downloads" en ingles, no "Descargas")
Move-Item -Force "$HOME\Downloads\archivo.tsx" "apps\ruta\archivo.tsx"
# Verificar contenido
Select-String -Path "apps\ruta\archivo.tsx" -Pattern "patron"
pnpm typecheck
```
NOTA IMPORTANTE: la descarga del navegador va a `C:\Users\roafe\Downloads` (ingles).
Para evitar descargas cacheadas con contenido viejo, nombrar archivos nuevos con
sufijo (`-v2`, `-v3`) y mover al destino con el nombre correcto.

---

## COMMITS DE LA SESION S22

- `fe7e6ae` — feat: domicilios y pickup completo - cliente, staff ve datos, pop-up entrega, estados en vivo (17 archivos)
- `a785a29` — feat: selector de pais y validacion de telefono en checkout de domicilio
- **(SIN COMMIT)** — fix mesa virtual unica por pedido + filtro `_dom` en mapa de mesas (ver "EN PROGRESO")

---

## FEATURE DOMICILIOS/PICKUP — ESTADO: FUNCIONAL, con bugs menores pendientes

### Arquitectura
- **Flujo cliente**: `/d/[slug]` (menu) -> `/d/[slug]/checkout` -> `/d/[slug]/pedido/[pedidoId]` (estado realtime)
- **Mesa virtual**: cada pedido externo crea su PROPIA mesa virtual unica (`_dom_<sufijo>`).
  CAMBIO IMPORTANTE de S22: antes era una sola mesa `_domicilio` compartida, pero el indice
  `uq_sesiones_mesa_activa` (UNIQUE mesa_id WHERE estado IN abierta/pago_pendiente) impedia
  2 sesiones abiertas en la misma mesa -> 2 domicilios simultaneos fallaban. Solucion: mesa
  unica por pedido.
- **Tipos de pedido**: `domicilio` (con direccion) y `pickup` (con hora). Ambos crean comanda
  con `origen = tipo` + registro en `pedidos_externos`.
- **Estado en vivo**: trigger `trg_sync_pedido_externo_estado` (SECURITY DEFINER) sincroniza
  `pedidos_externos.estado_entrega` cuando cambia `comandas.estado`. El estado `en_camino`/
  `listo_pickup` lo setea el mesero desde el pop-up via action `marcarEstadoEntrega`.

### DB aplicada en S22 (toda corrida en Supabase, OK)
```sql
-- origen ampliado (ya estaba de S21)
-- CHECK comandas.origen IN ('cliente','mesero','domicilio','pickup')

-- pedidos_externos: estado_entrega ampliado con listo_pickup
-- CHECK estado_entrega IN ('pendiente','en_preparacion','en_camino','listo_pickup','entregado')

-- Trigger CORREGIDO con SECURITY DEFINER (esto fue clave — sin esto el UPDATE
-- del trigger era bloqueado por RLS porque solo habia policy de SELECT):
CREATE OR REPLACE FUNCTION sync_pedido_externo_estado()
RETURNS TRIGGER SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.estado IN ('pendiente','en_preparacion') THEN
    UPDATE pedidos_externos SET estado_entrega = NEW.estado
    WHERE comanda_id = NEW.id
      AND estado_entrega NOT IN ('en_camino','listo_pickup','entregado');
  END IF;
  IF NEW.estado = 'entregada' THEN
    UPDATE pedidos_externos SET estado_entrega = 'entregado' WHERE comanda_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_pedido_externo_estado ON comandas;
CREATE TRIGGER trg_sync_pedido_externo_estado
AFTER UPDATE ON comandas FOR EACH ROW EXECUTE FUNCTION sync_pedido_externo_estado();

-- pedidos_externos agregada a realtime
ALTER PUBLICATION supabase_realtime ADD TABLE pedidos_externos;
```

### Archivos del feature (todos en el repo)
**Cliente:**
- `apps/cliente/app/d/[slug]/page.tsx` — server, carga restaurante por slug
- `apps/cliente/app/d/[slug]/menu-externo.tsx` — menu, carrito usa slug como key (lib usa sessionStorage `mesaya:carrito:{slug}`), botones +/- (sin notas aca)
- `apps/cliente/app/d/[slug]/checkout/page.tsx` — server
- `apps/cliente/app/d/[slug]/checkout/checkout-externo.tsx` — v3: notas por item, selector de pais (bandera+prefijo, CO default), validacion de digitos por pais. Telefono se guarda con prefijo (ej "+57 3001234567"). useState([]) + useEffect para evitar hydration.
- `apps/cliente/app/d/[slug]/checkout/actions.ts` — `crearPedidoExterno`. CAMBIO S22: crea mesa virtual unica por pedido (`_dom_<sufijo>`), no reusa mesa compartida.
- `apps/cliente/app/d/[slug]/pedido/[pedidoId]/page.tsx` — server
- `apps/cliente/app/d/[slug]/pedido/[pedidoId]/estado-pedido.tsx` — realtime via canal en pedidos_externos, barra de progreso por tipo

**Staff:**
- `apps/staff/app/cocina/tablero-cocina.tsx` — InfoEntrega + origen + badge domicilio/pickup + datos entrega en CardComanda
- `apps/staff/app/cocina/page.tsx` — query SSR con origen + pedidos_externos
- `apps/staff/app/mesero/tablero-mesero.tsx` — InfoEntregaMesero (con pedidoExternoId + estadoEntrega) + badge + datos entrega + boton "Ver detalles" que abre ModalDomicilio
- `apps/staff/app/mesero/modal-domicilio.tsx` — pop-up: nombre/tel grandes, boton Llamar (tel:), direccion + "Ver en Google Maps" (link directo sin API), notas, items, boton "Marcar en camino"/"Marcar listo para recoger"
- `apps/staff/app/mesero/page.tsx` — query SSR con origen + pedidos_externos (id, estado_entrega, ...)
- `apps/staff/app/mesero/actions.ts` — action `marcarEstadoEntrega({ pedidoExternoId, nuevoEstado })`

---

## EN PROGRESO — fix sin commitear (terminar ESTO primero al retomar)

### Bug critico ARREGLADO (sin commit): 2 domicilios simultaneos
- Causa: indice `uq_sesiones_mesa_activa` + mesa `_domicilio` compartida.
- Fix aplicado en `checkout/actions.ts` paso 2: ahora crea mesa virtual unica
  `_dom_<sufijo>` por pedido. `mesaDomicilioId` paso de `let` a `const`. Typecheck verde.
- PENDIENTE: probar 2 domicilios seguidos sin error + commitear.

### Bug #3 ARREGLADO (sin commit): mesa virtual aparecia en el mapa de mesas
- Fix aplicado en `apps/staff/app/mesero/page.tsx` query de mesas:
  agregado `.not('numero', 'like', '_dom%')` para ocultar mesas virtuales.
- PENDIENTE: confirmar typecheck verde + que el recuadro "domicilio" ya no aparece.

### COMMIT pendiente sugerido:
```
git add -A
git commit -m "fix: mesa virtual unica por pedido (permite domicilios simultaneos) y oculta mesas _dom del mapa"
git push
```

---

## BUGS / PENDIENTES REPORTADOS (no resueltos aun)

### Bug #2 — Google Maps no redirige (PENDIENTE — falta info del usuario)
El boton "Ver en Google Maps" del pop-up no redirigio. FALTA SABER: que escribio el
usuario en el campo direccion — una direccion normal ("Calle 50 #10-20") o un link de
Maps pegado. El fix depende de eso:
- Si direccion normal: revisar por que el link `https://www.google.com/maps/search/?api=1&query=<encoded>` no abre (puede ser bloqueo de popup en desktop, o target/rel).
- Si pegan un link de Maps: detectar URLs (empiezan con http) y abrirlas directo en vez de meterlas en query de busqueda.
Archivo: `apps/staff/app/mesero/modal-domicilio.tsx` (variable `mapsUrl`).

### Mejora #3 — boton "Entregar" en el pop-up + propina editable (PENDIENTE, razonable)
- Agregar boton "Entregar" dentro del ModalDomicilio que mande al flujo de cobro
  (el flujo de cobro YA EXISTE en tablero-mesero: `ModalCobrar`).
- En `ModalCobrar`: la propina hoy es toggle 10% fijo. El usuario quiere: porcentajes
  EDITABLES + opcion de escribir el monto en numero. Las dos opciones.
- Es trabajo sobre algo que ya funciona — hacerlo despues de los bugs.

---

## BACKLOG POSPUESTO CONSCIENTEMENTE (esperar al piloto / tienen costo)

1. **Rediseno del layout del mesero** (header de secciones mesas/domicilios sin cambiar de
   ruta, dividido en rows). Es un REDISENO GRANDE del corazon de la operacion. Riesgoso
   (realtime, cards, cobro). Pospuesto 2 veces. Esperar al piloto para ver si hace falta —
   con el badge azul + mesa virtual oculta, los domicilios ya se distinguen.
2. **Autocompletado de direccion** (Google Places Autocomplete API) — TIENE COSTO. Solo si
   el piloto muestra que los clientes escriben mal las direcciones.
3. **Mini-mapa embebido** en el pop-up (Google Maps Embed API) — TIENE COSTO. El link
   directo actual (gratis) cumple la funcion.
4. **Sistema de roles mesero/domiciliario** desde el admin — el piloto confirmado usa UNA
   persona para mesero+domiciliario, asi que NO se usa todavia. Va junto con el rol admin
   de plataforma (fase futura).
5. **Countdown de cancelacion en checkout externo** (Issue 4 viejo, tipo carrito QR 30s) —
   nunca se implemento. Bajo impacto.

### Rol admin de plataforma (fase futura — desbloquea cobro Bre-B + feedback staff + roles)
- 5 preguntas de arquitectura pendientes (ver doc cierre S21):
  1. Como distinguir admin plataforma de dueno (valor en perfiles.rol? tabla? flag?)
  2. Por donde entra (app admin existente con ruta protegida, o separado?)
  3. Que ve (datos de todos los restaurantes -> toca RLS de medio sistema)
  4. Como se asigna (Felipe + socio de confianza)
  5. Como se protege (rol mas poderoso del sistema)
- Sobre ese rol se montan: feedback del staff sobre EnPura + revision pagos Bre-B + roles de staff.

### Discovery cerrado en S21 (NO reconstruir)
- El feedback cliente -> dueno YA EXISTE: tabla `reviews` (12 registros), pantalla
  `/admin/reviews`, flujo en `gracias-cliente.tsx` (estrellas + comentario).
- Tabla `calificaciones` esta VACIA (0 registros), es tabla muerta, candidata a borrar.

---

## COMERCIAL — PRIORITARIO (lo que mueve la aguja)

- **Comprar `enpura.co`** (~$12, Cloudflare o Namecheap/Porkbun). Conectar a Vercel.
  `.app` puede esperar.
- **Piloto**: Felipe tiene un cliente potencial que YA VIO el producto y le gusto. El
  cliente menciono delivery como "seria bueno tener" (no bloqueante). El feature de
  domicilios ya esta listo para mostrarselo. Prioridad: configurar el restaurante del
  cliente (mesas, QR, menu) y acompanar los primeros dias.
- Cobro futuro: Bre-B manual (comprobante + revision) — cuando haya cliente #2-#3.

---

## LECCIONES CLAVE (S22)

- **#109**: Indices UNIQUE parciales (`uq_sesiones_mesa_activa`) pueden romper patrones de
  "recurso virtual compartido". Solucion: un recurso virtual unico por uso, no compartido.
- **#110**: Triggers que hacen UPDATE en tablas con RLS necesitan SECURITY DEFINER, sino el
  UPDATE se filtra en silencio (sin error) si no hay policy de UPDATE para ese rol.
- **#111**: Tablas nuevas que el cliente escucha por realtime hay que agregarlas a la
  publicacion `supabase_realtime` explicitamente (ALTER PUBLICATION ... ADD TABLE), sino el
  cliente nunca recibe eventos aunque la DB cambie.
- **#112**: Las descargas del navegador a veces sirven una version CACHEADA vieja del mismo
  nombre de archivo. Solucion: nombrar archivos nuevos con sufijo (-v2, -v3).
- **#113**: La carpeta de descargas del usuario es `Downloads` (ingles), no `Descargas`.
- **#114**: Patron recurrente del usuario: pedir muchas mejoras antes de que lo basico
  funcione E2E. Frenar, separar bugs (urgente) de features nuevas (pueden esperar), y
  arreglar bugs primero. Lo hicimos bien en S22.
- **#115**: Validacion de inputs: la del cliente es para feedback rapido (UX), la del
  servidor es la que protege de verdad. Hacer ambas.

---

## DONDE RETOMAR (orden sugerido para la proxima sesion)

1. **Commitear el fix en progreso** (mesa virtual unica + filtro `_dom` del mapa). Antes,
   confirmar typecheck verde y probar: 2 domicilios simultaneos OK + recuadro "domicilio"
   ya no aparece en el mapa.
2. **Bug #2 Google Maps**: preguntar al usuario que escribio en direccion, arreglar el link.
3. **Mejora #3**: boton "Entregar" en el pop-up + propina editable (% editable + monto en numero) en ModalCobrar.
4. **PARAR de sumar features** y empujar lo comercial: comprar enpura.co + arrancar el piloto.
   El feature de domicilios ya esta completo y funcional.

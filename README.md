# MesaYA

Sistema web para restaurantes en Colombia. Monorepo con tres apps Next.js 15
(App Router) + Supabase.

> Doc maestro del proyecto: `docs/Doc_Maestro_v0_2.md` (mantener fuera del
> repo o adentro, como prefieras).

## Estructura

```
mesaya/
├── apps/
│   ├── admin/      # Dashboard del dueño (puerto 3000)
│   ├── staff/      # App de mesero + cocina (puerto 3001)
│   └── cliente/    # PWA del cliente final (puerto 3002)
├── packages/
│   ├── database/   # Clientes Supabase (browser/server/service) + tipos
│   ├── ui/         # Primitives compartidos: Button, Input, Field, …
│   └── config/     # Tsconfigs y design tokens (Tailwind v4)
└── supabase/       # Migrations + tipos generados
```

## Setup en máquina nueva

```bash
# 1. Node 20+
nvm use   # respeta el .nvmrc

# 2. pnpm
corepack enable
corepack prepare pnpm@9.12.0 --activate

# 3. Deps
pnpm install

# 4. Env
cp .env.example .env.local
# Pega tus valores de Supabase (NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY)
# Importante: en Vercel, configura las mismas variables a nivel de proyecto.
# Con la integración Vercel↔Supabase ya conectada, deberían aparecer auto-pobladas.

# 5. Tipos de Supabase (cuando tengas la CLI vinculada — ver supabase/README.md)
pnpm db:types

# 6. Levantar todo en paralelo
pnpm dev
# o por app:
pnpm dev:admin
pnpm dev:staff
pnpm dev:cliente
```

## Scripts

```bash
pnpm dev          # corre las tres apps con Turbopack
pnpm build        # build de producción
pnpm typecheck    # tsc --noEmit en todo el monorepo
pnpm lint         # next lint en cada app
pnpm format       # prettier --write
pnpm db:types     # regenera packages/database/src/types.generated.ts
```

## Convenciones

- **Código** (variables, funciones, componentes): inglés.
- **DB** (tablas, columnas, enums): español, snake_case.
- **UI** (texto visible al usuario): español.
- **JS**: camelCase. **URLs**: kebab-case. **DB**: snake_case.
- **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`).

## Auth

- **Cliente**: `supabase.auth.signInAnonymously()` (transparente al final user;
  el cliente no ve concepto de "cuenta"). Lo implementaremos en S3.
- **Staff/Dueño**: email + password. La cookie de sesión la maneja
  `@supabase/ssr`. El middleware en cada app refresca el token en cada
  request via `@mesaya/database/middleware`.

## Decisión arquitectónica abierta

El doc maestro v0.2 (sección 10) dice "monorepo con tres apps por subdominios"
pero las URLs listadas usan paths bajo un solo `app.mesaya.co`. Hoy el
monorepo asume **una app Next por subdominio**:

- `admin.mesaya.co` → `apps/admin`
- `staff.mesaya.co` → `apps/staff`
- `m.mesaya.co` → `apps/cliente`

En Vercel, cada `apps/*` se configura como un proyecto separado apuntando al
mismo repositorio con `Root Directory` distinto. Esto permite deploys
independientes. Si decidimos colapsar a una sola app, es ~30 min de refactor.

## Estado del scaffold (S2.1)

Lo que ya funciona:

- ✅ Monorepo pnpm + Turborepo + TypeScript estricto
- ✅ Tres apps Next 15 con App Router, Tailwind v4, fonts via `next/font`
- ✅ Paquete `@mesaya/database` con clientes browser/server/service y tipos stub
- ✅ Paquete `@mesaya/ui` con primitives (Button, Input, Field) — design tokens compartidos
- ✅ Middleware de Supabase en cada app (refresh de sesión)
- ✅ Signup del dueño (email + password) con server action y validación Zod
- ✅ **Paso 1 del onboarding** (`/admin/onboarding/paso-1`) con preview en vivo
  del color de marca

Lo que está pendiente para próximas sesiones:

- ⏳ Pasos 2–8 del onboarding (sesión 2.2)
- ⏳ Generación de QRs únicos por mesa
- ⏳ App cliente: flujo `/m/[qr_token]` → nombre → menú → pedido (S3)
- ⏳ Tablero de cocina realtime (S3)
- ⏳ App mesero (S4)
- ⏳ Dashboard del dueño con KPIs (S4)
- ⏳ Edge Functions: cierre de sesiones diarias, suspensión por trial vencido,
  reseteo de `numero_diario`
- ⏳ Sentry + Plausible

## Contacto

Felipe — felipe@mesaya.co (o el que sea)

# Supabase

## Regenerar tipos del schema

El archivo `packages/database/src/types.ts` ahora es un **stub manual** que
modela las tablas que tocamos en S2.1 (`restaurantes`, `perfiles`). En cuanto
tengas la CLI vinculada al proyecto, regenera el archivo real desde tu schema:

```bash
# 1. Instala la CLI si no la tienes (una sola vez por máquina)
brew install supabase/tap/supabase
# o: npm i -g supabase

# 2. Login
supabase login

# 3. Vincula este monorepo a tu proyecto
supabase link --project-ref <tu-project-ref>
# El project-ref está en la URL de tu proyecto:
# https://supabase.com/dashboard/project/<PROJECT_REF>

# 4. Genera tipos
pnpm db:types
```

Eso ejecuta:

```
supabase gen types typescript --linked --schema public > packages/database/src/types.generated.ts
```

Luego actualiza `packages/database/src/types.ts` para re-exportar el archivo
generado:

```ts
// packages/database/src/types.ts
export type { Database, Json } from './types.generated';
// resto de tipos derivados (Tables, etc.) se quedan acá
```

## Migrations

Las migrations 001 y 002 (esquema + RLS) viven en este repo o en el dashboard
de Supabase, según donde las hayas aplicado. Recomendación: copiarlas a
`supabase/migrations/` para que la CLI las pueda re-aplicar a cualquier ambiente:

```bash
supabase/
├── migrations/
│   ├── 20260430120000_initial_schema.sql
│   └── 20260430120100_rls_policies.sql
└── README.md
```

Con la CLI vinculada:

```bash
# aplicar pendientes a remoto
supabase db push

# pull desde remoto a local (si editaste en el dashboard)
supabase db pull
```

## Entornos

- **Producción**: el proyecto Supabase que vinculaste a Vercel.
- **Local opcional**: `supabase start` levanta una instancia Docker para dev
  desconectado. Hoy no es necesario; la app dev apunta directo a producción
  vía `.env.local` (free tier, OK para arrancar).

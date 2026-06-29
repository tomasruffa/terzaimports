# Terza Imports

Monorepo con landing + dashboard (Next.js) y API (Express).

```
terzaimports/
├── apps/
│   ├── web/      → Vercel (landing + dashboard)
│   └── api/      → Railway (REST API)
└── packages/
    └── shared/   → tipos compartidos
```

## Desarrollo local

```bash
npm install
cp .env.example .env   # completar variables
npm run dev            # web :3000 + api :4000
```

## Deploy

### Vercel (web)

1. Importar el repo en [Vercel](https://vercel.com).
2. **Root Directory:** `apps/web`
3. Framework: Next.js (detectado automáticamente).
4. Variables de entorno:

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL pública de Railway (ej. `https://terzaimports-api.up.railway.app`) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key de Supabase |

El `vercel.json` en `apps/web` instala dependencias desde la raíz del monorepo.

### Railway (API)

1. Crear proyecto en [Railway](https://railway.app) desde el mismo repo.
2. **Root Directory:** `apps/api` (importante — si queda en la raíz, `npm start` intenta levantar Next.js y falla el healthcheck).
3. Variables de entorno:

| Variable | Valor |
|---|---|
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (solo backend) |
| `ALLOWED_ORIGINS` | Dominio de Vercel, ej. `https://terzaimports.vercel.app` |

Railway asigna `PORT` automáticamente; no configures `API_PORT` en producción.

**Healthcheck:** el deploy debe responder `200` en `GET /health`. Si falla, revisá en Railway → Deployments → Logs que veas `Terza API listening on 0.0.0.0:XXXX`.

### Orden recomendado

1. Deploy API en Railway → copiar URL pública.
2. Configurar `NEXT_PUBLIC_API_URL` en Vercel con esa URL.
3. Configurar `ALLOWED_ORIGINS` en Railway con el dominio de Vercel.
4. Deploy web en Vercel.

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Web + API en paralelo |
| `npm run build` | Build de todos los workspaces |
| `npm run start` | Start de producción |

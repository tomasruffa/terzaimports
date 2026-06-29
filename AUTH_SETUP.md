# Configuración de Autenticación - Terza Imports

## Descripción
Se ha implementado autenticación con Supabase en la sección del panel de stock. El dashboard ahora está protegido y requiere login para acceder.

## Cambios Realizados

### 1. Nuevos Archivos Creados
- `apps/web/src/lib/supabase.ts` - Cliente de Supabase para el navegador
- `apps/web/src/lib/auth.ts` - Manejo de sesiones en el servidor
- `apps/web/src/hooks/useAuth.ts` - Hook personalizado para autenticación
- `apps/web/src/middleware.ts` - Middleware para proteger rutas
- `apps/web/src/components/ProtectedRoute.tsx` - Componente para envolver rutas protegidas
- `apps/web/src/app/login/page.tsx` - Página de login
- `apps/web/src/app/login/layout.tsx` - Layout de la página de login

### 2. Archivos Modificados
- `apps/web/src/app/dashboard/layout.tsx` - Envuelto con ProtectedRoute
- `apps/web/src/components/dashboard/Header.tsx` - Agregado menú de usuario y botón logout
- `apps/web/.env.local` - Agregada variable NEXT_PUBLIC_API_URL

## Cómo Funciona

### Flujo de Autenticación
1. **Acceso sin sesión** → Usuario redirigido a `/login`
2. **Login exitoso** → Usuario redirigido a `/dashboard`
3. **Logout** → Usuario redirigido a `/login`

### Protección de Rutas
- El middleware (`src/middleware.ts`) valida la sesión en cada solicitud
- Las rutas bajo `/dashboard/*` están protegidas
- Los usuarios no autenticados son redirigidos automáticamente a `/login`
- Los usuarios autenticados que intentan acceder a `/login` son redirigidos a `/dashboard`

## Configuración en Supabase

### 1. Habilitar Email/Password Authentication
En tu proyecto Supabase:
1. Ve a **Authentication** → **Providers**
2. Habilita **Email** (si no está habilitado)
3. Configura las opciones:
   - "Email/password" debe estar habilitado
   - Confirma que "Confirm email" está deshabilitado o configura según tus necesidades

### 2. Crear Usuarios
1. Ve a **Authentication** → **Users**
2. Haz clic en **Add user**
3. Ingresa email y contraseña
4. El usuario estará disponible para login inmediatamente

### 3. Obtener y Configurar Variables de Entorno

#### Paso 1: Obtén las credenciales de Supabase
1. Ve a tu dashboard de Supabase: https://app.supabase.com
2. Selecciona tu proyecto
3. Ve a **Settings** → **API**
4. Copia:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **"anon" public API key** (NO la publishable key de Auth) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### Paso 2: Actualiza `.env.local`
```bash
# apps/web/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc... (tu anon key aquí)
NEXT_PUBLIC_API_URL=http://localhost:4000
```

**⚠️ IMPORTANTE:** 
- Usa la **Anon Key** (no el Publishable Key de Auth)
- La Anon Key empieza típicamente con `eyJ...`
- Nunca compartas la Service Role Key en el cliente

## Uso

### Login
1. Navega a `http://localhost:3000/login`
2. Ingresa email y contraseña de un usuario creado en Supabase
3. Si las credenciales son correctas, serás redirigido al dashboard

### Logout
1. Haz clic en el avatar del usuario en el header del dashboard
2. Haz clic en "Cerrar sesión"
3. Serás redirigido a la página de login

### Obtener Datos del Usuario
En cualquier componente:
```typescript
import { useAuth } from '@/hooks/useAuth'

export default function MyComponent() {
  const { user, loading, signOut } = useAuth()
  
  return (
    <div>
      <p>Email: {user?.email}</p>
      <button onClick={signOut}>Logout</button>
    </div>
  )
}
```

## Próximos Pasos (Opcionales)

### 1. Recuperación de Contraseña
Implementar ruta de reset de contraseña:
```typescript
// en src/app/reset-password
const { error } = await supabase.auth.resetPasswordForEmail(email)
```

### 2. Google/GitHub OAuth
1. Configurar OAuth providers en Supabase
2. Implementar login con:
```typescript
const { error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
})
```

### 3. Roles y Permisos (RLS)
Implementar Row Level Security en Supabase para controlar acceso a datos por usuario.

### 4. Notificaciones por Email
Configurar templates de email en Supabase para:
- Confirmación de email
- Reset de contraseña
- Invitaciones

## Troubleshooting

### Error CORS: "Razón: El pedido CORS falló"
**Causa:** Estás usando la Publishable Key de Auth en lugar de la Anon Key.

**Solución:**
1. Ve a Supabase Dashboard → **Settings** → **API**
2. Copia la **"anon" public API key** (no "Publishable key")
3. Actualiza `NEXT_PUBLIC_SUPABASE_ANON_KEY` en `.env.local`
4. Reinicia el servidor dev: `npm run dev`

### "Error de configuración" en login
- Verifica que `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` están configurados
- Asegúrate de estar usando la **Anon Key**, no la Publishable Key
- Reinicia el servidor dev (`npm run dev`)

### Usuario no ve cambios después de logout
- Limpia cookies en DevTools
- Reinicia el navegador

### Middleware no redirige a login
- Verifica que el middleware está en `src/middleware.ts`
- Asegúrate que Next.js tiene la versión 15.3+

### "Usuario no encontrado" o credenciales inválidas
1. Verifica que el usuario existe en Supabase → **Authentication** → **Users**
2. Prueba las credenciales directamente en el dashboard de Supabase
3. Asegúrate de haber habilitado Email/Password authentication en Providers

## Referencias
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [@supabase/ssr Package](https://github.com/supabase/auth-helpers/tree/main/packages/ssr)

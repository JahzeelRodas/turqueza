# Despliegue en Hostinger · backend y frontend separados

Guía para publicar Turquesa con **dos Web Apps Node.js independientes** en el plan Business
de Hostinger (sin Docker):

```
https://turqueza.rovelbots.com       → apps/web  (Next.js)
https://turqueza-api.rovelbots.com   → apps/api  (NestJS)  → MySQL de Hostinger
```

Ventajas de separar las apps:

- Cada una se construye, reinicia y escala por su cuenta.
- La API puede recibir otros clientes (apps móviles, integraciones) sin pasar por el storefront.
- El frontend no arrastra el proceso de NestJS ni el de Prisma.
- El panel `/admin` sigue viviendo en el frontend y habla con la API por HTTPS.

> **Importante — Hostinger aísla la red de cada Web App.** Dos procesos de la misma cuenta no
> pueden comunicarse por `127.0.0.1`. Por eso el gateway de una sola app (`server.mjs` en modo
> gateway) **no funciona en Web Apps de Hostinger**: arranca NestJS y Next.js como hijos, no los
> alcanza por loopback, agota los 120 s y el dominio devuelve **503**. Usa siempre dos Web Apps
> (esta guía). El gateway queda solo para VPS/Docker/local; ver
> [HOSTINGER-UNA-APP.md](HOSTINGER-UNA-APP.md).

---

## 1. Base de datos MySQL

1. hPanel → **Bases de datos → MySQL**.
2. Crea una base y un usuario con permisos totales.
3. Anota **host**, puerto (`3306`), nombre de base, usuario y contraseña. En Hostinger suelen
   llevar el prefijo de la cuenta, por ejemplo `u123456789_turquesa`.
4. Mantén el charset `utf8mb4`.

Cadena de conexión:

```env
DATABASE_URL="mysql://USUARIO:PASSWORD@localhost:3306/BASEDATOS?connection_limit=5"
```

`connection_limit=5` evita agotar las conexiones del hosting compartido. Usa exactamente el
host y puerto que muestre hPanel.

---

## 2. Preparar el repositorio

El monorepo ya está listo para desplegar cada app por separado:

```
apps/api   → API NestJS + Prisma + migraciones
apps/web   → Storefront Next.js + panel /admin
```

No subas `.env`, `.env.local` ni `.env.production.local`: las variables van en hPanel. El
`.gitignore` ya los excluye.

Cada `apps/*/package.json` es autocontenido. Hostinger puede instalar con **pnpm** (recomendado,
el `pnpm-lock.yaml` está en la raíz del monorepo) o con **npm** si el panel no detecta pnpm.

### Configuración exacta de Turquesa

| Web App | Root directory | Framework | Build script | Output | Entry file | Dominio |
| --- | --- | --- | --- | --- | --- | --- |
| API | `apps/api` | **NestJS** | `build:deploy` | `dist` | `main.js` | `turqueza-api.rovelbots.com` |
| Frontend | `apps/web` | **Next.js** | `build:deploy` | `.next` | — (ignorado) | `turqueza.rovelbots.com` |

> Si el panel muestra `Application type: Other` o un entry file distinto, corrígelo: un frontend
> Next.js con entry `server.mjs` se comporta como gateway y termina en 503. La API con root `/`
> y entry `apps/api/dist/main.js` funciona por casualidad, pero no es el modo recomendado.

---

## 3. Web App de la API (NestJS)

hPanel → **Websites → Add Website → Node.js web app → Connect with GitHub**:

| Campo | Valor |
| --- | --- |
| Repositorio | `TU_USUARIO/turquesa` · rama `main` |
| **Root directory** | `apps/api` |
| Framework | **NestJS** |
| Node.js | **22** |
| Package manager | **pnpm** (si no se detecta, selecciónalo manualmente) |
| Build script | `build:deploy` |
| Output directory | `dist` |
| Entry file | `main.js` |
| Dominio | `turqueza-api.rovelbots.com` |

> El **entry file** es relativo al output directory. Escribe `main.js`, no `dist/main.js`.
> No definas `PORT`: Hostinger lo inyecta y la API lee `process.env.PORT`.

### Variables de entorno de la API

hPanel → Web App (API) → **Environment variables**:

```env
DATABASE_URL="mysql://USUARIO:PASSWORD@localhost:3306/BASEDATOS?connection_limit=5"
NODE_ENV=production

# Dominios exactos del frontend, separados por coma y sin barra final.
CORS_ORIGIN="https://turqueza.rovelbots.com,https://www.turqueza.rovelbots.com"

ADMIN_EMAIL="admin@turqueza.rovelbots.com"
ADMIN_PASSWORD="una-contraseña-larga-y-segura"
ADMIN_NAME="Administrador"
ADMIN_JWT_SECRET="cadena-aleatoria-de-64-caracteres-minimo"
ADMIN_TOKEN_TTL_HOURS=12
```

Notas importantes:

- **`CORS_ORIGIN` es obligatorio en producción.** Sin él la API se niega a arrancar para no
  quedar abierta a cualquier origen. Incluye el dominio temporal de Hostinger mientras pruebas.
- **`NODE_ENV=production`** activa la validación estricta de credenciales y CORS.
- La API valida estas variables **antes de compilar** (`build:deploy` → `scripts/check-env.mjs`).
  Si falta algo, el build falla con un mensaje claro y no reemplaza la versión anterior.
- **`ADMIN_PASSWORD`** debe tener al menos 10 caracteres y no puede ser `admin123`.
- **`ADMIN_JWT_SECRET`** debe tener al menos 32 caracteres.

### Qué hace `build:deploy`

```text
scripts/check-env.mjs   → valida variables de producción
prisma generate         → genera el cliente tipado
prisma migrate deploy   → aplica migraciones pendientes
nest build              → compila a dist/
```

Si una migración falla, el build falla y Hostinger mantiene la versión anterior en producción.

Si el entorno de build no puede alcanzar MySQL, usa `build:deploy:nomigrate` y aplica las
migraciones por SSH antes del push:

```bash
pnpm --filter api prisma:migrate:deploy
```

### Seed inicial

El seed carga catálogo de ejemplo, las 9 zonas de envío de Bolivia y la configuración de tienda.
Es idempotente. Ejecútalo **una sola vez**:

- **Opción A (recomendada):** por SSH desde un clon del repo:

  ```bash
  pnpm install --frozen-lockfile
  pnpm --filter api prisma:seed
  ```

- **Opción B:** cambia temporalmente el build script de la API a `build:deploy:seed`, pulsa
  **Deploy** y vuelve a `build:deploy` después de verificar el login.

No dejes el seed activo en cada build: puede sobrescribir cambios de la tienda.

### Verificación de la API

```bash
curl -i https://turqueza-api.rovelbots.com/api/health
curl -i https://turqueza-api.rovelbots.com/api/products
```

`/api/health` debe responder `200` con `{"status":"ok","db":"up"}`.

---

## 4. Web App del frontend (Next.js)

Crea una segunda Web App desde el mismo repositorio:

| Campo | Valor |
| --- | --- |
| Repositorio | `TU_USUARIO/turquesa` · rama `main` |
| **Root directory** | `apps/web` |
| Framework | **Next.js** |
| Node.js | **22** |
| Package manager | **pnpm** (o npm) |
| Build script | `build:deploy` |
| Output directory | `.next` |
| Entry file | (Hostinger lo ignora en Next.js) |
| Dominio | `turqueza.rovelbots.com` y `www.turqueza.rovelbots.com` |

Hostinger construye Next.js en modo servidor y aplica `output: "standalone"` automáticamente.
El `next.config.mjs` del repo exporta un objeto, que es lo que Hostinger espera.

### Variables de entorno del frontend

hPanel → Web App (Frontend) → **Environment variables**:

```env
# URL pública de la API: la usa el navegador para pedidos y para /admin.
# Absoluta, HTTPS y SIN barra final.
NEXT_PUBLIC_API_URL="https://turqueza-api.rovelbots.com"

# URL que usa el servidor de Next (RSC/SSR) para leer catálogo y configuración.
# En Hostinger las dos Web Apps no comparten localhost: usa la URL pública.
API_INTERNAL_URL="https://turqueza-api.rovelbots.com"

NEXT_PUBLIC_STORE_THEME=joyeria
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

Notas importantes:

- **`NEXT_PUBLIC_API_URL` se incrusta en build time.** Si cambias la URL de la API, pulsa
  **Redeploy** para recompilar. No la dejes vacía: el navegador intentaría `/api` en el dominio
  del frontend y recibiría 404. El build `build:deploy` lo impide con `scripts/check-env.mjs`.
- **`API_INTERNAL_URL`** debe ser la URL pública de la API, no `http://127.0.0.1:3001`.
- Las variables `NEXT_PUBLIC_*` deben estar definidas **antes** del build.

### Verificación del frontend

```bash
curl -I https://turqueza.rovelbots.com
curl -I https://turqueza.rovelbots.com/admin
```

La home debe mostrar productos reales, no los datos de respaldo de `fallback.ts`. Si muestra
datos de respaldo, la API no está respondiendo o `API_INTERNAL_URL` es incorrecta.

---

## 5. CORS, dominios y SSL

1. En la Web App de la API, `CORS_ORIGIN` debe contener **exactamente** los dominios del
   frontend, separados por coma y sin barra final:

   ```env
   CORS_ORIGIN="https://turqueza.rovelbots.com,https://www.turqueza.rovelbots.com"
   ```

2. Si vas a probar con la URL temporal de Hostinger (`*.hostingersite.com`), añádela también:

   ```env
   CORS_ORIGIN="https://turqueza.rovelbots.com,https://www.turqueza.rovelbots.com,https://TU-APP-TEMPORAL.hostingersite.com"
   ```

   Cuando el dominio final funcione, elimina la URL temporal y pulsa **Redeploy** en la API.

3. hPanel → **Seguridad → SSL** → activa Let's Encrypt para `turqueza.rovelbots.com`,
   `www.turqueza.rovelbots.com` y `turqueza-api.rovelbots.com`. Fuerza HTTPS.

4. Asigna los dominios desde **Web App → Domains**. Si un dominio ya existía como sitio
   estático, elimínalo o desvincúlalo antes de asignarlo a la Web App.

---

## 6. Orden recomendado del primer despliegue

1. Crea la base MySQL.
2. Crea la Web App de la **API** con root `apps/api`, variables y dominio `turqueza-api.rovelbots.com`.
3. Despliega la API y verifica `/api/health`.
4. Ejecuta el seed una vez.
5. Crea la Web App del **frontend** con root `apps/web`, variables y dominio `turqueza.rovelbots.com`.
6. Despliega el frontend y verifica `/` y `/admin`.
7. Prueba el login del panel y un checkout de WhatsApp.
8. Si usaste `build:deploy:seed`, vuelve a `build:deploy` y haz **Redeploy** de la API.

> Despliega la API **antes** que el frontend. Durante el build de Next, las páginas leen el
> catálogo de la API; si aún no existe, el storefront usa datos de respaldo y se corrige en la
> siguiente revalidación (60 s) o al hacer Redeploy.

---

## 7. Checklist de producción

- [ ] Dos Web Apps creadas con **Root directory** `apps/api` y `apps/web`.
- [ ] API con framework **NestJS**, output `dist`, entry `main.js`, build `build:deploy`.
- [ ] Frontend con framework **Next.js**, output `.next`, build `build:deploy`.
- [ ] `DATABASE_URL` con `connection_limit=5`.
- [ ] `NODE_ENV=production` en ambas apps.
- [ ] `CORS_ORIGIN` con los dominios exactos del frontend.
- [ ] `ADMIN_EMAIL`, `ADMIN_PASSWORD` (mín. 10) y `ADMIN_JWT_SECRET` (mín. 32) configurados.
- [ ] `NEXT_PUBLIC_API_URL` y `API_INTERNAL_URL` apuntando a `https://turqueza-api.rovelbots.com`.
- [ ] Build del frontend rehecho después de cambiar `NEXT_PUBLIC_*`.
- [ ] Migraciones aplicadas (`prisma migrate deploy`).
- [ ] Seed ejecutado o catálogo cargado.
- [ ] `/api/health` responde `200`.
- [ ] Home con productos reales.
- [ ] Login de `/admin` funciona.
- [ ] Checkout de prueba abre WhatsApp con el mensaje correcto.
- [ ] SSL activo y redirección HTTPS en ambos dominios.
- [ ] Copias de seguridad de MySQL activadas en hPanel.

---

## 8. Actualizaciones y rollback

Cada push a `main` reconstruye **las dos** Web Apps de forma independiente. Revisa
**Deployments** y **Runtime Logs** de cada una.

Para volver atrás, revierte en Git:

```bash
git revert <commit>
git push origin main
```

Hostinger reconstruye el commit revertido. Las migraciones son forward-only: si el cambio de
esquema es destructivo, prepara el script de vuelta atrás antes de desplegar.

---

## 9. Problemas frecuentes

| Síntoma | Causa / solución |
| --- | --- |
| `package.json not found` | **Root directory** incorrecto: usa `apps/api` o `apps/web`. |
| Hostinger usa npm en vez de pnpm | Selecciona **pnpm** manualmente; el lockfile está en la raíz. También puedes usar npm: cada app es autocontenida. |
| El build de la API falla por variables | Revisa el mensaje de `scripts/check-env.mjs`; falta `CORS_ORIGIN`, `ADMIN_*` o `DATABASE_URL`. |
| `PrismaClientInitializationError` | `DATABASE_URL` incorrecta, usuario sin permisos o conexiones agotadas. Usa `connection_limit=5`. |
| `prisma migrate deploy` falla en el build | El entorno de build no alcanza MySQL. Usa `build:deploy:nomigrate` y aplica migraciones por SSH. |
| CORS bloqueado | `CORS_ORIGIN` no incluye el dominio exacto, o tiene barra final. |
| El frontend muestra datos de respaldo | `API_INTERNAL_URL` incorrecta o la API está caída. |
| El navegador llama a `/api` en el dominio del frontend | `NEXT_PUBLIC_API_URL` quedó vacía. Define la URL de la API y haz Redeploy. |
| Cambié una variable y no se aplica | Las `NEXT_PUBLIC_*` requieren recompilar: pulsa **Redeploy**. |
| Build de Next falla por memoria | Es un plan compartido: compila solo `apps/web` (root directory correcto) y evita builds simultáneos. |
| `403 Forbidden` de Hostinger | El dominio apunta a un sitio estático vacío o el `.htaccess` está obsoleto. Reasigna el dominio a la Web App y pulsa **Redeploy**. |
| `404` con página de Hostinger | La petición no llega a la app: revisa dominio, estado **Running** y `.htaccess`. |
| El admin no acepta login | Falta el seed o `ADMIN_EMAIL` / `ADMIN_PASSWORD` no coinciden con las variables de la API. |
| El checkout no abre WhatsApp | `whatsappNumber` vacío o con `+`/espacios en **Admin → Tienda y CMS**. |
| La home sigue con el catálogo viejo | Espera la revalidación (60 s) o pulsa **Redeploy** en el frontend. |

---

## 10. Modo opcional: una sola Web App

Si tu plan no permite dos Web Apps o prefieres un único dominio, el repo conserva
[`server.mjs`](../server.mjs). Publica `/` y `/api/*` en el mismo proceso y elimina la necesidad
de CORS entre dominios. Guía: [HOSTINGER-UNA-APP.md](HOSTINGER-UNA-APP.md).

En ese modo:

- Root directory: `/` (raíz del monorepo).
- Framework: **Other / Node.js**.
- Build script: `build`.
- Entry file: `server.mjs`.
- `NEXT_PUBLIC_API_URL` debe quedar vacía y el build del frontend debe ejecutarse con
  `ALLOW_SAME_ORIGIN_API=true`.

No mezcles ambos modos: si usas dos Web Apps, cada app debe tener su propio root directory y sus
propias variables.

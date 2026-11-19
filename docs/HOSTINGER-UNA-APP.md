# Hostinger · una sola Web App (opcional)

> **Modo opcional.** El despliegue recomendado para Turquesa es con **backend y frontend
> separados**: dos Web Apps, `apps/api` en `api.tudominio.com` y `apps/web` en
> `tudominio.com`. Guía: **[HOSTINGER.md](HOSTINGER.md)**. Usa esta guía solo si tu plan no
> permite dos Web Apps o prefieres un único dominio.

Hostinger Business expone **un único proceso Node por Web App**. El repo incluye
[`server.mjs`](../server.mjs), un gateway que arranca los dos servicios internos y publica todo
en el mismo dominio:

```
https://turqueza.rovelbots.com
        │
        ▼
  server.mjs  (puerto que asigna Hostinger)
        ├─ /          → Next.js  127.0.0.1:3000
        └─ /api/*     → NestJS   127.0.0.1:3001
                                      │
                                      └─ MySQL de Hostinger
```

Ventajas de este modo:

- No hace falta crear `api.turqueza.rovelbots.com`.
- El navegador llama a `/api` en el **mismo origen**: no hay CORS entre dominios.
- `NEXT_PUBLIC_API_URL` puede quedar vacío; no hay que recompilar si cambia el dominio.
- Un solo dominio, un solo SSL y un solo despliegue.

> Si tu panel no permite un comando de inicio personalizado o no acepta framework
> **Other / Node.js**, usa la guía recomendada de dos Web Apps: [HOSTINGER.md](HOSTINGER.md).

---

## 1. Base de datos

Crea la base MySQL en hPanel y conserva estos datos:

```env
DATABASE_URL="mysql://USUARIO:PASSWORD@localhost:3306/BASEDATOS?connection_limit=5"
```

El gateway ejecuta `prisma migrate deploy` al arrancar. No necesitas aplicar migraciones a mano.

---

## 2. Crear la Web App

hPanel → **Websites → Add Website → Node.js web app → Connect with GitHub**:

| Campo | Valor |
| --- | --- |
| Repositorio | `JahzeelRodas/turqueza` |
| Rama | `main` |
| **Root directory** | `/` (la raíz del monorepo; déjalo vacío si el panel lo permite) |
| Framework | **Other / Node.js** (no elijas Next.js) |
| Node.js | **22** |
| Package manager | **pnpm** |
| Build command | `build` (script de `package.json`; si el panel acepta el comando completo, `pnpm build`) |
| Start command | `pnpm start` (o entry file `server.mjs` / `node server.mjs`) |
| Output directory | `.` (o vacío) |
| Entry file | `server.mjs` (**obligatorio**) |
| Dominio | `turqueza.rovelbots.com` y `www.turqueza.rovelbots.com` |

`pnpm build` compila la API (`apps/api/dist`) y el storefront (`apps/web/.next`).
`pnpm start` ejecuta el gateway, que abre el puerto público de inmediato y luego espera a que
ambos servicios estén listos.

> Si en lugar de `pnpm build` usas `pnpm --filter web build:deploy` en este modo, define
> `ALLOW_SAME_ORIGIN_API=true`: el chequeo de entorno del frontend exige una URL de API cuando
> se despliega con dos Web Apps, y aquí la API vive en el mismo origen.

> **Importante:** el framework debe ser **Other / Node.js**. Con el preset **Next.js**,
> Hostinger ignora el comando de inicio y arranca solo el servidor standalone de Next; en ese caso
> `/api/*` no llegaría a NestJS.
>
> **Entry file es obligatorio.** Si queda vacío, el build termina en verde pero Hostinger marca
> `Mode: publish`, sirve `public_html` como sitio estático y el dominio devuelve `403`
> (o la página *Coming soon* de Hostinger). El log del deploy lo delata:
>
> ```
> Build command:      pnpm run build
> Output directory:   none
> Entry file:         none
> Mode:               publish
> ```
>
> Con `Entry file: server.mjs` el log debe mostrar `Mode: run` y, al final, las líneas del gateway.

---

## 3. Variables de entorno

hPanel → Web App → **Environment variables**:

```env
DATABASE_URL="mysql://USUARIO:PASSWORD@localhost:3306/BASEDATOS?connection_limit=5"
NODE_ENV=production
CORS_ORIGIN="https://turqueza.rovelbots.com,https://www.turqueza.rovelbots.com"

ADMIN_EMAIL="admin@turquesa.bo"
ADMIN_PASSWORD="TuContraseñaDeProducción"
ADMIN_NAME="Administrador"
ADMIN_JWT_SECRET="cadena-aleatoria-de-64-caracteres-minimo"
ADMIN_TOKEN_TTL_HOURS=12

# El navegador usa /api en el mismo origen. NO pongas una URL de API aquí.
# NEXT_PUBLIC_API_URL=

# Opcional: el gateway la fuerza a http://127.0.0.1:3001 de todos modos.
API_INTERNAL_URL="http://127.0.0.1:3001"
NEXT_PUBLIC_STORE_THEME=joyeria

# Solo en el primer arranque, para cargar catálogo, zonas y admin.
# Después de verificar el login, elimínala o ponla en false.
RUN_SEED=true
```

- **No definas `PORT`**: Hostinger lo inyecta y el gateway lo lee.
- **No definas `NEXT_PUBLIC_API_URL`** (ni la dejes apuntando a un subdominio). Si ya existe,
  bórrala y pulsa **Redeploy**. Se incrusta en build time y el navegador debe llamar a `/api`.
- `RUN_MIGRATIONS=true` es el valor por defecto. Para omitir migraciones, pon `false`.
- `RUN_SEED=true` ejecuta el seed una vez; es idempotente, pero no lo dejes activo para no
  sobrescribir cambios de la tienda en cada reinicio.

---

## 4. Primer despliegue

1. Si `turqueza.rovelbots.com` ya existe como **sitio/subdominio normal**, elimínalo o
   desvinculalo. Hostinger no permite asignar un dominio a una Web App si ya pertenece a otro
   sitio. Este es el motivo más común del **403**.
2. Crea la Web App con los ajustes de la sección 2 y las variables de la sección 3.
3. Pulsa **Deploy** y revisa **Deployments** y **Runtime Logs**.
4. Abre la **URL temporal** que muestra hPanel (suele ser `*.hostingersite.com`):
   - `/` debe cargar el storefront.
   - `/api/health` debe devolver `{"status":"ok","db":"up",...}`.
5. Si la URL temporal funciona, asigna el dominio desde **Web App → Domains** y activa SSL.
6. Fuerza HTTPS.
7. Verifica:

```bash
curl -i https://turqueza.rovelbots.com/
curl -i https://turqueza.rovelbots.com/api/health
curl -i https://turqueza.rovelbots.com/api/products
```

8. Entra a `https://turqueza.rovelbots.com/admin` y comprueba el login.
9. Cuando todo funcione, elimina `RUN_SEED` o ponla en `false` y haz **Redeploy**.

---

## 5. Qué hace el gateway

`server.mjs`:

1. Abre el puerto público (`0.0.0.0:$PORT`) antes de arrancar nada, para que el proxy nunca
   devuelva `403`.
2. Resuelve las rutas de Prisma y Next dentro del monorepo.
3. Ejecuta `prisma migrate deploy` (salvo `RUN_MIGRATIONS=false`).
4. Opcionalmente ejecuta el seed (`RUN_SEED=true`).
5. Arranca `node apps/api/dist/main.js` en `127.0.0.1:3001`.
6. Arranca `next start` en `127.0.0.1:3000`.
7. Espera a que ambos puertos respondan.
8. Enruta en el puerto público:
   - `/api` y `/api/*` → NestJS.
   - `/__gateway/health` → estado del gateway (JSON).
   - Todo lo demás → Next.js.
9. Si un proceso hijo muere, el gateway sigue vivo y responde `503` con el motivo, en lugar de
   dejar un `403` opaco. El estado completo está en `/__gateway/health`.

---

## 6. Errores frecuentes

| Síntoma | Causa / solución |
| --- | --- |
| `403 Forbidden` con página de Hostinger | El dominio sigue asignado a un sitio estático vacío, el `.htaccess` está obsoleto o **`Entry file` está vacío (modo `publish`)**. Revisa el log del deploy: si dice `Mode: publish`, pon `Entry file: server.mjs`. |
| `200` con la página *Coming soon* de Hostinger | Mismo caso: modo `publish`. El dominio sirve `public_html`, no la Web App. |
| `404` con página de Hostinger | La petición no llega a la app: revisa dominio, estado **Running** y `.htaccess`. |
| `503` con "La tienda se está iniciando" | El gateway está vivo pero la API o Next no arrancaron. Abre `/__gateway/health` y los **Runtime Logs**. |
| `No existe ...apps/api/dist/main.js` | El build no compiló la API. Usa root `/` y build `pnpm build`. |
| `No se encontró Next.js` / `Prisma` | Faltan dependencias. Fuerza un redeploy con `pnpm install`. |
| `Prisma migrate deploy falló` | `DATABASE_URL` incorrecta, usuario sin permisos o MySQL no accesible desde el servidor. |
| Build verde pero 502 | Revisa **Runtime Logs**. Suele ser una variable de entorno, el puerto o un proceso hijo que no arrancó. |
| La home carga datos de respaldo | La API no responde en `127.0.0.1:3001`; revisa `/api/health` y los logs de Nest. |
| El admin no acepta login | Falta el seed (`RUN_SEED=true`) o las credenciales de entorno no coinciden. |
| Next redirige a `localhost` | Asegúrate de que el proxy conserva `Host` y `X-Forwarded-*`; el gateway ya lo hace. |

---

## 7. Actualizaciones

Cada push a `main` reconstruye la Web App. El gateway aplica migraciones al arrancar, así que un
cambio de schema se despliega junto con el código. Revisa **Deployments** y **Runtime Logs**; si
algo falla, Hostinger mantiene la versión anterior o reinicia el proceso.

Para volver atrás:

```bash
git revert <commit>
git push origin main
```

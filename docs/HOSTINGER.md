# Despliegue en Hostinger Business (Node.js nativo)

Arquitectura objetivo: **dos aplicaciones Node.js** en el mismo hosting.

```
https://tudominio.com       -> apps/web  (Next.js, puerto asignado por Hostinger)
https://api.tudominio.com   -> apps/api  (NestJS, puerto asignado por Hostinger)
                                  |
                                  +-> MySQL de Hostinger
```

No se usan contenedores. Cada app se instala y compila en su propio directorio.

> **Flujo recomendado:** conecta el repositorio de GitHub a dos Web Apps Node.js (una para
> `apps/api` y otra para `apps/web`) usando **Root directory**. Hostinger reconstruye y despliega
> automáticamente en cada push a `main`, mientras GitHub Actions valida el código. Guía completa:
> **[CI-CD.md](CI-CD.md)**.

---

## 1. Base de datos

Hostinger Business ofrece **MySQL/MariaDB**. El schema de Prisma ya está configurado con
`provider = "mysql"`; no hay que cambiarlo.

1. hPanel → **Bases de datos → MySQL**.
2. Crea una base y un usuario con permisos totales.
3. Anota el **host**, puerto (`3306`), nombre de base, usuario y contraseña. En Hostinger suelen
   tener el prefijo de la cuenta, por ejemplo `u123456789_store`.
4. Mantén el charset `utf8mb4` (es el valor por defecto del panel).

Cadena de conexión de ejemplo:

```env
DATABASE_URL="mysql://usuario:password@localhost:3306/basedatos?connection_limit=5"
```

`connection_limit=5` evita agotar las conexiones en hosting compartido. Si el panel indica otro
host o puerto, usa exactamente esos valores.

> Los arrays (`images`, `tags`, `cities`) se guardan como **JSON** porque MySQL no soporta
> `String[]`. La API los devuelve como `string[]`, así que el storefront no cambia.

---

## 2. Subir el repositorio

1. Sube el monorepo a GitHub (ver [CI-CD.md](CI-CD.md) para el primer commit y el push).
2. hPanel → **Sitios web → Añadir sitio web → Node.js web app**.
3. Conecta GitHub y selecciona el repositorio.
4. Crea **dos Web Apps** desde el mismo repo, cambiando el **Root directory**:
   - `apps/api` para la API.
   - `apps/web` para el storefront.

Hostinger detecta el monorepo, instala dependencias y compila **solo** el subdirectorio
indicado. No hace falta clonar ni instalar por SSH: cada push a la rama conectada reconstruye y
reinicia la app automáticamente.

> Si hPanel no detecta pnpm, selecciónalo manualmente (el `pnpm-lock.yaml` está en la raíz del
> monorepo). Cada `package.json` de `apps/*` es autocontenido, así que también funciona con npm
> como alternativa.

---

## 3. API (NestJS)

En hPanel → **Node.js** crea una aplicación:

| Campo | Valor |
| --- | --- |
| Repositorio | `TU_USUARIO/turquesa` · rama `main` |
| **Root directory** | `apps/api` |
| Framework | NestJS |
| Versión de Node | 22 |
| Package manager | pnpm |
| Comando de build | `build:deploy` |
| Output directory | `dist` |
| Entry file | `main.js` |
| Dominio | `api.tudominio.com` |

`build:deploy` ejecuta `prisma generate`, `prisma migrate deploy` y `nest build`. Si una
migración falla, el build se detiene y la versión anterior sigue en producción.

Variables de entorno (hPanel → Web App → **Environment variables**):

```env
DATABASE_URL="mysql://usuario:password@localhost:3306/basedatos?connection_limit=5"
NODE_ENV=production
CORS_ORIGIN="https://tudominio.com,https://www.tudominio.com"

# Panel de administración (cambiar obligatoriamente)
ADMIN_EMAIL="admin@tudominio.com"
ADMIN_PASSWORD="una-contraseña-larga-y-segura"
ADMIN_NAME="Administrador"
ADMIN_JWT_SECRET="cadena-aleatoria-de-64-caracteres-minimo"
ADMIN_TOKEN_TTL_HOURS=12
```

> Hostinger inyecta su propio `PORT`. Si el panel lo define, **no lo sobrescribas**: la app lee
> `process.env.PORT`.

### Migraciones y seed

Las migraciones versionadas se aplican solas en cada build de la API (`build:deploy`). Para el
seed inicial (joyería + envíos Bolivia), ejecútalo una vez por SSH desde un clon del repo:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm --filter api prisma:seed
```

Para crear una migración nueva en desarrollo:

```bash
pnpm db:migrate --name nombre_del_cambio
# revisa y haz commit de apps/api/prisma/migrations
```

### Verificación

```bash
curl https://api.tudominio.com/api/health
curl https://api.tudominio.com/api/products
```

### Panel de administración

El panel vive en `https://tudominio.com/admin` (lo sirve la misma app Next.js). Usa las
variables `ADMIN_EMAIL` y `ADMIN_PASSWORD` definidas arriba. Los endpoints `/api/admin/*`
están protegidos con un token firmado (`ADMIN_JWT_SECRET`) y el login se puede comprobar con:

```bash
curl -X POST https://api.tudominio.com/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tudominio.com","password":"TU_CONTRASEÑA"}'
```

> Seguridad: usa una contraseña larga, un `ADMIN_JWT_SECRET` aleatorio y mantén
> `CORS_ORIGIN` restringido a tus dominios. El panel no se indexa (`noindex`).
> Con `NODE_ENV=production` la API se niega a arrancar si faltan las variables de
> administración, si se usa `admin123` o si el secreto tiene menos de 32 caracteres.

---

## 4. Storefront (Next.js)

Crea una segunda aplicación Node:

| Campo | Valor |
| --- | --- |
| Repositorio | `TU_USUARIO/turquesa` · rama `main` |
| **Root directory** | `apps/web` |
| Framework | Next.js |
| Versión de Node | 22 |
| Package manager | pnpm |
| Comando de build | `build` |
| Output directory | `.next` |
| Entry file | (se ignora en Next.js) |
| Dominio | `tudominio.com` y `www.tudominio.com` |

Variables de entorno (hPanel → Web App → **Environment variables**):

```env
NEXT_PUBLIC_API_URL="https://api.tudominio.com"
API_INTERNAL_URL="https://api.tudominio.com"
NEXT_PUBLIC_STORE_THEME=joyeria
```

- `NEXT_PUBLIC_API_URL` la usa el navegador para crear el pedido.
- `API_INTERNAL_URL` la usa el servidor (RSC) para leer catálogo y configuración. En Hostinger
  las apps no comparten `localhost`, así que apunta a la **URL pública** de la API.

> Las variables `NEXT_PUBLIC_*` se incrustan en **build time**. Si cambias la URL de la API,
> pulsa **Redeploy** en hPanel para recompilar.

---

## 5. SSL y dominio

1. hPanel → **Seguridad → SSL** → activa Let's Encrypt para ambos subdominios.
2. Fuerza HTTPS.
3. Ajusta `CORS_ORIGIN` en la API con los dominios finales (sin barra final).

---

## 6. Configurar la tienda y WhatsApp

Actualiza el singleton de configuración desde **Admin → Tienda y CMS** o con
`PATCH /api/admin/store-config` enviando `Authorization: Bearer <token>`:

```json
{
  "storeName": "Turquesa Joyería",
  "whatsappNumber": "59171234567",
  "currency": "BOB",
  "locale": "es-BO",
  "country": "Bolivia"
}
```

También puedes editarlo en `apps/api/prisma/seed.ts` y volver a ejecutar el seed.

---

## 7. Checklist de producción

- [ ] Repo conectado a dos Web Apps con **Root directory** `apps/api` y `apps/web`.
- [ ] CI de GitHub Actions en verde y rama `main` protegida.
- [ ] `DATABASE_URL` con `connection_limit` bajo.
- [ ] `ADMIN_EMAIL`, `ADMIN_PASSWORD` (mín. 10 caracteres) y `ADMIN_JWT_SECRET`
      (mín. 32) configurados; la API no arranca en producción con credenciales demo.
- [ ] `CORS_ORIGIN` con dominio(s) exactos.
- [ ] `NEXT_PUBLIC_API_URL` apuntando a HTTPS y build rehecho.
- [ ] Migraciones aplicadas (`prisma migrate deploy`).
- [ ] Seed ejecutado o catálogo cargado.
- [ ] `whatsappNumber` en formato internacional sin `+`.
- [ ] `/api/health` responde 200.
- [ ] Checkout de prueba: producto + grabado + departamento + WhatsApp abre con el mensaje.
- [ ] SSL activo y redirección HTTPS.
- [ ] Copias de seguridad de la base activadas en hPanel.

---

## 8. Actualizaciones

El despliegue es automático: haz merge a `main` y Hostinger reconstruye y reinicia **ambas**
Web Apps. Revisa el resultado en **Deployments** (commit, autor, logs y estado). No hace falta
`git pull` ni `npm install` por SSH.

Para volver atrás, revierte el commit y vuelve a hacer push:

```bash
git revert <commit>
git push origin main
```

Las migraciones de base de datos son forward-only: si el cambio de esquema es destructivo,
prepara el script de vuelta atrás antes de desplegar. Más detalle en [CI-CD.md](CI-CD.md).

## Problemas frecuentes

| Síntoma | Causa probable |
| --- | --- |
| `PrismaClientInitializationError` | `DATABASE_URL` incorrecta o conexiones agotadas |
| CORS bloqueado | `CORS_ORIGIN` no incluye el dominio exacto |
| El catálogo muestra datos de respaldo | `API_INTERNAL_URL` inaccesible desde el servidor |
| El checkout no abre WhatsApp | `whatsappNumber` vacío o con `+`/espacios |
| Build falla por memoria | Compila API y Web por separado (`npm run build` en cada app) |

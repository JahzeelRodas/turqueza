# CI/CD: GitHub + Hostinger con backend y frontend separados

Flujo recomendado para Turquesa: **dos Web Apps Node.js** creadas desde el mismo repositorio,
una para la API y otra para el storefront.

```
push a una rama / Pull Request
        │
        ▼
GitHub Actions (CI)  ── migraciones + typecheck + build + smoke test ──► ✅
        │
        ▼ merge a main
Hostinger detecta el push (GitHub App)
        │
        ├─ Web App API       (root: apps/api) → build:deploy → dist/main.js
        └─ Web App Frontend  (root: apps/web) → build:deploy → .next
```

No hacen falta claves SSH ni un workflow de despliegue en GitHub: **Hostinger hace el
despliegue automático** al recibir el push a `main`. GitHub Actions se usa como **puerta de
calidad** para que nunca llegue a `main` un commit que no compila.

> Guía de configuración de las dos Web Apps, variables, dominios y SSL:
> **[HOSTINGER.md](HOSTINGER.md)**. El modo de una sola Web App con `server.mjs` queda como
> alternativa opcional en **[HOSTINGER-UNA-APP.md](HOSTINGER-UNA-APP.md)**.

---

## 1. Preparar el repositorio local

Desde la raíz del proyecto:

```bash
git init -b main

# Revisa que no se cuele ningún secreto (deben quedar fuera .env y .env.local)
git status --short

git add .
git commit -m "chore: inicializa monorepo Turquesa"
```

El `.gitignore` excluye `node_modules`, `.next`, `dist`, `*.tsbuildinfo`, `.env*`
(salvo los `*.example`) y artefactos de Windows. El `.gitattributes` fuerza LF en scripts para
que el build de Linux/Hostinger no falle por finales de línea.

Comprueba que los archivos de entorno **no** aparecen en `git status`:

```bash
git check-ignore -v apps/api/.env apps/web/.env.local
```

---

## 2. Crear el repositorio en GitHub

### Opción A: con GitHub CLI

```bash
gh auth login
gh repo create turquesa --private --source=. --remote=origin --push
```

### Opción B: desde la web

1. GitHub → **New repository** → nombre `turquesa` → **Private** → sin README, sin
   `.gitignore` ni licencia (el repo ya los tiene).
2. Conecta el remoto y sube:

```bash
git remote add origin git@github.com:TU_USUARIO/turquesa.git
git push -u origin main
```

> Si usas HTTPS, GitHub pedirá un **Personal Access Token**, no tu contraseña.

---

## 3. Crear las dos Web Apps en Hostinger

### 3.1 API (NestJS)

hPanel → **Websites → Add Website → Node.js web app → Connect with GitHub**:

| Campo | Valor |
| --- | --- |
| Repositorio | `TU_USUARIO/turquesa` |
| Rama | `main` |
| **Root directory** | `apps/api` |
| Framework | **NestJS** |
| Node.js | **22** |
| Package manager | **pnpm** (o npm) |
| Build script | `build:deploy` |
| Output directory | `dist` |
| Entry file | `main.js` |
| Dominio | `api.tudominio.com` |

`build:deploy` ejecuta:

1. `scripts/check-env.mjs` → valida variables de producción.
2. `prisma generate`.
3. `prisma migrate deploy` → aplica migraciones pendientes.
4. `nest build` → compila a `dist/`.

Si una migración o una variable falla, el build se detiene y Hostinger mantiene la versión
anterior en producción.

Variables de entorno de la API (hPanel → Web App → **Environment variables**):

```env
DATABASE_URL=mysql://usuario:password@localhost:3306/basedatos?connection_limit=5
NODE_ENV=production
CORS_ORIGIN=https://tudominio.com,https://www.tudominio.com

ADMIN_EMAIL=admin@tudominio.com
ADMIN_PASSWORD=una-contraseña-larga-y-segura
ADMIN_NAME=Administrador
ADMIN_JWT_SECRET=cadena-aleatoria-de-64-caracteres-minimo
ADMIN_TOKEN_TTL_HOURS=12
```

> No definas `PORT`: Hostinger inyecta el puerto y la API ya lee `process.env.PORT`.
> `CORS_ORIGIN` es obligatorio en producción; sin él la API no arranca.

### 3.2 Frontend (Next.js)

Repite el flujo con una segunda Web App:

| Campo | Valor |
| --- | --- |
| Repositorio | `TU_USUARIO/turquesa` |
| Rama | `main` |
| **Root directory** | `apps/web` |
| Framework | **Next.js** |
| Node.js | **22** |
| Package manager | **pnpm** (o npm) |
| Build script | `build:deploy` |
| Output directory | `.next` |
| Entry file | (Hostinger lo ignora en Next.js) |
| Dominio | `tudominio.com` y `www.tudominio.com` |

Variables de entorno del storefront:

```env
NEXT_PUBLIC_API_URL=https://api.tudominio.com
API_INTERNAL_URL=https://api.tudominio.com
NEXT_PUBLIC_STORE_THEME=joyeria
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

Dos matices importantes del hosting gestionado:

- `API_INTERNAL_URL` debe ser la **URL pública** de la API (`https://api.tudominio.com`).
  En Hostinger las dos apps no comparten un `localhost:3001`; el servidor de Next sale por
  HTTPS igual que el navegador.
- `NEXT_PUBLIC_*` se incrusta en **build time**. Si cambias `NEXT_PUBLIC_API_URL`, pulsa
  **Redeploy** para recompilar. `build:deploy` falla si la variable está vacía o no es una URL
  absoluta.

---

## 4. Activar el despliegue continuo

Al crear cada app desde GitHub, Hostinger instala su **GitHub App** y activa
**Auto-deployment** para la rama `main`. Desde ese momento:

1. Haces push/merge a `main`.
2. GitHub notifica a Hostinger.
3. Hostinger instala dependencias, ejecuta el build y reinicia **cada** app.
4. El resultado queda en **Deployments**, con logs y hash del commit.

No hay que ejecutar `git pull` ni `npm install` por SSH. Las variables de entorno persisten
entre despliegues.

### Proteger `main` con el CI

Para que Hostinger solo despliegue código que pasó el CI:

1. GitHub → **Settings → Rules → Rulesets → New branch ruleset** (o **Branches**).
2. Target: `main`.
3. Activa:
   - **Require a pull request before merging**.
   - **Require status checks to pass** → selecciona **Typecheck, build & smoke test (API + Web)**.
   - **Require branches to be up to date before merging**.
   - **Block force pushes**.
   - Sin lista de bypass (o solo el mínimo indispensable): así nadie empuja directo a `main`.
4. Guarda.

Flujo diario:

```bash
git switch -c feat/nueva-coleccion
# ... cambios ...
git add .
git commit -m "feat: nueva colección"
git push -u origin feat/nueva-coleccion
# Abre el PR → espera el check verde → merge a main
```

El merge dispara el despliegue automático de la API y del frontend.

---

## 5. Verificación después del despliegue

```bash
# API
curl -i https://api.tudominio.com/api/health
curl -i https://api.tudominio.com/api/products

# Frontend
curl -I https://tudominio.com
curl -I https://tudominio.com/admin
```

Checklist rápida:

- [ ] `/api/health` responde `200`.
- [ ] La home carga productos reales (no los datos de respaldo del storefront).
- [ ] El login de `/admin` funciona con las credenciales de producción.
- [ ] Un checkout de prueba genera el enlace de WhatsApp.
- [ ] El preflight CORS responde con `Access-Control-Allow-Origin` del frontend.
- [ ] SSL activo en ambos dominios y `CORS_ORIGIN` con los dominios exactos.
- [ ] **Deployments** muestra el commit esperado en las dos apps.

Prueba manual de CORS:

```bash
curl -i -X OPTIONS https://api.tudominio.com/api/products \
  -H "Origin: https://tudominio.com" \
  -H "Access-Control-Request-Method: GET"
```

Debe incluir `Access-Control-Allow-Origin: https://tudominio.com`.

---

## 6. Migraciones de base de datos

Las migraciones versionadas viven en `apps/api/prisma/migrations/`. En el despliegue de dos
apps se aplican en el build de la API (`build:deploy`). El CI levanta un MySQL 8 temporal,
aplica `prisma migrate deploy` y ejecuta el seed en cada PR para detectar SQL incompatible antes
de llegar a `main`.

Para crear una migración en local:

```bash
pnpm db:migrate --name nombre_del_cambio
git add apps/api/prisma/migrations
git commit -m "feat(db): nombre_del_cambio"
git push
```

Recomendaciones:

- Haz migraciones **compatibles hacia atrás** (añadir columnas/tablas antes de usarlas), porque
  el código anterior puede seguir vivo unos segundos durante el reinicio.
- No edites migraciones ya aplicadas en producción.
- Si el entorno de build de Hostinger no puede alcanzar MySQL, cambia el build script a
  `build:deploy:nomigrate` y ejecuta las migraciones por SSH antes del push:

  ```bash
  pnpm --filter api prisma:migrate:deploy
  ```

- Para el seed inicial, usa `build:deploy:seed` una sola vez o ejecuta por SSH:

  ```bash
  pnpm --filter api prisma:seed
  ```

---

## 7. Rollback

El camino seguro es revertir en Git, no tocar archivos en el servidor:

```bash
git revert <commit>
git push origin main
```

Hostinger reconstruye y despliega el commit revertido en ambas apps. Ten en cuenta que **una
migración de base de datos no se revierte sola**; si el cambio de esquema es destructivo,
prepara el script de vuelta atrás antes de desplegar.

En **Deployments** puedes consultar builds anteriores, sus logs y volver a lanzar un build
(reutiliza la configuración y toma el último commit de la rama).

---

## 8. Problemas frecuentes

| Síntoma | Causa / solución |
| --- | --- |
| `package.json not found` | **Root directory** incorrecto: `apps/api` o `apps/web`. |
| Hostinger usa npm en vez de pnpm | Selecciona **pnpm** manualmente; el lockfile está en la raíz. npm también funciona porque cada app es autocontenida. |
| El build de la API falla por variables | Revisa `scripts/check-env.mjs`; falta `CORS_ORIGIN`, `ADMIN_*` o `DATABASE_URL`. |
| `403 Forbidden` de Hostinger | El dominio apunta a un sitio estático vacío o el `.htaccess` está obsoleto. Reasigna el dominio a la Web App y pulsa **Redeploy**. |
| Build verde pero la app no responde | Revisa **Runtime Logs**; suele ser una variable de entorno o el puerto. |
| `PrismaClientInitializationError` | `DATABASE_URL` incorrecta o límite de conexiones; usa `connection_limit=5`. |
| CORS bloqueado | `CORS_ORIGIN` debe incluir el dominio exacto, sin barra final. |
| El frontend muestra datos de respaldo | `API_INTERNAL_URL` no apunta a la API pública o la API está caída. |
| El navegador llama a `/api` en el dominio del frontend | `NEXT_PUBLIC_API_URL` vacía. Define la URL de la API y haz Redeploy. |
| Cambié una variable y no se aplica | Pulsa **Redeploy**; las `NEXT_PUBLIC_*` requieren recompilar. |
| El push no dispara deploy | Revisa el estado **Connected with GitHub** y el acceso al repo en la GitHub App. |
| Build de Next falla por memoria | Compila solo `apps/web` (root directory correcto) y evita builds simultáneos. |

---

## 9. Qué no necesitas

- **No** necesitas claves SSH ni secrets `SSH_HOST` / `SSH_PRIVATE_KEY` en GitHub.
- **No** necesitas un workflow que haga `docker compose` (el destino es Hostinger nativo).
- **No** subas `.env` ni `.env.production`: las variables van en hPanel.
- **No** uses el gateway `server.mjs` en el modo de dos apps: cada app tiene su propio root
  directory y su propio proceso.

Si más adelante migras a un VPS, el `docker-compose.yml` y `nginx/` del repo siguen siendo
válidos y ahí sí tendría sentido añadir un workflow de despliegue por SSH.

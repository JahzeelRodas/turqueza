# Turquesa · Plataforma E-commerce Headless y Modular

Monorepo de comercio electrónico **agnóstico al rubro**, preparado para desplegarse de forma
nativa en el **Plan Business de Hostinger (Node.js)** sin contenedores. El caso de uso inicial es
una joyería de alta gama con **grabado láser personalizado**, **envíos a los 9 departamentos de
Bolivia** y **checkout por WhatsApp**.

## Stack

| Capa | Tecnología |
| --- | --- |
| Storefront | Next.js 15 (App Router) · TypeScript · Tailwind CSS · Framer Motion |
| API | NestJS 11 · TypeScript · Prisma ORM |
| Base de datos | PostgreSQL 16 (JSONB para atributos dinámicos) |
| Estado del carrito | Zustand + persistencia en `localStorage` |
| Checkout | WhatsApp (`wa.me`) con mensaje formateado en servidor |

## Estructura

```
.
├─ apps/
│  ├─ api/                        # API headless NestJS
│  │  ├─ prisma/
│  │  │  ├─ schema.prisma         # Product, Cart, Order, ShippingZone, StoreConfig...
│  │  │  └─ seed.ts               # Joyería + 9 departamentos de Bolivia
│  │  └─ src/
│  │     ├─ products/             # Catálogo (filtros, búsqueda, CRUD admin)
│  │     ├─ categories/
│  │     ├─ orders/               # Checkout, grabado, envío, WhatsApp
│  │     ├─ shipping/             # Zonas y costos nacionales
│  │     ├─ store-config/         # Tema + bloques JSON del CMS
│  │     ├─ admin/                # Auth + endpoints protegidos del panel
│  │     └─ common/whatsapp.ts    # Formateador del mensaje de pedido
│  │
│  └─ web/                        # Storefront Next.js
│     └─ src/
│        ├─ app/
│        │  ├─ (storefront)/      # Rutas públicas (home, colección, checkout…)
│        │  └─ admin/             # Panel de administración (login + dashboard)
│        ├─ components/
│        │  ├─ admin/             # Shell, UI, formularios y tablas del panel
│        │  ├─ blocks/            # Hero, ValueProps, CategoryGrid, Showcase, Storytelling
│        │  ├─ product/           # ProductCard, Grabado, Guía de tallas, Galería
│        │  ├─ cart/              # Drawer + página de carrito
│        │  ├─ checkout/          # CheckoutForm (Bolivia + WhatsApp)
│        │  ├─ layout/            # Header (mega menú) + Footer
│        │  └─ ui/                # Button, Container, Reveal, Badge...
│        ├─ config/store-theme.ts # Tokens visuales por rubro
│        ├─ lib/                  # API client, fallback, WhatsApp, utils
│        ├─ store/cart.ts         # Zustand
│        └─ types/store.ts        # Contratos compartidos
│
├─ docs/HOSTINGER.md              # Despliegue nativo paso a paso
├─ nginx/default.conf             # Proxy opcional (solo si usas VPS/Docker)
├─ docker-compose.yml             # Stack opcional de desarrollo local
└─ pnpm-workspace.yaml
```

## Inicio rápido

```bash
# Requisitos: Node.js >= 22 y pnpm >= 9
corepack enable

# 1) Dependencias
pnpm install

# 2) Variables de entorno
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local
# Edita DATABASE_URL en apps/api/.env y NEXT_PUBLIC_API_URL en apps/web/.env.local

# 3) Base de datos
pnpm db:generate
pnpm db:migrate --name init
pnpm db:seed

# 4) Desarrollo (API :3001 + Web :3000)
pnpm dev
```

- Storefront: <http://localhost:3000>
- Panel admin: <http://localhost:3000/admin>
- API: <http://localhost:3001/api/health>
- Admin de DB: `pnpm db:studio`

> El storefront incluye datos de respaldo (`apps/web/src/lib/fallback.ts`), por lo que puede
> renderizarse aunque la API todavía no esté levantada. En producción la fuente de verdad es
> siempre PostgreSQL.

## Scripts

| Comando | Descripción |
| --- | --- |
| `pnpm dev` | API y Web en paralelo |
| `pnpm build` | Build de API + Web |
| `pnpm start:api` | API en producción (`node dist/main.js`) |
| `pnpm start:web` | Next.js en producción (respeta `PORT`) |
| `pnpm db:migrate` | Migración de desarrollo |
| `pnpm db:migrate:deploy` | Migraciones en producción |
| `pnpm db:seed` | Datos iniciales de joyería + envíos Bolivia |
| `pnpm typecheck` | TypeScript en todo el monorepo |

## API

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/health` | Healthcheck |
| `GET` | `/api/products?category=&featured=&onSale=&search=&take=` | Catálogo (incluye filtro de ofertas) |
| `GET` | `/api/products/:slug` | Ficha de producto (incluye grabado) |
| `GET` | `/api/categories` | Categorías |
| `GET` | `/api/shipping-zones` | Departamentos, ciudades y costos |
| `GET` | `/api/store-config` | Tema, navegación, footer y bloques del home |
| `POST` | `/api/orders` | Crea pedido, calcula envío y devuelve `whatsappUrl` |
| `PATCH` | `/api/orders/:orderNumber/confirm-whatsapp` | Marca el pedido como enviado (idempotente, sin datos personales) |

Los precios **siempre** se recalculan en servidor: el cliente nunca envía importes. El grabado se
valida contra la configuración JSONB del producto (caracteres, tipografía, ubicación y precio).

### Endpoints del panel (`/api/admin`, requieren Bearer token)

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/api/admin/auth/login` | Inicia sesión y devuelve el token |
| `GET` | `/api/admin/auth/me` | Valida la sesión activa |
| `GET` | `/api/admin/stats` | KPIs, ventas de 7 días, stock bajo y top productos |
| `GET/POST` | `/api/admin/products` | Listado completo / crear producto |
| `GET/PATCH/DELETE` | `/api/admin/products/:id` | Detalle, edición y borrado |
| `POST` | `/api/admin/products/:id/duplicate` | Duplica como borrador |
| `PATCH` | `/api/admin/products/bulk-discount` | Aplica o retira una oferta % a todo el catálogo o a una selección |
| `PATCH` | `/api/admin/products/:id/status` | Cambia estado (DRAFT/ACTIVE/ARCHIVED) |
| `PATCH` | `/api/admin/products/:id/stock` | Ajusta stock del producto |
| `POST` | `/api/admin/products/:id/variants` | Crea una variante |
| `PATCH/DELETE` | `/api/admin/products/:id/variants/:variantId` | Edita o elimina una variante |
| `GET/POST` | `/api/admin/categories` | Lista / crea categorías (árbol) |
| `GET/PATCH/DELETE` | `/api/admin/categories/:id` | Detalle, edición y borrado de categoría |
| `GET` | `/api/admin/orders` | Pedidos con filtros, búsqueda y conteos |
| `GET` | `/api/admin/orders/:orderNumber` | Detalle + enlace de WhatsApp |
| `PATCH` | `/api/admin/orders/:orderNumber/status` | Cambia el estado del pedido |
| `PATCH` | `/api/admin/orders/:orderNumber/notes` | Notas internas |
| `GET` | `/api/admin/customers` | Clientes agrupados por email |
| `GET` | `/api/admin/inventory` | Inventario paginado y métricas |
| `GET/POST/PATCH/DELETE` | `/api/admin/shipping-zones` | CRUD de zonas de envío |
| `GET/PATCH` | `/api/admin/store-config` | Datos generales, tema y CMS JSON |

## Panel de administración

El panel está en `/admin` y cubre las tareas operativas de la tienda:

- **Dashboard:** ingresos confirmados, pedidos pendientes, ticket promedio, ventas de los
  últimos 7 días, stock bajo y productos más vendidos.
- **Productos:** CRUD completo, publicación/borrador/archivo, destacados, imágenes,
  atributos JSONB, configuración de grabado láser y editor de variantes con SKU, precio,
  stock y opciones.
- **Ofertas masivas:** desde **Productos → Ofertas** se aplica un porcentaje definido por el
  usuario a todo el catálogo o a los productos seleccionados en la tabla. El descuento se
  calcula sobre el precio original (`compareAtPrice`), por lo que no se acumula al reaplicarlo
  y puede retirarse para restaurar el precio de lista. Las piezas en oferta se publican
  automáticamente en la ruta `/ofertas` del storefront.
- **Categorías:** CRUD con jerarquía padre/hijo, posición, visibilidad y validación de ciclos.
- **Inventario:** edición rápida de stock por variante o producto, alertas de stock bajo y
  agotados.
- **Pedidos:** búsqueda, filtros por estado y fecha, detalle con grabado, actualización de
  estado, notas internas, mensaje y enlace de WhatsApp, exportación CSV.
- **Clientes:** agrupados por email, pedidos, gasto acumulado y última compra.
- **Envíos:** CRUD de departamentos/ciudades, costos y umbral de envío gratis.
- **Tienda y CMS:** datos generales, WhatsApp, tema visual y editores JSON para navegación,
  footer, sellos de confianza y bloques del home.

Credenciales locales por defecto: `admin@turquesa.bo` / `admin123`. En producción define
`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` y `ADMIN_JWT_SECRET` (ver `.env.production.example`).
La API falla al arrancar si `NODE_ENV=production` y faltan esas variables, si la contraseña es la
de desarrollo o si el secreto tiene menos de 32 caracteres.
El token de sesión se firma con HMAC-SHA256 y expira según `ADMIN_TOKEN_TTL_HOURS`.

## Configuración del checkout

El mensaje de WhatsApp incluye:

1. Datos del cliente (nombre, teléfono, email).
2. Líneas del carrito con SKU, variante y cantidad.
3. Especificaciones exactas del grabado: texto, tipografía, ubicación y sobreprecio.
4. Departamento, ciudad, dirección, referencia y costo/tiempo de envío.
5. Subtotal, envío y total en bolivianos.

El número de WhatsApp se configura en `StoreConfig.whatsappNumber` (panel/CMS o seed) y el enlace
se genera con `https://wa.me/<número>?text=<mensaje>`.

## Cambiar de rubro

Sin tocar componentes:

1. Añade un tema en `apps/web/src/config/store-theme.ts` (colores, radios, tipografía).
2. Selecciónalo en **Admin → Tienda y CMS** (se guarda en `StoreConfig.themeId`). Si no hay
   configuración, se usa `NEXT_PUBLIC_STORE_THEME` como fallback.
3. Cambia los bloques del home y la navegación desde el panel o en `StoreConfig` (JSONB).
4. Reemplaza los datos del seed. Los atributos específicos viven en `metadata` (JSONB).

Los componentes no conocen "joyería": conocen bloques, productos, variantes y tokens.

### Dirección visual (2026)

El tema `joyeria` sigue el lenguaje de las joyerías editoriales contemporáneas
(Mejuri, Missoma, Monica Vinader, Astrid & Miyu, Cartier):

- **Papel cálido + tinta espresso** en lugar de blanco frío, con un halo dorado muy sutil.
- **Verde esmeralda profundo** como color de marca y **oro champagne** para filetes, iconos
  y detalles; **terracota** exclusivo para ofertas y descuentos.
- **Tipografía editorial**: serif de alto contraste para titulares y sans geométrica para
  navegación, etiquetas y precios secundarios.
- **Bordes casi rectos** (2px), marcos finos, mucho aire y fotografía protagonista.
- Componentes nuevos: sello de descuento y ahorro en tarjetas, badge de oferta en la ficha,
  footer oscuro editorial y página `/ofertas`.

## Despliegue

- **[docs/CI-CD.md](docs/CI-CD.md)** · flujo completo GitHub + GitHub Actions + Hostinger:
  subida del repo, creación de las dos Web Apps Node.js, monorepo con `root directory`,
  variables de entorno, auto-deploy al hacer merge a `main`, protección de rama, migraciones y
  rollback.
- **[docs/HOSTINGER.md](docs/HOSTINGER.md)** · configuración detallada de la base de datos,
  dominios, SSL y checklist de producción en Hostinger Business (sin Docker).

Resumen del flujo: push a una rama → PR → CI (`typecheck` + build) → merge a `main` →
Hostinger reconstruye y despliega automáticamente `apps/api` y `apps/web`.

## Notas

- `docker-compose.yml` y `nginx/` se conservan como alternativa **opcional** para VPS local. El
  despliegue objetivo es Hostinger Node.js nativo.
- Los índices GIN sobre JSONB se documentan en `schema.prisma`; añádelos en la migración si
  necesitas consultas intensivas por `metadata` o `engraving`.

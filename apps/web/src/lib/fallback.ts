import type {
  Category,
  EngravingConfig,
  Navigation,
  Product,
  ShippingZone,
  StoreConfig,
  ValueProp,
} from '@/types/store';

/**
 * Datos de respaldo.
 *
 * El storefront funciona incluso si la API aún no está levantada (primer deploy,
 * migraciones pendientes o caída temporal). En producción la fuente de verdad
 * siempre es PostgreSQL a través de la API NestJS.
 */

const img = (id: string, w = 1600) =>
  `https://images.unsplash.com/${id}?q=80&w=${w}&auto=format&fit=crop`;

export const engravingConfig: EngravingConfig = {
  enabled: true,
  price: 5_000,
  maxChars: 18,
  fonts: [
    { id: 'serif', label: 'Clásica', className: 'font-serif tracking-[0.18em]' },
    { id: 'sans', label: 'Moderna', className: 'font-sans tracking-[0.3em]' },
    { id: 'script', label: 'Manuscrita', className: 'font-serif italic tracking-wide' },
  ],
  placements: [
    { id: 'interior', label: 'Interior', description: 'Discreto, solo visible al retirar la pieza.' },
    { id: 'exterior', label: 'Exterior', description: 'Visible en la cara frontal de la joya.' },
  ],
};

export const fallbackCategories: Category[] = [
  { id: 'cat-anillos', name: 'Anillos', slug: 'anillos', imageUrl: img('photo-1605100804763-247f67b3557e'), position: 1 },
  { id: 'cat-collares', name: 'Collares', slug: 'collares', imageUrl: img('photo-1599643478518-a784e5dc4708'), position: 2 },
  { id: 'cat-pendientes', name: 'Pendientes', slug: 'pendientes', imageUrl: img('photo-1617038220319-276d3cfab638'), position: 3 },
  { id: 'cat-brazaletes', name: 'Brazaletes', slug: 'brazaletes', imageUrl: img('photo-1611591437281-460bfbe1220a'), position: 4 },
];

export const fallbackProducts: Product[] = [
  {
    id: 'prod-aurora',
    slug: 'anillo-solitario-aurora',
    name: 'Anillo Solitario Aurora',
    subtitle: 'Oro blanco 18k · Turquesa natural',
    description:
      'Solitario de líneas puras con una turquesa natural engastada en cuatro garras. Su canto fino de 2 mm maximiza la luz de la piedra y lo hace perfecto para el día a día.',
    price: 129_000,
    compareAtPrice: 149_000,
    currency: 'BOB',
    images: [img('photo-1605100804763-247f67b3557e'), img('photo-1535632066927-ab7c9ab60908')],
    status: 'ACTIVE',
    isFeatured: true,
    stock: 8,
    tags: ['oro', 'anillo', 'turquesa'],
    metadata: { material: 'Oro blanco 18k', piedra: 'Turquesa natural', peso_piedra: '0,9 ct', acabado: 'Pulido espejo' },
    attributes: { badges: ['Nuevo', 'Hecho a mano'], hasSizeGuide: true },
    engraving: engravingConfig,
    category: fallbackCategories[0],
    variants: [
      { id: 'var-aurora-50', sku: 'AUR-AN50', name: 'Anillo Aurora · 50', price: null, stock: 2, isActive: true, position: 0, options: { talla: '50' } },
      { id: 'var-aurora-52', sku: 'AUR-AN52', name: 'Anillo Aurora · 52', price: null, stock: 2, isActive: true, position: 1, options: { talla: '52' } },
      { id: 'var-aurora-54', sku: 'AUR-AN54', name: 'Anillo Aurora · 54', price: null, stock: 2, isActive: true, position: 2, options: { talla: '54' } },
      { id: 'var-aurora-56', sku: 'AUR-AN56', name: 'Anillo Aurora · 56', price: null, stock: 1, isActive: true, position: 3, options: { talla: '56' } },
      { id: 'var-aurora-58', sku: 'AUR-AN58', name: 'Anillo Aurora · 58', price: null, stock: 1, isActive: true, position: 4, options: { talla: '58' } },
    ],
  },
  {
    id: 'prod-lumina',
    slug: 'collar-perla-lumina',
    name: 'Collar Perla Lúmina',
    subtitle: 'Oro amarillo 18k · Perla Akoya',
    description:
      'Una perla Akoya de 7 mm suspendida de una cadena veneciana fina. Pureza y luz en su forma más esencial. Personalizable con un grabado interior en el cierre.',
    price: 89_000,
    compareAtPrice: null,
    currency: 'BOB',
    images: [img('photo-1599643478518-a784e5dc4708'), img('photo-1596944924616-7b38e7cfac36')],
    status: 'ACTIVE',
    isFeatured: true,
    stock: 12,
    tags: ['oro', 'collar', 'perla'],
    metadata: { material: 'Oro amarillo 18k', piedra: 'Perla Akoya 7 mm', largo_cadena: '45 cm', cierre: 'Mosquetón' },
    attributes: { badges: ['Edición limitada'], hasSizeGuide: false },
    engraving: engravingConfig,
    category: fallbackCategories[1],
    variants: [
      { id: 'var-lumina-40', sku: 'LUM-CL40', name: 'Collar Lúmina · 40 cm', price: null, stock: 5, isActive: true, position: 0, options: { largo: '40 cm' } },
      { id: 'var-lumina-45', sku: 'LUM-CL45', name: 'Collar Lúmina · 45 cm', price: null, stock: 5, isActive: true, position: 1, options: { largo: '45 cm' } },
    ],
  },
  {
    id: 'prod-aurea',
    slug: 'pendientes-gota-aurea',
    name: 'Pendientes Gota Áurea',
    subtitle: 'Oro rosa 14k · Cuarzo turmalina',
    description:
      'Gotas de cuarzo turmalina cortadas a mano y engastadas en oro rosa. Ligeros y versátiles, con un movimiento precioso al caminar.',
    price: 64_500,
    compareAtPrice: null,
    currency: 'BOB',
    images: [img('photo-1617038220319-276d3cfab638'), img('photo-1573408301185-9146fe634ad0')],
    status: 'ACTIVE',
    isFeatured: true,
    stock: 15,
    tags: ['oro rosa', 'pendientes', 'cuarzo'],
    metadata: { material: 'Oro rosa 14k', piedra: 'Cuarzo turmalina', peso: '3,2 g', cierre: 'Criolla' },
    attributes: { badges: ['Hecho a mano'], hasSizeGuide: false },
    engraving: null,
    category: fallbackCategories[2],
    variants: [
      { id: 'var-aurea-uni', sku: 'AUR-PE-UNI', name: 'Pendientes Gota Áurea · par', price: null, stock: 15, isActive: true, position: 0, options: { presentacion: 'Par' } },
    ],
  },
  {
    id: 'prod-serpente',
    slug: 'brazalete-tejido-serpente',
    name: 'Brazalete Tejido Serpente',
    subtitle: 'Plata 925 bañada en oro',
    description:
      'Brazalete de tejido serpiente bañado en oro de 18k con cierre oculto. El clásico que nunca falla.',
    price: 112_000,
    compareAtPrice: null,
    currency: 'BOB',
    images: [img('photo-1611591437281-460bfbe1220a'), img('photo-1515562141207-7a88fb7ce338')],
    status: 'ACTIVE',
    isFeatured: true,
    stock: 3,
    tags: ['plata', 'brazalete', 'oro'],
    metadata: { material: 'Plata 925 baño de oro 18k', tejido: 'Serpiente', ancho: '4 mm', cierre: 'Oculto' },
    attributes: { badges: ['Últimas unidades'], hasSizeGuide: false },
    engraving: engravingConfig,
    category: fallbackCategories[3],
    variants: [
      { id: 'var-serpente-s', sku: 'SER-BR-S', name: 'Brazalete Serpente · S', price: null, stock: 1, isActive: true, position: 0, options: { talla: 'S (17 cm)' } },
      { id: 'var-serpente-m', sku: 'SER-BR-M', name: 'Brazalete Serpente · M', price: null, stock: 2, isActive: true, position: 1, options: { talla: 'M (19 cm)' } },
    ],
  },
];

export const fallbackShippingZones: ShippingZone[] = [
  { id: 'zone-lp', code: 'LP', department: 'La Paz', cities: ['La Paz', 'El Alto', 'Viacha', 'Achocalla'], price: 2_500, freeThreshold: 150_000, estimatedDays: '1-2 días hábiles', isActive: true, position: 1 },
  { id: 'zone-sc', code: 'SC', department: 'Santa Cruz', cities: ['Santa Cruz de la Sierra', 'Montero', 'Warnes', 'Cotoca'], price: 3_000, freeThreshold: 150_000, estimatedDays: '2-3 días hábiles', isActive: true, position: 2 },
  { id: 'zone-cb', code: 'CB', department: 'Cochabamba', cities: ['Cochabamba', 'Quillacollo', 'Sacaba', 'Tiquipaya'], price: 2_800, freeThreshold: 150_000, estimatedDays: '2-3 días hábiles', isActive: true, position: 3 },
  { id: 'zone-tj', code: 'TJ', department: 'Tarija', cities: ['Tarija', 'Yacuiba', 'Villamontes'], price: 3_500, freeThreshold: 150_000, estimatedDays: '3-4 días hábiles', isActive: true, position: 4 },
  { id: 'zone-or', code: 'OR', department: 'Oruro', cities: ['Oruro', 'Huanuni'], price: 3_200, freeThreshold: 150_000, estimatedDays: '3-4 días hábiles', isActive: true, position: 5 },
  { id: 'zone-pt', code: 'PT', department: 'Potosí', cities: ['Potosí', 'Uyuni', 'Villazón'], price: 3_500, freeThreshold: 150_000, estimatedDays: '3-4 días hábiles', isActive: true, position: 6 },
  { id: 'zone-ch', code: 'CH', department: 'Chuquisaca', cities: ['Sucre', 'Monteagudo'], price: 3_500, freeThreshold: 150_000, estimatedDays: '3-4 días hábiles', isActive: true, position: 7 },
  { id: 'zone-be', code: 'BE', department: 'Beni', cities: ['Trinidad', 'Riberalta', 'Guayaramerín'], price: 4_200, freeThreshold: 150_000, estimatedDays: '4-6 días hábiles', isActive: true, position: 8 },
  { id: 'zone-pd', code: 'PD', department: 'Pando', cities: ['Cobija', 'Porvenir'], price: 4_500, freeThreshold: 150_000, estimatedDays: '4-6 días hábiles', isActive: true, position: 9 },
];

const valueProps: ValueProp[] = [
  { icon: 'gem', title: 'Materiales certificados', description: 'Oro 18k y piedras naturales con certificado de autenticidad.' },
  { icon: 'truck', title: 'Envíos a toda Bolivia', description: 'Los 9 departamentos con envío asegurado y seguimiento.' },
  { icon: 'sparkles', title: 'Grabado láser personalizado', description: 'Convierte tu joya en una pieza única con nombre o fecha.' },
  { icon: 'shield', title: 'Garantía de por vida', description: 'Revisión, pulido y ajuste de talla sin costo.' },
];

export const fallbackNavigation: Navigation = {
  announcement:
    'Envío gratis en pedidos desde Bs 1.500 · Grabado láser incluido en piezas seleccionadas',
  groups: [
    {
      label: 'Joyería',
      href: '/coleccion/todo',
      mega: {
        columns: [
          {
            title: 'Anillos',
            links: [
              { label: 'Solitarios', href: '/coleccion/anillos' },
              { label: 'Alianzas', href: '/coleccion/anillos' },
              { label: 'Guía de tallas', href: '/guia-de-tallas' },
            ],
          },
          {
            title: 'Collares',
            links: [
              { label: 'Colgantes', href: '/coleccion/collares' },
              { label: 'Cadenas', href: '/coleccion/collares' },
            ],
          },
          {
            title: 'Pendientes',
            links: [
              { label: 'Aretes', href: '/coleccion/pendientes' },
              { label: 'Dormilonas', href: '/coleccion/pendientes' },
            ],
          },
          {
            title: 'Brazaletes',
            links: [{ label: 'Tejidos', href: '/coleccion/brazaletes' }],
          },
        ],
        promo: {
          eyebrow: 'Nuevo',
          title: 'Grabado láser personalizado',
          body: 'Añade un nombre, una fecha o una coordenada a tu pieza favorita.',
          href: '/coleccion/anillos',
          imageUrl: img('photo-1611591437281-460bfbe1220a', 800),
        },
      },
    },
    { label: 'Nuestra casa', href: '/nuestra-casa' },
    { label: 'Guía de tallas', href: '/guia-de-tallas' },
    { label: 'Envíos', href: '/envios' },
  ],
};

export const fallbackStoreConfig: StoreConfig = {
  id: 'singleton',
  storeName: 'Turquesa Joyería',
  tagline: 'Alta joyería de autor, hecha a mano en Bolivia',
  currency: 'BOB',
  locale: 'es-BO',
  country: 'Bolivia',
  whatsappNumber: '59171234567',
  themeId: 'joyeria',
  navigation: fallbackNavigation,
  footer: {
    description:
      'Turquesa es una joyería de autor boliviana. Diseñamos y trabajamos a mano piezas en oro y plata con piedras naturales, pensadas para heredarse.',
    columns: [
      {
        title: 'Tienda',
        links: [
          { label: 'Anillos', href: '/coleccion/anillos' },
          { label: 'Collares', href: '/coleccion/collares' },
          { label: 'Pendientes', href: '/coleccion/pendientes' },
          { label: 'Brazaletes', href: '/coleccion/brazaletes' },
        ],
      },
      {
        title: 'Ayuda',
        links: [
          { label: 'Guía de tallas', href: '/guia-de-tallas' },
          { label: 'Envíos y entregas', href: '/envios' },
          { label: 'Contacto', href: '/contacto' },
        ],
      },
    ],
    social: [
      { label: 'Instagram', href: 'https://instagram.com' },
      { label: 'TikTok', href: 'https://tiktok.com' },
    ],
    legal: '© 2026 Turquesa Joyería · La Paz, Bolivia',
  },
  valueProps: { items: valueProps },
  homeLayout: [
    {
      type: 'hero',
      eyebrow: 'Colección 2026',
      title: 'Alta joyería de autor',
      subtitle: 'Piezas intemporales en oro, plata y piedras naturales. Diseñadas en La Paz para durar toda una vida.',
      ctas: [
        { label: 'Descubrir colección', href: '/coleccion/todo', variant: 'primary' },
        { label: 'Nuestro atelier', href: '/nuestra-casa', variant: 'outline' },
      ],
      media: { type: 'image', src: img('photo-1515562141207-7a88fb7ce338', 2400), alt: 'Anillos de oro sobre piedra' },
      minHeight: 'md',
      overlay: 0.35,
      imagePriority: true,
    },
    { type: 'value-props', items: valueProps },
    {
      type: 'category-grid',
      title: 'Colecciones',
      subtitle: 'La minuciosidad del taller, organizada en categorías',
      cta: { label: 'Ver todo', href: '/coleccion/todo' },
      categories: fallbackCategories,
    },
    {
      type: 'product-showcase',
      title: 'Selección destacada',
      subtitle: 'Las piezas más deseadas del momento',
      cta: { label: 'Ver toda la joyería', href: '/coleccion/todo' },
      products: fallbackProducts,
    },
    {
      type: 'storytelling',
      eyebrow: 'Nuestra historia',
      title: 'Cada pieza nace a mano en nuestro atelier',
      body: 'Desde 1987 dibujamos cera, tallamos metales y engastamos pieza a pieza. Trabajamos con oro trazable y piedras certificadas, porque una joya se hereda.\n\nVisita nuestro taller en La Paz o reserva una cita personalizada.',
      cta: { label: 'Conocer el atelier', href: '/nuestra-casa' },
      media: { type: 'image', src: img('photo-1573408301185-9146fe634ad0'), alt: 'Joyería trabajada a mano' },
      mirror: false,
    },
  ],
};

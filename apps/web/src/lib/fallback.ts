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
 * Datos de respaldo y configuración base del storefront.
 * En producción la fuente de verdad siempre es MySQL a través de la API NestJS.
 */

export const engravingConfig: EngravingConfig = {
  enabled: true,
  price: 2_500, // Bs 25,00 (ajusta según tu tarifa real)
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

/* Catálogo vacío por defecto para evitar productos demo cuando la BD está en cero */
export const fallbackCategories: Category[] = [];

export const fallbackProducts: Product[] = [];

export const fallbackShippingZones: ShippingZone[] = [
  { id: 'zone-lp', code: 'LP', department: 'La Paz', cities: ['La Paz', 'El Alto', 'Viacha', 'Achocalla'], price: 2_500, freeThreshold: 30_000, estimatedDays: '1-2 días hábiles', isActive: true, position: 1 },
  { id: 'zone-sc', code: 'SC', department: 'Santa Cruz', cities: ['Santa Cruz de la Sierra', 'Montero', 'Warnes', 'Cotoca'], price: 3_000, freeThreshold: 30_000, estimatedDays: '2-3 días hábiles', isActive: true, position: 2 },
  { id: 'zone-cb', code: 'CB', department: 'Cochabamba', cities: ['Cochabamba', 'Quillacollo', 'Sacaba', 'Tiquipaya'], price: 2_800, freeThreshold: 30_000, estimatedDays: '2-3 días hábiles', isActive: true, position: 3 },
  { id: 'zone-tj', code: 'TJ', department: 'Tarija', cities: ['Tarija', 'Yacuiba', 'Villamontes'], price: 3_500, freeThreshold: 30_000, estimatedDays: '3-4 días hábiles', isActive: true, position: 4 },
  { id: 'zone-or', code: 'OR', department: 'Oruro', cities: ['Oruro', 'Huanuni'], price: 3_200, freeThreshold: 30_000, estimatedDays: '3-4 días hábiles', isActive: true, position: 5 },
  { id: 'zone-pt', code: 'PT', department: 'Potosí', cities: ['Potosí', 'Uyuni', 'Villazón'], price: 3_500, freeThreshold: 30_000, estimatedDays: '3-4 días hábiles', isActive: true, position: 6 },
  { id: 'zone-ch', code: 'CH', department: 'Chuquisaca', cities: ['Sucre', 'Monteagudo'], price: 3_500, freeThreshold: 30_000, estimatedDays: '3-4 días hábiles', isActive: true, position: 7 },
  { id: 'zone-be', code: 'BE', department: 'Beni', cities: ['Trinidad', 'Riberalta', 'Guayaramerín'], price: 4_200, freeThreshold: 30_000, estimatedDays: '4-6 días hábiles', isActive: true, position: 8 },
  { id: 'zone-pd', code: 'PD', department: 'Pando', cities: ['Cobija', 'Porvenir'], price: 4_500, freeThreshold: 30_000, estimatedDays: '4-6 días hábiles', isActive: true, position: 9 },
];

const valueProps: ValueProp[] = [
  {
    icon: 'gem',
    title: 'Acero inoxidable 316L',
    description: 'Piezas hipoalergénicas, resistentes al agua y diseñadas para no perder su brillo.',
  },
  {
    icon: 'sparkles',
    title: 'Grabado láser de precisión',
    description: 'Personaliza tu joya con nombres, fechas, iniciales o frases especiales.',
  },
  {
    icon: 'truck',
    title: 'Envíos a toda Bolivia',
    description: 'Entregas seguras y con seguimiento en los 9 departamentos.',
  },
  {
    icon: 'shield',
    title: 'Brillo duradero',
    description: 'No se oxida ni mancha la piel, ideal para el uso diario.',
  },
];

export const fallbackNavigation: Navigation = {
  announcement:
    'Joyas en acero inoxidable quirúrgico · Grabado láser personalizado · Envíos a toda Bolivia',
  groups: [
    {
      label: 'Colección',
      href: '/coleccion/todo',
      mega: {
        columns: [
          {
            title: 'Anillos',
            links: [
              { label: 'Ver anillos', href: '/coleccion/anillos' },
              { label: 'Guía de tallas', href: '/guia-de-tallas' },
            ],
          },
          {
            title: 'Collares',
            links: [{ label: 'Ver collares', href: '/coleccion/collares' }],
          },
          {
            title: 'Pendientes',
            links: [{ label: 'Ver pendientes', href: '/coleccion/pendientes' }],
          },
          {
            title: 'Brazaletes',
            links: [{ label: 'Ver brazaletes', href: '/coleccion/brazaletes' }],
          },
        ],
        promo: {
          eyebrow: 'Personalización',
          title: 'Grabado láser a medida',
          body: 'Convierte cada pieza de acero inoxidable en un recuerdo único con tu propio grabado.',
          href: '/coleccion/todo',
          imageUrl: '/images/promo-grabado.jpg',
        },
      },
    },
    { label: 'Nosotros', href: '/nuestra-casa' },
    { label: 'Guía de tallas', href: '/guia-de-tallas' },
    { label: 'Envíos', href: '/envios' },
  ],
};

export const fallbackStoreConfig: StoreConfig = {
  id: 'singleton',
  storeName: 'Turquesa Joyería',
  tagline: 'Joyería en acero inoxidable con grabado láser en Bolivia',
  currency: 'BOB',
  locale: 'es-BO',
  country: 'Bolivia',
  whatsappNumber: '59170226107',
  themeId: 'joyeria',
  navigation: fallbackNavigation,
  footer: {
    description:
      'Turquesa es una marca boliviana especializada en joyería de acero inoxidable 316L y grabado láser personalizado. Piezas modernas, resistentes al agua e hipoalergénicas.',
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
    legal: '© 2026 Turquesa Joyería · Bolivia',
  },
  valueProps: { items: valueProps },
  homeLayout: [
    {
      type: 'hero',
      eyebrow: 'Colección 2026',
      title: 'Joyería en acero inoxidable',
      subtitle: 'Diseños atemporales resistentes al agua, hipoalergénicos y personalizables con grabado láser.',
      ctas: [
        { label: 'Explorar colección', href: '/coleccion/todo', variant: 'primary' },
        { label: 'Conocer más', href: '/nuestra-casa', variant: 'outline' },
      ],
      media: { type: 'image', src: '/images/hero-turquesa.png', alt: 'Joyería en acero inoxidable Turquesa' },
      minHeight: 'md',
      overlay: 0.35,
      imagePriority: true,
    },
    { type: 'value-props', items: valueProps },
    {
      type: 'category-grid',
      title: 'Colecciones',
      subtitle: 'Explora nuestras líneas en acero inoxidable',
      cta: { label: 'Ver todo', href: '/coleccion/todo' },
      categories: fallbackCategories,
    },
    {
      type: 'product-showcase',
      title: 'Selección destacada',
      subtitle: 'Piezas listas para usar o personalizar con grabado láser',
      cta: { label: 'Ver toda la colección', href: '/coleccion/todo' },
      products: fallbackProducts,
    },
    {
      type: 'storytelling',
      eyebrow: 'Nuestra esencia',
      title: 'Detalles hechos para acompañarte todos los días',
      body: 'Trabajamos con acero inoxidable quirúrgico 316L de alta durabilidad, resistente al agua y suave con tu piel.\n\nPersonalizamos tus piezas con grabado láser de alta precisión para que cada joya cuente una historia propia.',
      cta: { label: 'Conocer nuestra marca', href: '/nuestra-casa' },
      media: { type: 'image', src: '/images/Logo Turqueza sobre seda dorada.png', alt: 'Grabado láser en joyería de acero inoxidable' },
      mirror: false,
    },
  ],
};
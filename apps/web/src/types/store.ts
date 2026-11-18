/** Tipos compartidos entre la API (Prisma) y el storefront. */

export interface ProductVariant {
  id: string;
  sku: string;
  name: string;
  price: number | null;
  compareAtPrice?: number | null;
  stock: number;
  isActive: boolean;
  position: number;
  imageUrl?: string | null;
  options: Record<string, string>;
}

export interface EngravingOption {
  id: string;
  label: string;
  description?: string;
  className?: string;
}

export interface EngravingConfig {
  enabled: boolean;
  price: number;
  maxChars: number;
  fonts: EngravingOption[];
  placements: EngravingOption[];
}

export interface EngravingSelection {
  enabled: boolean;
  text: string;
  font: string;
  fontLabel: string;
  placement: 'interior' | 'exterior';
  placementLabel: string;
  price: number;
  className?: string;
}

export interface ProductAttributes {
  badges?: string[];
  hasSizeGuide?: boolean;
  [key: string]: unknown;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  subtitle?: string | null;
  description?: string | null;
  price: number;
  compareAtPrice?: number | null;
  currency: string;
  images: string[];
  status: string;
  isFeatured: boolean;
  stock: number;
  tags: string[];
  metadata: Record<string, unknown>;
  attributes: ProductAttributes;
  engraving?: EngravingConfig | null;
  variants: ProductVariant[];
  category?: Category | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  position: number;
}

export interface ShippingZone {
  id: string;
  code: string;
  department: string;
  cities: string[];
  price: number;
  freeThreshold: number | null;
  estimatedDays: string;
  isActive: boolean;
  position: number;
}

export interface NavLink {
  label: string;
  href: string;
}

export interface NavigationGroup {
  label: string;
  href?: string;
  mega?: {
    columns: Array<{ title: string; links: NavLink[] }>;
    promo?: {
      eyebrow?: string;
      title: string;
      body?: string;
      href: string;
      imageUrl?: string;
    };
  };
}

export interface Navigation {
  groups: NavigationGroup[];
  announcement?: string;
}

export interface FooterConfig {
  description?: string;
  columns?: Array<{ title: string; links: NavLink[] }>;
  social?: NavLink[];
  legal?: string;
}

export interface StoreConfig {
  id: string;
  storeName: string;
  tagline?: string | null;
  currency: string;
  locale: string;
  country: string;
  whatsappNumber?: string | null;
  themeId: string;
  navigation: Navigation;
  footer: FooterConfig;
  valueProps: { items?: ValueProp[] } | ValueProp[];
  homeLayout: Block[];
}

export interface ValueProp {
  icon: string;
  title: string;
  description?: string;
}

export interface Cta {
  label: string;
  href: string;
  variant?: 'primary' | 'outline' | 'ghost';
}

export interface Media {
  type: 'image' | 'video';
  src: string;
  alt?: string;
  poster?: string;
}

export type Block =
  | {
      type: 'hero';
      eyebrow?: string;
      title: string;
      subtitle?: string;
      ctas?: Cta[];
      media: Media;
      minHeight?: 'sm' | 'md' | 'lg' | 'screen';
      overlay?: number;
      imagePriority?: boolean;
    }
  | { type: 'value-props'; items: ValueProp[] }
  | {
      type: 'category-grid';
      title?: string;
      subtitle?: string;
      cta?: Cta;
      categories: Array<Pick<Category, 'name' | 'slug' | 'imageUrl' | 'description'>>;
    }
  | {
      type: 'product-showcase';
      title?: string;
      subtitle?: string;
      cta?: Cta;
      products: Product[];
    }
  | {
      type: 'storytelling';
      eyebrow?: string;
      title: string;
      body: string;
      cta?: Cta;
      media: Media;
      mirror?: boolean;
    };

export interface CreateOrderPayload {
  email: string;
  customerName: string;
  phone?: string;
  notes?: string;
  shippingZoneCode?: string;
  shippingAddress: {
    fullName: string;
    line1: string;
    line2?: string;
    department: string;
    city: string;
    postalCode?: string;
    country?: string;
    reference?: string;
    phone?: string;
  };
  items: Array<{
    variantId: string;
    quantity: number;
    engraving?: {
      enabled: boolean;
      text?: string;
      font?: string;
      placement?: 'interior' | 'exterior';
      fontLabel?: string;
      placementLabel?: string;
    };
  }>;
}

export interface CreatedOrder {
  id: string;
  orderNumber: string;
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
  whatsappMessage: string;
  whatsappUrl: string | null;
}

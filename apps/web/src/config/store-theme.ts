import type { CSSProperties } from 'react';

/**
 * Sistema de temas visuales por tokens.
 *
 * Para adaptar la plataforma a otro rubro NO se toca ningún componente:
 * se agrega un objeto en `themes` y se activa desde Admin → Tienda y CMS
 * (`StoreConfig.themeId`). `NEXT_PUBLIC_STORE_THEME` queda como fallback.
 * Los tokens se inyectan como variables CSS en <body> (layout.tsx) y Tailwind
 * los consume vía tailwind.config.js (bg-bg, text-fg, bg-accent, text-gold...).
 *
 * Paleta editorial 2026: fondos cálidos tipo papel, tinta espresso, verde
 * esmeralda profundo como acento de marca, oro champagne como metal noble y
 * un terracota sobrio para ofertas. Menos brillo, más contraste y aire.
 */
export interface StoreTheme {
  id: string;
  label: string;
  /** Tipo de letra decorativa para títulos (cargada con next/font en layout.tsx). */
  headingFont: 'serif' | 'sans';
  colors: {
    bg: string;
    surface: string;
    fg: string;
    muted: string;
    line: string;
    accent: string;
    accentContrast: string;
    accentSoft: string;
    /** Metal noble: filetes, detalles y acentos secundarios. */
    gold: string;
    goldSoft: string;
    /** Ofertas y descuentos. */
    sale: string;
    saleSoft: string;
  };
  radius: {
    card: string;
    button: string;
  };
  shadowSoft: string;
  /** Clases extra para imágenes/hero (p.ej. filtros de color). */
  imageClass?: string;
}

export const themes: Record<string, StoreTheme> = {
  /** Caso de uso inicial: joyería de alta gama. */
  joyeria: {
    id: 'joyeria',
    label: 'Joyería · Atelier',
    headingFont: 'serif',
    colors: {
      bg: '#f5f1e8',
      surface: '#fffcf6',
      fg: '#17140f',
      muted: '#6d6559',
      line: '#e2dacd',
      accent: '#0d4a45',
      accentContrast: '#f8f5ee',
      accentSoft: '#e3ece8',
      gold: '#b08d57',
      goldSoft: '#efe4d2',
      sale: '#9e3b2e',
      saleSoft: '#f6e3de',
    },
    radius: { card: '2px', button: '2px' },
    shadowSoft: '0 24px 60px -38px rgba(23, 20, 15, 0.55)',
    imageClass: 'saturate-[0.94] contrast-[1.02]',
  },

  /** Ejemplo moda: mismo código, otra piel. */
  moda: {
    id: 'moda',
    label: 'Moda',
    headingFont: 'sans',
    colors: {
      bg: '#ffffff',
      surface: '#f4f4f2',
      fg: '#111111',
      muted: '#6b6b6b',
      line: '#e5e5e5',
      accent: '#111111',
      accentContrast: '#ffffff',
      accentSoft: '#ececec',
      gold: '#9a7b4f',
      goldSoft: '#efe7da',
      sale: '#b42318',
      saleSoft: '#fde8e6',
    },
    radius: { card: '0px', button: '0px' },
    shadowSoft: 'none',
  },

  /** Ejemplo tecnología: contraste alto + acento eléctrico. */
  tech: {
    id: 'tech',
    label: 'Tecnología',
    headingFont: 'sans',
    colors: {
      bg: '#f6f7f9',
      surface: '#ffffff',
      fg: '#0b1220',
      muted: '#5b6472',
      line: '#dfe3ea',
      accent: '#2f5bff',
      accentContrast: '#ffffff',
      accentSoft: '#e6ecff',
      gold: '#c08a3e',
      goldSoft: '#f8edd9',
      sale: '#d92d20',
      saleSoft: '#fee4e2',
    },
    radius: { card: '14px', button: '10px' },
    shadowSoft: '0 16px 40px -24px rgba(11, 18, 32, 0.35)',
  },
};

const activeId = process.env.NEXT_PUBLIC_STORE_THEME ?? 'joyeria';

export const activeTheme = themes[activeId] ?? themes.joyeria;

/** Convierte el tema en variables CSS para el <body>. */
export function themeToCssVars(theme: StoreTheme = activeTheme): CSSProperties {
  return {
    '--color-bg': theme.colors.bg,
    '--color-surface': theme.colors.surface,
    '--color-fg': theme.colors.fg,
    '--color-muted': theme.colors.muted,
    '--color-line': theme.colors.line,
    '--color-accent': theme.colors.accent,
    '--color-accent-contrast': theme.colors.accentContrast,
    '--color-accent-soft': theme.colors.accentSoft,
    '--color-gold': theme.colors.gold,
    '--color-gold-soft': theme.colors.goldSoft,
    '--color-sale': theme.colors.sale,
    '--color-sale-soft': theme.colors.saleSoft,
    '--radius-card': theme.radius.card,
    '--radius-button': theme.radius.button,
    '--shadow-soft': theme.shadowSoft,
    '--font-heading': theme.headingFont === 'serif' ? 'var(--font-serif)' : 'var(--font-sans)',
  } as CSSProperties;
}

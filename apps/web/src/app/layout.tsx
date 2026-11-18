import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import { activeTheme, themeToCssVars } from '@/config/store-theme';
import './globals.css';

const serif = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-serif',
  display: 'swap',
});

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Turquesa · Plataforma e-commerce',
    template: '%s · Turquesa',
  },
  description:
    'Plataforma e-commerce headless y modular: catálogo, pedidos, envíos y CMS.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${serif.variable} ${sans.variable}`}>
      <body
        className="min-h-screen bg-bg font-sans text-fg antialiased"
        style={themeToCssVars(activeTheme)}
      >
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getStoreConfig } from '@/lib/api';
import { activeTheme, themes, themeToCssVars } from '@/config/store-theme';

export async function generateMetadata(): Promise<Metadata> {
  const config = await getStoreConfig();
  const description =
    config.tagline ??
    'Joyería en acero inoxidable 316L en Bolivia. Personaliza cada pieza con grabado láser de precisión y recíbela con envío a los 9 departamentos.';

  return {
    title: {
      default: `${config.storeName} · Alta joyería de autor`,
      template: `%s · ${config.storeName}`,
    },
    description,
    openGraph: {
      type: 'website',
      locale: 'es_BO',
      siteName: config.storeName,
      description,
    },
  };
}

export default async function StorefrontLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const config = await getStoreConfig();
  const theme = themes[config.themeId] ?? activeTheme;

  return (
    <div
      style={themeToCssVars(theme)}
      className="storefront-canvas min-h-screen text-fg"
      data-theme={theme.id}
    >
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:rounded-button focus:bg-fg focus:px-4 focus:py-2 focus:text-bg"
      >
        Saltar al contenido
      </a>
      <Header storeName={config.storeName} navigation={config.navigation} />
      <main id="contenido">{children}</main>
      <Footer storeName={config.storeName} config={config.footer} />
    </div>
  );
}

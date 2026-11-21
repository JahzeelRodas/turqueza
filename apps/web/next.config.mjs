/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Hostinger construye Next.js en modo servidor y aplica `output: "standalone"`
  // automáticamente. Exporta un objeto (no una función) para que lo respete.
  images: {
    // Las imágenes se cargan por URL desde el panel admin, así que cualquier
    // host HTTPS público debe poder pasar por el optimizador de Next.
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  // El storefront consume la API NestJS por HTTP (headless).
  // En el despliegue de dos Web Apps:
  //   NEXT_PUBLIC_API_URL=https://turqueza-api.rovelbots.com  (navegador)
  //   API_INTERNAL_URL=https://turqueza-api.rovelbots.com     (RSC/SSR)
  // Ambas son el origen de la API, SIN /api: el cliente ya añade /api.
  env: {
    NEXT_PUBLIC_STORE_THEME: process.env.NEXT_PUBLIC_STORE_THEME ?? 'joyeria',
  },
  // En hosting compartido el build de Next puede agotar el límite de procesos
  // al generar las páginas estáticas en paralelo. Un solo worker es suficiente.
  experimental: {
    cpus: 1,
  },
};

export default nextConfig;

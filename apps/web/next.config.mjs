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
  //   NEXT_PUBLIC_API_URL=https://api.tudominio.com  (navegador)
  //   API_INTERNAL_URL=https://api.tudominio.com     (RSC/SSR)
  env: {
    NEXT_PUBLIC_STORE_THEME: process.env.NEXT_PUBLIC_STORE_THEME ?? 'joyeria',
  },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Las imágenes se cargan por URL desde el panel admin, así que cualquier
    // host HTTPS público debe poder pasar por el optimizador de Next.
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  // El storefront consume la API NestJS por HTTP (headless).
  // En producción, NEXT_PUBLIC_API_URL=https://api.tudominio.com
  env: {
    NEXT_PUBLIC_STORE_THEME: process.env.NEXT_PUBLIC_STORE_THEME ?? 'joyeria',
  },
};

export default nextConfig;

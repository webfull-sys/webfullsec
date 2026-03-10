/**
 * WebfullSec — Configuração do Next.js
 * Autoria: Webfull (https://webfull.com.br)
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output para Docker
  output: 'standalone',

  // Headers de segurança
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://n8nwebfullsec.webfullvps.com.br https://webfullsec.webfullvps.com.br https://generativelanguage.googleapis.com",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

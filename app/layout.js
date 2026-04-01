/**
 * ============================================
 * WebfullSec — Layout Root (App Shell)
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 2.1.0
 * ============================================
 * Layout raiz que encapsula Sidebar + Header + Content.
 * Inclui SEO, fontes, PWA manifest e meta tags globais.
 */

import './globals.css';

export const metadata = {
  title: 'WebfullSec — Secretária AI & CRM Pessoal',
  description: 'Sistema de gestão de tempo, projetos e prevenção de burnout. Secretária Executiva AI para agências digitais.',
  keywords: 'CRM, gestão de projetos, pomodoro, produtividade, AI, secretária virtual',
  authors: [{ name: 'Webfull', url: 'https://webfull.com.br' }],
  robots: 'noindex, nofollow', // Sistema privado
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/icon-512.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'WebfullSec',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#060b18',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body>
        {/* Skip link para acessibilidade */}
        <a href="#main-content" className="skip-link">
          Pular para o conteúdo principal
        </a>
        {children}
      </body>
    </html>
  );
}


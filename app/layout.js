/**
 * ============================================
 * WebfullSec — Layout Root (App Shell)
 * Autoria: Webfull (https://webfull.com.br)
 * Versão: 1.0.0
 * ============================================
 * Layout raiz que encapsula Sidebar + Header + Content.
 * Inclui SEO, fontes e meta tags globais.
 */

import './globals.css';

export const metadata = {
  title: 'WebfullSec — Secretária AI & CRM Pessoal',
  description: 'Sistema de gestão de tempo, projetos e prevenção de burnout. Secretária Executiva AI para agências digitais.',
  keywords: 'CRM, gestão de projetos, pomodoro, produtividade, AI, secretária virtual',
  authors: [{ name: 'Webfull', url: 'https://webfull.com.br' }],
  robots: 'noindex, nofollow', // Sistema privado
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#060b18',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="color-scheme" content="dark" />
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

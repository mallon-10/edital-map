import type { NextConfig } from 'next';
import { extensoesDePagina } from './lib/paginasLocais';

const config: NextConfig = {
  poweredByHeader: false,
  // O painel do dono (app/admin/page.local.tsx) só existe no `npm run admin`, nunca no site publicado.
  pageExtensions: extensoesDePagina(process.env.NODE_ENV),
  async headers() {
    return [
      {
        // Link "Parar de receber" dos e-mails: o token fica no endereço; não vai no Referer nem para o índice.
        source: '/alertas/sair',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Robots-Tag', value: 'noindex' },
        ],
      },
    ];
  },
};

export default config;

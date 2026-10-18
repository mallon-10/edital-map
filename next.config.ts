import type { NextConfig } from 'next';

const config: NextConfig = {
  poweredByHeader: false,
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

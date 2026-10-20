import { describe, expect, it } from 'vitest';
import { classificarOrigem, paginaDoCaminho } from './paginaVista';

const SLUG = '00394452000103-2026-21982';

describe('paginaDoCaminho', () => {
  it('guarda o caminho sem parâmetros e sem barra no fim', () => {
    expect(paginaDoCaminho('/')).toEqual({ pagina: '/', edital: null });
    expect(paginaDoCaminho('/licitacoes/epi/sc/')).toEqual({ pagina: '/licitacoes/epi/sc', edital: null });
    expect(paginaDoCaminho('/planos?periodo=anual#x')).toEqual({ pagina: '/planos', edital: null });
  });
  it('edital vira /edital com o slug à parte', () => {
    expect(paginaDoCaminho(`/edital/${SLUG}`)).toEqual({ pagina: '/edital', edital: SLUG });
    expect(paginaDoCaminho('/edital/qualquer')).toEqual({ pagina: '/edital', edital: null });
  });
  it('tira ids e códigos do caminho', () => {
    expect(paginaDoCaminho('/alertas/0b7e1c9a-1111-4222-8333-944445555666/editar')).toEqual({ pagina: '/alertas/editar', edital: null });
    expect(paginaDoCaminho('/obrigado/0123456789abcdef0123456789abcdef')).toEqual({ pagina: '/obrigado', edital: null });
  });
  it('recusa o painel, as rotas da API e caminhos estranhos', () => {
    expect(paginaDoCaminho('/admin')).toBeNull();
    expect(paginaDoCaminho('/admin/x')).toBeNull();
    expect(paginaDoCaminho('/api/eventos')).toBeNull();
    expect(paginaDoCaminho('sem-barra')).toBeNull();
    expect(paginaDoCaminho('/<script>')).toBeNull();
    expect(paginaDoCaminho(`/${'a'.repeat(130)}`)).toBeNull();
  });
});

describe('classificarOrigem', () => {
  const sem = { site: null, utmSource: null, utmMedium: null, anuncio: false };
  it('sem quem mandou e sem campanha é direto', () => {
    expect(classificarOrigem(sem)).toBe('direto');
  });
  it('clique de anúncio (gclid) ou mídia paga é anúncio, mesmo vindo do Google', () => {
    expect(classificarOrigem({ ...sem, anuncio: true, site: 'www.google.com' })).toBe('anuncio');
    expect(classificarOrigem({ ...sem, utmMedium: 'CPC' })).toBe('anuncio');
    expect(classificarOrigem({ ...sem, utmMedium: 'paid_social', site: 'l.instagram.com' })).toBe('anuncio');
  });
  it('buscadores', () => {
    expect(classificarOrigem({ ...sem, site: 'www.google.com.br' })).toBe('google');
    expect(classificarOrigem({ ...sem, site: 'google.com' })).toBe('google');
    expect(classificarOrigem({ ...sem, site: 'www.bing.com' })).toBe('outro_buscador');
    expect(classificarOrigem({ ...sem, site: 'duckduckgo.com' })).toBe('outro_buscador');
  });
  it('assistentes de IA (o Gemini antes do Google)', () => {
    for (const s of ['chatgpt.com', 'chat.openai.com', 'gemini.google.com', 'www.perplexity.ai', 'copilot.microsoft.com', 'claude.ai']) {
      expect(classificarOrigem({ ...sem, site: s })).toBe('ia');
    }
  });
  it('redes sociais e WhatsApp', () => {
    for (const s of ['l.facebook.com', 'lm.facebook.com', 'l.instagram.com', 'www.linkedin.com', 't.co', 'web.whatsapp.com', 'www.youtube.com']) {
      expect(classificarOrigem({ ...sem, site: s })).toBe('redes');
    }
  });
  it('e-mail pelo webmail ou pela campanha', () => {
    expect(classificarOrigem({ ...sem, site: 'mail.google.com' })).toBe('email');
    expect(classificarOrigem({ ...sem, site: 'outlook.live.com' })).toBe('email');
    expect(classificarOrigem({ ...sem, utmMedium: 'email' })).toBe('email');
  });
  it('campanha sem quem mandou usa o utm_source', () => {
    expect(classificarOrigem({ ...sem, utmSource: 'instagram' })).toBe('redes');
    expect(classificarOrigem({ ...sem, utmSource: 'google' })).toBe('google');
    expect(classificarOrigem({ ...sem, utmSource: 'parceiro' })).toBe('outro_site');
  });
  it('outro site qualquer', () => {
    expect(classificarOrigem({ ...sem, site: 'www.gov.br' })).toBe('outro_site');
    expect(classificarOrigem({ ...sem, site: 'googleads.exemplo.com' })).toBe('outro_site');
  });
});

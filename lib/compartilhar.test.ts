import { describe, expect, it } from 'vitest';
import { LINK_COPIADO, linkDoEdital, modoCompartilhar } from './compartilhar';

describe('modoCompartilhar', () => {
  it('celular com Web Share: a folha do sistema', () => {
    expect(modoCompartilhar({ temShare: true, celular: true, temCopiar: true })).toBe('nativo');
  });
  it('computador: copiar o link (mesmo com Web Share)', () => {
    expect(modoCompartilhar({ temShare: true, celular: false, temCopiar: true })).toBe('copiar');
    expect(modoCompartilhar({ temShare: false, celular: true, temCopiar: true })).toBe('copiar');
  });
  it('sem área de transferência: Web Share se houver; senão, mostrar o link', () => {
    expect(modoCompartilhar({ temShare: true, celular: false, temCopiar: false })).toBe('nativo');
    expect(modoCompartilhar({ temShare: false, celular: false, temCopiar: false })).toBe('mostrar');
  });
});

describe('linkDoEdital', () => {
  it('endereço do edital sem parâmetros', () => {
    expect(linkDoEdital('https://edital-map.vercel.app', '83102244000102-2026-77')).toBe('https://edital-map.vercel.app/edital/83102244000102-2026-77');
  });
  it('texto do aviso', () => {
    expect(LINK_COPIADO).toBe('Link copiado');
  });
});

describe('foiCancelamento', () => {
  it('só AbortError é cancelamento', async () => {
    const { foiCancelamento, ehAvisoManual } = await import('./compartilhar');
    expect(foiCancelamento({ name: 'AbortError' })).toBe(true);
    expect(foiCancelamento(new Error('x'))).toBe(false);
    expect(foiCancelamento({ name: 'NotAllowedError' })).toBe(false);
    expect(foiCancelamento(null)).toBe(false);
    expect(ehAvisoManual('Copie o link: https://x')).toBe(true);
    expect(ehAvisoManual('Link copiado')).toBe(false);
    expect(ehAvisoManual(null)).toBe(false);
  });
});

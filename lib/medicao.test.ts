import { describe, expect, it } from 'vitest';
import { CONVERSOES, eventoConversao, ID_GOOGLE_ADS, jaMedido, lerConsentimento, marcarMedido } from './medicao';

const memoria = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

describe('conversões do Google Ads', () => {
  it('a tag e os quatro rótulos da conta 988-698-8976', () => {
    expect(ID_GOOGLE_ADS).toBe('AW-18520543547');
    expect(Object.keys(CONVERSOES).sort()).toEqual(['assinou', 'buscou', 'checkout', 'limite']);
    for (const c of Object.values(CONVERSOES)) expect(c).toMatch(/^AW-18520543547\/[A-Za-z0-9_-]+$/);
  });
  it('assinatura leva valor em reais, moeda e o código da compra (o Google não conta duas vezes)', () => {
    expect(eventoConversao('assinou', { valorCentavos: 34990, transacao: 'abc' })).toEqual({
      send_to: CONVERSOES.assinou, value: 349.9, currency: 'BRL', transaction_id: 'abc',
    });
  });
  it('as outras vão sem valor', () => {
    expect(eventoConversao('buscou')).toEqual({ send_to: CONVERSOES.buscou });
  });
});

describe('uma vez por dia / por compra', () => {
  it('marca e reconhece pela chave', () => {
    const s = memoria();
    expect(jaMedido(s, 'buscou:2026-10-18')).toBe(false);
    marcarMedido(s, 'buscou:2026-10-18');
    expect(jaMedido(s, 'buscou:2026-10-18')).toBe(true);
    expect(jaMedido(s, 'buscou:2026-10-19')).toBe(false);
  });
  it('armazenamento indisponível (aba anônima bloqueada): trata como não medido e não quebra', () => {
    const quebrado = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } };
    expect(jaMedido(quebrado, 'k')).toBe(false);
    expect(() => marcarMedido(quebrado, 'k')).not.toThrow();
  });
});

describe('consentimento', () => {
  it('lê a escolha guardada; sem escolha ou valor estranho: null (mostra o aviso)', () => {
    const s = memoria();
    expect(lerConsentimento(s)).toBeNull();
    s.setItem('em_cookies', 'aceito');
    expect(lerConsentimento(s)).toBe('aceito');
    s.setItem('em_cookies', 'recusado');
    expect(lerConsentimento(s)).toBe('recusado');
    s.setItem('em_cookies', 'talvez');
    expect(lerConsentimento(s)).toBeNull();
  });
});

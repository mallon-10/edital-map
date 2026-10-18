import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { criarLimite, LIMITES_CONTA } = await import('./limiteTentativas');

const MIN = 60 * 1000;

describe('criarLimite (janela deslizante em memória)', () => {
  let agora = 0;
  const relogio = () => agora;
  beforeEach(() => {
    agora = 1_000_000;
  });

  it('passa até o máximo dentro da janela e bloqueia depois', () => {
    const l = criarLimite({ max: 3, janelaMs: 15 * MIN, agora: relogio });
    for (let i = 0; i < 3; i++) {
      expect(l.excedido('a')).toBe(false);
      l.registrar('a');
    }
    expect(l.excedido('a')).toBe(true);
    expect(l.excedido('b')).toBe(false);
  });

  it('a janela desliza: marcas antigas deixam de contar', () => {
    const l = criarLimite({ max: 2, janelaMs: 15 * MIN, agora: relogio });
    l.registrar('a');
    agora += 10 * MIN;
    l.registrar('a');
    expect(l.excedido('a')).toBe(true);
    agora += 5 * MIN + 1; // a primeira saiu da janela
    expect(l.excedido('a')).toBe(false);
    agora += 10 * MIN; // a segunda também
    expect(l.excedido('a')).toBe(false);
    expect(l.tamanho()).toBe(0);
  });

  it('chave nula (sem IP) nunca bloqueia nem guarda nada', () => {
    const l = criarLimite({ max: 1, janelaMs: MIN, agora: relogio });
    l.registrar(null);
    l.registrar(null);
    expect(l.excedido(null)).toBe(false);
    expect(l.tamanho()).toBe(0);
  });

  it('zerar(chave) limpa só aquela chave', () => {
    const l = criarLimite({ max: 1, janelaMs: MIN, agora: relogio });
    l.registrar('a');
    l.registrar('b');
    l.zerar('a');
    expect(l.excedido('a')).toBe(false);
    expect(l.excedido('b')).toBe(true);
  });

  it('teto de chaves: limpa as vencidas e, se ainda passar, descarta as mais antigas', () => {
    const l = criarLimite({ max: 1, janelaMs: MIN, maxChaves: 3, agora: relogio });
    l.registrar('velha');
    agora += 2 * MIN; // 'velha' venceu
    l.registrar('a');
    l.registrar('b');
    l.registrar('c');
    expect(l.tamanho()).toBe(3);
    expect(l.excedido('a')).toBe(true);
    l.registrar('d'); // passa do teto: a mais antiga viva ('a') sai
    expect(l.tamanho()).toBe(3);
    expect(l.excedido('a')).toBe(false);
    expect(l.excedido('d')).toBe(true);
  });

  it('guarda no máximo `max` marcas por chave', () => {
    const l = criarLimite({ max: 2, janelaMs: MIN, agora: relogio });
    for (let i = 0; i < 100; i++) l.registrar('a');
    expect(l.marcas('a')).toBe(2);
  });
});

describe('LIMITES_CONTA', () => {
  it('confere código: 5 falhas por e-mail e 20 por IP em 15 min; envio de código: 5 por e-mail e 20 por IP em 1 h', () => {
    expect(LIMITES_CONTA.falhasPorEmail.config).toEqual({ max: 5, janelaMs: 15 * MIN });
    expect(LIMITES_CONTA.falhasPorIp.config).toEqual({ max: 20, janelaMs: 15 * MIN });
    expect(LIMITES_CONTA.codigosPorEmail.config).toEqual({ max: 5, janelaMs: 60 * MIN });
    expect(LIMITES_CONTA.codigosPorIp.config).toEqual({ max: 20, janelaMs: 60 * MIN });
  });
});

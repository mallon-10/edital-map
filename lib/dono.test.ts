import { describe, expect, it } from 'vitest';
import { ehDono, segredoDoEndereco, valorCookieDono } from './dono';

const SEGREDO = 'um-segredo-longo-do-servidor';

describe('cookie do dono', () => {
  it('valor certo é dono; adulterado, vazio ou sem segredo configurado não', () => {
    const v = valorCookieDono(SEGREDO);
    expect(v).toMatch(/^[0-9a-f]{64}$/);
    expect(ehDono(v, SEGREDO)).toBe(true);
    expect(ehDono(v.replace(/^./, v[0] === 'a' ? 'b' : 'a'), SEGREDO)).toBe(false);
    expect(ehDono(undefined, SEGREDO)).toBe(false);
    expect(ehDono(v, undefined)).toBe(false);
    expect(ehDono(v, '')).toBe(false);
  });
  it('o endereço precisa trazer o próprio segredo; "1" só marca as métricas', () => {
    expect(segredoDoEndereco(SEGREDO, SEGREDO)).toBe(true);
    expect(segredoDoEndereco('1', SEGREDO)).toBe(false);
    expect(segredoDoEndereco(undefined, SEGREDO)).toBe(false);
    expect(segredoDoEndereco('1', undefined)).toBe(false);
  });
});

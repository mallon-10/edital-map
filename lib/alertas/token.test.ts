import { describe, expect, it } from 'vitest';
import { criarTokenDescadastro, lerSegredo, lerTokenDescadastro } from './token';

const SEGREDO = 'x'.repeat(40);
const ALERTA = '11111111-1111-4111-8111-111111111111';
const CONTA = '22222222-2222-4222-8222-222222222222';

describe('token de descadastro', () => {
  it('ida e volta para alerta, todos e resumo', () => {
    for (const alvo of [{ tipo: 'alerta', id: ALERTA }, { tipo: 'todos', conta: CONTA }, { tipo: 'resumo', conta: CONTA }] as const) {
      const t = criarTokenDescadastro(alvo, SEGREDO);
      expect(t).toMatch(/^[atr]\.[0-9a-f-]{36}\.[A-Za-z0-9_-]{43}$/);
      expect(lerTokenDescadastro(t, SEGREDO)).toEqual(alvo);
    }
  });
  it('adulterado, de outro segredo, de outro tipo ou malformado: null', () => {
    const t = criarTokenDescadastro({ tipo: 'alerta', id: ALERTA }, SEGREDO);
    expect(lerTokenDescadastro(t.replace(ALERTA, CONTA), SEGREDO)).toBeNull();
    expect(lerTokenDescadastro(`t${t.slice(1)}`, SEGREDO)).toBeNull();
    expect(lerTokenDescadastro(t, 'y'.repeat(40))).toBeNull();
    const ultimo = t.at(-1) === 'A' ? 'B' : 'A';
    expect(lerTokenDescadastro(`${t.slice(0, -1)}${ultimo}`, SEGREDO)).toBeNull();
    for (const v of ['', 'a.b.c', null, 5, `${t}x`, t.toUpperCase(), ` ${t}`]) expect(lerTokenDescadastro(v, SEGREDO)).toBeNull();
  });
  it('segredo com espaço ou quebra de linha nas pontas vale o mesmo (lerSegredo nas duas funções)', () => {
    const alvo = { tipo: 'alerta', id: ALERTA } as const;
    const comQuebra = SEGREDO + String.fromCharCode(10);
    expect(lerTokenDescadastro(criarTokenDescadastro(alvo, comQuebra), SEGREDO)).toEqual(alvo);
    expect(lerTokenDescadastro(criarTokenDescadastro(alvo, SEGREDO), ' ' + comQuebra)).toEqual(alvo);
    expect(criarTokenDescadastro(alvo, comQuebra)).toBe(criarTokenDescadastro(alvo, SEGREDO));
    expect(() => criarTokenDescadastro(alvo, 'curto')).toThrow();
    expect(() => criarTokenDescadastro(alvo, ' '.repeat(40))).toThrow();
  });
  it('sem segredo (ou curto) nada vale', () => {
    const t = criarTokenDescadastro({ tipo: 'todos', conta: CONTA }, SEGREDO);
    expect(lerTokenDescadastro(t, null)).toBeNull();
    expect(lerTokenDescadastro(t, '')).toBeNull();
    expect(lerSegredo(undefined)).toBeNull();
    expect(lerSegredo('curto')).toBeNull();
    expect(lerSegredo(' '.repeat(40))).toBeNull();
    expect(lerSegredo(`  ${SEGREDO}  `)).toBe(SEGREDO);
  });
});

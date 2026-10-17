import { describe, expect, it } from 'vitest';
import { mesclarUso, publicarInicial, publicarUso, usoAtual } from './uso';

describe('uso do dia no navegador (selo)', () => {
  it('uso completo substitui; parcial só vale sobre um uso já conhecido', () => {
    expect(mesclarUso(null, { buscas: 2 })).toBeNull();
    expect(mesclarUso(null, { interno: false, buscas: 1, editais: 0 })).toEqual({ interno: false, buscas: 1, editais: 0 });
    expect(mesclarUso({ interno: false, buscas: 1, editais: 0 }, { buscas: 2 })).toEqual({ interno: false, buscas: 2, editais: 0 });
    expect(mesclarUso({ interno: false, buscas: 3, editais: 2 }, { interno: true, buscas: 0, editais: 0 })).toEqual({ interno: true, buscas: 0, editais: 0 });
  });
  it('publicarUso guarda para quem lê depois', () => {
    expect(usoAtual()).toBeNull();
    publicarUso({ editais: 1 });
    expect(usoAtual()).toBeNull();
    publicarUso({ interno: false, buscas: 0, editais: 1 });
    publicarUso({ buscas: 2 });
    expect(usoAtual()).toEqual({ interno: false, buscas: 2, editais: 1 });
  });
  it('uso inicial do servidor não sobrescreve um valor mais novo da loja', () => {
    const novo = { interno: false, buscas: 2, editais: 1 };
    publicarUso(novo);
    // página restaurada do cache do roteador (Voltar) traz um uso velho: a loja vence e o selo precisa rebuscar
    expect(publicarInicial({ interno: false, buscas: 0, editais: 0 })).toBe(true);
    expect(usoAtual()).toEqual(novo);
  });
});

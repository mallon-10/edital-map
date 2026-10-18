import { describe, expect, it } from 'vitest';
import type { FiltrosTela } from './tipos';
import { chaveVazio, descreverVazio, escolherSugestoes, limitarContagens, MAX_CONTAGENS, MAX_SUGESTOES, sugestoesVazio } from './vazio';

const VAZIO: FiltrosTela = { q: '', uf: '', cidade: null, valorMin: null, modalidades: [], seteDias: false, orgao: null, raio: null };
const JOINVILLE = { ibge: '4209102', nome: 'Joinville', uf: 'SC' };
const CHEIO: FiltrosTela = {
  q: 'luva', uf: 'SC', cidade: JOINVILLE, valorMin: 50_000, modalidades: [6], seteDias: true,
  orgao: { cnpj: '83102244000102', nome: 'Município de Joinville' }, raio: null,
};

describe('sugestoesVazio (cada uma tira um filtro só)', () => {
  it('uma por filtro ligado, na ordem', () => {
    expect(sugestoesVazio(CHEIO).map((s) => s.rotulo)).toEqual([
      'Ampliar para Todo o Brasil', 'Todo o estado (SC)', 'Tirar o valor mínimo', 'Todas as modalidades', 'Todos os órgãos', 'Todos os prazos',
    ]);
  });
  it('cada sugestão muda só o seu filtro', () => {
    const [brasil, estado, valor, , , prazo] = sugestoesVazio(CHEIO);
    expect(brasil.filtros).toEqual({ ...CHEIO, uf: '', cidade: null, raio: null });
    expect(estado.filtros).toEqual({ ...CHEIO, cidade: null, raio: null });
    expect(valor.filtros).toEqual({ ...CHEIO, valorMin: null });
    expect(prazo.filtros).toEqual({ ...CHEIO, seteDias: false });
  });
  it('termos excluídos e termos parecidos do catálogo', () => {
    expect(sugestoesVazio({ ...VAZIO, q: 'luva -latex' }).map((s) => [s.rotulo, s.filtros.q])).toEqual([['Sem os termos excluídos', 'luva']]);
    expect(sugestoesVazio({ ...VAZIO, q: 'farda' }).map((s) => [s.rotulo, s.filtros.q])).toEqual([['Buscar “fardamento”', 'fardamento']]);
  });
  it('sem filtro nem termo parecido: nada', () => {
    expect(sugestoesVazio({ ...VAZIO, q: 'xyzw' })).toEqual([]);
  });
});

describe('limitarContagens (no máximo 4 chamadas a /api/contagem por busca vazia)', () => {
  it('com muitas candidatas: 4, com Todo o Brasil à frente e uma vaga para o termo', () => {
    const c = sugestoesVazio({ ...CHEIO, q: 'luva -latex' });
    expect(c.length).toBeGreaterThan(MAX_CONTAGENS);
    const l = limitarContagens(c);
    expect(MAX_CONTAGENS).toBe(4);
    expect(l).toHaveLength(4);
    expect(l.map((s) => s.rotulo)).toEqual(['Ampliar para Todo o Brasil', 'Todo o estado (SC)', 'Tirar o valor mínimo', 'Sem os termos excluídos']);
  });
  it('só filtros: os 4 primeiros', () => {
    expect(limitarContagens(sugestoesVazio(CHEIO)).map((s) => s.rotulo)).toEqual([
      'Ampliar para Todo o Brasil', 'Todo o estado (SC)', 'Tirar o valor mínimo', 'Todas as modalidades',
    ]);
  });
  it('com poucas, deixa como estão', () => {
    const c = sugestoesVazio({ ...VAZIO, q: 'farda', uf: 'SC' });
    expect(limitarContagens(c)).toEqual(c);
  });
});

describe('escolherSugestoes (só as que trazem editais, as que mais trazem primeiro)', () => {
  it('ordena pelo total, tira zero e sem resposta, até MAX_SUGESTOES', () => {
    const c = sugestoesVazio(CHEIO);
    const escolhidas = escolherSugestoes(c, [0, 12, null, 40, 3, 7]);
    expect(escolhidas.map((s) => [s.rotulo, s.total])).toEqual([
      ['Todas as modalidades', 40], ['Todo o estado (SC)', 12], ['Todos os prazos', 7],
    ]);
    expect(escolhidas).toHaveLength(MAX_SUGESTOES);
  });
});

describe('chaveVazio', () => {
  it('mesmo conteúdo, mesma chave; outro filtro, outra chave', () => {
    expect(chaveVazio({ ...CHEIO })).toBe(chaveVazio(structuredClone(CHEIO)));
    expect(chaveVazio(CHEIO)).not.toBe(chaveVazio({ ...CHEIO, valorMin: null }));
  });
});

describe('descreverVazio', () => {
  it('com termo e lugar', () => {
    expect(descreverVazio(CHEIO)).toBe('Nenhum edital aberto para “luva” em Joinville/SC.');
    expect(descreverVazio({ ...VAZIO, q: 'luva', uf: 'SC' })).toBe('Nenhum edital aberto para “luva” em SC.');
    expect(descreverVazio({ ...CHEIO, raio: 100 })).toBe('Nenhum edital aberto para “luva” em Joinville/SC e até 100 km.');
  });
  it('sem termo', () => {
    expect(descreverVazio({ ...VAZIO, valorMin: 50_000 })).toBe('Nenhum edital aberto com esses filtros.');
  });
});

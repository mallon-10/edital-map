import { describe, expect, it } from 'vitest';
import { moedaCurta } from './formato';
import { montarPanorama, respostaDoPanorama, TOPO_ASSUNTOS } from './panorama';

const BRUTO = {
  total: 1000,
  com_valor: 800,
  mediana_valor: 290000,
  encerram_7_dias: 300,
  publicados_7_dias: 250,
  por_modalidade: [
    { modalidade_id: 8, total: 100, mediana_valor: 11599.5 },
    { modalidade_id: 6, total: 600, mediana_valor: 309933 },
    { modalidade_id: 99, total: 5, mediana_valor: null },
  ],
  por_uf: [
    { uf: 'BA', total: 100 },
    { uf: 'SP', total: 400 },
  ],
};

describe('montarPanorama', () => {
  it('ordena do maior para o menor e calcula as porcentagens', () => {
    const p = montarPanorama(BRUTO, []);
    expect(p.ufs.map((u) => u.uf)).toEqual(['SP', 'BA']);
    expect(p.ufs[0]).toMatchObject({ nome: 'São Paulo', total: 400, porcentagem: 40, caminho: '/licitacoes/sp' });
    expect(p.comValorPorcentagem).toBe(80);
    expect(p.encerramSetePorcentagem).toBe(30);
  });

  it('modalidades pelo nome da página; a desconhecida sai', () => {
    const p = montarPanorama(BRUTO, []);
    expect(p.modalidades.map((m) => m.id)).toEqual([6, 8]);
    expect(p.modalidades[0]).toMatchObject({ nome: 'pregão eletrônico', caminho: '/licitacoes/pregao-eletronico', porcentagem: 60 });
  });

  it('assuntos: só os maiores, sem os que têm zero', () => {
    const muitos = Array.from({ length: 30 }, (_, i) => ({ slug: `a${i}`, nome: `A${i}`, total: i }));
    const p = montarPanorama(BRUTO, muitos);
    expect(p.assuntos).toHaveLength(TOPO_ASSUNTOS);
    expect(p.assuntos[0]).toEqual({ slug: 'a29', nome: 'A29', total: 29, caminho: '/licitacoes/a29' });
    expect(montarPanorama(BRUTO, [{ slug: 'x', nome: 'X', total: 0 }]).assuntos).toEqual([]);
  });

  it('banco vazio não divide por zero', () => {
    const p = montarPanorama({ ...BRUTO, total: 0, com_valor: 0, encerram_7_dias: 0, por_uf: [], por_modalidade: [] }, []);
    expect(p.comValorPorcentagem).toBe(0);
    expect(p.encerramSetePorcentagem).toBe(0);
  });
});

describe('respostaDoPanorama', () => {
  it('abre com o total, a data e o estado com mais editais', () => {
    const t = respostaDoPanorama(montarPanorama(BRUTO, []), '2026-10-31T15:00:00Z');
    expect(t).toContain('31 de outubro de 2026');
    expect(t).toContain('1.000 editais abertos');
    expect(t).toContain('São Paulo');
    expect(t).toContain(moedaCurta(290000));
  });
});

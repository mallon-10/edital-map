import { describe, expect, it } from 'vitest';
import { lerFiltros } from './filtros';
import {
  combinacaoBusca, CONVITE_PLANOS, corpoLimite, LIMITE_GRATIS, LimiteAtingido, lerLimite, mensagemLimite, STATUS_LIMITE,
  textoSelo, textoSeloCompacto, tomSelo,
} from './limites';

const busca = (qs: string) => lerFiltros(new URLSearchParams(qs));

describe('combinacaoBusca (o que conta como uma busca no dia)', () => {
  it('página inicial sem nada preenchido não conta', () => {
    expect(combinacaoBusca(busca(''))).toBeNull();
  });
  it('prazo e "Carregar mais" não mudam a busca (e o prazo sozinho não conta)', () => {
    expect(combinacaoBusca(busca('q=luva&dias=7&deslocamento=50'))).toBe(combinacaoBusca(busca('q=luva')));
    expect(combinacaoBusca(busca('dias=7'))).toBeNull();
  });
  it('termo: maiúsculas, acentos e espaços não fazem outra busca', () => {
    expect(combinacaoBusca(busca('q=  Luva   Nitrílica '))).toBe(combinacaoBusca(busca('q=luva nitrilica')));
  });
  it('modalidades em qualquer ordem são a mesma busca', () => {
    expect(combinacaoBusca(busca('modalidades=8,6'))).toBe(combinacaoBusca(busca('modalidades=6,8')));
  });
  it('cada filtro muda a combinação', () => {
    const base = combinacaoBusca(busca('q=luva'));
    for (const extra of ['uf=SC', 'ibge=4209102', 'valor=50000', 'modalidades=6', 'orgao=83102285000107', 'ibge=4209102&raio=100']) {
      expect(combinacaoBusca(busca(`q=luva&${extra}`))).not.toBe(base);
    }
    expect(combinacaoBusca(busca('ibge=4209102&raio=100'))).not.toBe(combinacaoBusca(busca('ibge=4209102')));
  });
  it('com raio a UF não filtra, então não muda a busca', () => {
    expect(combinacaoBusca(busca('uf=SC&ibge=4209102&raio=100'))).toBe(combinacaoBusca(busca('ibge=4209102&raio=100')));
  });
  it('filtros inválidos (que a API ignora) não contam', () => {
    expect(combinacaoBusca(busca('uf=XX&valor=7&modalidades=99'))).toBeNull();
  });
});

describe('selo do plano grátis (recebe o que já foi usado hoje)', () => {
  it('sobrando: plural e singular', () => {
    expect(textoSelo({ buscas: 1, editais: 2 })).toBe('Grátis · restam 2 buscas e 1 edital hoje');
    expect(textoSeloCompacto({ buscas: 1, editais: 2 })).toBe('2 buscas · 1 edital');
    expect(textoSelo({ buscas: 0, editais: 0 })).toBe('Grátis · restam 3 buscas e 3 editais hoje');
    expect(textoSelo({ buscas: 2, editais: 3 })).toBe('Grátis · restam 1 busca e nenhum edital hoje');
  });
  it('zerado: "nenhuma busca" e "nenhum edital", sem número negativo', () => {
    expect(textoSelo({ buscas: 3, editais: 1 })).toBe('Grátis · restam nenhuma busca e 2 editais hoje');
    expect(textoSelo({ buscas: 3, editais: 3 })).toBe('Grátis · nenhuma busca e nenhum edital hoje');
    expect(textoSeloCompacto({ buscas: 3, editais: 3 })).toBe('nenhuma busca · nenhum edital');
    expect(textoSelo({ buscas: 5, editais: 0 })).toBe('Grátis · restam nenhuma busca e 3 editais hoje');
  });
  it('cor: amarelo quando falta 1 de qualquer um; laranja quando um zerou', () => {
    expect(tomSelo({ buscas: 0, editais: 1 })).toBe('normal');
    expect(tomSelo({ buscas: 2, editais: 0 })).toBe('atencao');
    expect(tomSelo({ buscas: 0, editais: 2 })).toBe('atencao');
    expect(tomSelo({ buscas: 3, editais: 2 })).toBe('esgotado');
    expect(tomSelo({ buscas: 2, editais: 3 })).toBe('esgotado');
  });
});

describe('sinal de limite (HTTP 402)', () => {
  it('textos do cartão', () => {
    expect(`${mensagemLimite('busca')} ${CONVITE_PLANOS}`).toBe('Você usou as 3 buscas grátis de hoje. Volta amanhã às 0h, ou conheça os planos.');
    expect(`${mensagemLimite('edital')} ${CONVITE_PLANOS}`).toBe('Você abriu os 3 editais grátis de hoje. Volta amanhã às 0h, ou conheça os planos.');
  });
  it('ida e volta: a rota monta, o navegador lê', () => {
    expect(STATUS_LIMITE).toBe(402);
    const corpo: unknown = JSON.parse(JSON.stringify(corpoLimite('busca', 3)));
    expect((corpo as { erro: string }).erro).toBe('Você usou as 3 buscas grátis de hoje. Volta amanhã às 0h, ou conheça os planos.');
    expect(lerLimite(402, corpo)).toEqual({ tipo: 'busca', usados: 3, maximo: LIMITE_GRATIS.busca });
  });
  it('limite por hora (429) e corpos estranhos não são o limite do dia', () => {
    expect(lerLimite(429, corpoLimite('busca', 3))).toBeNull();
    expect(lerLimite(402, { erro: 'x' })).toBeNull();
    expect(lerLimite(402, null)).toBeNull();
    expect(lerLimite(402, { codigo: 'limite_diario', limite: { tipo: 'outro', usados: 3, maximo: 3 } })).toBeNull();
  });
  it('LimiteAtingido carrega o limite e a mensagem', () => {
    const e = new LimiteAtingido({ tipo: 'edital', usados: 3, maximo: 3 });
    expect(e).toBeInstanceOf(Error);
    expect(e.limite.tipo).toBe('edital');
    expect(e.message).toBe('Você abriu os 3 editais grátis de hoje.');
  });
});

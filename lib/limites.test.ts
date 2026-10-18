import { describe, expect, it } from 'vitest';
import { lerFiltros } from './filtros';
import {
  combinacaoBusca, CONVITE_PLANOS, corpoLimite, LIMITE_GRATIS, LimiteAtingido, lerLimite, mensagemLimite, STATUS_LIMITE,
  bolinhas, cadeadoPro, corpoRecursoPro, leituraFaixa, lerRecursoPro, LIMITES_PLANO, planoDoLimite, precisaPro, textoFaixa, tomSelo,
} from './limites';

const busca = (qs: string) => lerFiltros(new URLSearchParams(qs));

describe('combinacaoBusca (o que conta como uma busca no dia)', () => {
  it('página inicial sem nada preenchido não conta', () => {
    expect(combinacaoBusca(busca(''))).toBeNull();
  });
  it('prazo, página e ordem não mudam a busca (e sozinhos não contam)', () => {
    expect(combinacaoBusca(busca('q=luva&dias=7&pagina=3&ordem=maior_valor'))).toBe(combinacaoBusca(busca('q=luva')));
    expect(combinacaoBusca(busca('dias=7'))).toBeNull();
    expect(combinacaoBusca(busca('pagina=2&ordem=recentes'))).toBeNull();
  });
  it('termos excluídos ("-palavra") fazem outra busca', () => {
    expect(combinacaoBusca(busca('q=luva -latex'))).not.toBe(combinacaoBusca(busca('q=luva')));
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

describe('faixa do plano grátis (recebe o que já foi usado hoje)', () => {
  it('bolinhas: cheias = restantes, vazias = usadas, sempre o máximo de bolinhas', () => {
    expect(bolinhas(0, 3)).toEqual([true, true, true]);
    expect(bolinhas(1, 3)).toEqual([true, true, false]);
    expect(bolinhas(2, 3)).toEqual([true, false, false]);
    expect(bolinhas(3, 3)).toEqual([false, false, false]);
    expect(bolinhas(5, 3)).toEqual([false, false, false]);
    expect(bolinhas(-1, 3)).toEqual([true, true, true]);
  });
  it('texto ao lado das bolinhas: "2 de 3"; zerado, "nenhuma busca" ou "nenhum edital"', () => {
    expect(textoFaixa('busca', 1)).toBe('2 de 3');
    expect(textoFaixa('edital', 2)).toBe('1 de 3');
    expect(textoFaixa('busca', 3)).toBe('nenhuma busca');
    expect(textoFaixa('edital', 4)).toBe('nenhum edital');
  });
  it('leitura para leitor de tela (as bolinhas ficam escondidas)', () => {
    expect(leituraFaixa('busca', 1)).toBe('restam 2 de 3 buscas grátis hoje');
    expect(leituraFaixa('edital', 2)).toBe('resta 1 de 3 editais grátis hoje');
    expect(leituraFaixa('busca', 3)).toBe('nenhuma busca grátis restante hoje');
    expect(leituraFaixa('edital', 3)).toBe('nenhum edital grátis restante hoje');
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

describe('limites por plano', () => {
  it('grátis 3/3, Basic 15/15, Pro 300/300 (uso justo)', () => {
    expect(LIMITES_PLANO.gratis).toEqual({ busca: 3, edital: 3 });
    expect(LIMITES_PLANO.basic).toEqual({ busca: 15, edital: 15 });
    expect(LIMITES_PLANO.pro).toEqual({ busca: 300, edital: 300 });
  });
  it('corpo do 402 com o máximo do plano', () => {
    expect(corpoLimite('busca', 15, 'basic').limite).toEqual({ tipo: 'busca', usados: 15, maximo: 15 });
    expect(corpoLimite('busca', 15, 'basic').erro).toContain('15 buscas do plano Basic');
    expect(corpoLimite('edital', 300, 'pro').erro).toContain('uso justo');
  });
  it('faixa do Basic conta até 15', () => {
    expect(textoFaixa('busca', 3, 15)).toBe('12 de 15');
    expect(leituraFaixa('edital', 14, 15)).toBe('resta 1 de 15 editais hoje');
    expect(tomSelo({ plano: 'basic', buscas: 3, editais: 0 })).toBe('normal');
    expect(tomSelo({ plano: 'basic', buscas: 14, editais: 0 })).toBe('atencao');
    expect(tomSelo({ plano: 'basic', buscas: 15, editais: 0 })).toBe('esgotado');
  });
  it('sem plano informado vale o grátis', () => {
    expect(tomSelo({ buscas: 3, editais: 0 })).toBe('esgotado');
  });
});

it('planoDoLimite pelo máximo do 402', () => {
  expect(planoDoLimite({ tipo: 'busca', maximo: 3 })).toBe('gratis');
  expect(planoDoLimite({ tipo: 'edital', maximo: 15 })).toBe('basic');
  expect(planoDoLimite({ tipo: 'busca', maximo: 300 })).toBe('pro');
});

describe('recursos Pro', () => {
  const f = (qs: string) => lerFiltros(new URLSearchParams(qs));
  it('raio e órgão pedem o Pro', () => {
    expect(precisaPro(f('q=luva&uf=SC'))).toBe(false);
    expect(precisaPro(f('q=luva&ibge=4209102&raio=50'))).toBe(true);
    expect(precisaPro(f('q=luva&orgao=00394452000103'))).toBe(true);
  });
  it('402 de recurso Pro: lido como tal, nunca como limite do dia', () => {
    const corpo: unknown = JSON.parse(JSON.stringify(corpoRecursoPro()));
    expect(lerRecursoPro(402, corpo)).toBe(true);
    expect(lerLimite(402, corpo)).toBeNull();
    expect(lerRecursoPro(402, corpoLimite('busca', 3))).toBe(false);
    expect(lerRecursoPro(429, corpo)).toBe(false);
  });
  it('cadeado na tela: só com o pagamento ligado, fora do Pro e fora do dono', () => {
    expect(cadeadoPro(null)).toBe(false);
    expect(cadeadoPro({ interno: false, plano: 'gratis', pagamento: false, buscas: 0, editais: 0 })).toBe(false);
    expect(cadeadoPro({ interno: false, plano: 'gratis', pagamento: true, buscas: 0, editais: 0 })).toBe(true);
    expect(cadeadoPro({ interno: false, plano: 'basic', pagamento: true, buscas: 0, editais: 0 })).toBe(true);
    expect(cadeadoPro({ interno: false, plano: 'pro', pagamento: true, buscas: 0, editais: 0 })).toBe(false);
    expect(cadeadoPro({ interno: true, plano: 'pro', pagamento: true, buscas: 0, editais: 0 })).toBe(false);
  });
});

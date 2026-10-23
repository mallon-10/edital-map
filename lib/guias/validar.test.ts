import { describe, expect, it } from 'vitest';
import type { Guia, Termo } from '../../conteudo/tipos';
import { caminhoFixoExiste, problemasDoGuia, problemasDoTermo } from './validar';

const RESPOSTA = Array.from({ length: 45 }, (_, i) => `palavra${i}`).join(' ');
const ctx = { guias: new Set(['sicaf', 'pregao-eletronico']), termos: new Set(['edital', 'pregao']), hoje: '2026-10-23' };

const bom: Guia = {
  slug: 'sicaf',
  titulo: 'SICAF: o que é e como cadastrar a empresa',
  descricao: 'O que é o SICAF, quem precisa e como cadastrar a empresa no cadastro de fornecedores do governo federal.',
  resposta: RESPOSTA,
  revisadoEm: '2026-10-23',
  secoes: [{ titulo: 'Passo a passo', blocos: [{ tipo: 'passos', itens: ['Leia o [edital](/glossario/edital).', 'Veja o [pregão](/guias/pregao-eletronico).'] }] }],
  editais: ['/licitacoes/pregao-eletronico', '/licitacoes/epi/sp'],
  perguntas: [1, 2, 3].map((n) => ({ pergunta: `Pergunta ${n}?`, resposta: 'Resposta.' })),
  fontes: [
    { nome: 'Lei 14.133', url: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm' },
    { nome: 'SICAF', url: 'https://www.gov.br/compras/pt-br/sistemas/conheca-o-compras/sicaf' },
  ],
  relacionados: ['pregao-eletronico'],
};

describe('caminhoFixoExiste', () => {
  it('páginas fixas, assunto, modalidade e UF', () => {
    for (const c of ['/', '/licitacoes', '/planos', '/cnpj', '/alertas', '/guias', '/glossario', '/licitacoes/epi', '/licitacoes/sp', '/licitacoes/dispensa/ba', '/licitacoes/epi/sp']) {
      expect(caminhoFixoExiste(c), c).toBe(true);
    }
    for (const c of ['/licitacoes/xx', '/licitacoes/epi/zz', '/qualquer', '/licitacoes/sp/campinas']) expect(caminhoFixoExiste(c), c).toBe(false);
  });
});

describe('problemasDoGuia', () => {
  it('guia bom não tem problema', () => {
    expect(problemasDoGuia(bom, ctx)).toEqual([]);
  });
  it('acusa cada regra', () => {
    const ruim: Guia = {
      ...bom,
      descricao: 'x'.repeat(161),
      resposta: 'curta demais',
      revisadoEm: '2027-01-01',
      editais: ['/licitacoes/nao-existe'],
      perguntas: [],
      fontes: [{ nome: 'Blog', url: 'https://exemplo.com.br' }],
      relacionados: ['nao-existe'],
      secoes: [{ titulo: 'S', blocos: [{ tipo: 'paragrafo', texto: 'Ver [x](/guias/nao-existe) e [y](/glossario/nada).' }] }],
    };
    const p = problemasDoGuia(ruim, ctx).join('\n');
    for (const trecho of ['descrição', 'resposta', 'revisadoEm', '/licitacoes/nao-existe', 'perguntas', 'fontes', 'exemplo.com.br', 'nao-existe', '/glossario/nada']) {
      expect(p).toContain(trecho);
    }
  });
  it('slug fora do padrão e promessa no texto', () => {
    const p = problemasDoGuia({ ...bom, slug: 'Com Espaço', resposta: `${RESPOSTA} garanta` }, ctx).join('\n');
    expect(p).toContain('slug');
    expect(p).toContain('promessa');
  });
});

describe('problemasDoTermo', () => {
  const termo: Termo = { slug: 'edital', nome: 'Edital', definicao: RESPOSTA, relacionados: ['pregao'], guia: 'sicaf' };
  it('termo bom', () => {
    expect(problemasDoTermo(termo, ctx)).toEqual([]);
  });
  it('definição curta, relacionado e guia inexistentes', () => {
    const p = problemasDoTermo({ ...termo, definicao: 'curta', relacionados: ['xx'], guia: 'yy' }, ctx).join('\n');
    expect(p).toContain('definição');
    expect(p).toContain('xx');
    expect(p).toContain('yy');
  });
});

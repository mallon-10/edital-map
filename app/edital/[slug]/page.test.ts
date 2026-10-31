import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { Edital, EditalRelacionado } from '@/lib/tipos';

vi.mock('server-only', () => ({}));
vi.mock('next/server', async (orig) => ({ ...(await orig<object>()), connection: async () => undefined }));

const SLUG = '00394452000103-2026-12';
const EDITAL: Edital = {
  id: 'e1', slug: SLUG, cnpj: '00394452000103', ano: 2026, sequencial: 12, objeto: 'Aquisição de luvas de procedimento',
  info_complementar: null, orgao_nome: 'PREFEITURA DE TESTE', unidade_nome: null, municipio_nome: 'Joinville', uf: 'SC',
  codigo_ibge: '4209102', modalidade_nome: 'Pregão - Eletrônico', situacao_nome: 'Divulgada no PNCP', situacao_id: 1,
  esfera: 'M', srp: false, valor_estimado: 1000, publicada_em: '2026-10-10T12:00:00Z', abertura_em: null,
  encerramento_em: '2099-01-01T12:00:00Z', link_origem: 'https://compras.exemplo.gov.br/edital/12', atualizada_pncp_em: null,
};
const parecido = (i: number): EditalRelacionado => ({
  id: `p${i}`, slug: `00394452000103-2026-${100 + i}`, objeto: `Luvas lote ${i}`, orgao_nome: 'PREFEITURA', municipio_nome: 'Joinville',
  uf: 'SC', valor_estimado: 10, encerramento_em: '2099-01-01T12:00:00Z', publicada_em: null, modalidade_nome: null, srp: false,
});

vi.mock('@/lib/servidor/consultas', () => ({
  edital: async () => EDITAL,
  atualizadoEm: async () => null,
  resumoItens: async () => ({ total: 0, materiais: 0, servicos: 0, comBeneficio: 0, exclusivos: 0, cota: 0, criterios: [] }),
  relacionados: async () => [1, 2, 3, 4, 5, 6].map(parecido),
}));
vi.mock('@/lib/servidor/licitacoes', () => ({
  orgaosComPagina: async () => [],
  cidadesComPagina: async () => [],
}));
vi.mock('@/lib/servidor/registro', () => ({
  contextoDaPagina: async () => ({ visitante: '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b', interno: false, dono: false, ipHash: null }),
}));
// Grátis com o pagamento ligado: o pior caso dos cadeados antigos.
vi.mock('@/lib/servidor/plano', () => ({
  pagamentoLigado: () => true,
  planoAtual: async () => 'gratis',
  planoDaPagina: async () => ({ plano: 'gratis', dono: false }),
}));

process.env.WHATSAPP_ASSESSORIA = '(11) 98765-4321';
const { default: PaginaEdital } = await import('./page');

describe('página do edital no grátis (sem limite e sem cadeado)', async () => {
  const html = renderToStaticMarkup(await PaginaEdital({ params: Promise.resolve({ slug: SLUG }), searchParams: Promise.resolve({}) }));
  it('documentos e itens ficam para o navegador: o servidor não espera o PNCP', () => {
    expect(html).toContain('Carregando os documentos do PNCP…');
    expect(html).toContain('Carregando os itens do PNCP…');
  });
  it('mostra o detalhe, nunca o cartão dos planos', () => {
    expect(html).toContain('Itens da licitação');
    expect(html).toContain('Documentos do edital');
    expect(html).not.toMatch(/editais grátis de hoje|Volta amanhã|Assinar o Pro/);
  });
  it('link oficial de verdade (não o cadeado do Pro)', () => {
    expect(html).toContain('href="https://compras.exemplo.gov.br/edital/12"');
    expect(html).not.toContain('Abrir edital oficial · Pro');
  });
  it('todos os parecidos, sem "Veja todos no Pro"', () => {
    for (let i = 1; i <= 6; i++) expect(html).toContain(`Luvas lote ${i}`);
    expect(html).not.toContain('Veja todos os parecidos');
  });
  it('sem faixa genérica: a oferta do Pro é o cartão de monitorar parecidos, com o contexto do edital', () => {
    expect(html).not.toContain('Conhecer o Pro');
    expect(html).not.toMatch(/Plano grátis|Renova à 0h/);
    expect(html).toContain('Quer encontrar outras licitações como esta?');
    expect(html).toContain('Monitorar oportunidades semelhantes');
    expect(html).toMatch(/href="\/alertas\/novo\?q=luva[^"]*uf=SC"/i);
  });
  it('assessoria com preço inicial, levando à triagem com o edital ligado (nunca direto ao WhatsApp)', () => {
    expect(html).toContain('Quer participar desta licitação?');
    expect(html).toContain('Assessoria a partir de R$ 197.');
    expect(html).toContain('Quero orientação para este edital');
    expect(html).toContain(`href="/assessoria?edital=${SLUG}"`);
    expect(html).not.toContain('wa.me');
  });
});

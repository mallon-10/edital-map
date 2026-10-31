import { describe, expect, it } from 'vitest';
import { LIMITES_CONTA } from './limitesConta';
import {
  BENEFICIOS_PRO,
  CHAMADA_FINAL,
  CONFIANCA,
  DIFERENCAS,
  EM_PREPARACAO,
  INCLUIDO_NOS_DOIS,
  ITENS_GRATIS,
  ITENS_PRO,
  PASSOS,
  PERGUNTAS,
  PUBLICO_PLANOS,
  TOPO,
  economiaAnual,
  hrefAssinar,
  precoNaPagina,
} from './paginaPlanos';
import { PLANOS } from './planos';

const [gratis, pro] = PLANOS;
const todosOsTextos = () =>
  JSON.stringify({ BENEFICIOS_PRO, CHAMADA_FINAL, DIFERENCAS, INCLUIDO_NOS_DOIS, ITENS_GRATIS, ITENS_PRO, PASSOS, PERGUNTAS, TOPO });

describe('preço na página de planos', () => {
  it('mensal: R$ 37,90/mês, cobrado todo mês', () => {
    expect(precoNaPagina(pro, 'mensal')).toEqual({
      valor: 'R$ 37,90', sufixo: '/mês', equivale: null, nota: 'Cobrado todo mês. Cancele quando quiser.',
    });
  });
  it('anual: R$ 349,90/ano, o equivalente por mês e a economia contra 12 mensalidades', () => {
    expect(precoNaPagina(pro, 'anual')).toEqual({
      valor: 'R$ 349,90',
      sufixo: '/ano',
      equivale: 'Equivale a R$ 29,16/mês',
      nota: 'Cobrado uma vez por ano: cerca de 23% a menos que 12 mensalidades (R$ 454,80).',
    });
    expect(economiaAnual(pro)).toBe(23);
  });
  it('grátis: R$ 0 nos dois períodos', () => {
    for (const p of ['mensal', 'anual'] as const) {
      expect(precoNaPagina(gratis, p)).toEqual({ valor: 'R$ 0', sufixo: 'para sempre', equivale: null, nota: 'Sem cartão e sem conta.' });
    }
  });
  it('o checkout de sempre, com o período', () => {
    expect(hrefAssinar('mensal')).toBe('/assinar?periodo=mensal');
    expect(hrefAssinar('anual')).toBe('/assinar?periodo=anual');
  });
});

describe('textos da página de planos', () => {
  it('topo e chamada final com os textos aprovados', () => {
    expect(TOPO.sobretitulo).toBe('Monitoramento automático de licitações');
    expect(`${TOPO.titulo} ${TOPO.destaque}`).toBe('Sua próxima oportunidade pode aparecer amanhã.');
    expect(TOPO.subtitulo).toBe(
      'O Edital Map encontra as licitações do seu segmento. Com o Pro, você recebe automaticamente as novas oportunidades e acompanha tudo em um só lugar.',
    );
    expect(TOPO.cta).toBe('Começar a receber oportunidades');
    expect(TOPO.beneficios).toEqual(['Alertas diários às 7h', 'Meu Radar', 'Resumo semanal às segundas']);
    expect(`${CHAMADA_FINAL.titulo} ${CHAMADA_FINAL.destaque}`).toBe('Pare de perder oportunidades de vender para o governo.');
  });
  it('para quem é cada plano', () => {
    expect(PUBLICO_PLANOS.gratis).toBe('Para quem deseja pesquisar oportunidades quando precisar.');
    expect(PUBLICO_PLANOS.pro).toBe('Para quem deseja acompanhar oportunidades continuamente e economizar tempo.');
  });
  it('confiança: fonte, atualização, alertas, pagamento e cancelamento, com o que é real', () => {
    const t = JSON.stringify(CONFIANCA);
    for (const f of ['PNCP', 'a cada 3 horas', 'todos os dias às 7h', 'Pix Automático', 'Cakto', 'Cancele quando quiser', 'até o fim do período']) expect(t, f).toContain(f);
  });
  it('benefícios pelo que muda na prática', () => {
    expect(BENEFICIOS_PRO.map((b) => b.titulo)).toEqual(['Monitoramento automático', 'Economia de tempo', 'Organização', 'Personalização por segmento e região']);
  });
  it('o número de alertas vem do limite da conta', () => {
    const n = LIMITES_CONTA.pro.alertas;
    expect(DIFERENCAS[1]).toEqual({ recurso: 'Segmentos e regiões acompanhados', gratis: false, pro: `Até ${n}` });
    expect(ITENS_PRO[0]).toBe(`Até ${n} alertas por e-mail às 7h`);
    expect(BENEFICIOS_PRO[3].texto).toContain(`até ${n} segmentos ou regiões`);
    expect(PASSOS[1].texto).toContain(`Até ${n} alertas`);
  });
  it('comparação: o que muda na rotina, mais buscas ilimitadas nos dois', () => {
    expect(DIFERENCAS.map((d) => d.recurso)).toEqual([
      'Descobrir editais novos', 'Segmentos e regiões acompanhados', 'Resumo semanal às segundas', 'Meu Radar', 'Organizar editais', 'Buscas e editais',
    ]);
    expect(DIFERENCAS[0]).toEqual({ recurso: 'Descobrir editais novos', gratis: 'Você pesquisa', pro: 'Chegam por e-mail às 7h' });
    expect(DIFERENCAS.at(-1)).toEqual({ recurso: 'Buscas e editais', gratis: 'Ilimitados', pro: 'Ilimitados' });
    expect(INCLUIDO_NOS_DOIS).toContain('Exportar a lista para planilha (CSV)');
    expect(INCLUIDO_NOS_DOIS).toContain('Botão "Abrir edital oficial"');
  });
  it('o que ainda não existe fica só em "Em preparação", nunca na lista do Pro', () => {
    expect(EM_PREPARACAO.itens).toEqual(['Preço de referência', 'quem venceu', 'resumo com IA']);
    expect(EM_PREPARACAO.texto).toContain('ainda não fazem parte do Pro');
    const vendido = JSON.stringify({ ITENS_PRO, BENEFICIOS_PRO, DIFERENCAS });
    expect(vendido).not.toMatch(/IA|referência|venceu/);
  });
  it('perguntas: dados, horário, filtros, mudar, cobrança, cancelamento, aparelhos e grátis', () => {
    const p = PERGUNTAS.map((x) => x.pergunta);
    expect(p).toEqual([
      'De onde vêm os dados?',
      'A que horas chegam os alertas?',
      'Posso escolher o que recebo?',
      'Dá para mudar ou pausar um alerta?',
      'Como funciona a cobrança?',
      'Como eu cancelo?',
      'Funciona no celular e no computador?',
      'Preciso pagar para pesquisar?',
    ]);
    const r = (i: number) => PERGUNTAS[i].resposta;
    expect(r(0)).toContain('PNCP');
    expect(r(1)).toContain('7h');
    expect(r(4)).toContain('R$ 37,90');
    expect(r(4)).toContain('R$ 349,90');
    expect(r(5)).toContain('até o fim do período que você já pagou');
  });
  it('nada de "2 meses grátis", garantia, reembolso ou números de clientes', () => {
    const t = todosOsTextos();
    expect(t).not.toMatch(/2 meses|meses grátis|garantia|reembols|clientes|empresas usam|avalia/i);
  });
});

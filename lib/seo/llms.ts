import { GUIAS } from '../../conteudo';
import { url } from './site';

const PAGINAS = [
  ['Buscar editais no mapa', '/', 'Busca por produto ou serviço, com mapa e filtros de estado, cidade, raio em km, órgão, valor e modalidade.'],
  ['Licitações abertas no Brasil', '/licitacoes', 'Editais abertos por assunto, modalidade, estado, cidade e órgão.'],
  ['Panorama das licitações', '/panorama', 'Números atualizados dos editais abertos: total, por estado, por modalidade, por assunto e valor mediano, com a metodologia.'],
  ['Guias de licitação', '/guias', 'Como vender ao governo, com a Lei 14.133/2021 e fontes oficiais.'],
  ['Glossário de licitações', '/glossario', 'Termos das licitações em linguagem simples.'],
  ['Licitações pelo CNPJ', '/cnpj', 'Assuntos da empresa pelo CNAE, com os editais abertos do ramo.'],
  ['Planos', '/planos', 'O que é grátis e o que o plano Pro inclui.'],
  ['Assessoria', '/assessoria', 'Serviço à parte para quem já escolheu um edital.'],
  ['Sobre', '/sobre', 'Quem somos, de onde vêm os dados e política de privacidade.'],
] as const;

/** Conteúdo de /llms.txt: guia curto do site para assistentes de IA. Sem números, para não envelhecer. */
export function textoLlms(): string {
  const item = (nome: string, caminho: string, nota: string) => `- [${nome}](${url(caminho)}): ${nota}`;
  return [
    '# Edital Map',
    '',
    '> Mapa das licitações públicas abertas no Brasil para empresas que vendem ao governo. Os dados vêm do Portal Nacional de Contratações Públicas (PNCP), são atualizados a cada 3 horas e cobrem as 27 unidades da federação.',
    '',
    'Pesquisar e abrir editais é grátis, sem conta, e cada pesquisa por palavra mostra cinco editais. O plano Pro libera todos e inclui Alertas diários por e-mail, Meu Radar, Minhas Oportunidades e resumo semanal; veja a página Planos.',
    '',
    'Cobertura: pregão eletrônico, pregão presencial, concorrência, dispensa e credenciamento publicados no PNCP. O Edital Map não é plataforma de disputa: a proposta é enviada na plataforma indicada no edital. Edital aberto significa prazo de proposta em curso, sem revogação nem anulação. A fonte oficial de cada edital é o próprio PNCP ou o sistema do órgão.',
    '',
    '## Páginas principais',
    '',
    ...PAGINAS.map(([nome, caminho, nota]) => item(nome, caminho, nota)),
    '',
    '## Guias',
    '',
    ...GUIAS.map((g) => item(g.titulo, `/guias/${g.slug}`, g.descricao)),
    '',
  ].join('\n');
}

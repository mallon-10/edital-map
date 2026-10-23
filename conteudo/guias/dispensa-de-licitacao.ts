import type { Guia } from '../tipos';
import { DECRETO_VALORES, VALORES } from '../valores';

export const guia: Guia = {
  slug: 'dispensa-de-licitacao',
  titulo: 'Dispensa de licitação: quando cabe, valores de 2026 e dispensa eletrônica',
  descricao: 'Quando o governo pode comprar sem licitação (art. 75 da Lei 14.133), os limites de valor de 2026 e como funciona a dispensa eletrônica para o fornecedor.',
  resposta: `Dispensa de licitação é quando a lei permite ao órgão contratar sem fazer licitação, nos casos listados no art. 75 da Lei 14.133/2021. O caso mais comum é o pequeno valor: em 2026, abaixo de ${VALORES.dispensaCompras} para compras e serviços e de ${VALORES.dispensaObras} para obras e serviços de engenharia. Muitas têm disputa de lances na dispensa eletrônica.`,
  revisadoEm: '2026-10-23',
  secoes: [
    {
      titulo: 'O que é dispensa de licitação',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'A regra é licitar. A [dispensa de licitação](/glossario/dispensa-de-licitacao) é uma exceção: a disputa seria possível, mas a lei autoriza o órgão a contratar diretamente em casos específicos, listados no art. 75 da Lei 14.133/2021. Por isso ela também é chamada de contratação direta.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Ela é diferente da [inexigibilidade](/glossario/inexigibilidade), que acontece quando a competição é inviável, como quando só um fornecedor exclusivo pode atender (art. 74). Na dispensa, há vários fornecedores possíveis; a lei só permite pular a licitação formal. Veja o guia de [inexigibilidade de licitação](/guias/inexigibilidade-de-licitacao).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Dispensa não quer dizer compra sem regras. O processo precisa ter, entre outros, a estimativa de despesa, a justificativa de preço, a razão da escolha do fornecedor e a prova de que ele cumpre os requisitos de [habilitação](/glossario/habilitacao) (art. 72). O ato que autoriza a contratação, ou o extrato do contrato, deve ser divulgado em sítio eletrônico oficial (art. 72, parágrafo único).',
        },
      ],
    },
    {
      titulo: 'Quando cabe a dispensa: os casos mais comuns',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'O art. 75 tem muitos incisos. Para uma pequena ou média empresa, os que mais aparecem no dia a dia são estes:',
        },
        {
          tipo: 'lista',
          itens: [
            'Pequeno valor em obras, serviços de engenharia e manutenção de veículos (art. 75, I).',
            'Pequeno valor em outros serviços e compras (art. 75, II). É o caso de uma prefeitura que compra camisetas para um evento ou um lote pequeno de luvas e botas.',
            'Licitação feita há menos de um ano que ficou sem interessados ou sem propostas válidas, ou em que os preços vieram muito acima do mercado, desde que mantidas as condições do edital (art. 75, III). Veja [licitação deserta](/glossario/licitacao-deserta) e [licitação fracassada](/glossario/licitacao-fracassada).',
            'Hortifrutigranjeiros, pães e outros perecíveis, no período necessário para fazer a licitação, pelo preço do dia (art. 75, IV, e).',
            'Peças compradas do fornecedor original de um equipamento durante a garantia técnica, quando a exclusividade for indispensável para manter a garantia (art. 75, IV, a).',
            'Emergência ou calamidade pública, só para o necessário à situação e para parcelas que possam ser concluídas em até um ano, sem prorrogação do contrato (art. 75, VIII).',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'Os demais incisos tratam de casos específicos, como defesa nacional, pesquisa, saúde e entidades sem fins lucrativos. Se o aviso citar um deles, leia o inciso na lei.',
        },
      ],
    },
    {
      titulo: 'Valores de 2026',
      blocos: [
        {
          tipo: 'paragrafo',
          texto: `Os valores da lei são atualizados todo 1º de janeiro pelo IPCA-E (art. 182). Para 2026, valem os do ${DECRETO_VALORES.nome}:`,
        },
        {
          tipo: 'lista',
          itens: [
            `Obras, serviços de engenharia e serviços de manutenção de veículos: contratações abaixo de ${VALORES.dispensaObras} (art. 75, I).`,
            `Outros serviços e compras: contratações abaixo de ${VALORES.dispensaCompras} (art. 75, II).`,
            `Manutenção de veículos do próprio órgão, com fornecimento de peças, até ${VALORES.dispensaPecasVeiculos}: essas contratações não entram na soma anual descrita na próxima seção (art. 75, § 7º).`,
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'Esses limites são dobrados para consórcios públicos e para autarquias ou fundações qualificadas como agências executivas (art. 75, § 2º). Os valores mudam a cada ano: confira sempre o decreto vigente e o aviso da compra.',
        },
      ],
    },
    {
      titulo: 'A soma do ano: por que o limite não é por compra',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'O limite não vale para cada compra isolada. Para saber se cabe a dispensa por valor, o órgão deve somar o que a unidade gestora gastou no exercício financeiro (o ano do orçamento) com objetos de mesma natureza, isto é, do mesmo ramo de atividade (art. 75, § 1º).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Exemplo: uma prefeitura compra uniformes para a escola em março, para a saúde em junho e para a guarda municipal em setembro. Se a mesma unidade gestora fizer as três compras, elas se somam. Se o total do ano passar do limite, o caminho é a licitação, normalmente um [pregão](/guias/pregao-eletronico). A regra existe para impedir que uma compra grande seja dividida em pedaços pequenos.',
        },
      ],
    },
    {
      titulo: 'O aviso de 3 dias úteis',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Nas dispensas por valor (incisos I e II), a lei pede que a contratação seja preferencialmente precedida de um aviso em sítio eletrônico oficial, por no mínimo 3 dias úteis. O aviso descreve o que o órgão quer comprar e convida outras empresas a mandar propostas adicionais. Depois, o órgão escolhe a proposta mais vantajosa (art. 75, § 3º).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Note o "preferencialmente": a lei não torna o aviso obrigatório em todos os casos, mas ele é o caminho indicado. Para o fornecedor, isso quer dizer que muitas dispensas ficam abertas por poucos dias. Quem só olha os editais uma vez por semana perde boa parte delas.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'A lei também prevê que essas contratações sejam preferencialmente pagas com cartão de pagamento, com o extrato divulgado no [PNCP](/glossario/pncp) (art. 75, § 4º).',
        },
      ],
    },
    {
      titulo: 'Como funciona a dispensa eletrônica',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'No governo federal, a [dispensa eletrônica](/glossario/dispensa-eletronica) é regulada pela Instrução Normativa SEGES/ME nº 67/2021 e acontece no Compras.gov.br. Estados e municípios que usam recursos da União vindos de transferências voluntárias também devem seguir essa norma (art. 2º da IN). Outros órgãos usam plataformas próprias, com regras parecidas ou não: o aviso de cada compra diz como participar.',
        },
        {
          tipo: 'passos',
          itens: [
            'O órgão publica o aviso de contratação direta no Compras.gov.br e no PNCP. O sistema avisa os fornecedores cadastrados no [SICAF](/guias/sicaf) na linha de fornecimento correspondente (IN 67, art. 7º).',
            'A disputa abre, no mínimo, 3 dias úteis depois da divulgação do aviso (IN 67, art. 6º).',
            'A empresa envia a proposta pelo sistema. Ela pode registrar um valor final mínimo, que fica em sigilo (IN 67, arts. 8º e 9º).',
            'Os [lances](/glossario/lance) são públicos e sucessivos, por um período de 6 a 10 horas. Cada empresa só pode baixar em relação ao próprio último lance, respeitando o intervalo mínimo, e todos veem o menor lance sem saber quem o deu (IN 67, arts. 11 a 13).',
            'Encerrados os lances, o órgão analisa a primeira colocada e pode negociar se o preço estiver acima do máximo (IN 67, arts. 15 a 17).',
            'A habilitação é conferida pelo SICAF ou sistema parecido (IN 67, art. 19). Em entregas imediatas ou compras abaixo de um quarto do limite de compras, pode ser exigida só a regularidade fiscal, social e trabalhista (IN 67, art. 20, e Lei 14.133, art. 70, III).',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'Para uma empresa de uniformes ou EPI, a dispensa eletrônica costuma ser a porta de entrada: valores menores, menos documentos e disputa rápida. A contrapartida é o prazo curto. Ter o cadastro em dia e o preço calculado antes do aviso faz diferença.',
        },
      ],
    },
    {
      titulo: 'Encontrar dispensas abertas',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'As dispensas com aviso aparecem no PNCP, e o Edital Map mostra as abertas em [/licitacoes/dispensa](/licitacoes/dispensa). Na [página inicial](/) você busca pelo que vende e vê no mapa onde estão as compras. Cada aviso tem regras próprias, então leia o aviso e o [termo de referência](/glossario/termo-de-referencia) antes de enviar a proposta.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Como o prazo costuma ser de poucos dias, os Alertas do plano Pro ajudam: eles mandam por e-mail os editais novos que combinam com a sua busca. Veja em [/planos](/planos).',
        },
      ],
    },
  ],
  editais: ['/licitacoes/dispensa', '/licitacoes/uniformes', '/licitacoes/epi', '/licitacoes'],
  perguntas: [
    {
      pergunta: 'Qual o valor da dispensa de licitação em 2026?',
      resposta: `Abaixo de ${VALORES.dispensaCompras} para compras e serviços em geral e abaixo de ${VALORES.dispensaObras} para obras, serviços de engenharia e manutenção de veículos (art. 75, I e II). Os valores são do ${DECRETO_VALORES.nome} e mudam todo ano.`,
    },
    {
      pergunta: 'Qual a diferença entre dispensa e inexigibilidade?',
      resposta:
        'Na dispensa, a competição é possível, mas a lei autoriza contratar sem licitar (art. 75). Na inexigibilidade, a competição é inviável, como no caso de fornecedor exclusivo (art. 74).',
    },
    {
      pergunta: 'Empresa pequena pode participar de dispensa eletrônica?',
      resposta:
        'Pode. Qualquer empresa que atenda às exigências do aviso pode enviar proposta. Nas dispensas federais, o cadastro no SICAF é usado para avisar os fornecedores e para conferir a habilitação.',
    },
    {
      pergunta: 'O órgão pode dividir uma compra para caber na dispensa?',
      resposta:
        'O limite considera a soma do ano, por unidade gestora, de objetos do mesmo ramo (art. 75, § 1º). Essa regra existe justamente para que uma compra grande não seja dividida em compras pequenas.',
    },
    {
      pergunta: 'Quanto tempo uma dispensa fica aberta?',
      resposta:
        'A lei pede, preferencialmente, aviso de no mínimo 3 dias úteis nas dispensas por valor (art. 75, § 3º). Na dispensa eletrônica federal, a disputa abre pelo menos 3 dias úteis depois do aviso e os lances duram de 6 a 10 horas.',
    },
  ],
  fontes: [
    { nome: 'Lei nº 14.133/2021 (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm' },
    DECRETO_VALORES.fonte,
    {
      nome: 'Instrução Normativa SEGES/ME nº 67/2021 (Portal de Compras do Governo Federal)',
      url: 'https://www.gov.br/compras/pt-br/acesso-a-informacao/legislacao/instrucoes-normativas/instrucao-normativa-seges-me-no-67-de-8-de-julho-de-2021',
    },
    {
      nome: 'Dispensa eletrônica (Portal de Compras do Governo Federal)',
      url: 'https://www.gov.br/compras/pt-br/nllc/legislacao-14-133-por-tema/outros/dispensa-eletronica',
    },
  ],
  relacionados: ['inexigibilidade-de-licitacao', 'pregao-eletronico', 'sicaf', 'como-participar-de-licitacao'],
};

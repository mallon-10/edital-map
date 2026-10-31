import type { Guia } from '../tipos';
import { DECRETO_VALORES, VALORES } from '../valores';

export const guia: Guia = {
  slug: 'nova-lei-de-licitacoes',
  titulo: 'Nova Lei de Licitações (14.133/2021): o que muda para a empresa',
  descricao:
    'O que a Lei 14.133/2021 mudou para quem vende ao governo: fim da 8.666, PNCP, pregão eletrônico, julgamento antes da habilitação, dispensa e garantias.',
  resposta:
    'A Nova Lei de Licitações (Lei 14.133/2021) é a lei geral de compras públicas do Brasil desde 30 de dezembro de 2023, quando a Lei 8.666/1993 e a Lei do Pregão foram revogadas. Para a empresa, ela trouxe o PNCP, a disputa preferencialmente eletrônica, o julgamento antes da habilitação e novas regras de dispensa e garantia.',
  revisadoEm: '2026-10-31',
  secoes: [
    {
      titulo: 'O que é a Lei 14.133 e desde quando vale',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'A Lei 14.133 foi publicada em 1º de abril de 2021 e entrou em vigor na mesma data (art. 194). Durante um período de transição, os órgãos puderam escolher entre ela e as leis antigas. Essa transição acabou em 30 de dezembro de 2023, quando foram revogadas a Lei 8.666/1993, a Lei 10.520/2002 (do pregão) e a maior parte da lei do RDC (art. 193, II, com redação da Lei Complementar 198/2023).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Contratos assinados a partir de licitações feitas pelas leis antigas continuam regidos por elas até o fim da vigência (art. 191, parágrafo único). Por isso você ainda pode ver a Lei 8.666 citada em contratos antigos. Editais novos seguem a Lei 14.133, que vale para União, estados, Distrito Federal e municípios.',
        },
      ],
    },
    {
      titulo: 'PNCP: um só lugar para os editais',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'A lei criou o [PNCP](/guias/pncp), o Portal Nacional de Contratações Públicas (art. 174). Os órgãos devem publicar nele o edital e todos os anexos (art. 54). Os contratos também vão para o portal, e essa divulgação é condição para o contrato ter eficácia (art. 94).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Para a empresa, isso facilita achar oportunidades: antes, cada prefeitura publicava em um lugar diferente. Uma exceção: municípios com até 20 mil habitantes tiveram 6 anos, contados de abril de 2021, para cumprir as regras de divulgação em sítio oficial e de licitação eletrônica (art. 176). Enquanto não adotam o PNCP, publicam no diário oficial.',
        },
      ],
    },
    {
      titulo: 'Como a disputa mudou',
      blocos: [
        {
          tipo: 'lista',
          itens: [
            'Eletrônico como regra. As licitações são feitas preferencialmente na forma eletrônica. A presencial precisa ser justificada, e a sessão deve ser gravada em áudio e vídeo (art. 17, § 2º).',
            'Julgamento antes da [habilitação](/glossario/habilitacao). A ordem padrão é propostas e [lances](/glossario/lance), julgamento e só depois habilitação (art. 17). O edital pode inverter essa ordem, com justificativa (art. 17, § 1º).',
            'Documentos só do vencedor. Em regra, apenas quem ficou em primeiro entrega os documentos de habilitação (art. 63, II), e a regularidade fiscal é conferida depois do julgamento (art. 63, III).',
            'Pregão obrigatório para bens e serviços comuns (art. 6º, XLI). O [pregão eletrônico](/guias/pregao-eletronico) virou o caminho mais comum para quem vende produtos.',
            'Novas modalidades. Saíram convite e tomada de preços. Entrou o [diálogo competitivo](/glossario/dialogo-competitivo), para contratações inovadoras (art. 28 e art. 32). O guia [o que é licitação](/guias/o-que-e-licitacao) explica todas.',
            'Prazos mínimos. Para comprar bens por menor preço ou maior desconto, o edital deve ficar publicado pelo menos 8 dias úteis antes das propostas (art. 55, I, a).',
            'Recurso em fase única. A intenção de recorrer deve ser manifestada logo após o resultado, e as razões vão em 3 dias úteis, com apreciação em fase única (art. 165, I, e § 1º). A [impugnação](/glossario/impugnacao) do edital vai até 3 dias úteis antes da abertura (art. 164).',
          ],
        },
      ],
    },
    {
      titulo: 'Quem conduz a licitação',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'A licitação é conduzida por um [agente de contratação](/glossario/agente-de-contratacao), servidor efetivo ou empregado público do quadro permanente, com uma equipe de apoio (art. 8º). No pregão, esse agente se chama [pregoeiro](/glossario/pregoeiro) (art. 8º, § 5º). Em compras de bens ou serviços especiais, pode haver uma [comissão de contratação](/glossario/comissao-de-contratacao) com pelo menos 3 membros (art. 8º, § 2º).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'A lei também reforçou o planejamento. O órgão começa com um [estudo técnico preliminar](/glossario/estudo-tecnico-preliminar) e define o objeto no [termo de referência](/glossario/termo-de-referencia) ou no [projeto básico](/glossario/projeto-basico) (art. 18). Pode ainda ter um [plano de contratações anual](/glossario/plano-de-contratacoes-anual), publicado na internet (art. 12, VII, e § 1º). Ler esse plano ajuda a prever o que o órgão vai comprar.',
        },
      ],
    },
    {
      titulo: 'Contratação direta e dispensa eletrônica',
      blocos: [
        {
          tipo: 'paragrafo',
          texto: `Os limites da [dispensa de licitação](/guias/dispensa-de-licitacao) por valor são atualizados todo 1º de janeiro pelo IPCA-E (art. 182). Em 2026, pelo ${DECRETO_VALORES.nome}, são ${VALORES.dispensaCompras} para compras e serviços e ${VALORES.dispensaObras} para obras, serviços de engenharia e manutenção de veículos (art. 75, I e II).`,
        },
        {
          tipo: 'paragrafo',
          texto:
            'Essas contratações devem ser precedidas, preferencialmente, de um aviso em sítio oficial por pelo menos 3 dias úteis, aberto a propostas de qualquer interessado (art. 75, § 3º). No governo federal isso é feito pela [dispensa eletrônica](/glossario/dispensa-eletronica), no Compras.gov.br. Já a [inexigibilidade](/guias/inexigibilidade-de-licitacao) continua para casos sem competição possível (art. 74).',
        },
      ],
    },
    {
      titulo: 'Riscos, garantias e pagamento',
      blocos: [
        {
          tipo: 'lista',
          itens: [
            '[Matriz de riscos](/glossario/matriz-de-riscos): cláusula que divide entre o órgão e a empresa a responsabilidade por eventos depois da assinatura (art. 6º, XXVII, e art. 22). Leia antes de calcular o preço.',
            '[Garantia contratual](/glossario/garantia-contratual): quando o edital exige, pode chegar a 5% do valor inicial do contrato, ou até 10% com justificativa (art. 98). A empresa escolhe entre caução, [seguro-garantia](/glossario/seguro-garantia), fiança bancária ou título de capitalização (art. 96, § 1º).',
            '[Inexequibilidade](/glossario/inexequibilidade): em obras e serviços de engenharia, proposta abaixo de 75% do valor orçado pelo órgão é presumida [inexequível](/guias/preco-inexequivel) (art. 59, § 4º). Para o TCU, a presunção é relativa: a empresa pode demonstrar que o preço é viável.',
            'Ordem cronológica: o órgão deve pagar seguindo a ordem cronológica de cada fonte de recursos, separada por tipo de contrato (art. 141). O guia de [empenho](/guias/empenho) mostra o caminho até o pagamento.',
            'Sanções: advertência, multa, impedimento de licitar e contratar e declaração de inidoneidade (art. 156).',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'Para a [ME e a EPP](/glossario/me-epp), seguem valendo os benefícios dos arts. 42 a 49 da Lei Complementar 123/2006 (art. 4º). A lei limita esses benefícios em itens ou licitações de valor acima da receita máxima de uma EPP e para empresas que já tenham contratos públicos acima desse valor no ano (art. 4º, §§ 1º e 2º).',
        },
      ],
    },
    {
      titulo: 'O que fazer agora',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Se você vai começar, siga o passo a passo de [como participar de licitação](/guias/como-participar-de-licitacao) e confira os [documentos para licitação](/guias/documentos-para-licitacao). Para achar editais abertos que já seguem a nova lei, use o [mapa do Edital Map](/), com filtros por assunto, cidade e valor. Os Alertas do plano [Pro](/planos) mandam por e-mail os editais novos do seu ramo. Cada edital tem regras próprias: confira sempre o documento oficial.',
        },
      ],
    },
  ],
  editais: ['/licitacoes', '/licitacoes/pregao-eletronico', '/licitacoes/dispensa', '/licitacoes/concorrencia'],
  perguntas: [
    {
      pergunta: 'A Lei 8.666 ainda vale?',
      resposta:
        'Não para licitações novas. Ela foi revogada em 30 de dezembro de 2023 (art. 193, II, da Lei 14.133). Contratos que vieram de licitações feitas por ela continuam seguindo suas regras até o fim.',
    },
    {
      pergunta: 'O que é a inversão de fases?',
      resposta:
        'Na Lei 8.666, a habilitação costumava vir antes das propostas. Na Lei 14.133, o padrão é julgar as propostas primeiro e só depois conferir os documentos de quem venceu (art. 17). O edital pode prever a ordem inversa, com justificativa.',
    },
    {
      pergunta: 'Todo edital precisa estar no PNCP?',
      resposta:
        'Sim, a lei exige a publicação do edital e dos anexos no PNCP (art. 54). Municípios com até 20 mil habitantes tiveram prazo maior para se adaptar (art. 176) e, enquanto isso, publicam no diário oficial.',
    },
    {
      pergunta: 'Qual o valor da dispensa de licitação em 2026?',
      resposta: `Para compras e serviços, contratações abaixo de ${VALORES.dispensaCompras}; para obras, serviços de engenharia e manutenção de veículos, abaixo de ${VALORES.dispensaObras}. Os valores são atualizados todo ano por decreto (art. 182).`,
    },
    {
      pergunta: 'A garantia do contrato é sempre obrigatória?',
      resposta:
        'Não. Ela só é exigida quando o edital prevê (art. 96). Quando exigida, a empresa escolhe a forma: caução, seguro-garantia, fiança bancária ou título de capitalização.',
    },
  ],
  fontes: [
    { nome: 'Lei nº 14.133/2021 (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm' },
    { nome: 'Lei Complementar nº 198/2023 (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp198.htm' },
    DECRETO_VALORES.fonte,
    { nome: 'Nova Lei de Licitações (Portal de Compras do Governo Federal)', url: 'https://www.gov.br/compras/pt-br/nllc' },
    {
      nome: 'Dispensa eletrônica (Portal de Compras do Governo Federal)',
      url: 'https://www.gov.br/compras/pt-br/nllc/legislacao-14-133-por-tema/outros/dispensa-eletronica',
    },
  ],
  relacionados: ['o-que-e-licitacao', 'como-participar-de-licitacao', 'pncp', 'dispensa-de-licitacao', 'modalidades-de-licitacao'],
};

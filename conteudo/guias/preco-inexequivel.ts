import type { Guia } from '../tipos';

export const guia: Guia = {
  slug: 'preco-inexequivel',
  titulo: 'Preço inexequível: o que é, como calcular e como provar',
  descricao:
    'Preço inexequível na Lei 14.133: regra de 75% em obras, indício de 50% em bens e serviços, como calcular a inexequibilidade e como provar que o preço é viável.',
  resposta:
    'Preço inexequível é o valor tão baixo que parece não cobrir a execução do contrato. A proposta assim é desclassificada (art. 59 da Lei 14.133/2021). Em obras e engenharia, o corte é de 75% do valor orçado; em bens e serviços federais, 50% é indício. Segundo o TCU, a empresa deve poder demonstrar que o preço é viável.',
  revisadoEm: '2026-10-31',
  secoes: [
    {
      titulo: 'O que é preço inexequível?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'É o preço que não paga a execução do contrato. A Lei 14.133/2021 tem entre seus objetivos evitar contratações com [sobrepreço](/glossario/sobrepreco) ou com preços manifestamente inexequíveis (art. 11, III).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Mas a [inexequibilidade](/glossario/inexequibilidade) não é só uma conta: um valor baixo pode ser aceito se a empresa mostrar como consegue praticá-lo.',
        },
      ],
    },
    {
      titulo: 'O que diz o art. 59 da Lei 14.133?',
      blocos: [
        {
          tipo: 'lista',
          itens: [
            'Inciso III: desclassifica a proposta com preço inexequível ou que fique acima do orçamento estimado.',
            'Inciso IV: desclassifica a proposta sem exequibilidade demonstrada, quando a Administração exigir.',
            '§ 1º: a conferência pode ser feita só na proposta mais bem classificada.',
            '§ 2º: o órgão pode fazer diligências ou exigir que a empresa demonstre a exequibilidade.',
            '§ 3º: em obras e serviços de engenharia e arquitetura, contam o preço global, os quantitativos e os preços unitários relevantes, conforme critério do edital.',
            '§ 4º: em obras e serviços de engenharia, são consideradas inexequíveis as propostas abaixo de 75% do valor orçado.',
            '§ 5º: nas mesmas contratações, proposta vencedora abaixo de 85% do orçado exige garantia adicional.',
          ],
        },
      ],
    },
    {
      titulo: 'A regra de 75% desclassifica automaticamente?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Não, segundo o entendimento atual do TCU. A leitura literal do § 4º sugere um corte automático, e o Acórdão 2.198/2023-Plenário chegou a dizer que não cabia diligência nesse caso.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Depois, o Tribunal seguiu outro caminho. O Acórdão 465/2024-Plenário diz que o critério conduz a uma presunção relativa de inexequibilidade, e que a Administração deve dar à empresa a oportunidade de demonstrar a exequibilidade (art. 59, § 2º). O Acórdão 803/2024-Plenário vai na mesma linha e aplica a Súmula 262 do TCU, escrita para a lei antiga.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'No Acórdão 214/2025-Plenário, por maioria, o TCU mandou anular desclassificações sumárias feitas com base em presunção absoluta e voltar à análise das propostas. Presunção relativa quer dizer que, abaixo de 75%, o preço é suspeito, mas a empresa pode provar o contrário.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'A decisão não foi unânime. Em editais de estados e municípios, confira também o tribunal de contas local.',
        },
      ],
    },
    {
      titulo: 'Qual é o limite em bens e serviços comuns?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'A lei não fixa percentual para eles. O TCU deixou claro que os 75% valem só para obras e serviços de engenharia (Acórdão 963/2024-Plenário).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'No governo federal, a IN SEGES/ME 73/2022 rege as licitações eletrônicas por menor preço ou maior desconto. Para ela, valor abaixo de 50% do orçado é indício de inexequibilidade (art. 34). A inexequibilidade só é considerada depois de diligência que comprove, ao mesmo tempo:',
        },
        {
          tipo: 'lista',
          itens: [
            'que o custo da empresa ultrapassa o valor da proposta;',
            'que não existem custos de oportunidade capazes de justificar a oferta.',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'Custo de oportunidade é o motivo comercial para aceitar menos. O manual do TCU cita exemplos que podem levar a reduzir ou até retirar a margem de lucro: quebrar barreiras de concorrentes, ampliar o portfólio e formar um novo fluxo de caixa.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Estados e municípios podem aplicar os regulamentos da União (art. 187), mas nem sempre o fazem. Segundo o manual do TCU, a Administração pode fixar um parâmetro caso a caso, e atingi-lo inverte o ônus da prova. A primeira leitura é sempre o [edital](/glossario/edital). E a análise olha a proposta inteira, não itens isolados (Acórdão 379/2024-Plenário).',
        },
      ],
    },
    {
      titulo: 'O lance pode ser excluído durante a disputa?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Como regra, não. O juízo sobre o preço vem depois dos lances, e só preços simbólicos, irrisórios ou de valor zero admitem exclusão durante a etapa competitiva (Acórdão 674/2020-Plenário). Pela IN 73/2022, o agente pode excluir, de forma excepcional, lance que comprometa a competição (art. 21, § 4º), o que o TCU aceitou para lance manifestamente inexequível (Acórdão 948/2024-Plenário).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Se errar o valor, a própria empresa pode excluir o último lance uma única vez, em até 15 segundos (art. 21, § 3º).',
        },
      ],
    },
    {
      titulo: 'Como calcular a inexequibilidade?',
      blocos: [
        {
          tipo: 'passos',
          itens: [
            'Ache o valor orçado no edital ou no [termo de referência](/glossario/termo-de-referencia). Se o orçamento for sigiloso, você pode não ter esse número na hora do lance (art. 24). A exceção é o maior desconto, em que o valor consta do edital (art. 24, parágrafo único).',
            'Divida a proposta pelo valor orçado e multiplique por 100.',
            'Compare o resultado com 75% e 85% em obras e engenharia, com 50% em bens e serviços federais, ou com a regra do edital nos demais casos.',
            'Compare a proposta com o seu custo real. É esse teste que o órgão fará na diligência.',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'Exemplo ilustrativo de bens, com números fictícios: um pregão federal de 1.000 pares de botas tem valor orçado de R$ 80.000. O limite de 50% dá R$ 40.000. Um lance de R$ 36.000 é 45% do orçado (36.000 ÷ 80.000), abaixo do limite, então é indício e pode gerar diligência.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'No mesmo exemplo, cada par custa R$ 30, mais R$ 2 de frete, e o imposto sobre a venda é de 6%. Sobre R$ 36 por par, o imposto é de R$ 2,16. O custo total fica em R$ 34,16 e sobram R$ 1,84 por par. O preço cobre o custo, e a empresa pode demonstrar isso.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Exemplo ilustrativo de obra, com números fictícios: o valor orçado é de R$ 200.000. O limite de 75% dá R$ 150.000 e o de 85% dá R$ 170.000. Uma proposta de R$ 160.000 (80%) não é presumida inexequível, mas exige garantia adicional. Uma de R$ 140.000 (70%) é presumida inexequível, e a empresa precisa demonstrar a viabilidade.',
        },
      ],
    },
    {
      titulo: 'Como funciona a garantia adicional?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Ela vale só para obras e serviços de engenharia e é exigida do vencedor com proposta abaixo de 85% do orçado (art. 59, § 5º). Ela se soma às demais garantias, como a [garantia contratual](/glossario/garantia-contratual) de até 5% do contrato, que pode chegar a 10% com justificativa (art. 98).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Atenção à conta. O texto da lei fala na diferença entre o valor orçado e a proposta. Já o exemplo do manual do TCU calcula a diferença entre 85% do orçado e a proposta. Na proposta de R$ 160.000 do exemplo acima, a primeira leitura dá R$ 40.000 e a segunda dá R$ 10.000.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Veja qual fórmula o edital adota e, se ele não for claro, peça esclarecimento antes da disputa. O custo da garantia, como o do [seguro-garantia](/glossario/seguro-garantia), precisa entrar no preço.',
        },
      ],
    },
    {
      titulo: 'Como demonstrar que o preço é viável?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'A lei não traz lista de documentos. Os passos abaixo são práticos e seguem o teste do art. 34 da IN 73/2022. O edital e o pedido do órgão definem o que entregar.',
        },
        {
          tipo: 'passos',
          itens: [
            'Antes da disputa, monte a planilha de custos, como no guia de [proposta de preços](/guias/proposta-de-precos): produto, frete, impostos, encargos, custo financeiro e margem.',
            'Registre no sistema o seu valor final mínimo, que fica em sigilo (IN 73/2022, art. 19).',
            'Separe as provas: notas fiscais de compra, cotações escritas de fornecedores e contratos parecidos já cumpridos, com o [atestado de capacidade técnica](/glossario/atestado-de-capacidade-tecnica).',
            'Explique a vantagem da empresa: estoque já comprado, produção própria, fornecedor com desconto ou frete menor pela proximidade.',
            'Se a margem for baixa de propósito, diga o motivo comercial. O custo de oportunidade é parte do teste federal.',
            'Em obras, inclua os preços unitários relevantes, não só o preço global (art. 59, § 3º).',
            'Responda no prazo. Para enviar proposta ajustada e documentos complementares, o edital deve dar pelo menos duas horas, prorrogáveis (IN 73/2022, art. 29, § 2º).',
          ],
        },
      ],
    },
    {
      titulo: 'E se a proposta for desclassificada?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Cabe [recurso](/glossario/recurso-administrativo) contra o julgamento das propostas, em 3 dias úteis (art. 165, I, b). Se não houve chance de defesa, cite a Súmula 262 e os Acórdãos 465/2024, 214/2025 e 1.244/2018, todos do Plenário. Veja o guia de [impugnação e recurso](/guias/impugnacao-e-recurso).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Só demonstre um preço que consiga cumprir. Não manter a proposta ou não executar o contrato são infrações sujeitas a sanção (art. 155, I a III e V).',
        },
      ],
    },
    {
      titulo: 'Como o Edital Map ajuda',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'O [Edital Map](/) mostra de graça, em busca e mapa, os editais abertos do PNCP, atualizados a cada 3 horas. Antes de calcular, abra o edital e veja o valor estimado, quando informado. Comece pelos [pregões eletrônicos](/licitacoes/pregao-eletronico) ou pelas [concorrências](/licitacoes/concorrencia) abertas.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Os Alertas por e-mail são do plano Pro ([/planos](/planos)).',
        },
      ],
    },
  ],
  editais: ['/licitacoes/pregao-eletronico', '/licitacoes/concorrencia', '/licitacoes/obras', '/licitacoes/epi'],
  perguntas: [
    {
      pergunta: 'O que é inexequibilidade?',
      resposta:
        'É quando o preço da proposta é baixo demais para cobrir a execução do contrato. A proposta inexequível é desclassificada (art. 59, III), mas a empresa pode ser chamada a demonstrar que o preço é viável.',
    },
    {
      pergunta: 'Como calcular se o preço é inexequível?',
      resposta:
        'Divida a proposta pelo valor orçado. Em obras e engenharia, abaixo de 75% é presumido inexequível. Em bens e serviços federais, abaixo de 50% é indício. Depois, compare a proposta com o seu custo real.',
    },
    {
      pergunta: 'Proposta abaixo de 75% é desclassificada automaticamente?',
      resposta:
        'Para o TCU, não. A presunção é relativa, e a empresa deve ter a chance de demonstrar a exequibilidade (Acórdãos 465/2024 e 214/2025, Plenário). A regra de 75% vale para obras e serviços de engenharia.',
    },
    {
      pergunta: 'Qual é o limite em pregão de bens?',
      resposta:
        'A lei não fixa percentual. No governo federal, valor abaixo de 50% do orçado é indício, que depende de diligência (IN 73/2022, art. 34). Outros órgãos podem ter regra própria: confira o edital.',
    },
    {
      pergunta: 'O que é a garantia adicional de 85%?',
      resposta:
        'É uma garantia extra exigida em obras e serviços de engenharia do vencedor com proposta abaixo de 85% do orçado (art. 59, § 5º). Ela se soma às demais garantias do contrato.',
    },
    {
      pergunta: 'A empresa pode vender sem lucro para o governo?',
      resposta:
        'O manual do TCU reconhece que estratégias comerciais podem levar a reduzir ou retirar a margem. Na regra federal, o problema é o custo passar do preço sem motivo que justifique a oferta (IN 73/2022, art. 34).',
    },
  ],
  fontes: [
    { nome: 'Lei nº 14.133/2021 (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm' },
    {
      nome: 'Instrução Normativa SEGES/ME nº 73/2022 (Portal de Compras do Governo Federal)',
      url: 'https://www.gov.br/compras/pt-br/acesso-a-informacao/legislacao/instrucoes-normativas/instrucao-normativa-seges-me-no-73-de-30-de-setembro-de-2022',
    },
    { nome: 'Aceitabilidade e desclassificação (Manual de Licitações e Contratos do TCU)', url: 'https://licitacoesecontratos.tcu.gov.br/5-4-1-aceitabilidade-e-desclassificacao-2/' },
    { nome: 'Garantia adicional (Manual de Licitações e Contratos do TCU)', url: 'https://licitacoesecontratos.tcu.gov.br/5-4-4-garantia-adicional-2/' },
    { nome: 'Envio de lances (Manual de Licitações e Contratos do TCU)', url: 'https://licitacoesecontratos.tcu.gov.br/5-3-envio-de-lances/' },
    {
      nome: 'TCU considera indevida desclassificação por presunção absoluta de inexequibilidade (Portal TCU)',
      url: 'https://portal.tcu.gov.br/imprensa/noticias/secao-das-sessoes-2025-02-12',
    },
  ],
  relacionados: ['proposta-de-precos', 'pregao-eletronico', 'impugnacao-e-recurso', 'painel-de-precos'],
};

import type { Guia } from '../tipos';

export const guia: Guia = {
  slug: 'ceis-e-cnep',
  titulo: 'CEIS e CNEP: o que são e como fazer a consulta',
  descricao:
    'CEIS e CNEP: o que são, quem alimenta, a diferença entre eles, como consultar no Portal da Transparência e o que a sanção da Lei 14.133 muda para a empresa.',
  resposta:
    'O CEIS reúne empresas e pessoas físicas com sanção que restringe o direito de licitar ou contratar com o governo. O CNEP reúne empresas punidas com base na Lei Anticorrupção. Os órgãos públicos de todo o país alimentam os cadastros, e a consulta é gratuita no Portal da Transparência, por CNPJ, CPF ou nome.',
  revisadoEm: '2026-10-31',
  secoes: [
    {
      titulo: 'O que são o CEIS e o CNEP?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'CEIS é o Cadastro Nacional de Empresas Inidôneas e Suspensas. CNEP é o Cadastro Nacional de Empresas Punidas. Os dois foram tratados na Lei 12.846/2013, a Lei Anticorrupção (arts. 22 e 23), e são citados na Lei 14.133/2021 (arts. 91 e 161).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Na prática, são listas públicas de quem foi punido, usadas pelos gestores para evitar a contratação de impedidos. Em 31/10/2026, o Portal da Transparência mostrava 23.771 sanções vigentes no CEIS e 1.853 no CNEP.',
        },
      ],
    },
    {
      titulo: 'Qual é a diferença entre CEIS e CNEP?',
      blocos: [
        {
          tipo: 'lista',
          itens: [
            'CEIS: traz pessoas físicas e jurídicas com sanção que restringe o direito de participar de licitações ou de celebrar contratos. Vale para sanções de várias leis, como a Lei 14.133, a antiga Lei 8.666 e a Lei do Pregão (Decreto 11.129/2022, art. 58). O portal mostra penalidades vigentes, coletadas a partir de 2008.',
            'CNEP: traz sanções da Lei 12.846/2013 aplicadas a empresas e o descumprimento de acordo de leniência (Decreto 11.129/2022, art. 59). O portal mostra penalidades vigentes aplicadas a partir de 29/01/2014.',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'O ponto que mais confunde: estar no CNEP não é, por si só, uma proibição de licitar. As sanções administrativas da Lei Anticorrupção são multa e publicação extraordinária da decisão (art. 6º). Na Justiça, podem ser perda de bens, suspensão de atividades, dissolução da empresa e proibição de receber incentivos e empréstimos públicos (art. 19).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Mesmo assim, o registro pesa. O órgão é obrigado a consultar os dois cadastros antes de assinar ou prorrogar um contrato (Lei 14.133, art. 91, § 4º). Além disso, o ato lesivo da Lei Anticorrupção é infração na Lei 14.133 (art. 155, XII) e leva à declaração de inidoneidade (art. 156, § 5º).',
        },
      ],
    },
    {
      titulo: 'Quem alimenta os cadastros?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Quem aplica a sanção é quem informa. Pelo art. 161 da Lei 14.133, órgãos e entidades dos três Poderes, em todos os entes federativos, têm até 15 dias úteis, contados da aplicação da sanção, para informar e manter atualizados os dados. O registro e a exclusão são de responsabilidade do órgão sancionador (Decreto 11.129/2022, art. 63, parágrafo único).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Os órgãos federais usam o sistema CGU-PJ, e os demais, o sistema de registro da CGU (Banco de Sanções). O CEIS também recebe dados do TCU e do cadastro de improbidade do CNJ. O registro é feito depois do prazo de recurso ou da decisão final, quando o recurso tem efeito suspensivo (Decreto 11.129/2022, art. 61).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Por isso, uma consulta limpa mostra só o que já foi informado. Uma sanção recente pode ainda não aparecer, e o TCU aponta a falta de atualização desses cadastros como risco.',
        },
      ],
    },
    {
      titulo: 'Quais sanções da Lei 14.133 levam ao registro?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto: 'O art. 156 prevê quatro sanções:',
        },
        {
          tipo: 'lista',
          itens: [
            'Advertência: só para a inexecução parcial do contrato, quando não se justificar pena mais grave (§ 2º).',
            'Multa: de 0,5% a 30% do valor do contrato, para qualquer infração (§ 3º). Pode vir junto com as outras sanções (§ 7º).',
            'Impedimento de licitar e contratar: para as infrações dos incisos II a VII do art. 155, como não manter a proposta ou não assinar o contrato. Vale na Administração direta e indireta do ente que aplicou, por até 3 anos (§ 4º).',
            'Declaração de inidoneidade: para documento falso, fraude, comportamento inidôneo e ato lesivo (incisos VIII a XII), ou para os casos dos incisos II a VII que pedem pena mais grave. Vale em todos os entes federativos, de 3 a 6 anos (§ 5º).',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'O art. 161 fala das sanções aplicadas, sem separar quais. A definição do CEIS responde a parte prática: ele reúne as sanções que restringem o direito de licitar ou contratar. O Decreto 11.129/2022 (art. 58) cita o impedimento e a inidoneidade da Lei 14.133. Advertência e multa, sozinhas, não impedem a empresa de licitar e não estão nessa lista.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Registros com prazos diferentes vêm de leis antigas, como o impedimento de até 5 anos da Lei do Pregão.',
        },
      ],
    },
    {
      titulo: 'O que acontece com a empresa punida?',
      blocos: [
        {
          tipo: 'lista',
          itens: [
            'Não disputa nem executa: quem está impossibilitado por sanção não pode disputar licitação nem participar da execução de contrato, direta ou indiretamente (art. 14, III).',
            'Cai na checagem: a ausência de registros no CEIS tem sido usada na etapa de [habilitação](/glossario/habilitacao), segundo o Portal da Transparência.',
            'Não escapa com outra empresa: o impedimento alcança quem atua em substituição para burlar a sanção, se o ilícito for comprovado (art. 14, § 1º). Em caso de abuso, os efeitos chegam a administradores, sucessora e empresa do mesmo ramo ligada à sancionada (art. 160).',
            'Pode ser crime: o declarado inidôneo que participa de licitação ou contrata com a Administração responde pelo art. 337-M do Código Penal.',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'Antes disso, há defesa: 15 dias úteis para a multa (art. 157) e para o processo de impedimento ou inidoneidade (art. 158). Contra a decisão, cabe [recurso](/glossario/recurso-administrativo) em 15 dias úteis, ou pedido de reconsideração na inidoneidade (arts. 166 e 167), com efeito suspensivo (art. 168). Veja o guia de [impugnação e recurso](/guias/impugnacao-e-recurso). Se a sua empresa recebeu uma intimação, procure um advogado: o efeito sobre contratos já assinados depende do caso.',
        },
      ],
    },
    {
      titulo: 'Como consultar o CEIS e o CNEP?',
      blocos: [
        {
          tipo: 'passos',
          itens: [
            'Abra a [consulta do CEIS](https://portaldatransparencia.gov.br/sancoes/consulta?cadastro=1) ou a [consulta do CNEP](https://portaldatransparencia.gov.br/sancoes/consulta?cadastro=2), no Portal da Transparência. Não precisa de login.',
            'No filtro CPF / CNPJ sancionado, digite o documento. É mais seguro que buscar pelo nome.',
            'Se precisar, refine por Cadastro, Período de vigência, UF do sancionado, Órgão sancionador ou Categoria de sanção.',
            'Veja o resultado e clique em Detalhar. Lá ficam os dados de contato da unidade que aplicou a sanção.',
            'Confira os dois cadastros: uma consulta no CEIS não cobre o CNEP.',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'Leia o alcance. Pela Lei 14.133, um impedimento aplicado por uma prefeitura vale naquele município (art. 156, § 4º), e o registro pode trazer o escopo da sanção (Decreto 11.129/2022, art. 60, X).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'O Portal da Transparência não emite certidão. A [certidão negativa](/glossario/certidao-negativa) sai no [sistema de Certidões da CGU](https://certidoes.cgu.gov.br/), que cobre CEIS, CNEP e CEPIM. O [Certidões APF, do TCU](https://certidoes-apf.apps.tcu.gov.br/), reúne pelo CNPJ os inidôneos do TCU, o cadastro de improbidade do CNJ, o CEIS e o CNEP.',
        },
      ],
    },
    {
      titulo: 'Por que consultar subcontratado e parceiro de consórcio?',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Porque a proibição do art. 14 alcança quem participa da execução "direta ou indiretamente". Colocar uma empresa sancionada na operação pode virar problema para você.',
        },
        {
          tipo: 'lista',
          itens: [
            '[Consórcio](/glossario/consorcio): os integrantes respondem de forma solidária pelos atos praticados, na licitação e na execução (art. 15, V). Consulte o parceiro antes de assinar o compromisso de constituição (art. 15, I).',
            '[Subcontratação](/glossario/subcontratacao): depende do limite autorizado pela Administração, e o contratado apresenta documentos da capacidade técnica do subcontratado (art. 122, caput e § 1º). O edital pode vedar ou restringir (art. 122, § 2º).',
            'Sócios: o CEIS também traz pessoas físicas. Consulte o CPF dos administradores do parceiro.',
            'Repita a consulta perto da assinatura: um registro pode entrar depois da primeira checagem.',
          ],
        },
      ],
    },
    {
      titulo: 'Como sair do cadastro? A reabilitação',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'O registro sai com o fim do prazo da sanção ou a pedido da empresa, cumpridos os requisitos que se aplicam, como a publicação da decisão de reabilitação, a reparação do dano e a quitação da multa (Decreto 11.129/2022, art. 62).',
        },
        {
          tipo: 'paragrafo',
          texto: 'A reabilitação é pedida à própria autoridade que aplicou a pena. O art. 163 exige, ao mesmo tempo:',
        },
        {
          tipo: 'lista',
          itens: [
            'Reparação integral do dano à Administração.',
            'Pagamento da multa.',
            'Prazo mínimo de 1 ano da aplicação da pena, no impedimento, ou de 3 anos, na inidoneidade.',
            'Cumprimento das condições definidas no ato punitivo.',
            'Análise jurídica prévia, com posição conclusiva.',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'Em documento falso (art. 155, VIII) e ato lesivo (art. 155, XII), a lei exige também a implantação ou o aperfeiçoamento de programa de integridade (art. 163, parágrafo único). Para esclarecer um registro ou tratar da regularização, o portal orienta falar com a unidade de origem da sanção.',
        },
      ],
    },
    {
      titulo: 'Como o Edital Map ajuda',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'O Edital Map não consulta o CEIS nem o CNEP: essa checagem é feita nos sites oficiais acima. Ele ajuda a achar as compras. Na [busca e no mapa](/), grátis, você vê os editais abertos do PNCP, atualizados a cada 3 horas.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Para receber por e-mail os editais novos do seu ramo, há os Alertas do plano [Pro](/planos). Antes de disputar, leia o guia de [documentos para licitação](/guias/documentos-para-licitacao).',
        },
      ],
    },
  ],
  editais: ['/licitacoes', '/licitacoes/pregao-eletronico', '/licitacoes/concorrencia', '/licitacoes/dispensa'],
  perguntas: [
    {
      pergunta: 'Como fazer a consulta do CEIS?',
      resposta:
        'Entre em portaldatransparencia.gov.br/sancoes/consulta?cadastro=1 e digite o CNPJ ou CPF no filtro CPF / CNPJ sancionado. A consulta é gratuita e não pede login. Para o CNEP, use cadastro=2 no fim do endereço ou troque o filtro Cadastro.',
    },
    {
      pergunta: 'O Portal da Transparência emite certidão do CEIS?',
      resposta:
        'Não. O próprio portal avisa que não gera certidão. A certidão negativa sai no sistema de Certidões da CGU (certidoes.cgu.gov.br), que cobre CEIS, CNEP e CEPIM.',
    },
    {
      pergunta: 'O que é empresa inidônea?',
      resposta:
        'É a empresa declarada inidônea para licitar ou contratar, a sanção mais grave do art. 156 da Lei 14.133. Ela fica impedida em todos os entes federativos por 3 a 6 anos e pode pedir reabilitação depois de 3 anos, cumpridas as demais exigências do art. 163.',
    },
    {
      pergunta: 'O impedimento de licitar vale para o Brasil todo?',
      resposta:
        'Pela Lei 14.133, não. O impedimento vale na Administração direta e indireta do ente federativo que aplicou a sanção, por até 3 anos (art. 156, § 4º). A declaração de inidoneidade é que vale para todos os entes.',
    },
    {
      pergunta: 'Multa coloca a empresa no CEIS?',
      resposta:
        'O CEIS reúne sanções que restringem o direito de licitar ou contratar, e a multa sozinha não faz isso. Já a multa da Lei Anticorrupção aparece no CNEP. Na dúvida, abra o registro e veja a categoria da sanção.',
    },
    {
      pergunta: 'Por quanto tempo a empresa fica no cadastro?',
      resposta:
        'Enquanto a sanção estiver vigente. O portal exclui o registro com o fim do prazo, por decisão do órgão responsável ou por decisão judicial. No CNEP, a vigência da multa termina com o pagamento.',
    },
  ],
  fontes: [
    { nome: 'Lei nº 14.133/2021 (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm' },
    { nome: 'Lei nº 12.846/2013, Lei Anticorrupção (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12846.htm' },
    { nome: 'Decreto nº 11.129/2022 (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/decreto/D11129.htm' },
    { nome: 'CEIS (Portal da Transparência)', url: 'https://portaldatransparencia.gov.br/entenda-a-gestao-publica/ceis' },
    { nome: 'CNEP (Portal da Transparência)', url: 'https://portaldatransparencia.gov.br/entenda-a-gestao-publica/cnep' },
    { nome: 'Sanções: visão geral e consulta (Portal da Transparência)', url: 'https://portaldatransparencia.gov.br/sancoes' },
    { nome: 'Sanções aplicadas: perguntas frequentes (Portal da Transparência)', url: 'https://portaldatransparencia.gov.br/perguntas-frequentes/sancoes-aplicadas' },
    { nome: 'Banco de Sanções (Controladoria-Geral da União)', url: 'https://bancodesancoes.cgu.gov.br/' },
    { nome: 'Sistema de Certidões (Controladoria-Geral da União)', url: 'https://certidoes.cgu.gov.br/' },
    { nome: 'Certidões APF (Tribunal de Contas da União)', url: 'https://certidoes-apf.apps.tcu.gov.br/' },
    {
      nome: 'Infrações e sanções administrativas de licitantes (Licitações e Contratos, TCU)',
      url: 'https://licitacoesecontratos.tcu.gov.br/5-8-infracoes-e-sancoes-administrativas-licitantes/',
    },
  ],
  relacionados: ['documentos-para-licitacao', 'impugnacao-e-recurso', 'nova-lei-de-licitacoes', 'sicaf'],
};

import type { Guia } from '../tipos';
import { DECRETO_VALORES, VALORES } from '../valores';

export const guia: Guia = {
  slug: 'me-epp-e-mei',
  titulo: 'ME, EPP e MEI em licitações: os benefícios da LC 123',
  descricao:
    'MEI, ME e EPP podem participar de licitação com benefícios da LC 123: desempate, prazo para certidões, itens exclusivos e cota. Veja o que muda em 2027.',
  resposta:
    'Sim, MEI, microempresa (ME) e empresa de pequeno porte (EPP) podem participar de licitação e têm tratamento favorecido pela Lei Complementar 123/2006, aplicado pela Lei 14.133 (art. 4º). Os principais benefícios são o desempate a seu favor, prazo extra para regularizar certidões, itens exclusivos de até R$ 80 mil em 2026 e cota reservada.',
  revisadoEm: '2026-10-31',
  secoes: [
    {
      titulo: 'Quem é ME, EPP e MEI',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'A Lei Complementar 123/2006 define o porte da empresa pela receita bruta do ano, que é basicamente o que ela fatura com vendas e serviços (art. 3º, § 1º). Hoje as faixas são estas:',
        },
        {
          tipo: 'lista',
          itens: [
            'Microempresa (ME): receita bruta de até R$ 360.000,00 por ano (art. 3º, I).',
            'Empresa de pequeno porte (EPP): receita bruta acima de R$ 360.000,00 e até R$ 4.800.000,00 por ano (art. 3º, II).',
            'Microempreendedor individual (MEI): receita bruta de até R$ 81.000,00 no ano anterior, com opção pelo Simples Nacional (art. 18-A, § 1º).',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'O MEI é uma modalidade de microempresa (art. 18-E, § 3º) e recebe todo benefício dado à microempresa sempre que for mais favorável a ele (art. 18-E, § 2º). A lei também proíbe restringir a participação do MEI em licitações por causa da sua natureza jurídica (art. 18-E, § 4º). Por isso, o MEI pode ser [licitante](/glossario/licitante) como qualquer empresa, desde que cumpra as exigências do [edital](/glossario/edital).',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Faturar pouco não basta. A lei tira do tratamento favorecido, por exemplo, a empresa que tem outra pessoa jurídica como sócia ou que é sócia de outra pessoa jurídica (art. 3º, § 4º, I e VII). E a [Lei Complementar 238/2026](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp238.htm) eleva o limite do MEI para R$ 110.000,00 em 2027 e R$ 140.000,00 a partir de 2028 (arts. 1º, 2º e 10), com a condição de a renúncia de receita constar da lei orçamentária (art. 3º).',
        },
      ],
    },
    {
      titulo: 'Os benefícios da LC 123 na licitação',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'A Lei 14.133/2021 manda aplicar às licitações os arts. 42 a 49 da LC 123 (art. 4º). Na prática, a [ME e a EPP](/glossario/me-epp) contam com estes benefícios:',
        },
        {
          tipo: 'lista',
          itens: [
            'Empate ficto. Se a proposta da ME ou EPP for igual ou até 10% maior que a mais bem classificada, a lei considera empate (art. 44, § 1º). No [pregão](/glossario/pregao), a margem é de até 5% (art. 44, § 2º). A ME ou EPP mais bem classificada pode então oferecer preço menor que o do vencedor e ficar com o objeto (art. 45, I); no pregão, ela tem até 5 minutos depois do fim dos [lances](/glossario/lance) (art. 45, § 3º). Isso só vale quando a melhor oferta inicial não é de ME ou EPP (art. 45, § 2º).',
            'Prazo para regularizar certidões. A ME e a EPP entregam os documentos de regularidade fiscal e trabalhista mesmo que tenham alguma restrição (art. 43). Se houver pendência, elas têm 5 dias úteis, contados de quando forem declaradas vencedoras e prorrogáveis por igual período a critério da Administração, para pagar ou parcelar o débito e tirar a [certidão](/glossario/certidao-negativa) (art. 43, § 1º). Sem regularizar, perdem o direito à contratação (art. 43, § 2º).',
            'Itens exclusivos. Em 2026, a Administração deve fazer licitação só para ME e EPP nos itens de até R$ 80.000,00 (art. 48, I).',
            '[Cota reservada](/glossario/cota-reservada). Na compra de bens divisíveis, como uniformes, a Administração deve separar uma cota de até 25% do objeto para ME e EPP (art. 48, III).',
            '[Subcontratação](/glossario/subcontratacao). Em obras e serviços, o edital pode exigir que o vencedor subcontrate ME ou EPP (art. 48, II).',
            'Prioridade local. Com justificativa, o edital pode dar prioridade à ME e à EPP sediadas no local ou na região, até o limite de 10% do melhor preço válido (art. 48, § 3º).',
          ],
        },
      ],
    },
    {
      titulo: 'Quando os benefícios não valem',
      blocos: [
        {
          tipo: 'paragrafo',
          texto: 'Os benefícios têm limites. Os principais estão na Lei 14.133 e no art. 49 da LC 123:',
        },
        {
          tipo: 'lista',
          itens: [
            'Item grande demais. Em compras e serviços em geral, o tratamento favorecido não vale para o item com valor estimado acima da receita bruta máxima de EPP, hoje R$ 4.800.000,00. Em obras e serviços de engenharia, a regra olha o valor da licitação inteira (Lei 14.133, art. 4º, § 1º).',
            'Empresa que já contratou muito no ano. Só tem os benefícios a ME ou EPP que, no ano da licitação, ainda não tenha contratos com a Administração Pública que, somados, passem desse mesmo teto. O órgão deve exigir uma declaração sobre isso (art. 4º, § 2º). Em contratos de mais de 1 ano, conta o valor anual (art. 4º, § 3º).',
            'Exceções do art. 49. Os itens exclusivos, a cota e a subcontratação não se aplicam quando não houver pelo menos 3 fornecedores competitivos ME ou EPP sediados no local ou na região e capazes de cumprir o edital (inciso II), quando o tratamento diferenciado não for vantajoso para a Administração ou prejudicar o conjunto do objeto (inciso III) ou nos casos de [dispensa](/guias/dispensa-de-licitacao) e [inexigibilidade](/glossario/inexigibilidade) (inciso IV, que ainda cita a antiga Lei 8.666). Nas dispensas por valor, esse inciso manda comprar preferencialmente de ME e EPP.',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'As exceções do art. 49 alcançam só os arts. 47 e 48. Mesmo sem item exclusivo, o empate ficto e o prazo para as certidões podem valer na disputa aberta a todos. O edital informa, item por item, se a disputa é exclusiva, se é cota reservada ou se é de ampla participação.',
        },
      ],
    },
    {
      titulo: 'O que muda em 2027 com a LC 238/2026',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'A Lei Complementar 238, publicada em 21 de outubro de 2026, alterou os arts. 48 e 49 da LC 123 (art. 8º). Essas mudanças produzem efeitos a partir de 1º de janeiro de 2027 (art. 10, II). Até 31 de dezembro de 2026, continua valendo o limite de R$ 80.000,00 por item para as disputas exclusivas.',
        },
        {
          tipo: 'lista',
          itens: [
            `Disputas exclusivas de ME e EPP: o limite passa a ser o valor do art. 75, I, da Lei 14.133, atualizado todo ano na forma do art. 182 (novo art. 48, I). É o limite de dispensa para obras, serviços de engenharia e manutenção de veículos, que em 2026 é de ${VALORES.dispensaObras}. Em 2027 vale o valor fixado no decreto de atualização daquele ano.`,
            `Disputas só para MEI: a Administração poderá fazer licitação exclusiva para microempreendedores individuais nos itens de até a metade do valor do art. 75, II, da Lei 14.133, também atualizado (novo art. 48, IV). Em 2026, o valor do art. 75, II, é de ${VALORES.dispensaCompras}. É uma possibilidade, não uma obrigação.`,
            'Exceção do art. 49, III: passa a citar os microempreendedores ao lado da ME e da EPP. O tratamento diferenciado continua podendo ser afastado quando não for vantajoso ou prejudicar o objeto.',
          ],
        },
        {
          tipo: 'paragrafo',
          texto:
            'O edital é que mostra a regra aplicada a cada item. Se ele não deixar claro qual limite usou, faça um [pedido de esclarecimento](/guias/impugnacao-e-recurso) dentro do prazo.',
        },
      ],
    },
    {
      titulo: 'Exemplo: uma confecção ME num pregão de uniformes',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'Imagine uma confecção registrada como microempresa que acha, nos [editais de uniformes](/licitacoes/uniformes), um pregão eletrônico de uma prefeitura com três itens: camisetas estimadas em R$ 50 mil, calças em R$ 70 mil e jaquetas em R$ 200 mil. Em 2026, os itens de camisetas e calças, de até R$ 80 mil cada, devem ser exclusivos de ME e EPP, salvo as exceções do art. 49. Nas jaquetas, que são um bem divisível, a prefeitura deve reservar uma cota de até 25% para ME e EPP, e o restante fica aberto a todos.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Na parte aberta a todos, se o lance final da confecção ficar até 5% acima do de uma empresa grande, ela pode cobrir a oferta em até 5 minutos (arts. 44 e 45). Se uma certidão estiver vencida quando ela for declarada vencedora, ela tem 5 dias úteis, prorrogáveis, para regularizar (art. 43, § 1º). O mais seguro, porém, é deixar tudo em dia antes da sessão.',
        },
        {
          tipo: 'paragrafo',
          texto:
            'Se a empresa fosse MEI, valeriam os mesmos benefícios. Só que um contrato grande pode fazer o MEI passar do limite de receita do ano. Antes de disputar, vale conversar com o contador.',
        },
      ],
    },
    {
      titulo: 'Cuidados antes de disputar',
      blocos: [
        {
          tipo: 'lista',
          itens: [
            'Confirme o porte. A declaração de ME ou EPP precisa ser verdadeira: declaração falsa é infração e pode gerar sanções como multa e impedimento de licitar (Lei 14.133, arts. 155, VIII, e 156).',
            'Leia a tabela de itens do edital e o [termo de referência](/glossario/termo-de-referencia) para saber quais itens são exclusivos ou de cota.',
            'Mantenha cadastro e certidões em dia. No governo federal, o [SICAF](/guias/sicaf) reúne boa parte dos documentos, e o guia de [documentos para licitação](/guias/documentos-para-licitacao) traz a lista.',
            'Calcule o preço antes. Ser ME ou EPP não muda a regra do preço: proposta [inexequível](/glossario/inexequibilidade) pode ser desclassificada (art. 59, III).',
          ],
        },
      ],
    },
    {
      titulo: 'Como o Edital Map ajuda',
      blocos: [
        {
          tipo: 'paragrafo',
          texto:
            'O Edital Map reúne os editais abertos publicados no PNCP. No [mapa](/) você busca pelo que vende e filtra por estado, cidade e valor, para achar compras do tamanho da sua empresa. Se preferir receber os editais novos do seu ramo por e-mail, os Alertas fazem parte do plano [Pro](/planos). Se é o seu primeiro contato com licitações, comece por [como participar de licitação](/guias/como-participar-de-licitacao). As regras de cada compra estão sempre no edital oficial.',
        },
      ],
    },
  ],
  editais: ['/licitacoes/uniformes', '/licitacoes/epi', '/licitacoes/pregao-eletronico', '/licitacoes/dispensa'],
  perguntas: [
    {
      pergunta: 'MEI pode participar de licitação?',
      resposta:
        'Pode. O MEI é uma modalidade de microempresa e tem os mesmos benefícios nas compras públicas (LC 123, art. 18-E, §§ 2º e 3º). A lei proíbe restringir a participação dele por causa da natureza jurídica (art. 18-E, § 4º). Ele precisa cumprir as exigências do edital, como as certidões.',
    },
    {
      pergunta: 'Qual o limite da licitação exclusiva para ME e EPP?',
      resposta: `Em 2026, a disputa deve ser exclusiva de ME e EPP nos itens de até R$ 80.000,00 (LC 123, art. 48, I). A partir de 1º de janeiro de 2027, pela LC 238/2026, o limite passa a ser o valor do art. 75, I, da Lei 14.133, atualizado por decreto (em 2026, ${VALORES.dispensaObras}). Há exceções no art. 49.`,
    },
    {
      pergunta: 'O que é empate ficto?',
      resposta:
        'É quando a proposta da ME ou EPP fica igual ou até 10% acima da melhor oferta de uma empresa maior, ou até 5% no pregão. Nesse caso, a ME ou EPP pode apresentar um preço menor e ficar com o objeto (LC 123, arts. 44 e 45).',
    },
    {
      pergunta: 'Posso participar com certidão vencida?',
      resposta:
        'A ME e a EPP podem apresentar a documentação fiscal e trabalhista mesmo com restrição. Se vencerem, têm 5 dias úteis, prorrogáveis por igual período, para regularizar (LC 123, art. 43, § 1º). Se não regularizarem, perdem o direito à contratação (art. 43, § 2º).',
    },
    {
      pergunta: 'Toda licitação tem item exclusivo para ME e EPP?',
      resposta:
        'Não. A regra não vale quando não há pelo menos 3 fornecedores competitivos desse porte no local ou na região, quando o tratamento não é vantajoso para a Administração ou na dispensa e na inexigibilidade (LC 123, art. 49). Itens acima do teto de EPP também ficam de fora (Lei 14.133, art. 4º, § 1º).',
    },
  ],
  fontes: [
    { nome: 'Lei Complementar nº 123/2006 (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm' },
    { nome: 'Lei Complementar nº 238/2026 (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp238.htm' },
    { nome: 'Lei nº 14.133/2021 (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm' },
    DECRETO_VALORES.fonte,
  ],
  relacionados: ['como-participar-de-licitacao', 'documentos-para-licitacao', 'pregao-eletronico', 'impugnacao-e-recurso', 'contrata-mais-brasil'],
};

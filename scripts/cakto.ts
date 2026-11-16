// Cakto pela API pública (docs/superpowers/specs/2026-10-18-pagamento-cakto-design.md §2).
// Uso: npx tsx scripts/cakto.ts listar
// Lê CAKTO_CLIENT_ID e CAKTO_CLIENT_SECRET do .env. Nunca imprime segredos (chave, token, segredo do webhook).
import '../worker/ambiente';

const BASE = 'https://api.cakto.com.br/public_api';

async function token(): Promise<{ access: string; escopos: string }> {
  const id = process.env.CAKTO_CLIENT_ID;
  const secret = process.env.CAKTO_CLIENT_SECRET;
  if (!id || !secret) throw new Error('Faltam CAKTO_CLIENT_ID e CAKTO_CLIENT_SECRET no .env');
  const r = await fetch(`${BASE}/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: id, client_secret: secret }),
  });
  if (!r.ok) throw new Error(`token: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
  const t = (await r.json()) as { access_token: string; scope?: string };
  return { access: t.access_token, escopos: t.scope ?? '' };
}

export async function chamar(access: string, metodo: string, caminho: string, corpo?: unknown): Promise<unknown> {
  const r = await fetch(`${BASE}${caminho}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await r.text();
  if (!r.ok) throw new Error(`${metodo} ${caminho}: HTTP ${r.status} ${texto.slice(0, 500)}`);
  return texto ? JSON.parse(texto) : null;
}

type Pagina<T> = { results?: T[]; next?: string | null };
type Produto = { id: string; short_id?: string; name: string; price?: number; type?: string; status?: string };

async function listar(access: string) {
  const produtos = (await chamar(access, 'GET', '/products/?limit=100')) as Pagina<Produto>;
  console.log('produtos:');
  for (const p of produtos.results ?? []) console.log(`  ${p.name} · ${p.type} · R$ ${p.price} · ${p.status} · id ${p.id}`);
  const ganchos = (await chamar(access, 'GET', '/webhook/')) as Pagina<{ id: number; name: string; url: string; status: string }>;
  console.log('webhooks:');
  for (const w of ganchos.results ?? []) console.log(`  ${w.name} · ${w.url} · ${w.status} · id ${w.id}`);
}

/** Cria um produto de assinatura se ainda não existir um com o mesmo nome; imprime o registro sem dados sensíveis. */
async function criarProduto(access: string, nome: string, preco: number) {
  const existentes = (await chamar(access, 'GET', '/products/?limit=100')) as Pagina<Produto>;
  const ja = (existentes.results ?? []).find((p) => p.name === nome);
  if (ja) {
    console.log(`já existe: ${nome} · id ${ja.id}`);
    return;
  }
  const criado = (await chamar(access, 'POST', '/products/', {
    name: nome,
    description: `${nome}: licitações abertas do Brasil no mapa, com busca por relevância e alertas. https://www.editalmap.com.br`,
    price: preco,
    type: 'subscription',
    salesPage: 'https://www.editalmap.com.br/planos',
    paymentMethods: ['pix', 'credit_card'],
    contentDeliveries: ['emailAccess'],
    emailAccessLink: 'https://www.editalmap.com.br/assinatura',
    supportEmail: 'mallon@escalav.com.br',
  })) as Record<string, unknown>;
  const { emailAccessLink: _l, ...visivel } = criado;
  console.log(JSON.stringify(visivel, null, 2).slice(0, 4000));
}

type Oferta = { id: string; name: string; price: number; default?: boolean; type?: string; intervalType?: string; recurrence_period?: number; status?: string };

/**
 * Deixa o produto pronto: oferta padrão mensal (intervalType month), oferta anual (year, 10 mensalidades) e a volta para
 * /obrigado/{{callback}}. Idempotente: só cria a anual se não houver uma oferta anual ativa.
 */
async function ajustar(access: string, produtoId: string, mensal: number, anual: number) {
  const produto = (await chamar(access, 'GET', `/products/${produtoId}/`)) as Record<string, unknown>;
  const lista = (await chamar(access, 'GET', `/offers/?product=${produtoId}&limit=50`)) as Pagina<Oferta & { product?: string }>;
  const ofertas = (lista.results ?? []).filter((o) => !o.product || o.product === produtoId);
  const padrao = ofertas.find((o) => o.default) ?? ofertas[0];
  if (!padrao) throw new Error('produto sem oferta padrão');
  const nomeBase = String(produto.name);
  const mensalOk = (await chamar(access, 'PUT', `/offers/${padrao.id}/`, {
    product: produtoId, name: `${nomeBase} · Mensal`, price: mensal, type: 'subscription', intervalType: 'month', interval: 1,
    recurrence_period: 30, status: 'active',
  })) as Oferta;
  console.log(`mensal: ${mensalOk.id} · ${mensalOk.intervalType} · R$ ${mensalOk.price} · ${mensalOk.recurrence_period} dias`);
  let anualOk = ofertas.find((o) => o.intervalType === 'year' && o.status !== 'disabled');
  if (!anualOk) {
    anualOk = (await chamar(access, 'POST', '/offers/', {
      product: produtoId, name: `${nomeBase} · Anual`, price: anual, type: 'subscription', intervalType: 'year', interval: 1,
      recurrence_period: 365,
    })) as Oferta;
  }
  console.log(`anual: ${anualOk.id} · ${anualOk.intervalType} · R$ ${anualOk.price} · ${anualOk.recurrence_period} dias`);
  // PUT de produto exige os campos da criação (docs/integrations/cakto.md do Oferta Kids).
  const atualizado = (await chamar(access, 'PUT', `/products/${produtoId}/`, {
    name: produto.name, description: produto.description, price: mensal, type: 'subscription', salesPage: produto.salesPage,
    contentDeliveries: produto.contentDeliveries, paymentMethods: produto.paymentMethods,
    postPaymentRedirectUrl: 'https://www.editalmap.com.br/obrigado/{{callback}}',
  })) as Record<string, unknown>;
  console.log(`volta: ${atualizado.postPaymentRedirectUrl ?? '(não gravou)'}`);
}

const EVENTOS = [
  'purchase_approved', 'purchase_refused', 'refund', 'chargeback', 'subscription_created', 'subscription_renewed',
  'subscription_renewal_refused', 'subscription_late', 'subscription_canceled',
];

/** Cria o webhook do site para os produtos (se ainda não houver um para a mesma URL) e grava o segredo no .env sem imprimir. */
async function criarWebhook(access: string, url: string, produtos: string[]) {
  const ganchos = (await chamar(access, 'GET', '/webhook/')) as Pagina<{ id: number; url: string }>;
  if ((ganchos.results ?? []).some((w) => w.url === url)) {
    console.log(`já existe um webhook para ${url}`);
    return;
  }
  const criado = (await chamar(access, 'POST', '/webhook/', { name: 'Edital Map · site', url, products: produtos, events: EVENTOS })) as {
    id: number; status?: string; events?: Array<{ custom_id: string }>; fields?: { secret?: string };
  };
  const segredo = criado.fields?.secret;
  if (!segredo) throw new Error('webhook criado sem segredo na resposta');
  await gravarNoEnv({ CAKTO_WEBHOOK_SECRET: segredo });
  console.log(`webhook ${criado.id} · ${criado.status} · eventos: ${(criado.events ?? []).map((e) => e.custom_id).join(', ')}`);
  console.log('CAKTO_WEBHOOK_SECRET gravado no .env');
}

/** Acrescenta ou troca linhas NOME=valor no .env (nunca imprime os valores). */
async function gravarNoEnv(valores: Record<string, string>) {
  const { readFile, writeFile } = await import('node:fs/promises');
  let texto = await readFile('.env', 'utf8');
  for (const [nome, valor] of Object.entries(valores)) {
    const linha = `${nome}=${valor}`;
    const re = new RegExp(`^${nome}=.*$`, 'm');
    texto = re.test(texto) ? texto.replace(re, linha) : `${texto.replace(/\n?$/, '\n')}${linha}\n`;
  }
  await writeFile('.env', texto);
}

/** Troca o preço de uma oferta mantendo o resto (o PUT de oferta precisa dos campos da criação). */
async function precoOferta(access: string, ofertaId: string, preco: number) {
  const o = (await chamar(access, 'GET', `/offers/${ofertaId}/`)) as Oferta & { product?: string | { id: string } };
  const produto = typeof o.product === 'string' ? o.product : o.product?.id;
  const r = (await chamar(access, 'PUT', `/offers/${ofertaId}/`, {
    product: produto, name: o.name, price: preco, type: o.type, intervalType: o.intervalType, interval: 1,
    recurrence_period: o.recurrence_period, status: o.status ?? 'active',
  })) as Oferta;
  console.log(`oferta ${r.id} · ${r.name} · R$ ${r.price} · ${r.intervalType} · ${r.status}`);
}

/** Desativa as ofertas de um produto (o produto não aceita status desativado; sem oferta ativa, o checkout para de vender). */
async function desativarProduto(access: string, produtoId: string) {
  const lista = (await chamar(access, 'GET', `/offers/?product=${produtoId}&limit=50`)) as Pagina<Oferta & { product?: string }>;
  for (const o of (lista.results ?? []).filter((x) => !x.product || x.product === produtoId)) {
    const r = (await chamar(access, 'PUT', `/offers/${o.id}/`, {
      product: produtoId, name: o.name, price: o.price, type: o.type, intervalType: o.intervalType, interval: 1,
      recurrence_period: o.recurrence_period, status: 'disabled',
    })) as Oferta;
    console.log(`oferta ${r.id} · ${r.name} · ${r.status}`);
  }
}

/** Manda um corpo incompleto para /payments/ e mostra os campos que a Cakto exige (400 sem criar pedido). */
async function sondarPagamento(access: string, metodo: string) {
  const r = await fetch(`${BASE}/payments/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': `sonda-${Date.now()}` },
    body: JSON.stringify({ paymentMethod: metodo, items: [{ offerId: 'irpv92e' }], customer: {} }),
  });
  console.log(`HTTP ${r.status}`);
  console.log((await r.text()).slice(0, 2500));
}

/** Últimos pedidos (status, método, oferta, e-mail mascarado), para conferir testes. */
async function pedidos(access: string) {
  const r = (await chamar(access, 'GET', '/orders/?limit=5&ordering=-createdAt')) as Pagina<Record<string, unknown>>;
  for (const o of r.results ?? []) {
    const c = (o.customer ?? {}) as { email?: string };
    const email = (c.email ?? '').replace(/^(.{3}).*(@.*)$/, '$1…$2');
    const oferta = (o.offer ?? {}) as { id?: string };
    console.log(`${o.refId} · ${o.status} · ${o.paymentMethod} · oferta ${oferta.id} · ${email} · ${o.createdAt}`);
  }
}

/** Pede à Cakto um evento de exemplo para o webhook (confere endereço e assinatura; o pedido do exemplo é fictício). */
async function testarWebhook(access: string, id: string, evento: string) {
  const r = await fetch(`${BASE}/webhook/event_test/${id}/?event_id=${evento}`, { method: 'POST', headers: { Authorization: `Bearer ${access}` } });
  console.log(`HTTP ${r.status} ${(await r.text()).slice(0, 300)}`);
}

/** Mostra um produto sem os campos sensíveis (link de acesso, e-mail de suporte, dados do produtor). */
async function verProduto(access: string, id: string) {
  const p = (await chamar(access, 'GET', `/products/${id}/`)) as Record<string, unknown>;
  const { emailAccessLink: _l, supportEmail: _s, producer: _p, ...visivel } = p;
  console.log(JSON.stringify(visivel, null, 2).slice(0, 4000));
}

const CURSO_NOME = 'Curso de Licitação — Do zero à primeira licitação';

/**
 * Produto do curso (venda única, área de membros Cakto V3, Pix e cartão). Idempotente pelo nome. Imprime o produto e a
 * oferta padrão com o link do checkout. O texto não promete vitória nem renda (docs/superpowers/specs/2026-10-31-*).
 */
async function criarCurso(access: string, preco: number) {
  const existentes = (await chamar(access, 'GET', '/products/?limit=100')) as Pagina<Produto>;
  let produto = (existentes.results ?? []).find((p) => p.name === CURSO_NOME);
  if (produto) console.log(`já existe: ${CURSO_NOME} · id ${produto.id}`);
  else {
    produto = (await chamar(access, 'POST', '/products/', {
      name: CURSO_NOME,
      description:
        'Curso em vídeo para quem quer começar a vender para o governo. Você aprende como funciona uma licitação, ' +
        'quem pode participar, quais documentos e cadastros a empresa precisa, onde encontrar editais e como ler um, ' +
        'como escolher boas oportunidades, encontrar fornecedores, calcular o preço, enviar a proposta, participar da ' +
        'disputa e da dispensa eletrônica, e o que fazer depois: entregar e receber. 16 aulas em 6 módulos, com acesso ' +
        'pela área de membros. Feito pelo Edital Map: https://www.editalmap.com.br',
      price: preco,
      type: 'unique',
      salesPage: 'https://www.editalmap.com.br/cursolicitacao',
      paymentMethods: ['pix', 'credit_card'],
      contentDeliveries: ['cakto_v3'],
      supportEmail: 'mallon@escalav.com.br',
    })) as Produto;
    console.log(`criado: ${produto.name} · ${produto.type} · R$ ${produto.price} · id ${produto.id}`);
  }
  const lista = (await chamar(access, 'GET', `/offers/?product=${produto.id}&limit=50`)) as Pagina<Oferta & { product?: string }>;
  for (const o of (lista.results ?? []).filter((x) => !x.product || x.product === produto!.id)) {
    console.log(`oferta ${o.id} · ${o.name} · R$ ${o.price} · ${o.status}${o.default ? ' · padrão' : ''} · https://pay.cakto.com.br/${o.id}`);
  }
}

/** Produto do curso na Cakto (criado em 15/11/2026 com `criar-curso 67`; oferta padrão vutq63g). */
const CURSO_PRODUTO = 'ff616128-6bb1-4810-926c-fa933bb19c0b';

/** Estrutura do curso definida pelo João em 15/11/2026. */
const CURSO_MODULOS: Array<{ titulo: string; aulas: string[] }> = [
  { titulo: 'Módulo 01 — Conhecendo o mercado público', aulas: ['Aula 1 — O governo pode ser seu cliente', 'Aula 2 — Como funciona uma licitação', 'Aula 3 — Quais oportunidades existem?'] },
  { titulo: 'Módulo 02 — Preparando sua empresa', aulas: ['Aula 4 — Quem pode vender para o governo?', 'Aula 5 — Documentação necessária', 'Aula 6 — Cadastro nas plataformas'] },
  { titulo: 'Módulo 03 — Encontrando oportunidades', aulas: ['Aula 7 — Onde encontrar licitações', 'Aula 8 — Como ler um edital', 'Aula 9 — Como escolher boas oportunidades'] },
  { titulo: 'Módulo 04 — Fornecedores e precificação', aulas: ['Aula 10 — Como encontrar fornecedores', 'Aula 11 — Como calcular seu preço'] },
  { titulo: 'Módulo 05 — Participando de uma licitação', aulas: ['Aula 12 — Como cadastrar sua proposta', 'Aula 13 — Como funciona a disputa', 'Aula 14 — Como participar de uma dispensa eletrônica'] },
  { titulo: 'Módulo 06 — Ganhei. E agora?', aulas: ['Aula 15 — O que acontece depois da disputa', 'Aula 16 — Como entregar e receber'] },
];

type Item = { id: string; title?: string; name?: string; status?: string };
const itens = (r: unknown): Item[] => (Array.isArray(r) ? r : ((r as Pagina<Item>)?.results ?? [])) as Item[];

/**
 * Monta a área de membros do curso: área (a Cakto devolve a existente), uma seção "Curso", os 6 módulos e as 16 aulas.
 * Idempotente pelo título. Módulos saem publicados; aulas saem em rascunho até ganharem vídeo (`publicar-aula`).
 * Precisa de uma chave com o escopo `members`.
 */
async function areaCurso(access: string) {
  const area = (await chamar(access, 'POST', '/members/areas/', { product: CURSO_PRODUTO })) as Item & { slug?: string };
  await chamar(access, 'PATCH', `/members/areas/${area.id}/`, {
    description: 'Do zero à primeira licitação: 16 aulas em 6 módulos, do mercado público à entrega e ao pagamento.',
    support_email: 'mallon@escalav.com.br',
    comments_enabled: true,
  });
  console.log(`área ${area.id} · ${area.slug ?? ''} · ${area.status ?? ''}`);
  const secoes = itens(await chamar(access, 'GET', `/members/areas/${area.id}/sections/?limit=50`));
  const secao =
    secoes.find((s) => s.title === 'Curso') ??
    ((await chamar(access, 'POST', `/members/areas/${area.id}/sections/`, {
      title: 'Curso', type: 'course', content_type: 'course', status: 'published', visibility: 'paid_members',
    })) as Item);
  console.log(`seção ${secao.id} · Curso`);
  const modulos = itens(await chamar(access, 'GET', `/members/sections/${secao.id}/modules/?limit=50`));
  for (const m of CURSO_MODULOS) {
    const mod =
      modulos.find((x) => x.title === m.titulo) ??
      ((await chamar(access, 'POST', `/members/sections/${secao.id}/modules/`, { title: m.titulo, status: 'published' })) as Item);
    const aulas = itens(await chamar(access, 'GET', `/members/modules/${mod.id}/lessons/?limit=50`));
    console.log(`${m.titulo} · ${mod.id}`);
    for (const a of m.aulas) {
      const aula =
        aulas.find((x) => x.title === a) ??
        ((await chamar(access, 'POST', `/members/modules/${mod.id}/lessons/`, { title: a, status: 'draft', release_type: 'immediate' })) as Item);
      console.log(`  ${a} · ${aula.id} · ${aula.status ?? 'draft'}`);
    }
  }
}

/** Descrições dos módulos e das aulas (sem promessa de vitória nem de renda). */
const CURSO_DESCRICOES: Record<string, string> = {
  'Módulo 01 — Conhecendo o mercado público': 'Por que o governo compra de empresas pequenas e como esse mercado funciona.',
  'Módulo 02 — Preparando sua empresa': 'Quem pode participar, os documentos que a empresa precisa ter e os cadastros nas plataformas de compras.',
  'Módulo 03 — Encontrando oportunidades': 'Onde os editais são publicados, como ler um e como escolher os que fazem sentido para o seu negócio.',
  'Módulo 04 — Fornecedores e precificação': 'Como encontrar quem fornece o que você vai vender e como montar um preço que cubra custos e impostos.',
  'Módulo 05 — Participando de uma licitação': 'Do cadastro da proposta à disputa de lances, incluindo a dispensa eletrônica.',
  'Módulo 06 — Ganhei. E agora?': 'O que acontece depois da disputa: habilitação, contrato, entrega e pagamento.',
  'Aula 1 — O governo pode ser seu cliente': 'O tamanho das compras públicas e por que empresas de todos os portes vendem para o governo.',
  'Aula 2 — Como funciona uma licitação': 'As etapas de uma licitação, do edital publicado ao resultado.',
  'Aula 3 — Quais oportunidades existem?': 'As formas de contratação (pregão, concorrência, dispensa e outras) e o que cada uma significa para você.',
  'Aula 4 — Quem pode vender para o governo?': 'Quem pode participar, o que muda para MEI, ME e EPP e quais são os impedimentos.',
  'Aula 5 — Documentação necessária': 'Os documentos de habilitação que costumam ser pedidos e como deixar tudo em dia.',
  'Aula 6 — Cadastro nas plataformas': 'Passo a passo do cadastro nas plataformas de compras públicas, com telas reais.',
  'Aula 7 — Onde encontrar licitações': 'Os portais onde os editais são publicados e como acompanhar os do seu segmento, com telas reais.',
  'Aula 8 — Como ler um edital': 'As partes de um edital e os pontos que você precisa conferir antes de decidir participar.',
  'Aula 9 — Como escolher boas oportunidades': 'Critérios para separar os editais que valem o seu tempo dos que não valem.',
  'Aula 10 — Como encontrar fornecedores': 'Como achar e cotar fornecedores para o que o edital pede.',
  'Aula 11 — Como calcular seu preço': 'Como somar custo, frete, impostos e margem para chegar a um preço viável.',
  'Aula 12 — Como cadastrar sua proposta': 'Como preencher e enviar a proposta na plataforma, sem esquecer anexos e prazos.',
  'Aula 13 — Como funciona a disputa': 'Como funciona a fase de lances e o que acontece depois dela.',
  'Aula 14 — Como participar de uma dispensa eletrônica': 'Como funciona a dispensa eletrônica e como participar dela.',
  'Aula 15 — O que acontece depois da disputa': 'Habilitação, recursos, homologação e assinatura do contrato ou da ata.',
  'Aula 16 — Como entregar e receber': 'Empenho, entrega, nota fiscal e o caminho até o pagamento.',
};

/** Grava as descrições de CURSO_DESCRICOES nos módulos e nas aulas que já existem (não muda status). */
async function descreverCurso(access: string) {
  const area = (await chamar(access, 'POST', '/members/areas/', { product: CURSO_PRODUTO })) as Item;
  const secao = itens(await chamar(access, 'GET', `/members/areas/${area.id}/sections/?limit=50`)).find((s) => s.title === 'Curso');
  if (!secao) throw new Error('seção Curso não existe; rode area-curso antes');
  for (const mod of itens(await chamar(access, 'GET', `/members/sections/${secao.id}/modules/?limit=50`))) {
    const d = CURSO_DESCRICOES[mod.title ?? ''];
    if (d) await chamar(access, 'PATCH', `/members/modules/${mod.id}/`, { description: d });
    console.log(`${mod.title}${d ? ' ✓' : ' (sem descrição)'}`);
    for (const aula of itens(await chamar(access, 'GET', `/members/modules/${mod.id}/lessons/?limit=50`))) {
      const da = CURSO_DESCRICOES[aula.title ?? ''];
      if (da) await chamar(access, 'PATCH', `/members/lessons/${aula.id}/`, { description: da });
      console.log(`  ${aula.title}${da ? ' ✓' : ' (sem descrição)'} · ${aula.status}`);
    }
  }
}

/**
 * Nome, topo (hero), botão e cores da área na identidade Edital Map. As imagens (banner, logo, capas) a API não aceita
 * (só JSON e corpo pequeno): vão pelo painel, a partir de Área de Trabalho\Edital Map\curso-cakto\saida.
 */
async function visualCurso(access: string) {
  const area = (await chamar(access, 'POST', '/members/areas/', { product: CURSO_PRODUTO })) as Item;
  const secao = itens(await chamar(access, 'GET', `/members/areas/${area.id}/sections/?limit=50`)).find(
    (s) => s.title === 'Curso' || s.title === 'Aulas do curso',
  );
  if (secao) await chamar(access, 'PATCH', `/members/sections/${secao.id}/`, { title: 'Aulas do curso' });
  const base = {
    name: 'Curso de Licitação',
    description: 'Do zero à primeira licitação: 16 aulas em 6 módulos, do mercado público à entrega e ao pagamento.',
    hero_title: 'Do zero à primeira licitação',
    hero_description:
      'Como funciona o mercado público, o que sua empresa precisa, onde achar editais e como participar, em 16 aulas curtas.',
    hero_cta_label: 'Começar o curso',
    hero_cta_section: secao?.id ?? null,
    title_color: '#F4F1E8',
    subtitle_color: '#C9D2E0',
    cta_color: '#FF5A1F',
    banner_overlay_enabled: false,
    logo_label: '',
    comments_enabled: true,
    show_students_count: false,
  };
  const r = (await chamar(access, 'PATCH', `/members/areas/${area.id}/`, base)) as Record<string, unknown>;
  console.log(`área: ${r.name} · topo: ${r.hero_title} · botão: ${r.hero_cta_label} (${r.cta_color})`);
  for (const campo of ['title_font_family', 'cta_font_family', 'logo_font_family']) {
    try {
      await chamar(access, 'PATCH', `/members/areas/${area.id}/`, { [campo]: 'Public Sans' });
      console.log(`${campo}: Public Sans`);
    } catch (e) {
      console.log(`${campo}: não aceitou (${String(e).slice(0, 160)})`);
    }
  }
}

/** Vídeos da biblioteca da Cakto (os que o João subiu pelo painel), para ligar às aulas. */
async function videos(access: string) {
  for (const v of itens(await chamar(access, 'GET', '/members/videos/?limit=100'))) console.log(`${v.id} · ${v.title ?? v.name ?? ''} · ${v.status ?? ''}`);
}

/** Liga uma aula a um vídeo (id da biblioteca ou link do YouTube) e publica. */
async function publicarAula(access: string, aulaId: string, video: string) {
  const corpo = /^https?:\/\//.test(video) ? { external_video_url: video } : { video_id: video };
  const r = (await chamar(access, 'PATCH', `/members/lessons/${aulaId}/`, { ...corpo, status: 'published' })) as Item;
  console.log(`aula ${r.id} · ${r.title} · ${r.status}`);
}

/**
 * Liga cada vídeo da biblioteca à aula de mesmo número ("Aula N — …" no nome do arquivo e no título da aula) e publica a
 * aula. Aula sem vídeo correspondente fica como está. Sem argumento só mostra o plano; com "aplicar" grava.
 */
async function ligarVideos(access: string, aplicar: boolean) {
  const num = (s: string | undefined) => Number(/Aula\s+0*(\d+)/i.exec(s ?? '')?.[1] ?? NaN);
  const vids = new Map<number, Item>();
  for (const v of itens(await chamar(access, 'GET', '/members/videos/?limit=100'))) {
    const n = num(v.title ?? v.name);
    if (n) vids.set(n, v);
  }
  const area = (await chamar(access, 'POST', '/members/areas/', { product: CURSO_PRODUTO })) as Item;
  const secao = itens(await chamar(access, 'GET', `/members/areas/${area.id}/sections/?limit=50`)).find(
    (s) => s.title === 'Curso' || s.title === 'Aulas do curso',
  );
  if (!secao) throw new Error('seção do curso não encontrada');
  for (const mod of itens(await chamar(access, 'GET', `/members/sections/${secao.id}/modules/?limit=50`))) {
    for (const aula of itens(await chamar(access, 'GET', `/members/modules/${mod.id}/lessons/?limit=50`))) {
      const v = vids.get(num(aula.title));
      if (!v) { console.log(`sem vídeo · ${aula.title} · ${aula.status}`); continue; }
      if (aplicar) await chamar(access, 'PATCH', `/members/lessons/${aula.id}/`, { video_id: v.id, status: 'published' });
      console.log(`${aplicar ? 'publicada' : 'plano'} · ${aula.title} ← ${v.title ?? v.name} (${v.status ?? ''})`);
    }
  }
}

/**
 * Markdown simples (o que o João escreve) → HTML que a área da Cakto mostra bem. A Cakto zera margens de <p> e números
 * de <ol>, e ignora quebras de linha soltas: cada linha vira um <p>, linha em branco vira <p><br></p>, listas levam o
 * marcador digitado (•, ☐ ou o número), títulos "## " viram negrito e endereços viram links que abrem em outra aba.
 */
export function descricaoHtml(md: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (s: string) =>
    esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/https?:\/\/[^\s<]+?(?=[.,;:)]?(\s|$))/g, (u) => `<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`);
  const saida: string[] = [];
  for (const bruta of md.replace(/\r/g, '').trim().split('\n')) {
    const l = bruta.trim();
    if (!l) { if (saida[saida.length - 1] !== '<p><br></p>') saida.push('<p><br></p>'); continue; }
    let m: RegExpMatchArray | null;
    if ((m = l.match(/^#{1,6}\s+(.*)$/))) saida.push(`<p><strong>${inline(m[1].replace(/\*\*/g, ''))}</strong></p>`);
    else if ((m = l.match(/^[-*]\s+\[[ xX]?\]\s+(.*)$/))) saida.push(`<p>☐ ${inline(m[1])}</p>`);
    else if ((m = l.match(/^[-*]\s+(.*)$/))) saida.push(`<p>• ${inline(m[1])}</p>`);
    else saida.push(`<p>${inline(l)}</p>`);
  }
  return saida.join('');
}

/** Grava a descrição de cada aula a partir de <pasta>/aula-NN.md (número da aula no título). Sem "aplicar" só mostra. */
async function descricoesAulas(access: string, pasta: string, aplicar: boolean) {
  const { readFileSync, existsSync } = await import('node:fs');
  const { join } = await import('node:path');
  const area = (await chamar(access, 'POST', '/members/areas/', { product: CURSO_PRODUTO })) as Item;
  const secao = itens(await chamar(access, 'GET', `/members/areas/${area.id}/sections/?limit=50`)).find(
    (s) => s.title === 'Curso' || s.title === 'Aulas do curso',
  );
  if (!secao) throw new Error('seção do curso não encontrada');
  for (const mod of itens(await chamar(access, 'GET', `/members/sections/${secao.id}/modules/?limit=50`))) {
    for (const aula of itens(await chamar(access, 'GET', `/members/modules/${mod.id}/lessons/?limit=50`))) {
      const n = Number(/Aula\s+0*(\d+)/i.exec(aula.title ?? '')?.[1]);
      const arq = join(pasta, `aula-${String(n).padStart(2, '0')}.md`);
      if (!existsSync(arq)) { console.log(`sem arquivo · ${aula.title}`); continue; }
      const html = descricaoHtml(readFileSync(arq, 'utf8'));
      if (aplicar) await chamar(access, 'PATCH', `/members/lessons/${aula.id}/`, { description: html });
      console.log(`${aplicar ? 'gravada' : 'plano'} · ${aula.title} · ${html.length} caracteres`);
    }
  }
}

type Checkout = { id: number | string; name: string; config?: unknown; default?: boolean };

/** Checkouts do curso, com o visual (config) gravado em cada um. */
async function checkoutCurso(access: string) {
  for (const c of itens(await chamar(access, 'GET', `/products/${CURSO_PRODUTO}/checkouts/?limit=20`)) as unknown as Checkout[])
    console.log(`${c.id} · ${c.name}\n${JSON.stringify(c.config ?? null, null, 2).slice(0, 3000)}`);
}

/**
 * Visual do checkout do curso na identidade Edital Map (mesmo formato do checkout do Pet Sitter): banner do site no topo
 * (computador e celular), depois o formulário; fundo Atlas, botão de pagar Marcador com texto Carta. As imagens moram em
 * public/curso/checkout/ (a API só aceita endereço) e saem de Área de Trabalho\Edital Map\curso-cakto\gerar.mjs.
 */
async function visualCheckout(access: string, produto = CURSO_PRODUTO, pasta = 'curso/checkout') {
  const SITE = `https://www.editalmap.com.br/${pasta}/`;
  const settings = {
    background: { color: '#0C2340' },
    payButton: { color: '#FF5A1F', text: { color: '#FFFFFF' } },
    text: { color: { active: '#FF5A1F' } },
    icon: { color: '#FF5A1F' },
  };
  const lado = (dev: string, banner: string) => ({
    settings,
    extra: {},
    rows: [
      { id: `${dev}-row-banner`, type: 'row', layout: [12], columns: [
        { id: `${dev}-col-banner`, type: 'column', components: [
          { id: `${dev}-banner`, type: 'image', attributes: { image: SITE + banner, alignment: 'center' } },
        ] },
      ] },
      { id: `${dev}-row-checkout`, type: 'row', layout: [12], columns: [
        { id: `${dev}-col-checkout`, type: 'column', components: [{ id: `${dev}-checkout`, type: 'checkout', attributes: {} }] },
      ] },
    ],
  });
  const checkouts = itens(await chamar(access, 'GET', `/products/${produto}/checkouts/?limit=20`)) as unknown as Checkout[];
  for (const c of checkouts) {
    await chamar(access, 'PATCH', `/products/${produto}/checkouts/${c.id}/`, {
      name: c.name,
      config: { desktop: lado('desktop', 'banner-computador.jpg'), mobile: lado('mobile', 'banner-celular.jpg') },
    });
    console.log(`checkout ${c.id} · ${c.name}: visual gravado`);
  }
}

const comando = process.argv[2];
const { access, escopos } = await token();
console.log(`escopos: ${escopos}`);
if (comando === 'listar') await listar(access);
else if (comando === 'ver-produto') await verProduto(access, process.argv[3]);
else if (comando === 'criar-curso') await criarCurso(access, Number(process.argv[3]));
else if (comando === 'area-curso') await areaCurso(access);
else if (comando === 'videos') await videos(access);
else if (comando === 'descrever-curso') await descreverCurso(access);
else if (comando === 'visual-curso') await visualCurso(access);
else if (comando === 'checkout-curso') await checkoutCurso(access);
else if (comando === 'descricoes-aulas') await descricoesAulas(access, process.argv[3], process.argv[4] === 'aplicar');
else if (comando === 'ligar-videos')await ligarVideos(access, process.argv[3] === 'aplicar');
else if (comando === 'visual-checkout') await visualCheckout(access);
// Edital Map Pro: mesmos banners e cores, artes em public/pro/checkout/ (gerar-checkout.mjs pro).
else if (comando === 'visual-checkout-pro') await visualCheckout(access, 'ad9240ce-3de9-4595-84c4-6c29036d9345', 'pro/checkout');
else if (comando === 'publicar-aula') await publicarAula(access, process.argv[3], process.argv[4]);
else if (comando === 'criar-produto') await criarProduto(access, process.argv[3], Number(process.argv[4]));
else if (comando === 'ajustar') await ajustar(access, process.argv[3], Number(process.argv[4]), Number(process.argv[5]));
else if (comando === 'preco-oferta') await precoOferta(access, process.argv[3], Number(process.argv[4]));
else if (comando === 'desativar-produto') await desativarProduto(access, process.argv[3]);
else if (comando === 'sondar-pagamento') await sondarPagamento(access, process.argv[3]);
else if (comando === 'pedidos') await pedidos(access);
else if (comando === 'testar-webhook') await testarWebhook(access, process.argv[3], process.argv[4] ?? 'purchase_approved');
else if (comando === 'criar-webhook') await criarWebhook(access, process.argv[3], process.argv.slice(4));
else if (comando === 'gravar-ofertas') {
  const [bm, ba, pm, pa] = process.argv.slice(3);
  await gravarNoEnv({ CAKTO_OFERTA_BASIC_MENSAL: bm, CAKTO_OFERTA_BASIC_ANUAL: ba, CAKTO_OFERTA_PRO_MENSAL: pm, CAKTO_OFERTA_PRO_ANUAL: pa });
  console.log('ofertas gravadas no .env');
} else console.log('Comandos: listar | criar-produto "<nome>" <preço> | ajustar <produto> <mensal> <anual> | criar-webhook <url> <produto>… | gravar-ofertas <bm> <ba> <pm> <pa>');

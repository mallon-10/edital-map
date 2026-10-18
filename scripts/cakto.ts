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

const comando = process.argv[2];
const { access, escopos } = await token();
console.log(`escopos: ${escopos}`);
if (comando === 'listar') await listar(access);
else if (comando === 'criar-produto') await criarProduto(access, process.argv[3], Number(process.argv[4]));
else if (comando === 'ajustar') await ajustar(access, process.argv[3], Number(process.argv[4]), Number(process.argv[5]));
else if (comando === 'preco-oferta') await precoOferta(access, process.argv[3], Number(process.argv[4]));
else if (comando === 'desativar-produto') await desativarProduto(access, process.argv[3]);
else if (comando === 'sondar-pagamento') await sondarPagamento(access, process.argv[3]);
else if (comando === 'pedidos') await pedidos(access);
else if (comando === 'criar-webhook') await criarWebhook(access, process.argv[3], process.argv.slice(4));
else if (comando === 'gravar-ofertas') {
  const [bm, ba, pm, pa] = process.argv.slice(3);
  await gravarNoEnv({ CAKTO_OFERTA_BASIC_MENSAL: bm, CAKTO_OFERTA_BASIC_ANUAL: ba, CAKTO_OFERTA_PRO_MENSAL: pm, CAKTO_OFERTA_PRO_ANUAL: pa });
  console.log('ofertas gravadas no .env');
} else console.log('Comandos: listar | criar-produto "<nome>" <preço> | ajustar <produto> <mensal> <anual> | criar-webhook <url> <produto>… | gravar-ofertas <bm> <ba> <pm> <pa>');

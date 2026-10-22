import { after } from 'next/server';
import { configPagamento } from '@/lib/pagamento/config';
import { lerPedidos, webhookAutentico } from '@/lib/pagamento/webhook';
import { aplicarPedido } from '@/lib/servidor/pagamento';

/**
 * Webhook da Cakto (spec do pagamento, §4). Vem do servidor da Cakto: confere a assinatura do webhook (não a origem).
 * Responde 2xx rápido; erro de banco = 500 (a Cakto não reenvia resposta recebida: reenviar pelo painel ou pela API).
 */
export async function POST(request: Request) {
  const cfg = configPagamento();
  if (!cfg) return Response.json({ erro: 'Pagamento desligado.' }, { status: 503 });
  const corpoCru = await request.text();
  let corpo: unknown = null;
  try {
    corpo = JSON.parse(corpoCru);
  } catch {
    return Response.json({ erro: 'Corpo inválido.' }, { status: 400 });
  }
  const autentico = webhookAutentico({
    corpoCru,
    corpo,
    assinatura: request.headers.get('x-cakto-signature'),
    timestamp: request.headers.get('x-cakto-timestamp'),
    segredo: cfg.segredoWebhook,
    agora: new Date(),
  });
  if (!autentico) return Response.json({ erro: 'Assinatura inválida.' }, { status: 401 });
  try {
    const resultados = [];
    // O e-mail de boas-vindas sai depois da resposta: a Cakto recebe o 200 sem esperar o Resend.
    for (const pedido of lerPedidos(corpo)) resultados.push(await aplicarPedido(pedido, cfg, new Date(), after));
    return Response.json({ ok: true, resultados });
  } catch (erro) {
    // Sem o corpo no log: ele traz o e-mail do comprador.
    console.error('webhook da Cakto:', erro instanceof Error ? erro.message : erro);
    return Response.json({ erro: 'Falha ao aplicar o evento.' }, { status: 500 });
  }
}

import 'server-only';
import { randomBytes } from 'node:crypto';
import type { PlanoPago } from '../eventos';
import { gerarChave } from '../pagamento/chave';
import { type ConfigPagamento, planoDaOferta } from '../pagamento/config';
import { type Assinatura, type Efeito, efeitoDoEvento, type StatusAssinatura } from '../pagamento/efeitos';
import { corpoCompraGa4, type DadosGa4 } from '../pagamento/ga4';
import type { PedidoCakto } from '../pagamento/webhook';
import { PLANOS } from '../planos';
import { enviarBoasVindas } from './emailBoasVindas';
import { enviarGa4 } from './ga4';
import type { Periodo } from '../planos';
import type { Contexto } from './registro';
import { supabaseServidor } from './supabase';

/** Pagamento pela Cakto no servidor (docs/superpowers/specs/2026-10-18-pagamento-cakto-design.md §3–§5). */

export type AssinaturaVisivel = {
  id: string;
  plano: PlanoPago;
  periodo: Periodo;
  status: StatusAssinatura;
  validoAte: string;
  email: string | null;
};

const CODIGO = /^[0-9a-f]{32}$/;
type Linha = Record<string, unknown>;

function paraAssinatura(l: Linha): AssinaturaVisivel {
  return {
    id: String(l.id),
    plano: l.plano === 'pro' ? 'pro' : 'basic',
    periodo: l.periodo === 'anual' ? 'anual' : 'mensal',
    status: l.status === 'cancelada' || l.status === 'estornada' ? l.status : 'ativa',
    validoAte: String(l.valido_ate),
    email: typeof l.email === 'string' ? l.email : null,
  };
}

const valida = (a: AssinaturaVisivel, agora: Date) => a.status !== 'estornada' && Date.parse(a.validoAte) > agora.getTime();

/** Assinaturas válidas ligadas ao navegador, Pro primeiro. */
async function assinaturasDoVisitante(visitante: string, agora: Date): Promise<AssinaturaVisivel[]> {
  const { data, error } = await supabaseServidor()
    .from('assinatura_navegadores')
    .select('assinaturas(id, plano, periodo, status, valido_ate, email)')
    .eq('visitante', visitante);
  if (error) throw new Error(`assinaturas do visitante: ${error.message}`);
  return ((data ?? []) as Array<{ assinaturas: Linha | Linha[] | null }>)
    .flatMap((l) => (Array.isArray(l.assinaturas) ? l.assinaturas : l.assinaturas ? [l.assinaturas] : []))
    .map(paraAssinatura)
    .filter((a) => valida(a, agora))
    .sort((a, b) => Number(b.plano === 'pro') - Number(a.plano === 'pro'));
}

/** A maior assinatura válida com este e-mail (conta logada, em qualquer aparelho). */
export async function assinaturaDoEmail(email: string, agora = new Date()): Promise<AssinaturaVisivel | null> {
  const { data, error } = await supabaseServidor()
    .from('assinaturas')
    .select('id, plano, periodo, status, valido_ate, email')
    .eq('email', email.toLowerCase())
    .neq('status', 'estornada')
    .gt('valido_ate', agora.toISOString())
    .order('valido_ate', { ascending: false })
    .limit(1);
  if (error) throw new Error(`assinatura do e-mail: ${error.message}`);
  const l = (data ?? [])[0] as Linha | undefined;
  return l ? paraAssinatura(l) : null;
}

export async function assinaturaDoVisitante(visitante: string, agora = new Date()): Promise<AssinaturaVisivel | null> {
  return (await assinaturasDoVisitante(visitante, agora))[0] ?? null;
}

/** Código do `?callback=` da Cakto, ligado a este navegador. Sem visitante (robô, cookie bloqueado): null. */
export async function criarCheckout(ctx: Contexto | null, plano: PlanoPago, periodo: Periodo, ga?: DadosGa4): Promise<string | null> {
  if (!ctx) return null;
  const codigo = randomBytes(16).toString('hex');
  const { error } = await supabaseServidor()
    .from('checkouts')
    .insert({ codigo, visitante: ctx.visitante, plano, periodo, ga_cliente: ga?.cliente ?? null, ga_sessao: ga?.sessao ?? null, consentimento: ga?.consentimento ?? false });
  if (error) throw new Error(`criar checkout: ${error.message}`);
  return codigo;
}

export type EstadoCheckout =
  | { estado: 'pago'; plano: PlanoPago; periodo: Periodo; validoAte: string; status: StatusAssinatura; email: string | null }
  | { estado: 'esperando' }
  | { estado: 'desconhecido' };

/** Situação de um checkout para /obrigado. O e-mail da compra só aparece no navegador que fez o checkout. */
export async function estadoDoCheckout(codigo: string, visitante: string | null, agora = new Date()): Promise<EstadoCheckout> {
  if (!CODIGO.test(codigo)) return { estado: 'desconhecido' };
  const { data, error } = await supabaseServidor().from('checkouts').select('visitante, plano, periodo').eq('codigo', codigo).maybeSingle();
  if (error) throw new Error(`checkout: ${error.message}`);
  if (!data) return { estado: 'desconhecido' };
  const c = data as Linha;
  const comprada = (await assinaturasDoVisitante(String(c.visitante), agora)).find((a) => a.plano === c.plano);
  if (!comprada) return { estado: 'esperando' };
  return {
    estado: 'pago',
    plano: comprada.plano,
    periodo: comprada.periodo,
    validoAte: comprada.validoAte,
    status: comprada.status,
    email: visitante === c.visitante ? comprada.email : null,
  };
}

/** Assinatura atual do pedido: pela assinatura da Cakto; sem ela (pedido avulso), pelo e-mail + plano (a mais recente). */
async function assinaturaDoPedido(p: PedidoCakto, plano: PlanoPago): Promise<(Assinatura & { id: string }) | null> {
  const consulta = supabaseServidor().from('assinaturas').select('id, plano, periodo, status, valido_ate');
  let r;
  if (p.assinaturaCakto) r = await consulta.eq('cakto_assinatura', p.assinaturaCakto).maybeSingle();
  else if (p.email) r = await consulta.eq('email', p.email).eq('plano', plano).order('criado_em', { ascending: false }).limit(1).maybeSingle();
  else return null;
  if (r.error) throw new Error(`assinatura do pedido: ${r.error.message}`);
  if (!r.data) return null;
  const a = paraAssinatura(r.data as Linha);
  return { id: a.id, plano: a.plano, periodo: a.periodo, status: a.status, validoAte: a.validoAte };
}

/** O evento já terminou? Recebido sem terminar (falhou no meio) pode ser reenviado. */
async function eventoAplicado(p: PedidoCakto): Promise<boolean> {
  const { data, error } = await supabaseServidor().from('cakto_eventos').select('aplicado_em').eq('pedido', p.pedido).eq('evento', p.evento).maybeSingle();
  if (error) throw new Error(`ler evento da Cakto: ${error.message}`);
  return Boolean((data as Linha | null)?.aplicado_em);
}

/**
 * Efeito na assinatura e a marca dele no evento, na mesma transação (aplicar_efeito_cakto, 0024): num reenvio, o banco
 * devolve o que já foi feito em vez de aplicar de novo. A chave é única no banco, então tenta de novo se (raramente) colidir.
 */
async function gravarEfeito(p: PedidoCakto, efeito: Efeito, atual: { id: string } | null): Promise<{ assinatura: string | null; efeito: Efeito['tipo'] }> {
  const criar = efeito.tipo === 'criar' ? efeito : null;
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const { data, error } = await supabaseServidor().rpc('aplicar_efeito_cakto', {
      p_pedido: p.pedido, p_evento: p.evento, p_efeito: efeito.tipo, p_assinatura: atual?.id ?? null,
      p_valido_ate: efeito.tipo === 'criar' || efeito.tipo === 'estender' || efeito.tipo === 'estornar' ? efeito.validoAte : null,
      p_cakto_assinatura: p.assinaturaCakto, p_plano: criar?.plano ?? null, p_periodo: criar?.periodo ?? null, p_email: p.email,
      p_chave: criar ? gerarChave() : null,
    });
    if (!error) {
      const l = data as { assinatura: string | null; efeito: Efeito['tipo'] } | null;
      if (!l) throw new Error('efeito da Cakto: resposta vazia');
      return l;
    }
    if (error.code !== '23505' || !error.message.includes('chave')) throw new Error(`efeito da Cakto: ${error.message}`);
  }
  throw new Error('efeito da Cakto: chave repetida três vezes');
}

/** Navegador do checkout (código do `?callback=`), para ligar o plano nele. */
async function checkoutDoPedido(callback: string | null): Promise<{ visitante: string; ga: DadosGa4 } | null> {
  if (!callback || !CODIGO.test(callback)) return null;
  const { data, error } = await supabaseServidor()
    .from('checkouts')
    .select('visitante, ga_cliente, ga_sessao, consentimento')
    .eq('codigo', callback)
    .maybeSingle();
  if (error) throw new Error(`checkout do pedido: ${error.message}`);
  if (!data) return null;
  const l = data as Linha;
  return {
    visitante: String(l.visitante),
    ga: { cliente: typeof l.ga_cliente === 'string' ? l.ga_cliente : null, sessao: typeof l.ga_sessao === 'string' ? l.ga_sessao : null, consentimento: l.consentimento === true },
  };
}

/** Visitante usado no evento `assinou` quando a compra não veio de um checkout do site. */
const VISITANTE_DESCONHECIDO = '00000000-0000-4000-8000-000000000000';

/** Tarefa que pode rodar depois da resposta ao webhook (a rota passa o `after` do Next; sem ele, roda na hora). */
export type Agendar = (tarefa: () => Promise<unknown>) => void | Promise<unknown>;
const naHora: Agendar = (tarefa) => tarefa();

/**
 * Aplica um pedido do webhook da Cakto (spec do pagamento, §4). Idempotente: o par (pedido, evento) só tem efeito uma
 * vez, e só é 'repetido' depois de terminar (aplicado_em): quem falhou no meio responde 500 e o reenvio termina o
 * trabalho. Oferta desconhecida não marca aplicado, para poder reenviar depois de configurar.
 * O registro do evento guarda só o pedido já lido (sem cartão, documento, telefone ou endereço). Assinatura nova com
 * e-mail: boas-vindas com o código para ativar a conta (agendado; falhar não derruba o webhook; a idempotência por pedido
 * segura o reenvio). A medição fica logo antes da marca final: um reenvio não perde a venda e só repetiria o `assinou`
 * se a própria marca falhasse.
 */
export async function aplicarPedido(
  p: PedidoCakto,
  cfg: ConfigPagamento,
  agora: Date,
  agendar: Agendar = naHora,
): Promise<'aplicado' | 'repetido' | 'ignorado'> {
  const registro = await supabaseServidor().from('cakto_eventos').insert({ pedido: p.pedido, evento: p.evento, corpo: p });
  if (registro.error) {
    if (registro.error.code !== '23505') throw new Error(`registrar evento da Cakto: ${registro.error.message}`);
    if (await eventoAplicado(p)) return 'repetido';
  }
  const oferta = planoDaOferta(cfg, p.ofertaId);
  if (!oferta) return 'ignorado';
  const atual = await assinaturaDoPedido(p, oferta.plano);
  const calculado = efeitoDoEvento({ evento: p.evento, status: p.status, pagoEm: p.pagoEm, ...oferta, atual, agora });
  const { assinatura: id, efeito } = await gravarEfeito(p, calculado, atual);
  const checkout = id ? await checkoutDoPedido(p.callback) : null;
  const visitante = checkout?.visitante ?? null;
  if (id && visitante) {
    const r = await supabaseServidor().rpc('ligar_navegador', { p_assinatura: id, p_visitante: visitante });
    if (r.error) throw new Error(`ligar navegador do checkout: ${r.error.message}`);
  }
  if (efeito === 'criar') {
    const { error } = await supabaseServidor().from('eventos').insert({
      visitante: visitante ?? VISITANTE_DESCONHECIDO, tipo: 'assinou', interno: false,
      detalhe: { plano: oferta.plano, periodo: oferta.periodo, valor: p.valorCentavos },
    });
    if (error) console.error(`evento assinou: ${error.message}`);
    // Compra no GA4 pelo servidor (vale mesmo sem a volta ao /obrigado); só com o aceite dos cookies.
    if (checkout?.ga.consentimento && checkout.ga.cliente && p.callback) {
      const pro = PLANOS.find((x) => x.id === 'pro')!;
      await enviarGa4(
        corpoCompraGa4({
          cliente: checkout.ga.cliente, sessao: checkout.ga.sessao, codigo: p.callback, periodo: oferta.periodo,
          valorCentavos: oferta.periodo === 'anual' ? pro.centavosAno : pro.centavosMes,
        }),
      );
    }
    const email = p.email;
    if (email) {
      await agendar(() =>
        enviarBoasVindas(email, oferta.periodo, p.pedido).catch((erro: unknown) =>
          console.error('boas-vindas:', erro instanceof Error ? erro.message : erro),
        ),
      );
    }
  }
  const { error } = await supabaseServidor().from('cakto_eventos').update({ aplicado_em: agora.toISOString() }).eq('pedido', p.pedido).eq('evento', p.evento);
  if (error) throw new Error(`marcar evento da Cakto: ${error.message}`);
  return efeito === 'nada' ? 'ignorado' : 'aplicado';
}

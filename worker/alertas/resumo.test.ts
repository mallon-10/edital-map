import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { lerTokenDescadastro } from '../../lib/alertas/token';
import type { ResumoSemanal } from '../../lib/alertas/resumo';
import type { Radar } from '../../lib/radar';
import { criarBancoAlertas } from './banco';
import { ESPERA_CONTAGEM_MS, ESPERAS_REGISTRO_MS, MAX_EMAILS_POR_RODADA, PAUSA_ENTRE_EMAILS_MS } from './executar';
import type { Mensagem, ResultadoEnvio } from './resend';
import {
  avisosDoResumoSemanal,
  criarBancoResumo,
  executarResumo,
  tetoDoResumo,
  type BancoResumo,
  type ContaResumo,
  type RegistroResumo,
  type ResultadoResumo,
} from './resumo';

const SEGREDO = 'x'.repeat(40);
const AGORA = new Date('2026-10-19T10:00:00Z');
/** Meia-noite de 19/10 em Brasília (UTC−3). */
const INICIO_DO_DIA = '2026-10-19T03:00:00.000Z';
const RADAR: Radar = { termos: ['luva'], termosExcluir: [], ufs: ['SC'], municipios: [], valorMin: null, valorMax: null, modalidades: [], soMeEpp: false };
/** Os tokens de descadastro só aceitam uuid: 'u1' → 75310000-0000-4000-8000-000000000000. */
const id = (s: string) => `${Buffer.from(s).toString('hex').padEnd(8, '0').slice(0, 8)}-0000-4000-8000-000000000000`;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const conta = (nome: string): ContaResumo => ({ userId: id(nome), email: `${nome}@empresa.com.br`, radar: RADAR });
const resumo = (novas: number, prazo: number): ResumoSemanal => ({
  total: 10, novas, prazoProximo: prazo, valorTotal: 0, comValor: 0, orgaos: [], cidades: [], encerrando: [],
  novos: novas ? [{ id: 'e1', slug: '00394452000103-2026-1', objeto: 'Aquisição de luvas', orgao_nome: 'P', municipio_nome: null, uf: 'SC', valor_estimado: null, encerramento_em: '2026-10-30T13:00:00Z', situacao_id: 1 }] : [],
});

type Opcoes = { envio?: ResultadoEnvio | ((m: Mensagem) => ResultadoEnvio); alertasHoje?: number; falhasRegistroEnviado?: number };

function montar(contas: ContaResumo[], resumos: Record<string, ResumoSemanal | null | Error>, o: Opcoes = {}) {
  const registros: RegistroResumo[] = [];
  const eventos: unknown[] = [];
  const logs: string[] = [];
  const desdes: string[] = [];
  let falhasRegistro = o.falhasRegistroEnviado ?? 0;
  const banco: BancoResumo = {
    contasParaResumo: async () => contas,
    emailsDeAlertasHoje: async (desde) => {
      desdes.push(desde);
      return o.alertasHoje ?? 0;
    },
    resumoDaConta: async (c) => {
      const nome = Object.keys(resumos).find((k) => id(k) === c.userId) ?? '';
      const r = resumos[nome];
      if (r instanceof Error) throw r;
      return r ?? null;
    },
    registrarResumo: async (r) => {
      if (r.status === 'enviado' && falhasRegistro > 0) {
        falhasRegistro--;
        throw new Error('envios_resumo: conexão caiu');
      }
      registros.push(r);
    },
    gravarEventoResumo: async (d) => {
      eventos.push(d);
    },
  };
  const enviar = vi.fn(async (m: Mensagem): Promise<ResultadoEnvio> => {
    if (typeof o.envio === 'function') return o.envio(m);
    return o.envio ?? { ok: true, id: 'msg-r', tentativas: 1 };
  });
  const esperar = vi.fn(async (_ms: number) => undefined);
  return {
    deps: { banco, enviar, segredo: SEGREDO, agora: () => AGORA, esperar, log: (l: string) => void logs.push(l) },
    registros, eventos, enviar, esperar, logs, desdes,
  };
}

const VAZIO: ResultadoResumo = {
  contas: 0, emails: 0, enviados: 0, semNovidades: 0, falhas: 0, adiados: 0, cotaEsgotada: false, aceitosSemRegistro: 0, alertasHoje: 0, teto: MAX_EMAILS_POR_RODADA,
};

describe('rodada do resumo semanal', () => {
  it('com novidade: um e-mail por conta, enviado só depois do aceite, evento sem e-mail', async () => {
    const U1 = '22222222-2222-4222-8222-222222222222';
    const t = montar([{ userId: U1, email: 'dono@empresa.com.br', radar: RADAR }], {});
    t.deps.banco.resumoDaConta = async () => resumo(3, 2);
    const r = await executarResumo(t.deps);
    const m = t.enviar.mock.calls[0][0];
    expect(m.para).toBe('dono@empresa.com.br');
    expect(m.assunto).toBe('Sua semana no Edital Map: 3 editais novos no seu radar');
    const token = decodeURIComponent(/t=([^>]+)>/.exec(m.cabecalhos['List-Unsubscribe'])![1]);
    expect(lerTokenDescadastro(token, SEGREDO)).toEqual({ tipo: 'resumo', conta: U1 });
    expect(m.idempotencia.startsWith(`resumo/${U1}/`)).toBe(true);
    expect(t.registros).toEqual([{ userId: U1, status: 'enviado', qtd: 3, tentativas: 1, idMensagem: 'msg-r', iniciadoEm: AGORA.toISOString() }]);
    expect(t.eventos).toEqual([{ novas: 3, prazo: 2 }]);
    expect(r).toEqual({ ...VAZIO, contas: 1, emails: 1, enviados: 1 });
  });
  it('segredo com espaço no fim (lerSegredo): o token do e-mail vale com o segredo normalizado', async () => {
    const t = montar([conta('u1')], { u1: resumo(1, 0) });
    await executarResumo({ ...t.deps, segredo: `${SEGREDO}\n` });
    const token = decodeURIComponent(/t=([^>]+)>/.exec(t.enviar.mock.calls[0][0].cabecalhos['List-Unsubscribe'])![1]);
    expect(lerTokenDescadastro(token, SEGREDO)).toEqual({ tipo: 'resumo', conta: id('u1') });
  });
  it('sem novidade (ou radar sem termo): sem_novidades, nada enviado', async () => {
    const t = montar([conta('u1'), conta('u2')], { u1: resumo(0, 0), u2: null });
    const r = await executarResumo(t.deps);
    expect(t.enviar).not.toHaveBeenCalled();
    expect(t.registros.map((x) => x.status)).toEqual(['sem_novidades', 'sem_novidades']);
    expect(r.semNovidades).toBe(2);
    expect(t.eventos).toEqual([]);
  });
  it('só prazo próximo também é novidade', async () => {
    const t = montar([conta('u1')], { u1: resumo(0, 4) });
    const r = await executarResumo(t.deps);
    expect(t.enviar.mock.calls[0][0].assunto).toBe('Sua semana no Edital Map: 4 editais encerram em até 7 dias');
    expect(r.enviados).toBe(1);
  });
  it('falha do Resend ou erro do banco: falhou, e as outras contas seguem', async () => {
    const t = montar([conta('u1'), conta('u2')], { u1: new Error('timeout'), u2: resumo(1, 0) }, { envio: { ok: false, erro: 'Resend 500: fora', tentativas: 4 } });
    const r = await executarResumo(t.deps);
    expect(t.registros.map((x) => [x.userId, x.status, x.erro, x.tentativas])).toEqual([[id('u1'), 'falhou', 'timeout', 0], [id('u2'), 'falhou', 'Resend 500: fora', 4]]);
    expect(t.eventos).toEqual([]);
    expect(r.falhas).toBe(2);
    expect(r.emails).toBe(1);
  });
  it('sem chave ou sem segredo: falhou com o motivo, sem chamar o Resend; sem novidade continua sem_novidades', async () => {
    const s = montar([conta('u1'), conta('u2')], { u1: resumo(1, 0), u2: resumo(0, 0) });
    const r = await executarResumo({ ...s.deps, enviar: null });
    expect(s.registros[0]).toMatchObject({ status: 'falhou', erro: 'RESEND_API_KEY ausente', tentativas: 0, qtd: 1 });
    expect(s.registros[1]).toMatchObject({ status: 'sem_novidades' });
    expect(r).toMatchObject({ falhas: 1, semNovidades: 1, emails: 0 });
    expect(s.logs.some((l) => l.includes('envio desligado: RESEND_API_KEY ausente'))).toBe(true);
    const g = montar([conta('u1')], { u1: resumo(1, 0) });
    await executarResumo({ ...g.deps, segredo: null });
    expect(g.enviar).not.toHaveBeenCalled();
    expect(g.registros[0]).toMatchObject({ status: 'falhou', erro: 'ALERTAS_SEGREDO ausente', tentativas: 0 });
  });
  it('pausa entre e-mails, não antes do primeiro', async () => {
    const t = montar([conta('u1'), conta('u2')], { u1: resumo(1, 0), u2: resumo(0, 1) });
    await executarResumo(t.deps);
    expect(t.esperar.mock.calls).toEqual([[PAUSA_ENTRE_EMAILS_MS]]);
  });
  it('mesmo resumo no mesmo dia: a mesma chave de idempotência (rodar de novo não duplica no Resend)', async () => {
    const a = montar([conta('u1')], { u1: resumo(1, 0) });
    const b = montar([conta('u1')], { u1: resumo(1, 0) });
    await executarResumo(a.deps);
    await executarResumo(b.deps);
    expect(a.enviar.mock.calls[0][0].idempotencia).toBe(b.enviar.mock.calls[0][0].idempotencia);
  });
});

describe('cota do Resend dividida com os alertas', () => {
  it('teto = 60 menos os e-mails que os alertas já mandaram hoje (dia de Brasília), nunca negativo', () => {
    expect(tetoDoResumo(0)).toBe(MAX_EMAILS_POR_RODADA);
    expect(tetoDoResumo(45)).toBe(15);
    expect(tetoDoResumo(60)).toBe(0);
    expect(tetoDoResumo(80)).toBe(0);
  });
  it('conta os alertas desde a meia-noite de Brasília e registra no log', async () => {
    const t = montar([conta('u1')], { u1: resumo(1, 0) }, { alertasHoje: 12 });
    const r = await executarResumo(t.deps);
    expect(t.desdes).toEqual([INICIO_DO_DIA]);
    expect(r).toMatchObject({ alertasHoje: 12, teto: 48, enviados: 1 });
    expect(t.logs).toContain('[resumo] alertas de hoje: 12 e-mails; teto do resumo nesta rodada: 48');
  });
  it('contagem dos alertas de hoje: 2 tentativas, 2 s entre elas; depois a rodada para sem enviar', async () => {
    const t = montar([conta('u1')], { u1: resumo(1, 0) });
    let falhas = 1;
    const umaFalha = async () => {
      if (falhas-- > 0) throw new Error('envios_alerta de hoje: timeout');
      return 3;
    };
    expect(await executarResumo({ ...t.deps, banco: { ...t.deps.banco, emailsDeAlertasHoje: umaFalha } })).toMatchObject({ alertasHoje: 3, enviados: 1 });
    expect(t.esperar.mock.calls[0]).toEqual([ESPERA_CONTAGEM_MS]);

    const u = montar([conta('u1')], { u1: resumo(1, 0) });
    const sempre = vi.fn(async (_desde: string): Promise<number> => {
      throw new Error('envios_alerta de hoje: timeout');
    });
    await expect(executarResumo({ ...u.deps, banco: { ...u.deps.banco, emailsDeAlertasHoje: sempre } })).rejects.toThrow('envios_alerta de hoje: timeout');
    expect(sempre).toHaveBeenCalledTimes(2);
    expect(u.esperar.mock.calls).toEqual([[ESPERA_CONTAGEM_MS]]);
    expect(u.enviar).not.toHaveBeenCalled();
    expect(u.registros).toEqual([]);
  });
  it('acima do teto: não envia nem registra (a regra dos 6 dias deixa a conta para a próxima segunda)', async () => {
    const t = montar([conta('u1'), conta('u2'), conta('u3'), conta('u4')], { u1: resumo(1, 0), u2: resumo(0, 0), u3: resumo(2, 0), u4: resumo(1, 0) }, { alertasHoje: MAX_EMAILS_POR_RODADA - 2 });
    const r = await executarResumo(t.deps);
    expect(t.enviar).toHaveBeenCalledTimes(2);
    expect(t.registros.map((x) => [x.userId, x.status])).toEqual([[id('u1'), 'enviado'], [id('u2'), 'sem_novidades'], [id('u3'), 'enviado']]);
    expect(r).toMatchObject({ contas: 4, enviados: 2, semNovidades: 1, adiados: 1, falhas: 0, teto: 2 });
  });
  it('envio recusado não gasta o teto', async () => {
    let n = 0;
    const t = montar([conta('u1'), conta('u2')], { u1: resumo(1, 0), u2: resumo(1, 0) }, {
      alertasHoje: MAX_EMAILS_POR_RODADA - 1,
      envio: () => (n++ === 0 ? { ok: false, erro: 'Resend 422: endereço inválido', tentativas: 1 } : { ok: true, id: 'msg-2', tentativas: 1 }),
    });
    const r = await executarResumo(t.deps);
    expect(r).toMatchObject({ enviados: 1, falhas: 1, adiados: 0 });
  });
  it('os alertas já gastaram o teto: nenhuma conta é lida nem registrada', async () => {
    const t = montar([conta('u1'), conta('u2')], { u1: resumo(1, 0), u2: resumo(1, 0) }, { alertasHoje: 70 });
    const resumoDaConta = vi.spyOn(t.deps.banco, 'resumoDaConta');
    const r = await executarResumo(t.deps);
    expect(resumoDaConta).not.toHaveBeenCalled();
    expect(t.registros).toEqual([]);
    expect(r).toMatchObject({ contas: 2, adiados: 2, teto: 0, falhas: 0 });
  });
  it('cota esgotada (429): falhou nesta conta, a rodada para e as outras não são registradas', async () => {
    const t = montar([conta('u1'), conta('u2'), conta('u3')], { u1: resumo(1, 0), u2: resumo(1, 0), u3: resumo(1, 0) }, {
      envio: { ok: false, erro: 'Resend 429: daily quota', tentativas: 1, cotaEsgotada: true },
    });
    const r = await executarResumo(t.deps);
    expect(t.enviar).toHaveBeenCalledTimes(1);
    expect(t.registros.map((x) => [x.userId, x.status])).toEqual([[id('u1'), 'falhou']]);
    expect(r).toMatchObject({ cotaEsgotada: true, adiados: 2, falhas: 1 });
  });
});

describe('registro depois do aceite', () => {
  it('o registro do enviado falha uma vez e depois grava: enviado (espera 2 s), sem falhou', async () => {
    const t = montar([conta('u1')], { u1: resumo(1, 0) }, { falhasRegistroEnviado: 1 });
    const r = await executarResumo(t.deps);
    expect(t.registros.map((x) => x.status)).toEqual(['enviado']);
    expect(t.esperar.mock.calls).toEqual([[ESPERAS_REGISTRO_MS[0]]]);
    expect(r).toMatchObject({ enviados: 1, falhas: 0, aceitosSemRegistro: 0 });
    expect(t.eventos).toHaveLength(1);
  });
  it('o registro falha de vez: não vira falhou (o e-mail saiu), marcador no log e falha na rodada', async () => {
    const t = montar([conta('u1'), conta('u2')], { u1: resumo(1, 0), u2: resumo(1, 0) }, { falhasRegistroEnviado: 3 });
    const r = await executarResumo(t.deps);
    expect(t.registros.map((x) => [x.userId, x.status])).toEqual([[id('u2'), 'enviado']]);
    expect(r).toMatchObject({ enviados: 1, aceitosSemRegistro: 1, falhas: 1 });
    expect(t.logs.some((l) => l.startsWith(`[resumo] ACEITO_SEM_REGISTRO conta ${id('u1').slice(0, 8)} msg msg-r`))).toBe(true);
  });
});

describe('logs e avisos', () => {
  it('logs sem e-mail e sem uuid completo', async () => {
    const t = montar([conta('u1'), conta('u2')], { u1: new Error(`falhou para ${id('u1')} u1@empresa.com.br`), u2: resumo(1, 0) }, {
      envio: { ok: false, erro: 'Resend 422: invalid to u2@empresa.com.br', tentativas: 1 },
    });
    await executarResumo(t.deps);
    expect(t.logs.length).toBeGreaterThan(0);
    for (const l of t.logs) {
      expect(l).not.toMatch(/@/);
      expect(l).not.toMatch(UUID);
    }
  });
  it('avisos do GitHub: só contagens; adiar sozinho não é falha', () => {
    expect(avisosDoResumoSemanal(VAZIO)).toEqual([]);
    expect(avisosDoResumoSemanal({ ...VAZIO, adiados: 5, alertasHoje: 50, teto: 10 })).toEqual([
      '::warning::Teto do resumo atingido (10 e-mails; os alertas de hoje usaram 50 de 60): 5 contas ficaram para a próxima segunda',
    ]);
    expect(avisosDoResumoSemanal({ ...VAZIO, adiados: 3, cotaEsgotada: true })).toEqual(['::warning::Cota do Resend esgotada: 3 contas ficaram para a próxima segunda']);
    expect(avisosDoResumoSemanal({ ...VAZIO, aceitosSemRegistro: 2 })).toEqual([
      '::error::2 resumos enviados sem registro (podem repetir se a rodada for refeita): procure ACEITO_SEM_REGISTRO no log',
    ]);
  });
});

describe('banco do resumo', () => {
  it('contas, resumo com os filtros do radar, histórico e evento', async () => {
    const chamadas: unknown[][] = [];
    const sb = {
      rpc: vi.fn(async (nome: string, args?: unknown) => {
        chamadas.push([nome, args]);
        if (nome === 'contas_para_resumo') {
          return { data: [{ user_id: 'u1', email: 'u1@empresa.com.br', termos: ['luva'], termos_excluir: [], ufs: ['SC'], municipios: [], valor_min: null, valor_max: null, modalidades: [], so_me_epp: false }], error: null };
        }
        return { data: { total: 1, novas: 1, prazo_proximo: 0, valor_total: 0, com_valor: 0, novos: [], encerrando: [], orgaos: [], cidades: [] }, error: null };
      }),
      from: vi.fn((tabela: string) => ({ insert: async (linha: unknown) => (chamadas.push([tabela, linha]), { error: null }) })),
    } as unknown as SupabaseClient;
    const b = criarBancoResumo(sb);
    const [c] = await b.contasParaResumo();
    expect(c).toEqual({ userId: 'u1', email: 'u1@empresa.com.br', radar: RADAR });
    expect((await b.resumoDaConta(c))?.novas).toBe(1);
    expect(chamadas[1]).toEqual(['resumo_do_radar', expect.objectContaining({ p_user: 'u1', p_termos: ['luva'], p_ufs: ['SC'] })]);
    await b.registrarResumo({ userId: 'u1', status: 'enviado', qtd: 1, tentativas: 1, idMensagem: 'm', iniciadoEm: 't' });
    expect(chamadas[2]).toEqual(['envios_resumo', { user_id: 'u1', status: 'enviado', qtd_editais: 1, tentativas: 1, erro: null, id_mensagem: 'm', iniciado_em: 't' }]);
    await b.gravarEventoResumo({ novas: 1, prazo: 0 });
    expect(chamadas[3]).toEqual(['eventos', expect.objectContaining({ tipo: 'resumo_enviado', detalhe: { novas: 1, prazo: 0 }, interno: false })]);
  });
  it('erro do banco vira exceção com o contexto', async () => {
    const sb = { rpc: vi.fn(async () => ({ data: null, error: { message: 'sem permissão' } })) } as unknown as SupabaseClient;
    await expect(criarBancoResumo(sb).contasParaResumo()).rejects.toThrow('contas_para_resumo: sem permissão');
  });
  it('e-mails dos alertas hoje: contas distintas com envio aceito desde o início do dia', async () => {
    const filtros: unknown[][] = [];
    const consulta = {
      select: (c: string) => (filtros.push(['select', c]), consulta),
      eq: (c: string, v: unknown) => (filtros.push(['eq', c, v]), consulta),
      gte: (c: string, v: unknown) => (filtros.push(['gte', c, v]), consulta),
      limit: (n: number) => {
        filtros.push(['limit', n]);
        return Promise.resolve({ data: [{ user_id: 'a' }, { user_id: 'a' }, { user_id: 'b' }], error: null });
      },
    };
    const sb = { from: vi.fn((t: string) => (filtros.push(['from', t]), consulta)) } as unknown as SupabaseClient;
    expect(await criarBancoResumo(sb).emailsDeAlertasHoje(INICIO_DO_DIA)).toBe(2);
    // os dois modos leem a mesma contagem (o teto do resumo e o dos alertas)
    expect(await criarBancoAlertas(sb).emailsDeAlertasHoje(INICIO_DO_DIA)).toBe(2);
    const umaLeitura = [['from', 'envios_alerta'], ['select', 'user_id'], ['eq', 'status', 'enviado'], ['gte', 'iniciado_em', INICIO_DO_DIA], ['limit', 10000]];
    expect(filtros).toEqual([...umaLeitura, ...umaLeitura]);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { lerTokenDescadastro } from '../../lib/alertas/token';
import type { Radar } from '../../lib/radar';
import type { AlertaParaEnvio, BancoAlertas, EditalAlerta, RegistroEnvio } from './banco';
import {
  chaveIdempotencia,
  executarAlertas,
  avisosDoResumo,
  desdeDoAlerta,
  MAX_EMAILS_POR_RODADA,
  motivoSemEnvio,
  PAUSA_ENTRE_EMAILS_MS,
  porConta,
  porEspera,
  type DepsAlertas,
} from './executar';
import type { Enviar, Mensagem, ResultadoEnvio } from './resend';

const SEGREDO = 'x'.repeat(40);
const AGORA = new Date('2026-10-19T10:00:00Z');
const RADAR: Radar = { termos: ['luva'], termosExcluir: [], ufs: [], municipios: [], valorMin: null, valorMax: null, modalidades: [], soMeEpp: false };
/** Os tokens de descadastro só aceitam uuid: 'a' → 61000000-0000-4000-8000-000000000000. */
const id = (s: string) => `${Buffer.from(s).toString('hex').padEnd(8, '0').slice(0, 8)}-0000-4000-8000-000000000000`;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const al = (a: string, conta: string, plano: 'gratis' | 'pro', criadoEm: string, extra: Partial<AlertaParaEnvio> = {}): AlertaParaEnvio => ({
  id: id(a), userId: id(conta), email: `${conta}@empresa.com.br`, plano, nome: `alerta ${a}`, radar: RADAR, ultimoEnvioEm: null, criadoEm, ...extra,
});
const ed = (e: string): EditalAlerta => ({
  id: e, slug: `00394452000103-2026-${e.length}`, objeto: 'Aquisição de luvas', orgao_nome: 'PREFEITURA', municipio_nome: 'Joinville', uf: 'SC', valor_estimado: 100,
  encerramento_em: '2026-10-30T13:00:00Z', situacao_id: 1,
});

function montar(alertas: AlertaParaEnvio[], editais: Record<string, { editais: EditalAlerta[]; total: number } | Error> = {}, envio?: ResultadoEnvio) {
  const ordem: string[] = [];
  const registros: RegistroEnvio[] = [];
  const eventos: unknown[] = [];
  const logs: string[] = [];
  const consultas: Array<{ id: string; desde: string; limite: number }> = [];
  const porId = new Map(Object.entries(editais).map(([k, v]) => [id(k), v]));
  const banco: BancoAlertas = {
    alertasParaEnvio: async () => alertas,
    editaisDoAlerta: async (a, desde, limite) => {
      consultas.push({ id: a.id, desde, limite });
      const r = porId.get(a.id) ?? { editais: [], total: 0 };
      if (r instanceof Error) throw r;
      return r;
    },
    registrarEnvio: async (r) => {
      ordem.push(`registrar:${r.status}`);
      registros.push(r);
    },
    gravarEventoEnvio: async (d) => {
      eventos.push(d);
    },
  };
  const enviar = vi.fn(async (m: Mensagem) => {
    ordem.push(`enviar:${m.para}`);
    return envio ?? { ok: true as const, id: 'msg-1', tentativas: 1 };
  });
  const esperar = vi.fn(async (_ms: number) => {
    ordem.push('esperar');
  });
  const deps: DepsAlertas = { banco, enviar, segredo: SEGREDO, agora: () => AGORA, esperar, log: (l) => void logs.push(l) };
  return { deps, ordem, registros, eventos, consultas, enviar, esperar, logs };
}

describe('rodada dos alertas', () => {
  it('Grátis: pulado_plano em todos, sem buscar editais nem enviar', async () => {
    const t = montar([al('a', 'u1', 'gratis', '2026-10-01T00:00:00Z'), al('b', 'u1', 'gratis', '2026-10-02T00:00:00Z')]);
    const r = await executarAlertas(t.deps);
    expect(t.registros.map((x) => [x.alertaId, x.status])).toEqual([[id('a'), 'pulado_plano'], [id('b'), 'pulado_plano']]);
    expect(t.consultas).toEqual([]);
    expect(t.enviar).not.toHaveBeenCalled();
    expect(r).toMatchObject({ contas: 1, emails: 0, puladosPlano: 2 });
  });
  it('Pro: até 5 alertas, pelo mais antigo; o 6º fica pulado_plano', async () => {
    const lista = ['f', 'e', 'd', 'c', 'b', 'a'].map((a, i) => al(a, 'u1', 'pro', `2026-10-0${6 - i}T00:00:00Z`));
    const t = montar(lista);
    await executarAlertas(t.deps);
    expect(t.consultas.map((c) => c.id)).toEqual(['a', 'b', 'c', 'd', 'e'].map(id));
    expect(t.registros.find((x) => x.status === 'pulado_plano')?.alertaId).toBe(id('f'));
  });
  it('janela: com envio, desde ele; sem envio, 24 h antes da criação (no máximo 7 dias + 24 h); até 20 editais', async () => {
    const t = montar([
      al('a', 'u1', 'pro', '2026-10-01T00:00:00Z'),
      al('b', 'u1', 'pro', '2026-10-02T00:00:00Z', { ultimoEnvioEm: '2026-10-17T10:00:05Z' }),
      al('c', 'u1', 'pro', '2026-10-18T12:00:00Z'),
    ]);
    await executarAlertas(t.deps);
    expect(t.consultas).toEqual([
      { id: id('a'), desde: '2026-10-11T10:00:00.000Z', limite: 20 },
      { id: id('b'), desde: '2026-10-17T10:00:05Z', limite: 20 },
      { id: id('c'), desde: '2026-10-17T12:00:00.000Z', limite: 20 },
    ]);
  });
  it('janela sem envio: ancorada na criação, não no relógio (o mesmo valor amanhã)', () => {
    const amanha = new Date(AGORA.getTime() + 24 * 60 * 60 * 1000);
    expect(desdeDoAlerta(null, '2026-10-18T12:00:00Z', AGORA)).toBe('2026-10-17T12:00:00.000Z');
    expect(desdeDoAlerta(null, '2026-10-18T12:00:00Z', amanha)).toBe('2026-10-17T12:00:00.000Z');
    expect(desdeDoAlerta('2026-10-18T10:00:00Z', '2026-10-01T00:00:00Z', AGORA)).toBe('2026-10-18T10:00:00Z');
    expect(desdeDoAlerta(null, 'lixo', AGORA)).toBe('2026-10-18T10:00:00.000Z');
  });
  it('sem novidade: sem_novidades e nenhum e-mail', async () => {
    const t = montar([al('a', 'u1', 'pro', '2026-10-01T00:00:00Z')]);
    const r = await executarAlertas(t.deps);
    expect(t.registros.map((x) => x.status)).toEqual(['sem_novidades']);
    expect(t.enviar).not.toHaveBeenCalled();
    expect(r.semNovidades).toBe(1);
  });
  it('um e-mail por conta com as seções dos alertas com novidade; enviado só depois do aceite, com os ids', async () => {
    const t = montar(
      [al('a', 'u1', 'pro', '2026-10-01T00:00:00Z'), al('b', 'u1', 'pro', '2026-10-02T00:00:00Z'), al('c', 'u1', 'pro', '2026-10-03T00:00:00Z')],
      { a: { editais: [ed('e1'), ed('e22')], total: 2 }, b: { editais: [ed('e333')], total: 1 } },
    );
    const r = await executarAlertas(t.deps);
    expect(t.enviar).toHaveBeenCalledTimes(1);
    const m = t.enviar.mock.calls[0][0];
    expect(m.para).toBe('u1@empresa.com.br');
    expect(m.assunto).toBe('3 editais novos nos seus alertas');
    expect(m.idempotencia).toBe(chaveIdempotencia('alertas', id('u1'), ['e1', 'e22', 'e333']));
    expect(t.ordem).toEqual(['registrar:sem_novidades', 'enviar:u1@empresa.com.br', 'registrar:enviado', 'registrar:enviado']);
    expect(t.registros.filter((x) => x.status === 'enviado')).toEqual([
      { alertaId: id('a'), status: 'enviado', qtd: 2, tentativas: 1, idMensagem: 'msg-1', ids: ['e1', 'e22'], selecionadoEm: AGORA.toISOString(), avancar: true },
      { alertaId: id('b'), status: 'enviado', qtd: 1, tentativas: 1, idMensagem: 'msg-1', ids: ['e333'], selecionadoEm: AGORA.toISOString(), avancar: true },
    ]);
    expect(t.eventos).toEqual([{ qtd: 3, alertas: 2 }]);
    expect(r).toMatchObject({ contas: 1, emails: 1, enviados: 2, semNovidades: 1, editais: 3, falhas: 0, adiados: 0, cotaEsgotada: false });
  });
  it('List-Unsubscribe com um token que vale para "todos" da conta; link por alerta no corpo', async () => {
    const conta = '22222222-2222-4222-8222-222222222222';
    const alerta = { ...al('a', 'x', 'pro', '2026-10-01T00:00:00Z'), userId: conta };
    const t = montar([alerta], { a: { editais: [ed('e1')], total: 1 } });
    await executarAlertas(t.deps);
    const m = t.enviar.mock.calls[0][0];
    const token = decodeURIComponent(/t=([^>]+)>/.exec(m.cabecalhos['List-Unsubscribe'])![1]);
    expect(lerTokenDescadastro(token, SEGREDO)).toEqual({ tipo: 'todos', conta });
    expect(m.cabecalhos['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    const tokens = [...m.texto.matchAll(/\/alertas\/sair\?t=([^\s]+)/g)].map((x) => lerTokenDescadastro(decodeURIComponent(x[1]), SEGREDO));
    expect(tokens).toContainEqual({ tipo: 'alerta', id: id('a') });
  });
  it('sobra (mais de 20): a janela não avança; nunca enviado fixa a janela usada (não a de 24 h do banco)', async () => {
    const t = montar(
      [al('a', 'u1', 'pro', '2026-10-18T12:00:00Z'), al('b', 'u1', 'pro', '2026-10-01T00:00:00Z', { ultimoEnvioEm: '2026-10-18T10:00:00Z' })],
      { a: { editais: [ed('e1')], total: 25 }, b: { editais: [ed('e2')], total: 25 } },
    );
    await executarAlertas(t.deps);
    const [b, a] = t.registros;
    expect(a).toMatchObject({ alertaId: id('a'), status: 'enviado', avancar: false, janelaInicial: '2026-10-17T12:00:00.000Z' });
    expect(b).toMatchObject({ alertaId: id('b'), status: 'enviado', avancar: false });
    expect(b.janelaInicial).toBeUndefined();
  });
  it('falha do Resend: falhou com o erro e as tentativas, sem evento', async () => {
    const t = montar([al('a', 'u1', 'pro', '2026-10-01T00:00:00Z')], { a: { editais: [ed('e1')], total: 1 } }, { ok: false, erro: 'Resend 500: fora', tentativas: 4 });
    const r = await executarAlertas(t.deps);
    expect(t.registros).toEqual([{ alertaId: id('a'), status: 'falhou', qtd: 1, tentativas: 4, erro: 'Resend 500: fora', selecionadoEm: AGORA.toISOString() }]);
    expect(t.eventos).toEqual([]);
    expect(r.falhas).toBe(1);
  });
  it('sem chave ou sem segredo: falhou com o motivo, sem chamar o Resend', async () => {
    for (const [mudanca, motivo] of [[{ enviar: null }, 'RESEND_API_KEY ausente'], [{ segredo: null }, 'ALERTAS_SEGREDO ausente']] as const) {
      const t = montar([al('a', 'u1', 'pro', '2026-10-01T00:00:00Z')], { a: { editais: [ed('e1')], total: 1 } });
      const r = await executarAlertas({ ...t.deps, ...mudanca });
      expect(t.registros).toEqual([{ alertaId: id('a'), status: 'falhou', qtd: 1, tentativas: 0, erro: motivo, selecionadoEm: AGORA.toISOString() }]);
      expect(t.enviar).not.toHaveBeenCalled();
      expect(r.falhas).toBe(1);
      expect(t.logs.some((l) => l.includes(motivo))).toBe(true);
    }
    expect(motivoSemEnvio({ enviar: null, segredo: null, agora: () => AGORA, esperar: async () => undefined, log: () => undefined })).toBe('RESEND_API_KEY ausente');
  });
  it('erro ao buscar um alerta não derruba os outros', async () => {
    const t = montar([al('a', 'u1', 'pro', '2026-10-01T00:00:00Z'), al('b', 'u2', 'pro', '2026-10-01T00:00:00Z')], { a: new Error('timeout'), b: { editais: [ed('e1')], total: 1 } });
    const r = await executarAlertas(t.deps);
    expect(t.registros.map((x) => [x.alertaId, x.status, x.erro ?? null])).toEqual([[id('a'), 'falhou', 'timeout'], [id('b'), 'enviado', null]]);
    expect(r).toMatchObject({ falhas: 1, enviados: 1 });
  });
  it('uma conta que quebra (envio lança) fica falhou e as outras seguem', async () => {
    const t = montar([al('a', 'u1', 'pro', '2026-10-01T00:00:00Z'), al('b', 'u2', 'pro', '2026-10-01T00:00:00Z')], { a: { editais: [ed('e1')], total: 1 }, b: { editais: [ed('e2')], total: 1 } });
    const enviar = vi.fn<Enviar>(async (m) => {
      if (m.para.startsWith('u1')) throw new Error('bug');
      return { ok: true, id: 'msg-2', tentativas: 1 };
    });
    const r = await executarAlertas({ ...t.deps, enviar });
    expect(t.registros.map((x) => [x.alertaId, x.status, x.erro ?? null])).toEqual([[id('a'), 'falhou', 'bug'], [id('b'), 'enviado', null]]);
    expect(r).toMatchObject({ falhas: 1, enviados: 1 });
  });
  it('aceito pelo Resend e o registro falha: não vira falhou (o e-mail saiu)', async () => {
    const t = montar([al('a', 'u1', 'pro', '2026-10-01T00:00:00Z'), al('b', 'u2', 'pro', '2026-10-01T00:00:00Z')], { a: { editais: [ed('e1')], total: 1 }, b: { editais: [ed('e2')], total: 1 } });
    const registrar = t.deps.banco.registrarEnvio;
    const banco: BancoAlertas = {
      ...t.deps.banco,
      registrarEnvio: async (x) => {
        if (x.alertaId === id('a')) throw new Error('banco fora');
        return registrar(x);
      },
    };
    const r = await executarAlertas({ ...t.deps, banco });
    expect(t.registros.map((x) => [x.alertaId, x.status])).toEqual([[id('b'), 'enviado']]);
    expect(r).toMatchObject({ falhas: 1, enviados: 1, emails: 2, aceitosSemRegistro: 1 });
    expect(t.logs).toContain(`[alertas] ACEITO_SEM_REGISTRO alerta ${id('a').slice(0, 8)} msg msg-1 qtd 1`);
  });
  it('registro do enviado falha uma vez e depois grava: enviado, sem falhou (espera 2 s)', async () => {
    const t = montar([al('a', 'u1', 'pro', '2026-10-01T00:00:00Z')], { a: { editais: [ed('e1')], total: 1 } });
    const registrar = t.deps.banco.registrarEnvio;
    let vezes = 0;
    const banco: BancoAlertas = {
      ...t.deps.banco,
      registrarEnvio: async (x) => {
        if (vezes++ === 0) throw new Error('timeout');
        return registrar(x);
      },
    };
    const r = await executarAlertas({ ...t.deps, banco });
    expect(t.registros.map((x) => [x.alertaId, x.status])).toEqual([[id('a'), 'enviado']]);
    expect(t.esperar.mock.calls).toEqual([[2000]]);
    expect(t.eventos).toEqual([{ qtd: 1, alertas: 1 }]);
    expect(r).toMatchObject({ falhas: 0, enviados: 1, aceitosSemRegistro: 0 });
  });
  it('registro da seção A falha de vez: a B ainda é registrada e o evento sai', async () => {
    const t = montar(
      [al('a', 'u1', 'pro', '2026-10-01T00:00:00Z'), al('b', 'u1', 'pro', '2026-10-02T00:00:00Z')],
      { a: { editais: [ed('e1')], total: 1 }, b: { editais: [ed('e2'), ed('e3')], total: 2 } },
    );
    const registrar = t.deps.banco.registrarEnvio;
    const banco: BancoAlertas = {
      ...t.deps.banco,
      registrarEnvio: async (x) => {
        if (x.alertaId === id('a')) throw new Error('banco fora');
        return registrar(x);
      },
    };
    const r = await executarAlertas({ ...t.deps, banco });
    expect(t.registros.map((x) => [x.alertaId, x.status])).toEqual([[id('b'), 'enviado']]);
    expect(t.esperar.mock.calls).toEqual([[2000], [4000]]);
    expect(t.eventos).toEqual([{ qtd: 3, alertas: 2 }]);
    expect(t.logs).toContain(`[alertas] ACEITO_SEM_REGISTRO alerta ${id('a').slice(0, 8)} msg msg-1 qtd 1`);
    expect(r).toMatchObject({ falhas: 1, enviados: 1, editais: 2, aceitosSemRegistro: 1 });
  });
  it('pausa de 600 ms entre e-mails, não antes do primeiro', async () => {
    const t = montar([al('a', 'u1', 'pro', '2026-10-01T00:00:00Z'), al('b', 'u2', 'pro', '2026-10-01T00:00:00Z')], { a: { editais: [ed('e1')], total: 1 }, b: { editais: [ed('e2')], total: 1 } });
    await executarAlertas(t.deps);
    expect(t.esperar.mock.calls).toEqual([[PAUSA_ENTRE_EMAILS_MS]]);
    expect(t.ordem.indexOf('esperar')).toBeGreaterThan(t.ordem.indexOf('enviar:u1@empresa.com.br'));
    expect(t.ordem.indexOf('esperar')).toBeLessThan(t.ordem.indexOf('enviar:u2@empresa.com.br'));
  });
  it(`cota do Resend: no máximo ${MAX_EMAILS_POR_RODADA} e-mails aceitos; o resto fica para amanhã, sem registro`, async () => {
    const contas = Array.from({ length: MAX_EMAILS_POR_RODADA + 2 }, (_, i) => `c${i}`);
    const alertas = contas.map((c) => al(c, c, 'pro', '2026-10-01T00:00:00Z'));
    const editais = Object.fromEntries(contas.map((c) => [c, { editais: [ed(`e${c}`)], total: 1 }]));
    const t = montar(alertas, editais);
    const r = await executarAlertas(t.deps);
    expect(t.enviar).toHaveBeenCalledTimes(MAX_EMAILS_POR_RODADA);
    expect(t.registros).toHaveLength(MAX_EMAILS_POR_RODADA);
    expect(t.registros.map((x) => x.alertaId)).not.toContain(id(contas[MAX_EMAILS_POR_RODADA]));
    expect(t.consultas).toHaveLength(MAX_EMAILS_POR_RODADA);
    expect(r).toMatchObject({ contas: MAX_EMAILS_POR_RODADA + 2, emails: MAX_EMAILS_POR_RODADA, enviados: MAX_EMAILS_POR_RODADA, adiados: 2, falhas: 0 });
    expect(t.logs.filter((l) => l.includes('amanhã'))).toEqual([`[alertas] limite de ${MAX_EMAILS_POR_RODADA} e-mails na rodada: 2 contas ficam para amanhã`]);
  });
  it('envio recusado não conta para o limite da rodada', async () => {
    const contas = Array.from({ length: MAX_EMAILS_POR_RODADA + 1 }, (_, i) => `c${i}`);
    const t = montar(contas.map((c) => al(c, c, 'pro', '2026-10-01T00:00:00Z')), Object.fromEntries(contas.map((c) => [c, { editais: [ed(`e${c}`)], total: 1 }])));
    let n = 0;
    const enviar = vi.fn<Enviar>(async () => (n++ === 0 ? { ok: false, erro: 'Resend 422: x', tentativas: 1 } : { ok: true, id: 'm', tentativas: 1 }));
    const r = await executarAlertas({ ...t.deps, enviar });
    expect(enviar).toHaveBeenCalledTimes(MAX_EMAILS_POR_RODADA + 1);
    expect(r).toMatchObject({ enviados: MAX_EMAILS_POR_RODADA, falhas: 1, adiados: 0 });
  });
  it('cota esgotada: falhou nesta conta, a rodada para e as outras ficam para amanhã', async () => {
    const t = montar(
      [al('a', 'u1', 'pro', '2026-10-01T00:00:00Z'), al('b', 'u2', 'pro', '2026-10-01T00:00:00Z'), al('c', 'u3', 'gratis', '2026-10-01T00:00:00Z')],
      { a: { editais: [ed('e1')], total: 1 }, b: { editais: [ed('e2')], total: 1 } },
      { ok: false, erro: 'Resend 429: You have reached your daily email sending quota.', tentativas: 1, cotaEsgotada: true },
    );
    const r = await executarAlertas(t.deps);
    expect(t.enviar).toHaveBeenCalledTimes(1);
    expect(t.registros).toEqual([
      { alertaId: id('a'), status: 'falhou', qtd: 1, tentativas: 1, erro: 'Resend 429: You have reached your daily email sending quota.', selecionadoEm: AGORA.toISOString() },
    ]);
    expect(t.consultas.map((c) => c.id)).toEqual([id('a')]);
    expect(t.eventos).toEqual([]);
    expect(r).toMatchObject({ falhas: 1, enviados: 0, adiados: 2, cotaEsgotada: true });
    expect(t.logs.filter((l) => l.includes('amanhã'))).toEqual(['[alertas] cota do Resend esgotada: rodada encerrada, 2 contas ficam para amanhã']);
  });
  it('quem espera há mais tempo vai primeiro (o que ficou de ontem não fica para sempre)', async () => {
    const t = montar(
      [al('a', 'u1', 'pro', '2026-10-01T00:00:00Z'), al('b', 'u2', 'pro', '2026-10-01T00:00:00Z', { ultimoEnvioEm: '2026-10-05T10:00:00Z' }), al('c', 'u3', 'pro', '2026-10-01T00:00:00Z')],
      { a: { editais: [ed('e1')], total: 1 }, b: { editais: [ed('e2')], total: 1 }, c: { editais: [ed('e3')], total: 1 } },
    );
    await executarAlertas(t.deps);
    expect(t.enviar.mock.calls.map((c) => c[0].para)).toEqual(['u2@empresa.com.br', 'u1@empresa.com.br', 'u3@empresa.com.br']);
  });
  it('nunca enviado e adiado: guarda a janela de ontem e vai primeiro no dia seguinte', async () => {
    const velhos = Array.from({ length: MAX_EMAILS_POR_RODADA }, (_, i) => `v${i}`);
    const antigos = velhos.map((c) => al(c, c, 'pro', '2026-09-01T00:00:00Z', { ultimoEnvioEm: '2026-10-17T00:00:00Z' }));
    const novo = al('n', 'novo', 'pro', '2026-10-18T12:00:00Z');
    const editais = Object.fromEntries([...velhos, 'n'].map((c) => [c, { editais: [ed(`e${c}`)], total: 1 }]));
    const dia1 = montar([...antigos, novo], editais);
    expect(await executarAlertas(dia1.deps)).toMatchObject({ enviados: MAX_EMAILS_POR_RODADA, adiados: 1 });
    expect(dia1.registros.map((x) => x.alertaId)).not.toContain(id('n'));
    // Dia seguinte: os 60 avançaram a janela; o novo não foi registrado e continua com a janela de ontem.
    const dia2 = montar([...antigos.map((a) => ({ ...a, ultimoEnvioEm: AGORA.toISOString() })), novo], editais);
    await executarAlertas({ ...dia2.deps, agora: () => new Date(AGORA.getTime() + 24 * 60 * 60 * 1000) });
    expect(dia2.enviar.mock.calls[0][0].para).toBe('novo@empresa.com.br');
    expect(dia2.consultas[0]).toEqual({ id: id('n'), desde: '2026-10-17T12:00:00.000Z', limite: 20 });
  });
  it('avisos do GitHub: só contagens; adiar sozinho não é falha', () => {
    const base = { contas: 70, emails: 60, enviados: 60, semNovidades: 0, falhas: 0, puladosPlano: 0, editais: 60, adiados: 0, cotaEsgotada: false, aceitosSemRegistro: 0 };
    expect(avisosDoResumo(base)).toEqual([]);
    expect(avisosDoResumo({ ...base, adiados: 10 })).toEqual([`::warning::Teto de ${MAX_EMAILS_POR_RODADA} e-mails atingido: 10 contas ficaram para amanhã`]);
    expect(avisosDoResumo({ ...base, adiados: 3, cotaEsgotada: true })).toEqual(['::warning::Cota do Resend esgotada: 3 contas ficaram para amanhã']);
    expect(avisosDoResumo({ ...base, aceitosSemRegistro: 2 })).toEqual(['::error::2 alertas enviados sem registro (podem repetir amanhã): procure ACEITO_SEM_REGISTRO no log']);
  });
  it('logs sem e-mail e sem uuid completo', async () => {
    const t = montar(
      [al('a', 'u1', 'pro', '2026-10-01T00:00:00Z'), al('b', 'u2', 'pro', '2026-10-01T00:00:00Z')],
      { a: new Error(`falhou para ${id('a')} u1@empresa.com.br`), b: { editais: [ed('e2')], total: 1 } },
      { ok: false, erro: 'Resend 500: fora', tentativas: 4 },
    );
    await executarAlertas(t.deps);
    expect(t.logs.length).toBeGreaterThan(0);
    for (const l of t.logs) {
      expect(l).not.toContain('@');
      expect(l).not.toMatch(UUID);
    }
  });
  it('chave de idempotência: a mesma para os mesmos editais, em qualquer ordem; muda com o tipo e a conta', () => {
    expect(chaveIdempotencia('alertas', 'u1', ['b', 'a'])).toBe(chaveIdempotencia('alertas', 'u1', ['a', 'b']));
    expect(chaveIdempotencia('alertas', 'u1', ['a'])).not.toBe(chaveIdempotencia('alertas', 'u2', ['a']));
    expect(chaveIdempotencia('resumo', 'u1', ['a'])).not.toBe(chaveIdempotencia('alertas', 'u1', ['a']));
    expect(chaveIdempotencia('alertas', 'u1', ['a'])).toMatch(/^alertas\/u1\/[0-9a-f]{32}$/);
  });
  it('agrupa por conta (mais antigo primeiro) e ordena as contas pela janela mais antiga', () => {
    const lista = [al('b', 'u1', 'pro', '2026-10-02T00:00:00Z'), al('c', 'u2', 'pro', '2026-10-01T00:00:00Z', { ultimoEnvioEm: '2026-10-10T00:00:00Z' }), al('a', 'u1', 'pro', '2026-10-01T00:00:00Z')];
    const contas = porConta(lista);
    expect(contas.map((c) => c.map((a) => a.id))).toEqual([[id('a'), id('b')], [id('c')]]);
    expect(porEspera(contas, AGORA).map((c) => c[0].userId)).toEqual([id('u2'), id('u1')]);
  });
});

import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { alertaDaLinhaEnvio, criarBancoAlertas, editalDaLinha, VISITANTE_JOB } from './banco';

const LINHA = {
  alerta_id: '11111111-1111-4111-8111-111111111111', user_id: '22222222-2222-4222-8222-222222222222', email: 'dono@empresa.com.br', plano: 'basic',
  nome: 'EPI', termos: ['luva'], termos_excluir: [], ufs: ['SC'], municipios: [], valor_min: null, valor_max: '50000.00', modalidades: [], so_me_epp: false,
  ultimo_envio_em: null, criado_em: '2026-10-18T10:00:00+00:00',
};

describe('banco do job dos alertas', () => {
  it('linha → alerta (basic antigo vale pro)', () => {
    expect(alertaDaLinhaEnvio(LINHA)).toEqual({
      id: LINHA.alerta_id, userId: LINHA.user_id, email: 'dono@empresa.com.br', plano: 'pro', nome: 'EPI',
      radar: { termos: ['luva'], termosExcluir: [], ufs: ['SC'], municipios: [], valorMin: null, valorMax: 50000, modalidades: [], soMeEpp: false },
      ultimoEnvioEm: null, criadoEm: '2026-10-18T10:00:00+00:00',
    });
    expect(alertaDaLinhaEnvio({ ...LINHA, plano: 'gratis', ultimo_envio_em: '2026-10-17T10:00:05+00:00' })).toMatchObject({ plano: 'gratis', ultimoEnvioEm: '2026-10-17T10:00:05+00:00' });
  });
  it('linha → edital (numeric como texto; nulos ficam nulos)', () => {
    expect(editalDaLinha({ id: 'e1', slug: 's', objeto: 'o', orgao_nome: 'g', municipio_nome: undefined, uf: 'SC', valor_estimado: null, encerramento_em: 'x', situacao_id: '4' })).toEqual({
      id: 'e1', slug: 's', objeto: 'o', orgao_nome: 'g', municipio_nome: null, uf: 'SC', valor_estimado: null, encerramento_em: 'x', situacao_id: 4,
    });
  });
  it('editais_do_alerta com os filtros do radar, a janela e o limite; registrar e evento', async () => {
    const chamadas: unknown[][] = [];
    const sb = {
      rpc: vi.fn(async (nome: string, args: unknown) => {
        chamadas.push([nome, args]);
        if (nome === 'editais_do_alerta') return { data: [{ id: 'e1', slug: 's1', objeto: 'o', orgao_nome: 'g', municipio_nome: null, uf: 'SC', valor_estimado: '10.50', encerramento_em: 'x', situacao_id: 1, pontuacao: 60, total: 7 }], error: null };
        return { data: null, error: null };
      }),
      from: vi.fn(() => ({ insert: async (linha: unknown) => (chamadas.push(['eventos', linha]), { error: null }) })),
    } as unknown as SupabaseClient;
    const banco = criarBancoAlertas(sb);
    const r = await banco.editaisDoAlerta(alertaDaLinhaEnvio(LINHA), '2026-10-18T10:00:00.000Z', 20);
    expect(r).toEqual({ total: 7, editais: [{ id: 'e1', slug: 's1', objeto: 'o', orgao_nome: 'g', municipio_nome: null, uf: 'SC', valor_estimado: 10.5, encerramento_em: 'x', situacao_id: 1 }] });
    expect(chamadas[0][1]).toMatchObject({ p_alerta: LINHA.alerta_id, p_desde: '2026-10-18T10:00:00.000Z', p_termos: ['luva'], p_ufs: ['SC'], p_valor_max: 50000, p_limite: 20 });
    await banco.registrarEnvio({ alertaId: 'a', status: 'enviado', qtd: 1, tentativas: 2, idMensagem: 'm', ids: ['e1'], selecionadoEm: 't', avancar: false });
    expect(chamadas[1]).toEqual(['registrar_envio_alerta', { p_alerta: 'a', p_status: 'enviado', p_qtd: 1, p_tentativas: 2, p_erro: null, p_id_mensagem: 'm', p_ids: ['e1'], p_selecionado_em: 't', p_avancar: false }]);
    await banco.gravarEventoEnvio({ qtd: 3, alertas: 2 });
    expect(chamadas[2]).toEqual(['eventos', { visitante: VISITANTE_JOB, tipo: 'alerta_enviado', detalhe: { qtd: 3, alertas: 2 }, interno: false }]);
  });
  it('falhou: sem ids e sem avançar a janela', async () => {
    const chamadas: unknown[][] = [];
    const sb = { rpc: vi.fn(async (nome: string, args: unknown) => (chamadas.push([nome, args]), { data: null, error: null })) } as unknown as SupabaseClient;
    await criarBancoAlertas(sb).registrarEnvio({ alertaId: 'a', status: 'falhou', qtd: 2, tentativas: 1, erro: 'Resend 429: cota', selecionadoEm: 't' });
    expect(chamadas[0][1]).toMatchObject({ p_status: 'falhou', p_erro: 'Resend 429: cota', p_ids: null, p_id_mensagem: null });
  });
  it('enviado com janelaInicial: fixa ultimo_envio_em (só se nulo) antes de registrar', async () => {
    const chamadas: unknown[][] = [];
    const filtro = {
      eq: vi.fn((col: string, v: unknown) => (chamadas.push(['eq', col, v]), filtro)),
      is: vi.fn(async (col: string, v: unknown) => (chamadas.push(['is', col, v]), { error: null })),
    };
    const sb = {
      rpc: vi.fn(async (nome: string) => (chamadas.push(['rpc', nome]), { data: null, error: null })),
      from: vi.fn((t: string) => ({ update: (v: unknown) => (chamadas.push(['update', t, v]), filtro) })),
    } as unknown as SupabaseClient;
    const banco = criarBancoAlertas(sb);
    await banco.registrarEnvio({ alertaId: 'a', status: 'enviado', qtd: 1, tentativas: 1, ids: ['e1'], selecionadoEm: 't', avancar: false, janelaInicial: '2026-10-17T12:00:00.000Z' });
    expect(chamadas).toEqual([
      ['update', 'alertas', { ultimo_envio_em: '2026-10-17T12:00:00.000Z' }],
      ['eq', 'id', 'a'],
      ['is', 'ultimo_envio_em', null],
      ['rpc', 'registrar_envio_alerta'],
    ]);
    chamadas.length = 0;
    await banco.registrarEnvio({ alertaId: 'a', status: 'enviado', qtd: 1, tentativas: 1, ids: ['e1'], selecionadoEm: 't', avancar: true });
    expect(chamadas).toEqual([['rpc', 'registrar_envio_alerta']]);
  });
  it('erro do banco vira exceção com o nome da função', async () => {
    const sb = { rpc: vi.fn(async () => ({ data: null, error: { message: 'timeout' } })) } as unknown as SupabaseClient;
    await expect(criarBancoAlertas(sb).alertasParaEnvio()).rejects.toThrow('alertas_para_envio: timeout');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Radar } from '../radar';

vi.mock('server-only', () => ({}));

const m = vi.hoisted(() => ({ chamadas: [] as Array<{ nome: string; args: Record<string, unknown> }>, dados: [] as unknown }));
vi.mock('./supabase', () => ({
  supabaseServidor: () => ({
    rpc: (nome: string, args: Record<string, unknown>) => {
      m.chamadas.push({ nome, args });
      const resposta = Promise.resolve({ data: m.dados, error: null });
      return { single: () => resposta, then: (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => resposta.then(ok, ko) };
    },
  }),
}));

const { contagensDoRadar, editaisDoRadar } = await import('./radar');

const RADAR: Radar = { termos: ['uniforme'], termosExcluir: ['escolar'], ufs: [], municipios: ['4209102'], valorMin: null, valorMax: 50000, modalidades: [], soMeEpp: true };
const linha = {
  id: 'x', slug: 's', objeto: 'Aquisição de fardamento', orgao_nome: 'PREFEITURA', unidade_nome: null, municipio_nome: 'Joinville', uf: 'SC',
  codigo_ibge: '4209102', valor_estimado: 1000, encerramento_em: '2026-10-30T13:00:00Z', publicada_em: '2026-10-17T10:00:00Z',
  modalidade_nome: 'Pregão - Eletrônico', srp: false, link_origem: null, onde: 'objeto', total: 7, situacao_id: 1,
  pontuacao: 45, termos_objeto: ['fardamento'], termos_itens: [], frase: false,
};

beforeEach(() => {
  m.chamadas.length = 0;
});

describe('editaisDoRadar', () => {
  it('chama buscar_editais com os filtros do radar e explica pelo perfil', async () => {
    m.dados = [linha];
    const r = await editaisDoRadar(RADAR, { ordem: null, pagina: 1, limite: 5 });
    expect(m.chamadas[0].nome).toBe('buscar_editais');
    expect(m.chamadas[0].args).toMatchObject({
      p_termos: ['uniforme'], p_excluir: ['escolar'], p_ibges: ['4209102'], p_valor_max: 50000, p_so_me_epp: true,
      p_ordem: 'relevancia', p_limite: 5, p_deslocamento: 0,
    });
    expect(m.chamadas[0].args).not.toHaveProperty('user_id');
    expect(r.total).toBe(7);
    expect(r.editais[0].relevancia?.explicacao).toBe('Menciona fardamento, relacionado a uniformes profissionais, um dos produtos que você monitora.');
  });
  it('valor máximo 0 vai como nulo; até 12 relacionados', async () => {
    m.dados = [];
    const termos = ['uniforme', 'luva', 'cimento', 'computador', 'medicamento'];
    await editaisDoRadar({ ...RADAR, termos, valorMax: 0 }, { ordem: null, pagina: 1, limite: 20 });
    expect(m.chamadas[0].args).toMatchObject({ p_valor_max: null });
    expect(m.chamadas[0].args.p_relacionados).toHaveLength(12);
  });
  it('descartados vão em p_sem_ids (sem descartados: nulo)', async () => {
    m.dados = [];
    await editaisDoRadar({ ...RADAR, termos: ['jaleco'] }, { ordem: null, pagina: 1, limite: 20 }, ['b', 'a']);
    expect(m.chamadas[0].args).toMatchObject({ p_sem_ids: ['b', 'a'] });
    await editaisDoRadar({ ...RADAR, termos: ['botina'] }, { ordem: null, pagina: 1, limite: 20 });
    expect(m.chamadas[1].args).toMatchObject({ p_sem_ids: null });
  });
});

describe('contagensDoRadar', () => {
  it('uma chamada a radar_contagens com os mesmos filtros e o "desde"', async () => {
    m.dados = { total: 12, novas: 3, prazo_proximo: 4 };
    expect(await contagensDoRadar(RADAR, '2026-10-17T10:00:00.000Z')).toEqual({ total: 12, novas: 3, prazoProximo: 4 });
    expect(m.chamadas[0].nome).toBe('radar_contagens');
    expect(m.chamadas[0].args).toMatchObject({ p_termos: ['uniforme'], p_ibges: ['4209102'], p_desde: '2026-10-17T10:00:00.000Z' });
    expect(Object.keys(m.chamadas[0].args)).not.toContain('p_ordem');
  });
  it('contagens também sem os descartados', async () => {
    m.dados = { total: 1, novas: 0, prazo_proximo: 0 };
    await contagensDoRadar(RADAR, '2026-10-17T10:00:00.000Z', ['a']);
    expect(m.chamadas[0].args).toMatchObject({ p_sem_ids: ['a'] });
  });
  it('argumentos são exatamente os de radar_contagens (0016: 0014 + p_sem_ids); valor 0 vai como nulo', async () => {
    m.dados = { total: 0, novas: 0, prazo_proximo: 0 };
    await contagensDoRadar({ ...RADAR, valorMin: 0, valorMax: 0 }, '2026-10-17T10:00:00.000Z');
    expect(Object.keys(m.chamadas[0].args).sort()).toEqual(
      ['p_termos', 'p_relacionados', 'p_excluir', 'p_ufs', 'p_ibges', 'p_valor_min', 'p_valor_max', 'p_modalidades', 'p_so_me_epp', 'p_desde', 'p_sem_ids'].sort(),
    );
    expect(m.chamadas[0].args).toMatchObject({ p_valor_min: null, p_valor_max: null, p_sem_ids: null });
  });
});

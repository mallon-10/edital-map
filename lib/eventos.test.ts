import { describe, expect, it } from 'vitest';
import { LIMITES, RECURSOS_USADOS, TIPOS_EVENTO, UFS_BRASIL, ufsIniciaisAlerta, validarEvento, validarListaEspera, validarPedidoAlerta } from './eventos';

const SLUG = '00394452000103-2026-21982';

describe('validarEvento', () => {
  it('busca: limpa o termo e aceita UF e 7 dias', () => {
    expect(validarEvento({ tipo: 'busca', detalhe: { q: '  EPI ', uf: 'SC', dias: 7 } })).toEqual({
      ok: true, valor: { tipo: 'busca', detalhe: { q: 'EPI', uf: 'SC', dias: 7 } },
    });
  });
  it('busca: descarta UF e dias inválidos', () => {
    expect(validarEvento({ tipo: 'busca', detalhe: { q: '', uf: 'XX', dias: 30 } })).toEqual({
      ok: true, valor: { tipo: 'busca', detalhe: { q: null, uf: null, dias: null } },
    });
  });
  it('eventos de edital exigem slug válido', () => {
    expect(validarEvento({ tipo: 'abriu_edital', detalhe: { edital: SLUG } })).toEqual({
      ok: true, valor: { tipo: 'abriu_edital', detalhe: { edital: SLUG } },
    });
    expect(validarEvento({ tipo: 'clicou_edital_oficial', detalhe: { edital: 'x' } }).ok).toBe(false);
  });
  it('aceita CNPJ alfanumérico (12 caracteres [0-9A-Z] + 2 dígitos) e recusa minúsculas', () => {
    expect(validarEvento({ tipo: 'abriu_edital', detalhe: { edital: '12ABC34501DE35-2026-7' } })).toEqual({
      ok: true, valor: { tipo: 'abriu_edital', detalhe: { edital: '12ABC34501DE35-2026-7' } },
    });
    expect(validarEvento({ tipo: 'abriu_edital', detalhe: { edital: '12abc34501de35-2026-7' } }).ok).toBe(false);
  });
  it('quer_recurso exige recurso conhecido', () => {
    expect(validarEvento({ tipo: 'quer_recurso', detalhe: { recurso: 'resumo_ia', edital: SLUG } }).ok).toBe(true);
    expect(validarEvento({ tipo: 'quer_recurso', detalhe: { recurso: 'outro', edital: SLUG } }).ok).toBe(false);
  });
  it('quer_recurso de plano e filtros Pro não exige edital', () => {
    expect(validarEvento({ tipo: 'quer_recurso', detalhe: { recurso: 'plano_pro' } })).toEqual({
      ok: true, valor: { tipo: 'quer_recurso', detalhe: { recurso: 'plano_pro' } },
    });
    expect(validarEvento({ tipo: 'quer_recurso', detalhe: { recurso: 'filtros_pro' } }).ok).toBe(true);
    expect(validarEvento({ tipo: 'quer_recurso', detalhe: { recurso: 'resumo_ia' } }).ok).toBe(false);
  });
  it('usou_recurso: filtros Pro sem edital; clique em parecido com o edital de origem', () => {
    expect(validarEvento({ tipo: 'usou_recurso', detalhe: { recurso: 'filtro_orgao' } })).toEqual({
      ok: true, valor: { tipo: 'usou_recurso', detalhe: { recurso: 'filtro_orgao' } },
    });
    expect(validarEvento({ tipo: 'usou_recurso', detalhe: { recurso: 'filtro_raio', edital: SLUG } })).toEqual({
      ok: true, valor: { tipo: 'usou_recurso', detalhe: { recurso: 'filtro_raio' } },
    });
    expect(validarEvento({ tipo: 'usou_recurso', detalhe: { recurso: 'relacionados_clique', edital: SLUG } })).toEqual({
      ok: true, valor: { tipo: 'usou_recurso', detalhe: { recurso: 'relacionados_clique', edital: SLUG } },
    });
    expect(validarEvento({ tipo: 'usou_recurso', detalhe: { recurso: 'relacionados_clique' } })).toEqual({ ok: false, erro: 'edital inválido' });
  });
  it('usou_recurso: baixou_documento com o edital e o tipo do documento', () => {
    expect(validarEvento({ tipo: 'usou_recurso', detalhe: { recurso: 'baixou_documento', edital: SLUG, documento: 'Termo de Referência' } })).toEqual({
      ok: true, valor: { tipo: 'usou_recurso', detalhe: { recurso: 'baixou_documento', edital: SLUG, documento: 'Termo de Referência' } },
    });
    expect(validarEvento({ tipo: 'usou_recurso', detalhe: { recurso: 'baixou_documento', edital: SLUG, documento: 'x'.repeat(200) } })).toEqual({
      ok: true, valor: { tipo: 'usou_recurso', detalhe: { recurso: 'baixou_documento', edital: SLUG, documento: 'x'.repeat(80) } },
    });
    expect(validarEvento({ tipo: 'usou_recurso', detalhe: { recurso: 'baixou_documento', edital: SLUG } })).toEqual({
      ok: true, valor: { tipo: 'usou_recurso', detalhe: { recurso: 'baixou_documento', edital: SLUG, documento: null } },
    });
    expect(validarEvento({ tipo: 'usou_recurso', detalhe: { recurso: 'baixou_documento' } })).toEqual({ ok: false, erro: 'edital inválido' });
  });
  it('usou_recurso: exportou só pela rota /api/exportar; recurso desconhecido é recusado', () => {
    expect(validarEvento({ tipo: 'usou_recurso', detalhe: { recurso: 'exportou' } })).toEqual({ ok: false, erro: 'recurso inválido' });
    expect(validarEvento({ tipo: 'usou_recurso', detalhe: { recurso: 'resumo_ia', edital: SLUG } }).ok).toBe(false);
    expect(validarEvento({ tipo: 'usou_recurso', detalhe: {} }).ok).toBe(false);
  });
  it('os cinco usos medidos e o limite de exportações por hora', () => {
    expect(RECURSOS_USADOS).toEqual(['relacionados_clique', 'filtro_orgao', 'filtro_raio', 'exportou', 'baixou_documento']);
    expect(TIPOS_EVENTO).toContain('usou_recurso');
    expect(LIMITES.exportacoesPorHora).toBe(20);
  });
  it('recusa tipo desconhecido, pediu_alerta e corpo inválido', () => {
    expect(validarEvento({ tipo: 'pediu_alerta', detalhe: {} }).ok).toBe(false);
    expect(validarEvento({ tipo: 'xyz' }).ok).toBe(false);
    expect(validarEvento(null).ok).toBe(false);
    expect(validarEvento([]).ok).toBe(false);
  });
});

describe('validarPedidoAlerta', () => {
  const valido = { email: ' Ana@Empresa.com.br ', termos: ['EPI', ' botina  de segurança ', 'epi'], ufs: ['SC', 'PR', 'XX'], aceite: true, site: '' };

  it('normaliza e-mail, termos (sem repetir) e UFs', () => {
    expect(validarPedidoAlerta(valido)).toEqual({
      ok: true, valor: { email: 'ana@empresa.com.br', termos: ['EPI', 'botina de segurança'], ufs: ['SC', 'PR'] },
    });
  });
  it('campo-isca preenchido é recusado em silêncio', () => {
    expect(validarPedidoAlerta({ ...valido, site: 'http://spam' })).toEqual({ ok: false, erro: 'robô', silencioso: true });
  });
  it('recusa e-mail inválido', () => {
    expect(validarPedidoAlerta({ ...valido, email: 'ana@' })).toEqual({ ok: false, erro: 'Confira o e-mail.' });
  });
  it('exige ao menos um termo e no máximo 10', () => {
    expect(validarPedidoAlerta({ ...valido, termos: ['a'] }).ok).toBe(false);
    const onze = Array.from({ length: 11 }, (_, i) => `termo ${i}`);
    expect(validarPedidoAlerta({ ...valido, termos: onze })).toEqual({ ok: false, erro: 'Use até 10 termos.' });
  });
  it('recusa 10.000 termos distintos', () => {
    const muitos = Array.from({ length: 10_000 }, (_, i) => `termo ${i}`);
    expect(validarPedidoAlerta({ ...valido, termos: muitos })).toEqual({ ok: false, erro: 'Use até 10 termos.' });
  });
  it('para de ler os termos ao passar do teto', () => {
    let lidos = 0;
    const muitos = new Proxy(Array.from({ length: 10_000 }, (_, i) => `termo ${i}`), {
      get(alvo, chave, receptor) {
        if (typeof chave === 'string' && /^\d+$/.test(chave)) lidos++;
        return Reflect.get(alvo, chave, receptor);
      },
    });
    validarPedidoAlerta({ ...valido, termos: muitos });
    expect(lidos).toBeLessThanOrEqual(11);
  });
  it('exige UF e aceite', () => {
    expect(validarPedidoAlerta({ ...valido, ufs: [] }).ok).toBe(false);
    expect(validarPedidoAlerta({ ...valido, aceite: false })).toEqual({ ok: false, erro: 'Confirme o uso do e-mail para o aviso.' });
  });
  it('lista as 27 UFs', () => {
    expect(UFS_BRASIL).toHaveLength(27);
  });
});

describe('ufsIniciaisAlerta', () => {
  it('sem ?uf= nao pre-seleciona nenhum estado', () => {
    expect(ufsIniciaisAlerta(undefined)).toEqual([]);
    expect(ufsIniciaisAlerta('')).toEqual([]);
  });
  it('uf valida na URL vira a unica pre-selecao', () => {
    expect(ufsIniciaisAlerta('SP')).toEqual(['SP']);
  });
  it('uf fora da lista ou em outro formato e ignorada', () => {
    expect(ufsIniciaisAlerta('XX')).toEqual([]);
    expect(ufsIniciaisAlerta('sc')).toEqual([]);
  });
});

describe('lista de espera dos planos', () => {
  it('aceita basic e pro com e-mail válido (minúsculo, sem espaços)', () => {
    expect(validarListaEspera({ email: '  Joao@Empresa.com.br ', plano: 'basic' })).toEqual({
      ok: true, valor: { email: 'joao@empresa.com.br', plano: 'basic' },
    });
    expect(validarListaEspera({ email: 'a@b.co', plano: 'pro' }).ok).toBe(true);
  });
  it('recusa plano desconhecido, e-mail ruim e corpo estranho', () => {
    expect(validarListaEspera({ email: 'a@b.co', plano: 'premium' })).toEqual({ ok: false, erro: 'Escolha o plano.' });
    expect(validarListaEspera({ email: 'sem-arroba', plano: 'pro' })).toEqual({ ok: false, erro: 'Confira o e-mail.' });
    expect(validarListaEspera(null)).toEqual({ ok: false, erro: 'Formulário inválido.' });
  });
  it('robô (campo escondido preenchido) é recusado em silêncio', () => {
    expect(validarListaEspera({ email: 'a@b.co', plano: 'pro', site: 'http://spam' })).toEqual({ ok: false, erro: 'robô', silencioso: true });
  });
  it('limite de envios por hora, como o pedido de alerta', () => {
    expect(LIMITES.listaEsperaPorHora).toBe(5);
  });
  it('interesse no Basic vem sem edital, como o do Pro', () => {
    expect(validarEvento({ tipo: 'quer_recurso', detalhe: { recurso: 'plano_basic' } })).toEqual({
      ok: true, valor: { tipo: 'quer_recurso', detalhe: { recurso: 'plano_basic' } },
    });
  });
});

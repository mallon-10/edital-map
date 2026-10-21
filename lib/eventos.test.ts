import { describe, expect, it } from 'vitest';
import { LIMITES, RECURSOS_USADOS, TIPOS_EVENTO, UFS_BRASIL, validarEvento, validarListaEspera } from './eventos';

const SLUG = '00394452000103-2026-21982';

describe('validarEvento', () => {
  it('busca: limpa o termo e aceita UF e 7 dias', () => {
    expect(validarEvento({ tipo: 'busca', detalhe: { q: '  EPI ', uf: 'SC', dias: 7, total: 12 } })).toEqual({
      ok: true, valor: { tipo: 'busca', detalhe: { q: 'EPI', uf: 'SC', dias: 7, total: 12 } },
    });
  });
  it('busca: descarta UF, dias e total inválidos', () => {
    expect(validarEvento({ tipo: 'busca', detalhe: { q: '', uf: 'XX', dias: 30, total: -1 } })).toEqual({
      ok: true, valor: { tipo: 'busca', detalhe: { q: null, uf: null, dias: null, total: null } },
    });
    expect(validarEvento({ tipo: 'busca', detalhe: { q: 'luva', total: 1.5 } })).toMatchObject({ valor: { detalhe: { total: null } } });
    expect(validarEvento({ tipo: 'busca', detalhe: { q: 'luva', total: 0 } })).toMatchObject({ valor: { detalhe: { total: 0 } } });
  });
  it('pagina_vista: caminho limpo no servidor; fora da entrada, sem origem', () => {
    expect(validarEvento({ tipo: 'pagina_vista', detalhe: { pagina: `/edital/${SLUG}`, entrada: false, site: 'www.google.com' } })).toEqual({
      ok: true, valor: { tipo: 'pagina_vista', detalhe: { pagina: '/edital', edital: SLUG } },
    });
    expect(validarEvento({ tipo: 'pagina_vista', detalhe: { pagina: '/admin' } }).ok).toBe(false);
    expect(validarEvento({ tipo: 'pagina_vista', detalhe: {} }).ok).toBe(false);
  });
  it('pagina_vista: na entrada, origem calculada no servidor, domínio e campanha', () => {
    expect(validarEvento({
      tipo: 'pagina_vista',
      detalhe: { pagina: '/licitacoes/epi', entrada: true, site: 'WWW.Google.com.br', utm_campaign: ' epi-sul ', utm_medium: null, anuncio: false },
    })).toEqual({
      ok: true, valor: { tipo: 'pagina_vista', detalhe: { pagina: '/licitacoes/epi', origem: 'google', site: 'www.google.com.br', campanha: 'epi-sul' } },
    });
    expect(validarEvento({ tipo: 'pagina_vista', detalhe: { pagina: '/', entrada: true, anuncio: true } })).toEqual({
      ok: true, valor: { tipo: 'pagina_vista', detalhe: { pagina: '/', origem: 'anuncio' } },
    });
    expect(validarEvento({ tipo: 'pagina_vista', detalhe: { pagina: '/', entrada: true, site: 'evil.com/<x>' } })).toEqual({
      ok: true, valor: { tipo: 'pagina_vista', detalhe: { pagina: '/', origem: 'direto' } },
    });
  });
  it('quer_recurso assessoria (WhatsApp no edital) exige edital', () => {
    expect(validarEvento({ tipo: 'quer_recurso', detalhe: { recurso: 'assessoria', edital: SLUG } })).toEqual({
      ok: true, valor: { tipo: 'quer_recurso', detalhe: { recurso: 'assessoria', edital: SLUG } },
    });
    expect(validarEvento({ tipo: 'quer_recurso', detalhe: { recurso: 'assessoria' } }).ok).toBe(false);
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
  it('os seis usos medidos e o limite de exportações por hora', () => {
    expect(RECURSOS_USADOS).toEqual(['relacionados_clique', 'filtro_orgao', 'filtro_raio', 'exportou', 'baixou_documento', 'tentou_assinar', 'consultou_cnpj']);
    // tentou_assinar é gravado só pela rota /api/assinar (que conta as tentativas por IP).
    expect(validarEvento({ tipo: 'usou_recurso', detalhe: { recurso: 'tentou_assinar' } }).ok).toBe(false);
    expect(LIMITES.assinaturasPorHora).toBe(10);
    expect(LIMITES.eventosPorHora).toBe(240);
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

describe('UFS_BRASIL', () => {
  it('lista as 27 UFs', () => {
    expect(UFS_BRASIL).toHaveLength(27);
  });
});

describe('lista de espera dos planos', () => {
  it('aceita basic e pro com e-mail válido (minúsculo, sem espaços)', () => {
    expect(validarListaEspera({ email: '  Joao@Empresa.com.br ', plano: 'basic' })).toEqual({
      ok: true, valor: { email: 'joao@empresa.com.br', plano: 'basic', periodo: 'mensal' },
    });
    expect(validarListaEspera({ email: 'a@b.co', plano: 'pro' }).ok).toBe(true);
  });
  it('recusa plano desconhecido, e-mail ruim e corpo estranho', () => {
    expect(validarListaEspera({ email: 'a@b.co', plano: 'premium' })).toEqual({ ok: false, erro: 'Escolha o plano.' });
    expect(validarListaEspera({ email: 'sem-arroba', plano: 'pro' })).toEqual({ ok: false, erro: 'Confira o e-mail.' });
    expect(validarListaEspera(null)).toEqual({ ok: false, erro: 'Formulário inválido.' });
  });
  it('período: mensal por padrão, anual aceito, outro valor recusado', () => {
    expect(validarListaEspera({ email: 'a@b.co', plano: 'pro', periodo: 'anual' })).toEqual({
      ok: true, valor: { email: 'a@b.co', plano: 'pro', periodo: 'anual' },
    });
    expect(validarListaEspera({ email: 'a@b.co', plano: 'pro', periodo: 'semestral' })).toEqual({ ok: false, erro: 'Formulário inválido.' });
    expect(validarListaEspera({ email: 'a@b.co', plano: 'pro', periodo: 5 }).ok).toBe(false);
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

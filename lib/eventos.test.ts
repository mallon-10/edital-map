import { describe, expect, it } from 'vitest';
import { UFS_BRASIL, validarEvento, validarPedidoAlerta } from './eventos';

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

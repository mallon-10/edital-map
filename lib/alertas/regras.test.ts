import { describe, expect, it } from 'vitest';
import { data, hora } from '../formato';
import { MENSAGENS_RADAR } from '../radar';
import {
  alertaDaLinha, envioIndisponivel, lerIdAlerta, linhaDoAlerta, MENSAGENS_ALERTA, nomePadrao, textoUltimoEnvio, validarAlerta, validarMudancaAlerta,
} from './regras';

const CORPO = { nome: '  Uniformes   no Sul ', termos: ['uniforme'], ufs: ['SC', 'PR'] };

describe('validação do alerta', () => {
  it('nome aparado + as validações do radar; user_id do corpo não passa', () => {
    const v = validarAlerta({ ...CORPO, user_id: 'outra' });
    expect(v).toEqual({
      ok: true,
      valor: { nome: 'Uniformes no Sul', termos: ['uniforme'], termosExcluir: [], ufs: ['PR', 'SC'], municipios: [], valorMin: null, valorMax: null, modalidades: [], soMeEpp: false },
    });
  });
  it('nome obrigatório, até 60', () => {
    expect(validarAlerta({ ...CORPO, nome: '   ' })).toEqual({ ok: false, erro: MENSAGENS_ALERTA.nome });
    expect(validarAlerta({ ...CORPO, nome: 'a'.repeat(61) })).toEqual({ ok: false, erro: MENSAGENS_ALERTA.nome });
    expect(validarAlerta({ ...CORPO, nome: 5 })).toEqual({ ok: false, erro: MENSAGENS_ALERTA.nome });
  });
  it('erros do radar valem para o alerta', () => {
    expect(validarAlerta({ ...CORPO, termos: [] })).toEqual({ ok: false, erro: MENSAGENS_RADAR.semTermo });
    expect(validarAlerta({ ...CORPO, municipios: ['4209102'] })).toEqual({ ok: false, erro: MENSAGENS_RADAR.local });
    expect(validarAlerta(null)).toEqual({ ok: false, erro: MENSAGENS_ALERTA.formulario });
  });
  it('mudança: { ativo } pausa ou retoma; o resto é edição completa', () => {
    expect(validarMudancaAlerta({ ativo: false })).toEqual({ ok: true, valor: { tipo: 'ativo', ativo: false } });
    expect(validarMudancaAlerta(CORPO)).toMatchObject({ ok: true, valor: { tipo: 'alerta', alerta: { nome: 'Uniformes no Sul' } } });
    expect(validarMudancaAlerta({ ativo: 'sim' })).toEqual({ ok: false, erro: MENSAGENS_ALERTA.nome });
  });
  it('nome sugerido pelos produtos, até 60', () => {
    expect(nomePadrao(['uniforme', 'luva'])).toBe('uniforme, luva');
    expect(nomePadrao(['a'.repeat(40), 'b'.repeat(40)])).toHaveLength(60);
    expect(nomePadrao([])).toBe('');
  });
  it('id do alerta é um uuid', () => {
    expect(lerIdAlerta('11111111-1111-4111-8111-111111111111')).toBe('11111111-1111-4111-8111-111111111111');
    for (const v of ['1', 'x'.repeat(36), null, 7]) expect(lerIdAlerta(v)).toBeNull();
  });
});

describe('linhas', () => {
  it('linha ↔ alerta (sem user_id na linha gravada)', () => {
    const l = {
      id: '11111111-1111-4111-8111-111111111111', nome: 'EPI', termos: ['luva'], termos_excluir: [], ufs: ['SC'], municipios: [], valor_min: '1000.00',
      valor_max: null, modalidades: [6], so_me_epp: true, ativo: false, criado_em: '2026-10-18T10:00:00+00:00', ultimo_envio_em: null,
    };
    const a = alertaDaLinha(l);
    expect(a).toMatchObject({ id: l.id, nome: 'EPI', termos: ['luva'], valorMin: 1000, modalidades: [6], soMeEpp: true, ativo: false, ultimoEnvioEm: null });
    const linha = linhaDoAlerta(a);
    expect(linha).toMatchObject({ nome: 'EPI', termos: ['luva'], valor_min: 1000, so_me_epp: true });
    expect(linha).not.toHaveProperty('user_id');
  });
});

describe('último envio', () => {
  const em = '2026-10-18T10:00:12+00:00';
  const quando = `${data(em)} às ${hora(em)}`;
  it('textos por status', () => {
    expect(textoUltimoEnvio(null)).toBe('Ainda sem envio. O primeiro sai às 7h, se houver editais novos.');
    expect(textoUltimoEnvio({ status: 'enviado', em, qtd: 1 })).toBe(`Último envio ${quando}: 1 edital.`);
    expect(textoUltimoEnvio({ status: 'enviado', em, qtd: 12 })).toBe(`Último envio ${quando}: 12 editais.`);
    expect(textoUltimoEnvio({ status: 'sem_novidades', em, qtd: 0 })).toBe(`Sem editais novos em ${quando}.`);
    expect(textoUltimoEnvio({ status: 'falhou', em, qtd: 3 })).toBe(`O envio de ${quando} falhou. Tentamos de novo às 7h.`);
    expect(textoUltimoEnvio({ status: 'pulado_plano', em, qtd: 0 })).toBe(`Não enviado em ${quando}: alertas por e-mail são do plano Pro.`);
  });
  it('envio indisponível quando o último de algum alerta falhou', () => {
    expect(envioIndisponivel([null, { status: 'enviado', em, qtd: 1 }])).toBe(false);
    expect(envioIndisponivel([{ status: 'falhou', em, qtd: 1 }])).toBe(true);
  });
});

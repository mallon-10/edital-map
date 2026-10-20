import { describe, expect, it } from 'vitest';
import {
  acessoDoPlano, AVISO_PLANO_NAVEGADOR, avisoPlanoNavegador, planoIncerto, bloqueioAlerta, bloqueioSalvar, LIMITES_CONTA, lerPlano, maiorPlano, MENSAGENS_LIMITE_CONTA,
} from './limitesConta';

describe('limites da conta', () => {
  it('Grátis nada; Pro 500 salvos (uso justo) e 5 alertas', () => {
    expect(LIMITES_CONTA).toEqual({ gratis: { salvos: 0, alertas: 0 }, pro: { salvos: 500, alertas: 5 } });
  });
  it('o maior plano vence', () => {
    expect(maiorPlano()).toBe('gratis');
    expect(maiorPlano('gratis', 'pro')).toBe('pro');
    expect(maiorPlano('gratis', 'gratis')).toBe('gratis');
  });
  it('lerPlano: pro; basic (descontinuado, linhas antigas) vale pro; o resto é grátis', () => {
    expect(lerPlano('pro')).toBe('pro');
    expect(lerPlano('basic')).toBe('pro');
    for (const v of ['business', '', null, undefined, 3]) expect(lerPlano(v)).toBe('gratis');
  });
  it('aviso quando o plano está só no navegador', () => {
    expect(avisoPlanoNavegador({ plano: 'pro', daConta: 'gratis', doNavegador: 'pro', falhou: false })).toBe(AVISO_PLANO_NAVEGADOR);
    expect(avisoPlanoNavegador({ plano: 'pro', daConta: 'pro', doNavegador: 'pro', falhou: false })).toBeNull();
    expect(avisoPlanoNavegador({ plano: 'pro', daConta: 'pro', doNavegador: 'gratis', falhou: false })).toBeNull();
    expect(AVISO_PLANO_NAVEGADOR).toBe('Plano no navegador, não na conta: use o mesmo e-mail da compra.');
  });
  it('salvar: grátis vê o convite; Pro até 500', () => {
    expect(bloqueioSalvar('gratis', 0)).toEqual({ codigo: 'plano', mensagem: MENSAGENS_LIMITE_CONTA.salvosPlano });
    expect(bloqueioSalvar('pro', 499)).toBeNull();
    expect(bloqueioSalvar('pro', 500)).toEqual({ codigo: 'limite', mensagem: 'Você chegou a 500 editais salvos. Remova um para salvar outro.' });
  });
  it('alertas: grátis vê o convite; Pro até 5', () => {
    expect(bloqueioAlerta('gratis', 0)).toEqual({ codigo: 'plano', mensagem: MENSAGENS_LIMITE_CONTA.alertasPlano });
    expect(bloqueioAlerta('pro', 4)).toBeNull();
    expect(bloqueioAlerta('pro', 5)).toEqual({ codigo: 'limite', mensagem: 'Você já tem 5 alertas, o máximo do plano. Pause ou exclua um para criar outro.' });
  });
  it('plano incerto: a consulta da conta falhou e nada garante o Pro (pedir para tentar de novo, não o convite)', () => {
    expect(planoIncerto({ plano: 'gratis', daConta: 'gratis', doNavegador: 'gratis', falhou: true })).toBe(true);
    expect(planoIncerto({ plano: 'pro', daConta: 'gratis', doNavegador: 'pro', falhou: true })).toBe(false);
    expect(planoIncerto({ plano: 'gratis', daConta: 'gratis', doNavegador: 'gratis', falhou: false })).toBe(false);
  });
  it('textos', () => {
    expect(MENSAGENS_LIMITE_CONTA).toEqual({
      salvosPlano: 'Salvar editais é do plano Pro.',
      alertasPlano: 'Alertas por e-mail são do plano Pro.',
      resumoPlano: 'O resumo semanal é do plano Pro.',
      planoIndisponivel: 'Não deu para confirmar seu plano agora. Tente de novo.',
      salvosConvite: 'No Pro, salve os editais que interessam e acompanhe cada um com status e observação.',
      alertasConvite: 'No Pro, até 5 alertas: os editais novos chegam por e-mail às 7h, e toda segunda chega o resumo da semana.',
    });
  });
  it('acesso às áreas do Pro (Meu Radar, Oportunidades, Alertas): Pro libera; grátis bloqueia; consulta falhou sem Pro = incerto', () => {
    expect(acessoDoPlano({ plano: 'pro', daConta: 'pro', doNavegador: 'gratis', falhou: false })).toBe('liberado');
    expect(acessoDoPlano({ plano: 'pro', daConta: 'gratis', doNavegador: 'pro', falhou: true })).toBe('liberado');
    expect(acessoDoPlano({ plano: 'gratis', daConta: 'gratis', doNavegador: 'gratis', falhou: false })).toBe('bloqueado');
    expect(acessoDoPlano({ plano: 'gratis', daConta: 'gratis', doNavegador: 'gratis', falhou: true })).toBe('incerto');
  });
});

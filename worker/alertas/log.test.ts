import { describe, expect, it } from 'vitest';
import { curto, limparLog } from './log';

describe('log público do job (repositório aberto)', () => {
  it('id curto: só os 8 primeiros caracteres', () => {
    expect(curto('11111111-2222-4333-8444-555555555555')).toBe('11111111');
    expect(curto('abc')).toBe('abc');
  });
  it('tira e-mails, uuids completos e chaves do Resend', () => {
    const l = limparLog('conta 11111111-2222-4333-8444-555555555555 (dono.da+x@empresa.com.br): erro re_AbCdEf123456_xyz');
    expect(l).toBe('conta 11111111… ([e-mail]): erro [chave]');
  });
  it('tira a chave dada mesmo sem o prefixo re_', () => {
    expect(limparLog('falhou com segredo-xyz-123', ['segredo-xyz-123'])).toBe('falhou com [chave]');
    expect(limparLog('nada aqui', ['', null, undefined])).toBe('nada aqui');
  });
});

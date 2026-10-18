import { describe, expect, it } from 'vitest';
import { AVISO_SUSPENSA, avisoSituacao, rotuloSituacao, SITUACAO, SITUACOES_FORA_DAS_ABERTAS } from './situacao';

describe('situação oficial no PNCP', () => {
  it('revogada e anulada saem das abertas; suspensa fica', () => {
    expect(SITUACOES_FORA_DAS_ABERTAS).toEqual([SITUACAO.revogada, SITUACAO.anulada]);
    expect(SITUACOES_FORA_DAS_ABERTAS).not.toContain(SITUACAO.suspensa);
  });
  it('rótulos das etiquetas', () => {
    expect(rotuloSituacao(4)).toBe('Suspensa');
    expect(rotuloSituacao(2)).toBe('Revogada');
    expect(rotuloSituacao(3)).toBe('Anulada');
    expect(rotuloSituacao(1)).toBeNull();
    expect(rotuloSituacao(null)).toBeNull();
  });
  it('avisos (o da suspensa é o texto da spec)', () => {
    expect(AVISO_SUSPENSA).toBe('O órgão suspendeu esta licitação; confira o edital oficial antes de se preparar.');
    expect(avisoSituacao(4)).toBe(AVISO_SUSPENSA);
    expect(avisoSituacao(2)).toBe('O órgão revogou esta licitação: ela não está mais aberta.');
    expect(avisoSituacao(3)).toBe('O órgão anulou esta licitação: ela não está mais aberta.');
    expect(avisoSituacao(1)).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { ENTREGAVEIS_ASSESSORIA, hrefAssessoria, LIMITES_ASSESSORIA, mostrarAssessoria, numeroWhatsapp, precoAssessoria, rotuloPrecoAssessoria } from './assessoria';

describe('numeroWhatsapp', () => {
  it('guarda só os dígitos, com 55 na frente', () => {
    expect(numeroWhatsapp('(11) 98765-4321')).toBe('5511987654321');
    expect(numeroWhatsapp('+55 11 98765-4321')).toBe('5511987654321');
    expect(numeroWhatsapp('47 3433-1234')).toBe('554734331234');
  });
  it('vazio ou inválido não vale', () => {
    expect(numeroWhatsapp(undefined)).toBeNull();
    expect(numeroWhatsapp('')).toBeNull();
    expect(numeroWhatsapp('98765-4321')).toBeNull();
    expect(numeroWhatsapp('5511987654321000')).toBeNull();
    expect(numeroWhatsapp('(01) 98765-4321')).toBeNull();
  });
});

describe('preço da assessoria', () => {
  it('R$ 197 por padrão, sem centavos quando redondo', () => {
    expect(rotuloPrecoAssessoria(precoAssessoria(undefined))).toBe('R$ 197');
  });
  it('configurável em centavos', () => {
    expect(precoAssessoria('24700')).toBe(24700);
    expect(rotuloPrecoAssessoria(24700)).toBe('R$ 247');
    expect(rotuloPrecoAssessoria(19790)).toBe('R$ 197,90');
  });
  it('valor inválido volta ao padrão, nunca mostra preço quebrado', () => {
    for (const v of ['', 'abc', '0', '-100', '19.7']) expect(precoAssessoria(v), v).toBe(19700);
  });
});

describe('o que a assessoria inclui e o que não inclui', () => {
  it('os seis entregáveis combinados', () => {
    expect(ENTREGAVEIS_ASSESSORIA).toEqual([
      'Análise orientativa do edital',
      'Resumo em linguagem simples',
      'Identificação dos documentos exigidos',
      'Checklist para preparação',
      'Orientações sobre as etapas para participar',
      'Indicação dos canais e procedimentos oficiais',
    ]);
  });
  it('o que não prestamos só aparece como limite, nunca como entrega', () => {
    const limites = LIMITES_ASSESSORIA.join(' ');
    for (const t of ['habilitação', 'vitória', 'proposta', 'sessões públicas', 'jurídica', 'integral']) expect(limites, t).toContain(t);
    expect(ENTREGAVEIS_ASSESSORIA.join(' ')).not.toMatch(/garant|vitória|sessão|sessões|jurídic|envio de proposta/i);
  });
});

describe('hrefAssessoria', () => {
  it('com e sem edital', () => {
    expect(hrefAssessoria()).toBe('/assessoria');
    expect(hrefAssessoria('00394452000103-2026-21982')).toBe('/assessoria?edital=00394452000103-2026-21982');
  });
});

describe('mostrarAssessoria', () => {
  const agora = new Date('2026-11-10T13:00:00.000Z');
  it('em todo edital com propostas abertas, mesmo encerrando hoje', () => {
    expect(mostrarAssessoria({ encerramento_em: '2026-11-10T13:30:00.000Z', situacao_id: 1 }, agora)).toBe(true);
    expect(mostrarAssessoria({ encerramento_em: '2026-11-10T13:00:00.000Z', situacao_id: 1 }, agora)).toBe(false);
    expect(mostrarAssessoria({ encerramento_em: null, situacao_id: 1 }, agora)).toBe(false);
  });
  it('revogada ou anulada não', () => {
    expect(mostrarAssessoria({ encerramento_em: '2026-12-01T13:00:00.000Z', situacao_id: 2 }, agora)).toBe(false);
    expect(mostrarAssessoria({ encerramento_em: '2026-12-01T13:00:00.000Z', situacao_id: 3 }, agora)).toBe(false);
  });
});

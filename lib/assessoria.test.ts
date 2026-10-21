import { describe, expect, it } from 'vitest';
import { linkAssessoria, mensagemAssessoria, mostrarAssessoria, numeroWhatsapp } from './assessoria';

const EDITAL = {
  slug: '00394452000103-2026-21982',
  titulo: 'Aquisição de equipamentos de informática',
  orgao: 'Prefeitura Municipal de Joinville',
  local: 'Joinville/SC',
  encerramento_em: '2026-11-12T13:00:00.000Z',
};

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

describe('mensagemAssessoria', () => {
  it('título, órgão, local, prazo e link do edital', () => {
    expect(mensagemAssessoria(EDITAL)).toBe(
      [
        'Olá! Vi este edital no Edital Map e quero orientação para participar:',
        '',
        'Aquisição de equipamentos de informática',
        'Prefeitura Municipal de Joinville · Joinville/SC',
        'Propostas até 12.11.2026 · 10h',
        'https://www.editalmap.com.br/edital/00394452000103-2026-21982',
      ].join('\n'),
    );
  });
  it('sem prazo, sem a linha; título longo cortado', () => {
    const m = mensagemAssessoria({ ...EDITAL, titulo: 'a'.repeat(200), encerramento_em: null });
    expect(m).not.toContain('Propostas até');
    expect(m).toContain(`${'a'.repeat(119)}…`);
    expect(m).not.toContain('a'.repeat(120));
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

describe('linkAssessoria', () => {
  it('wa.me com a mensagem codificada', () => {
    const url = new URL(linkAssessoria('5511987654321', EDITAL));
    expect(url.origin + url.pathname).toBe('https://wa.me/5511987654321');
    expect(url.searchParams.get('text')).toBe(mensagemAssessoria(EDITAL));
  });
});

import { describe, expect, it } from 'vitest';
import { diasCompletos, intervaloDoPeriodo, largura, nomeDaPagina, nomeDoRecurso, taxa } from './admin';

// 20/10/2026 14:30 em Brasília (UTC-3).
const AGORA = new Date('2026-10-20T17:30:00Z');

describe('intervaloDoPeriodo', () => {
  it('padrão: 7 dias contando hoje, da meia-noite de Brasília até agora', () => {
    expect(intervaloDoPeriodo(undefined, AGORA)).toEqual({
      periodo: '7', desde: new Date('2026-10-14T03:00:00Z'), ate: AGORA,
    });
  });
  it('hoje, 30 e 90 dias; valor estranho volta ao padrão', () => {
    expect(intervaloDoPeriodo('hoje', AGORA).desde).toEqual(new Date('2026-10-20T03:00:00Z'));
    expect(intervaloDoPeriodo('30', AGORA).desde).toEqual(new Date('2026-09-21T03:00:00Z'));
    expect(intervaloDoPeriodo('90', AGORA).desde).toEqual(new Date('2026-07-23T03:00:00Z'));
    expect(intervaloDoPeriodo('365', AGORA).periodo).toBe('7');
  });
  it('logo depois da meia-noite de Brasília já conta o dia novo', () => {
    const madrugada = new Date('2026-10-21T03:10:00Z'); // 00:10 do dia 21 em Brasília
    expect(intervaloDoPeriodo('hoje', madrugada).desde).toEqual(new Date('2026-10-21T03:00:00Z'));
  });
});

describe('diasCompletos', () => {
  it('preenche os dias sem eventos com zero, em ordem', () => {
    const dias = diasCompletos([{ dia: '2026-10-16', visitantes: 3, paginas: 5, buscas: 2, editais: 1 }], new Date('2026-10-14T03:00:00Z'), AGORA);
    expect(dias.map((d) => d.dia)).toEqual(['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20']);
    expect(dias[2]).toEqual({ dia: '2026-10-16', visitantes: 3, paginas: 5, buscas: 2, editais: 1 });
    expect(dias[0]).toEqual({ dia: '2026-10-14', visitantes: 0, paginas: 0, buscas: 0, editais: 0 });
  });
});

describe('largura e taxa', () => {
  it('barra proporcional ao maior, com um mínimo visível', () => {
    expect(largura(5, 10)).toBe(50);
    expect(largura(1, 1000)).toBe(2);
    expect(largura(0, 10)).toBe(0);
    expect(largura(3, 0)).toBe(0);
  });
  it('taxa em porcentagem inteira; sem base, traço', () => {
    expect(taxa(1, 3)).toBe('33%');
    expect(taxa(0, 0)).toBe('–');
  });
});

describe('nomes', () => {
  it('páginas conhecidas ganham nome; as outras ficam pelo caminho', () => {
    expect(nomeDaPagina('/')).toBe('Página inicial');
    expect(nomeDaPagina('/edital')).toBe('Edital');
    expect(nomeDaPagina('/licitacoes/epi/sc')).toBe('/licitacoes/epi/sc');
  });
  it('recursos conhecidos ganham nome; os desconhecidos ficam como vieram', () => {
    expect(nomeDoRecurso('usou_recurso', 'exportou')).toBe('Exportou CSV');
    expect(nomeDoRecurso('quer_recurso', 'plano_pro')).toBe('Quero o Pro (lista de espera)');
    expect(nomeDoRecurso('usou_recurso', 'outro')).toBe('outro');
  });
});

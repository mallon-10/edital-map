import { describe, expect, it } from 'vitest';
import { data, dataHora, diasAte, diaMes, etiqueta, haQuanto, hora, linkOficial, moeda, moedaCurta, numero, prazo, quantidade } from './formato';

// 15/10/2026 12h em Brasília
const AGORA = new Date('2026-10-15T15:00:00Z');

describe('moeda e números', () => {
  it('formata reais', () => {
    expect(moeda(1282749.8)).toBe('R$ 1.282.749,80');
    expect(moeda('29000')).toBe('R$ 29.000,00');
  });
  it('zero, vazio e inválido viram null', () => {
    expect(moeda(0)).toBeNull();
    expect(moeda(null)).toBeNull();
    expect(moeda(undefined)).toBeNull();
    expect(moeda('abc')).toBeNull();
  });
  it('números e quantidades', () => {
    expect(numero(9022)).toBe('9.022');
    expect(quantidade(200)).toBe('200');
    expect(quantidade('0.5')).toBe('0,5');
    expect(quantidade(null)).toBe('—');
  });
});

describe('datas no padrão da marca', () => {
  it('hora sem minutos quando são 00', () => {
    expect(hora('2026-10-17T12:00:00Z')).toBe('09h');
    expect(hora('2026-10-16T12:30:00Z')).toBe('09h30');
  });
  it('data e data com hora', () => {
    expect(data('2026-10-17T12:00:00Z')).toBe('17.10.2026');
    expect(dataHora('2026-10-17T12:00:00Z')).toBe('17.10.2026 · 09h');
  });
  it('dias de calendário de Brasília', () => {
    expect(diasAte('2026-10-16T02:30:00Z', AGORA)).toBe(0); // 15/10 23h30 em Brasília
    expect(diasAte('2026-10-16T03:30:00Z', AGORA)).toBe(1); // 16/10 00h30 em Brasília
  });
});

describe('prazo', () => {
  it('encerra hoje', () => {
    expect(prazo('2026-10-15T20:00:00Z', AGORA)).toEqual({ situacao: 'Prazo próximo', tom: 'urgente', texto: 'Encerra hoje às 17h' });
    expect(prazo('2026-10-16T02:30:00Z', AGORA).texto).toBe('Encerra hoje às 23h30');
  });
  it('encerra amanhã', () => {
    expect(prazo('2026-10-16T12:30:00Z', AGORA)).toEqual({ situacao: 'Prazo próximo', tom: 'urgente', texto: 'Encerra amanhã às 09h30' });
  });
  it('até 7 dias', () => {
    expect(prazo('2026-10-20T13:00:00Z', AGORA)).toEqual({ situacao: 'Prazo próximo', tom: 'proximo', texto: 'Encerra em 5 dias' });
  });
  it('mais longe', () => {
    expect(prazo('2026-11-14T13:00:00Z', AGORA)).toEqual({ situacao: 'Aberto', tom: 'longe', texto: '30 dias' });
    expect(prazo('2028-01-01T00:00:00Z', AGORA).texto).toBe('mais de 1 ano');
  });
  it('vencido e sem prazo', () => {
    expect(prazo('2026-10-15T14:00:00Z', AGORA)).toEqual({ situacao: 'Encerrado', tom: 'encerrado', texto: 'Encerrado em 15.10.2026' });
    expect(prazo(null, AGORA)).toEqual({ situacao: 'Sem prazo', tom: 'encerrado', texto: 'Prazo não informado' });
  });
});

describe('haQuanto e link oficial', () => {
  it('tempo relativo', () => {
    expect(haQuanto('2026-10-15T14:59:30Z', AGORA)).toBe('agora há pouco');
    expect(haQuanto('2026-10-15T14:22:00Z', AGORA)).toBe('há 38 min');
    expect(haQuanto('2026-10-15T12:00:00Z', AGORA)).toBe('há 3 h');
    expect(haQuanto('2026-10-13T15:00:00Z', AGORA)).toBe('há 2 dias');
  });
  it('usa o link de origem ou o portal do PNCP', () => {
    expect(linkOficial({ link_origem: 'https://x.gov.br/e', cnpj: '1', ano: 2026, sequencial: 2 })).toBe('https://x.gov.br/e');
    expect(linkOficial({ link_origem: null, cnpj: '00394452000103', ano: 2026, sequencial: 21982 })).toBe(
      'https://pncp.gov.br/app/editais/00394452000103/2026/21982',
    );
  });
  it('só usa link de origem com http ou https', () => {
    const pncp = 'https://pncp.gov.br/app/editais/00394452000103/2026/21982';
    const base = { cnpj: '00394452000103', ano: 2026, sequencial: 21982 };
    expect(linkOficial({ ...base, link_origem: 'javascript:alert(1)' })).toBe(pncp);
    expect(linkOficial({ ...base, link_origem: 'www.x.gov.br/e' })).toBe(pncp);
    expect(linkOficial({ ...base, link_origem: 'HTTP://X.GOV.BR/E' })).toBe('HTTP://X.GOV.BR/E');
  });
});

describe('moedaCurta e diaMes', () => {
  it('abrevia', () => {
    expect(moedaCurta(850)).toBe('R$ 850');
    expect(moedaCurta(860_000)).toBe('R$ 860 mil');
    expect(moedaCurta(999_600)).toBe('R$ 999 mil');
    expect(moedaCurta(1_250_000)).toBe('R$ 1,25 mi');
    expect(moedaCurta(1_284_000)).toBe('R$ 1,28 mi');
    expect(moedaCurta(2_105_000_000)).toBe('R$ 2,1 bi');
    expect(moedaCurta('50000')).toBe('R$ 50 mil');
  });
  it('zero e vazio viram null', () => {
    expect(moedaCurta(0)).toBeNull();
    expect(moedaCurta(null)).toBeNull();
  });
  it('dia e mês no padrão da marca', () => {
    expect(diaMes('2026-09-25T13:00:00Z')).toBe('25.09');
  });
});

describe('etiqueta', () => {
  const longe = '2026-11-14T13:00:00Z';
  it('prazo manda primeiro', () => {
    expect(etiqueta({ encerramento_em: '2026-10-15T20:00:00Z', publicada_em: null }, AGORA)).toEqual({ texto: 'Encerra hoje', tom: 'urgente' });
    expect(etiqueta({ encerramento_em: '2026-10-16T12:30:00Z', publicada_em: null }, AGORA)).toEqual({ texto: 'Encerra amanhã', tom: 'urgente' });
    expect(etiqueta({ encerramento_em: '2026-10-20T13:00:00Z', publicada_em: '2026-10-15T12:00:00Z' }, AGORA)).toEqual({
      texto: 'Encerra em 5 dias',
      tom: 'proximo',
    });
  });
  it('novo: publicado nos últimos 3 dias de calendário', () => {
    expect(etiqueta({ encerramento_em: longe, publicada_em: '2026-10-13T12:00:00Z' }, AGORA)).toEqual({ texto: 'Novo', tom: 'novo' });
    expect(etiqueta({ encerramento_em: longe, publicada_em: '2026-10-12T12:00:00Z' }, AGORA)).toEqual({ texto: 'Aberto', tom: 'aberto' });
    expect(etiqueta({ encerramento_em: longe, publicada_em: null }, AGORA)).toEqual({ texto: 'Aberto', tom: 'aberto' });
  });
});

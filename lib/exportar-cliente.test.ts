import { describe, expect, it } from 'vitest';
import { ERRO_EXPORTAR, mensagemDaApi, nomeDoArquivo } from './exportar-cliente';

describe('mensagemDaApi', () => {
  it('usa a mensagem da API', () => expect(mensagemDaApi({ erro: 'Limite por hora.' })).toBe('Limite por hora.'));
  it.each([null, undefined, {}, { erro: '' }, { erro: 3 }, 'x'])('cai no genérico para %j', (c) => expect(mensagemDaApi(c)).toBe(ERRO_EXPORTAR));
});

describe('nomeDoArquivo', () => {
  const agora = new Date('2026-10-17T15:00:00Z');
  it('lê o filename', () => expect(nomeDoArquivo('attachment; filename="a.csv"', agora)).toBe('a.csv'));
  it('sem cabeçalho usa a data', () => expect(nomeDoArquivo(null, agora)).toBe('editais-2026-10-17.csv'));
});

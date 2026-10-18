import { describe, expect, it } from 'vitest';
import type { RespostaCnpj } from './cliente/cnpj';
import {
  corpoRadarRapido, localPadraoDoCnpj, marcadosDoCnpj, opcoesDoCnpj, pareceCnpj, produtosDoTexto, radarDoCnpj,
} from './onboardingRadar';
import { validarRadar } from './radar';
import { ASSUNTOS } from './seo/assuntos';

const empresa = (o: Partial<RespostaCnpj['empresa']> = {}): RespostaCnpj['empresa'] => ({
  razao: 'EMPRESA LTDA', fantasia: null, uf: 'SC', municipio: 'JOINVILLE', ativa: true, atividade: 'Confecção', ...o,
});

describe('produtosDoTexto', () => {
  it('separa por vírgula ou ponto e vírgula, tira espaços e repetidos', () => {
    expect(produtosDoTexto(' uniforme,  luva ; bota de segurança ; Luva ')).toEqual(['uniforme', 'luva', 'bota de segurança']);
  });
  it('soma aos que já existem sem repetir (plural e acento contam como iguais)', () => {
    expect(produtosDoTexto('luvas, botas', ['luva'])).toEqual(['luva', 'botas']);
    expect(produtosDoTexto('Informática', ['informatica'])).toEqual(['informatica']);
  });
  it('vazio, só separadores e hífen inicial', () => {
    expect(produtosDoTexto('')).toEqual([]);
    expect(produtosDoTexto(' , ;; ')).toEqual([]);
    expect(produtosDoTexto('-papel A4')).toEqual(['papel A4']);
  });
});

describe('pareceCnpj', () => {
  it('14 números, com ou sem máscara', () => {
    expect(pareceCnpj('11.222.333/0001-81')).toBe(true);
    expect(pareceCnpj('11222333000181')).toBe(true);
    expect(pareceCnpj('11222333000180')).toBe(true);
  });
  it('texto ou outra quantidade de números não é CNPJ', () => {
    expect(pareceCnpj('uniforme')).toBe(false);
    expect(pareceCnpj('papel A4')).toBe(false);
    expect(pareceCnpj('123456')).toBe(false);
    expect(pareceCnpj('')).toBe(false);
  });
});

describe('resposta do CNPJ → radar', () => {
  const r: RespostaCnpj = {
    empresa: empresa(),
    assuntos: [
      { slug: 'uniformes', nome: 'uniformes', principal: true },
      { slug: 'epi', nome: 'EPI', principal: true },
      { slug: 'limpeza', nome: 'materiais de limpeza', principal: false },
    ],
  };
  it('marca só os da atividade principal', () => {
    expect(marcadosDoCnpj(r)).toEqual(['uniformes', 'epi']);
  });
  it('sem segmento encontrado: todos aparecem, nenhum marcado', () => {
    const vazio = { ...r, assuntos: [] };
    expect(opcoesDoCnpj(vazio).map((a) => a.slug)).toEqual(ASSUNTOS.map((a) => a.slug));
    expect(marcadosDoCnpj(vazio)).toEqual([]);
    expect(opcoesDoCnpj(r).map((a) => a.slug)).toEqual(['uniformes', 'epi', 'limpeza']);
  });
  it('local padrão: a UF da sede; sem UF, todo o Brasil', () => {
    expect(localPadraoDoCnpj('SC')).toBe('uf');
    expect(localPadraoDoCnpj(null)).toBe('brasil');
  });
  it('termos = termo de cada assunto marcado; ufs = [UF] ou []', () => {
    expect(radarDoCnpj(['uniformes', 'epi'], 'SC', 'uf')).toEqual({ termos: ['EPI', 'uniforme'], ufs: ['SC'] });
    expect(radarDoCnpj(['uniformes'], 'SC', 'brasil')).toEqual({ termos: ['uniforme'], ufs: [] });
    expect(radarDoCnpj(['uniformes'], null, 'uf')).toEqual({ termos: ['uniforme'], ufs: [] });
    expect(radarDoCnpj(['nao-existe'], 'SC', 'uf')).toEqual({ termos: [], ufs: ['SC'] });
  });
});

describe('corpoRadarRapido', () => {
  it('só termos e estados; o resto vazio, e passa na validação do servidor', () => {
    const corpo = corpoRadarRapido(['EPI', 'uniforme'], ['SC']);
    expect(corpo).toEqual({
      termos: ['EPI', 'uniforme'], termosExcluir: [], ufs: ['SC'], municipios: [], valorMin: null, valorMax: null, modalidades: [], soMeEpp: false,
    });
    expect(validarRadar(corpo).ok).toBe(true);
  });
  it('cada assunto do CNPJ vira um termo que o servidor aceita', () => {
    const { termos } = radarDoCnpj(ASSUNTOS.map((a) => a.slug).slice(0, 10), null, 'brasil');
    expect(validarRadar(corpoRadarRapido(termos, [])).ok).toBe(true);
  });
});

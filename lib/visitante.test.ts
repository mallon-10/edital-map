import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COOKIE_INTERNO, COOKIE_VISITANTE, OPCOES_COOKIE, visitanteDoCookie, visitanteValido } from './visitante';

const UUID = '6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b';

describe('cookie do visitante', () => {
  it('nomes de sempre, um ano, só para o servidor, o site todo', () => {
    expect(COOKIE_VISITANTE).toBe('em_visitante');
    expect(COOKIE_INTERNO).toBe('em_interno');
    expect(OPCOES_COOKIE).toMatchObject({ maxAge: 60 * 60 * 24 * 365, httpOnly: true, sameSite: 'lax', path: '/' });
  });
  it('aceita só UUID minúsculo', () => {
    expect(visitanteValido(UUID)).toBe(true);
    expect(visitanteValido(UUID.toUpperCase())).toBe(false);
    expect(visitanteValido('')).toBe(false);
    expect(visitanteValido(undefined)).toBe(false);
    expect(visitanteValido('abc')).toBe(false);
  });
  it('mantém o válido e gera um novo quando falta ou é inválido', () => {
    expect(visitanteDoCookie(UUID, () => 'nunca')).toEqual({ visitante: UUID, novo: false });
    expect(visitanteDoCookie(undefined, () => UUID)).toEqual({ visitante: UUID, novo: true });
    expect(visitanteDoCookie('lixo', () => UUID)).toEqual({ visitante: UUID, novo: true });
  });
  it('o proxy roda nas páginas que contam e nas rotas da API', () => {
    const proxy = readFileSync(new URL('../proxy.ts', import.meta.url), 'utf8');
    expect(proxy).toContain('export async function proxy(');
    for (const caminho of ["'/'", "'/edital/:path*'", "'/planos'", "'/api/:path*'"]) expect(proxy).toContain(caminho);
  });
});

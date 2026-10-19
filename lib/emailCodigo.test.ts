import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ASSUNTO_CODIGO, codigoValido, htmlDoCodigo, MODELO_CODIGO_HTML, REMETENTE_CODIGO, textoDoCodigo } from './emailCodigo';

const semCr = (s: string) => s.replace(/\r\n/g, '\n');

describe('e-mail do código de acesso', () => {
  it('o modelo do site é idêntico a supabase/templates/codigo.html (cópia para colar no Supabase)', () => {
    const arquivo = readFileSync(new URL('../supabase/templates/codigo.html', import.meta.url), 'utf8');
    expect(semCr(MODELO_CODIGO_HTML)).toBe(semCr(arquivo));
    expect(MODELO_CODIGO_HTML.split('{{ .Token }}')).toHaveLength(2);
  });
  it('htmlDoCodigo troca o {{ .Token }} pelo código, igual ao que o Supabase faria', () => {
    const arquivo = semCr(readFileSync(new URL('../supabase/templates/codigo.html', import.meta.url), 'utf8'));
    expect(semCr(htmlDoCodigo('482913'))).toBe(arquivo.replace('{{ .Token }}', '482913'));
    expect(htmlDoCodigo('482913')).not.toContain('{{');
  });
  it('texto, assunto (sem o código) e remetente', () => {
    const texto = textoDoCodigo('482913');
    expect(texto).toContain('482913');
    expect(texto).toContain('Vale por 1 hora');
    expect(texto).toContain('https://www.editalmap.com.br/');
    expect(ASSUNTO_CODIGO).toBe('Seu código do Edital Map');
    expect(ASSUNTO_CODIGO).not.toMatch(/\d/);
    expect(REMETENTE_CODIGO).toBe('Edital Map <nao-responda@editalmap.com.br>');
  });
  it('só aceita 6 dígitos (nada de HTML entra no modelo)', () => {
    expect(codigoValido('012345')).toBe(true);
    for (const ruim of ['12345', '1234567', '12345a', '<b>1</b>', '', null, undefined, 123456]) expect(codigoValido(ruim)).toBe(false);
    expect(() => htmlDoCodigo('<script>')).toThrow();
    expect(() => textoDoCodigo('1234567')).toThrow();
  });
});

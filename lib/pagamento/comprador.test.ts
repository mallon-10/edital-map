import { describe, expect, it } from 'vitest';
import { cnpjValido, cpfValido, validarComprador } from './comprador';

describe('documentos', () => {
  it('CPF com dígito verificador', () => {
    expect(cpfValido('529.982.247-25')).toBe(true);
    expect(cpfValido('52998224725')).toBe(true);
    expect(cpfValido('529.982.247-24')).toBe(false);
    expect(cpfValido('111.111.111-11')).toBe(false);
    expect(cpfValido('123')).toBe(false);
  });
  it('CNPJ com dígito verificador', () => {
    expect(cnpjValido('11.222.333/0001-81')).toBe(true);
    expect(cnpjValido('11222333000181')).toBe(true);
    expect(cnpjValido('11.222.333/0001-80')).toBe(false);
    expect(cnpjValido('00.000.000/0000-00')).toBe(false);
  });
});

describe('validarComprador', () => {
  const ok = { nome: '  Maria  da Silva ', email: ' Maria@Exemplo.COM ', celular: '(11) 99999-8888', documento: '529.982.247-25' };
  it('normaliza: nome sem espaços extras, e-mail minúsculo, celular E.164, documento só dígitos', () => {
    expect(validarComprador(ok)).toEqual({
      ok: true,
      comprador: { nome: 'Maria da Silva', email: 'maria@exemplo.com', celular: '5511999998888', tipoDocumento: 'cpf', documento: '52998224725' },
    });
  });
  it('CNPJ vira docType cnpj', () => {
    const r = validarComprador({ ...ok, documento: '11.222.333/0001-81' });
    expect(r.ok && r.comprador.tipoDocumento).toBe('cnpj');
  });
  it('erros por campo', () => {
    expect(validarComprador({ nome: 'Ma', email: 'x@', celular: '1199', documento: '123' })).toEqual({
      ok: false,
      erros: {
        nome: 'Informe o nome completo.',
        email: 'Informe um e-mail válido.',
        celular: 'Informe o celular com DDD.',
        documento: 'Informe um CPF ou CNPJ válido.',
      },
    });
  });
  it('celular já com 55 e fixo de 10 dígitos não passa como celular', () => {
    expect(validarComprador({ ...ok, celular: '+55 11 99999-8888' }).ok).toBe(true);
    expect(validarComprador({ ...ok, celular: '(11) 3333-4444' }).ok).toBe(false);
  });
  it('corpo estranho não quebra', () => {
    expect(validarComprador(null).ok).toBe(false);
    expect(validarComprador({ nome: 1 }).ok).toBe(false);
  });
});

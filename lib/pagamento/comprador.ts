/**
 * Dados do comprador no checkout próprio (spec do pagamento, revisão 2, §4). A Cakto exige nome, e-mail e celular
 * (E.164) e, na prática, CPF ou CNPJ. Validado no navegador e de novo no servidor.
 */
export type Comprador = { nome: string; email: string; celular: string; tipoDocumento: 'cpf' | 'cnpj'; documento: string };
type Campo = 'nome' | 'email' | 'celular' | 'documento';
export type ResultadoComprador = { ok: true; comprador: Comprador } | { ok: false; erros: Partial<Record<Campo, string>> };

const digitos = (t: string) => t.replace(/\D/g, '');
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function digitoVerificador(base: string, pesos: number[]): number {
  const soma = [...base].reduce((s, d, i) => s + Number(d) * pesos[i], 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function cpfValido(t: string): boolean {
  const c = digitos(t);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const d1 = digitoVerificador(c.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = digitoVerificador(c.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === Number(c[9]) && d2 === Number(c[10]);
}

export function cnpjValido(t: string): boolean {
  const c = digitos(t);
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const d1 = digitoVerificador(c.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = digitoVerificador(c.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === Number(c[12]) && d2 === Number(c[13]);
}

/** Celular brasileiro (DDD + 9 + 8 dígitos) → E.164 sem o +: "5511999998888". */
function celularE164(t: string): string | null {
  let c = digitos(t);
  if (c.length === 13 && c.startsWith('55')) c = c.slice(2);
  return /^[1-9]{2}9\d{8}$/.test(c) ? `55${c}` : null;
}

export function validarComprador(corpo: unknown): ResultadoComprador {
  const c = (typeof corpo === 'object' && corpo !== null ? corpo : {}) as Record<string, unknown>;
  const texto = (v: unknown) => (typeof v === 'string' ? v : '');
  const nome = texto(c.nome).replace(/\s+/g, ' ').trim();
  const email = texto(c.email).trim().toLowerCase();
  const celular = celularE164(texto(c.celular));
  const doc = digitos(texto(c.documento));
  const tipo = doc.length === 11 && cpfValido(doc) ? 'cpf' : doc.length === 14 && cnpjValido(doc) ? 'cnpj' : null;
  const erros: Partial<Record<Campo, string>> = {};
  if (nome.length < 5 || !nome.includes(' ') || nome.length > 120) erros.nome = 'Informe o nome completo.';
  if (!EMAIL.test(email) || email.length > 254) erros.email = 'Informe um e-mail válido.';
  if (!celular) erros.celular = 'Informe o celular com DDD.';
  if (!tipo) erros.documento = 'Informe um CPF ou CNPJ válido.';
  if (Object.keys(erros).length > 0 || !celular || !tipo) return { ok: false, erros };
  return { ok: true, comprador: { nome, email, celular, tipoDocumento: tipo, documento: doc } };
}

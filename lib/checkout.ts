import type { CartaoDigitado, Endereco } from './cliente/caktoSdk';
import { formatarReais, PLANOS, type Periodo } from './planos';

/**
 * Checkout do Pro (spec 2026-10-22-checkout-design.md): máscaras dos campos, validação do cartão antes do SDK da Cakto e
 * os textos que mudam com o período e a forma de pagamento. Sem nada do navegador: o componente só chama daqui.
 */

export type Metodo = 'pix' | 'cartao';

const PRO = PLANOS.find((p) => p.id === 'pro')!;
const so = (t: string) => t.replace(/\D/g, '');

/** Junta os dígitos nos pedaços de `tamanhos` com os separadores de `juntas` (só os que já têm dígito). */
function formatar(digitos: string, tamanhos: number[], juntas: string[]): string {
  let saida = '';
  let i = 0;
  tamanhos.forEach((n, k) => {
    const pedaco = digitos.slice(i, i + n);
    if (!pedaco) return;
    saida += (k > 0 ? juntas[k - 1] : '') + pedaco;
    i += n;
  });
  return saida;
}

/** CPF (000.000.000-00) até 11 dígitos; a partir do 12º, CNPJ (00.000.000/0000-00). */
export function mascaraDocumento(t: string): string {
  const d = so(t).slice(0, 14);
  return d.length <= 11 ? formatar(d, [3, 3, 3, 2], ['.', '.', '-']) : formatar(d, [2, 3, 3, 4, 2], ['.', '.', '/', '-']);
}

/** (11) 98765-4321 (celular começa com 9); fixo, (11) 3456-7890. */
export function mascaraCelular(t: string): string {
  const d = so(t).slice(0, 11);
  if (!d) return '';
  return `(${formatar(d, [2, d[2] === '9' ? 5 : 4, 4], [') ', '-'])}`;
}

export const mascaraCartao = (t: string) => (so(t).slice(0, 19).match(/.{1,4}/g) ?? []).join(' ');
export const mascaraValidade = (t: string) => formatar(so(t).slice(0, 4), [2, 2], ['/']);
export const mascaraCvv = (t: string) => so(t).slice(0, 4);
export const mascaraCep = (t: string) => formatar(so(t).slice(0, 8), [5, 3], ['-']);

/** Dígito verificador do cartão (Luhn). */
function luhn(numero: string): boolean {
  let soma = 0;
  [...numero].reverse().forEach((c, i) => {
    let n = Number(c);
    if (i % 2 === 1) n = n * 2 > 9 ? n * 2 - 9 : n * 2;
    soma += n;
  });
  return soma % 10 === 0;
}

export type CartaoForm = { numero: string; nomeCartao: string; validade: string; cvv: string };
export type EnderecoForm = { cep: string; rua: string; numero: string; complemento: string; cidade: string; uf: string };
export type CampoCartao = 'numero' | 'nomeCartao' | 'validade' | 'cvv' | 'cep' | 'enderecoNumero' | 'rua' | 'cidade' | 'uf';
export type ResultadoCartao =
  | { ok: true; cartao: CartaoDigitado; endereco: Endereco }
  | { ok: false; erros: Partial<Record<CampoCartao, string>> };

/** Cartão e endereço de cobrança, campo a campo, no formato que o SDK da Cakto pede (o 3D Secure exige o endereço). */
export function validarCartao(c: CartaoForm, e: EnderecoForm, agora: Date): ResultadoCartao {
  const numero = so(c.numero);
  const [mes = '', ano = ''] = mascaraValidade(c.validade).split('/');
  const cartao: CartaoDigitado = { holderName: c.nomeCartao.replace(/\s+/g, ' ').trim(), cardNumber: numero, cvv: so(c.cvv), expMonth: mes, expYear: ano };
  const endereco: Endereco = {
    street: e.rua.trim(), number: e.numero.trim(), complement: e.complemento.trim(),
    city: e.cidade.trim(), state: e.uf.trim().toUpperCase(), zipcode: so(e.cep),
  };
  const erros: Partial<Record<CampoCartao, string>> = {};
  if (numero.length < 13 || numero.length > 19 || !luhn(numero)) erros.numero = 'Confira o número do cartão.';
  if (cartao.holderName.length < 2) erros.nomeCartao = 'Informe o nome como está no cartão.';
  const m = Number(mes);
  if (mes.length !== 2 || ano.length !== 2 || m < 1 || m > 12) erros.validade = 'Informe MM/AA.';
  else if (2000 + Number(ano) < agora.getUTCFullYear() || (2000 + Number(ano) === agora.getUTCFullYear() && m < agora.getUTCMonth() + 1)) {
    erros.validade = 'Cartão vencido.';
  }
  if (cartao.cvv.length < 3) erros.cvv = 'Informe o CVV.';
  if (endereco.zipcode.length !== 8) erros.cep = 'Informe o CEP.';
  if (!endereco.number) erros.enderecoNumero = 'Informe o número.';
  if (!endereco.street) erros.rua = 'Informe a rua.';
  if (!endereco.city) erros.cidade = 'Informe a cidade.';
  if (!/^[A-Z]{2}$/.test(endereco.state)) erros.uf = 'Informe a UF.';
  return Object.keys(erros).length > 0 ? { ok: false, erros } : { ok: true, cartao, endereco };
}

export type TextosCheckout = { valor: string; sufixo: string; depois: string; botao: string; letraMiuda: string };

/** O que muda com o período e a forma de pagamento: o preço do resumo, o botão e a linha embaixo dele. */
export function textosCheckout(periodo: Periodo, metodo: Metodo): TextosCheckout {
  const anual = periodo === 'anual';
  const valor = formatarReais(anual ? PRO.centavosAno : PRO.centavosMes);
  const unidade = anual ? 'ano' : 'mês';
  return {
    valor,
    sufixo: `/${unidade}`,
    depois: `Depois, ${valor} por ${unidade}, até você cancelar.`,
    botao: `Assinar com ${metodo === 'pix' ? 'Pix' : 'cartão'} · ${valor}`,
    letraMiuda:
      metodo === 'pix'
        ? 'Na próxima tela aparece o QR Code para autorizar no app do banco.'
        : `Cobrado agora e renovado a cada ${unidade}. Você cancela quando quiser.`,
  };
}

/** "Rua Augusta · São Paulo/SP" (o endereço que o CEP trouxe). */
export function linhaEndereco(e: { rua: string; cidade: string; uf: string }): string {
  const lugar = [e.cidade.trim(), e.uf.trim().toUpperCase()].filter(Boolean).join('/');
  return [e.rua.trim(), lugar].filter(Boolean).join(' · ');
}

/** Checkout: sem a barra de baixo do celular (nada tira a pessoa do pagamento). */
export const ehCheckout = (caminho: string) => caminho === '/assinar' || caminho.startsWith('/assinar/');

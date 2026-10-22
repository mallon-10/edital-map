import { describe, expect, it } from 'vitest';
import {
  ehCheckout,
  linhaEndereco,
  mascaraCartao,
  mascaraCelular,
  mascaraCep,
  mascaraCvv,
  mascaraDocumento,
  mascaraValidade,
  textosCheckout,
  validarCartao,
} from './checkout';

describe('máscaras do checkout (o que a pessoa digita vira o formato de sempre)', () => {
  it('CPF vai se formando a cada dígito e vira CNPJ a partir do 12º', () => {
    expect(mascaraDocumento('123')).toBe('123');
    expect(mascaraDocumento('1234')).toBe('123.4');
    expect(mascaraDocumento('1234567')).toBe('123.456.7');
    expect(mascaraDocumento('12345678909')).toBe('123.456.789-09');
    expect(mascaraDocumento('123456789012')).toBe('12.345.678/9012');
    expect(mascaraDocumento('12.345.678/0001-95')).toBe('12.345.678/0001-95');
    expect(mascaraDocumento('123456780001959')).toBe('12.345.678/0001-95');
  });
  it('celular com DDD: (11) 98765-4321; fixo de 10 dígitos também formata', () => {
    expect(mascaraCelular('1')).toBe('(1');
    expect(mascaraCelular('11')).toBe('(11');
    expect(mascaraCelular('119')).toBe('(11) 9');
    expect(mascaraCelular('1198765')).toBe('(11) 98765');
    expect(mascaraCelular('11987654321')).toBe('(11) 98765-4321');
    expect(mascaraCelular('1134567890')).toBe('(11) 3456-7890');
    expect(mascaraCelular('(11) 98765-43219')).toBe('(11) 98765-4321');
  });
  it('cartão em grupos de 4, até 19 dígitos', () => {
    expect(mascaraCartao('5502')).toBe('5502');
    expect(mascaraCartao('55020912')).toBe('5502 0912');
    expect(mascaraCartao('5502091234567890')).toBe('5502 0912 3456 7890');
    expect(mascaraCartao('55020912345678901234')).toBe('5502 0912 3456 7890 123');
  });
  it('validade MM/AA, CVV até 4 dígitos e CEP 00000-000', () => {
    expect(mascaraValidade('0')).toBe('0');
    expect(mascaraValidade('08')).toBe('08');
    expect(mascaraValidade('082')).toBe('08/2');
    expect(mascaraValidade('08/29')).toBe('08/29');
    expect(mascaraValidade('082999')).toBe('08/29');
    expect(mascaraCvv('12a345')).toBe('1234');
    expect(mascaraCep('01305')).toBe('01305');
    expect(mascaraCep('013051')).toBe('01305-1');
    expect(mascaraCep('01305-1009')).toBe('01305-100');
  });
});

describe('validarCartao (antes de chamar o SDK da Cakto)', () => {
  const agora = new Date('2026-10-22T12:00:00Z');
  const cartao = { numero: '4111 1111 1111 1111', nomeCartao: ' Maria da Silva ', validade: '08/29', cvv: '123' };
  const endereco = { cep: '01305-100', rua: 'Rua Augusta', numero: '1200', complemento: '', cidade: 'São Paulo', uf: 'sp' };

  it('tudo certo: devolve o cartão e o endereço no formato do SDK', () => {
    const r = validarCartao(cartao, endereco, agora);
    expect(r).toEqual({
      ok: true,
      cartao: { holderName: 'Maria da Silva', cardNumber: '4111111111111111', cvv: '123', expMonth: '08', expYear: '29' },
      endereco: { street: 'Rua Augusta', number: '1200', complement: '', city: 'São Paulo', state: 'SP', zipcode: '01305100' },
    });
  });
  it('número que não passa no dígito verificador é marcado', () => {
    const r = validarCartao({ ...cartao, numero: '4111 1111 1111 1112' }, endereco, agora);
    expect(r).toEqual({ ok: false, erros: { numero: 'Confira o número do cartão.' } });
  });
  it('validade fora de 01–12 ou vencida (mensagens curtas: cabem na coluna estreita do celular)', () => {
    expect(validarCartao({ ...cartao, validade: '13/29' }, endereco, agora)).toEqual({ ok: false, erros: { validade: 'Informe MM/AA.' } });
    expect(validarCartao({ ...cartao, validade: '09/26' }, endereco, agora)).toEqual({ ok: false, erros: { validade: 'Cartão vencido.' } });
    expect(validarCartao({ ...cartao, validade: '10/26' }, endereco, agora).ok).toBe(true);
  });
  it('campos vazios: um erro por campo, inclusive o endereço', () => {
    const vazio = { numero: '', nomeCartao: '', validade: '', cvv: '' };
    const semEndereco = { cep: '', rua: '', numero: '', complemento: '', cidade: '', uf: '' };
    const r = validarCartao(vazio, semEndereco, agora);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.erros).sort()).toEqual(['cep', 'cidade', 'cvv', 'enderecoNumero', 'nomeCartao', 'numero', 'rua', 'uf', 'validade']);
    expect(r.erros.enderecoNumero).toBe('Informe o número.');
  });
});

describe('textos do checkout', () => {
  it('botão com a forma de pagamento e o valor do período', () => {
    expect(textosCheckout('mensal', 'pix').botao).toBe('Assinar com Pix · R$ 37,90');
    expect(textosCheckout('anual', 'cartao').botao).toBe('Assinar com cartão · R$ 349,90');
  });
  it('resumo: valor, sufixo e o que vem depois', () => {
    expect(textosCheckout('mensal', 'pix')).toMatchObject({ valor: 'R$ 37,90', sufixo: '/mês', depois: 'Depois, R$ 37,90 por mês, até você cancelar.' });
    expect(textosCheckout('anual', 'pix')).toMatchObject({ valor: 'R$ 349,90', sufixo: '/ano', depois: 'Depois, R$ 349,90 por ano, até você cancelar.' });
  });
  it('linha embaixo do botão muda com a forma de pagamento', () => {
    expect(textosCheckout('mensal', 'pix').letraMiuda).toBe('Na próxima tela aparece o QR Code para autorizar no app do banco.');
    expect(textosCheckout('mensal', 'cartao').letraMiuda).toBe('Cobrado agora e renovado a cada mês. Você cancela quando quiser.');
    expect(textosCheckout('anual', 'cartao').letraMiuda).toBe('Cobrado agora e renovado a cada ano. Você cancela quando quiser.');
  });
});

describe('endereço e página', () => {
  it('linha do endereço achado pelo CEP', () => {
    expect(linhaEndereco({ rua: 'Rua Augusta', cidade: 'São Paulo', uf: 'SP' })).toBe('Rua Augusta · São Paulo/SP');
    expect(linhaEndereco({ rua: '', cidade: 'Itajaí', uf: 'SC' })).toBe('Itajaí/SC');
    expect(linhaEndereco({ rua: '', cidade: '', uf: '' })).toBe('');
  });
  it('a barra de baixo do celular some só no checkout', () => {
    expect(ehCheckout('/assinar')).toBe(true);
    expect(ehCheckout('/assinar/x')).toBe(true);
    expect(ehCheckout('/assinatura')).toBe(false);
    expect(ehCheckout('/obrigado/abc')).toBe(false);
  });
});

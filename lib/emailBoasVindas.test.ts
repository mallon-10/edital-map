import { describe, expect, it } from 'vitest';
import { ASSUNTO_BOAS_VINDAS, caminhoAtivacao, linkAtivacao, montarBoasVindas, REMETENTE_BOAS_VINDAS } from './emailBoasVindas';

describe('e-mail de boas-vindas do Pro', () => {
  it('remetente e assunto da marca, sem o código no assunto', () => {
    expect(REMETENTE_BOAS_VINDAS).toBe('Edital Map <nao-responda@editalmap.com.br>');
    const e = montarBoasVindas({ email: 'maria@exemplo.com', codigo: '482913', periodo: 'mensal' });
    expect(e.assunto).toBe(ASSUNTO_BOAS_VINDAS);
    expect(e.assunto).not.toContain('482913');
  });

  it('link de ativação: com código, abre direto a tela do código e segue para montar o radar', () => {
    expect(linkAtivacao('maria+pro@exemplo.com', true)).toBe(
      'https://www.editalmap.com.br/entrar?email=maria%2Bpro%40exemplo.com&etapa=codigo&voltar=%2Fradar%2Fcomecar',
    );
    expect(linkAtivacao('maria@exemplo.com', false)).toBe(
      'https://www.editalmap.com.br/entrar?email=maria%40exemplo.com&voltar=%2Fradar%2Fcomecar',
    );
  });

  it('caminho do /obrigado: com o e-mail da compra abre o código; sem ele, a tela de entrar', () => {
    expect(caminhoAtivacao('maria@exemplo.com')).toBe('/entrar?email=maria%40exemplo.com&etapa=codigo&voltar=%2Fradar%2Fcomecar');
    expect(caminhoAtivacao(null)).toBe('/entrar?voltar=%2Fradar%2Fcomecar');
  });

  it('com código: o código, o botão de ativar e os três passos no HTML e no texto', () => {
    const e = montarBoasVindas({ email: 'maria@exemplo.com', codigo: '482913', periodo: 'anual' });
    const link = linkAtivacao('maria@exemplo.com', true);
    for (const parte of [e.html, e.texto]) {
      expect(parte).toContain('482913');
      expect(parte).toContain('Pro anual');
      expect(parte).toContain('Vale por 1 hora');
      expect(parte).toContain('Reenviar código');
      expect(parte).toContain('Monte seu radar');
    }
    expect(e.html).toContain(`href="${link.replace(/&/g, '&amp;')}"`);
    expect(e.html).toContain('Ativar minha conta');
    expect(e.texto).toContain(link);
  });

  it('sem código (o Auth falhou): o botão leva a pedir o código na tela de entrada', () => {
    const e = montarBoasVindas({ email: 'maria@exemplo.com', codigo: null, periodo: 'mensal' });
    expect(e.html).not.toMatch(/\d{6}/);
    expect(e.html).toContain(linkAtivacao('maria@exemplo.com', false).replace(/&/g, '&amp;'));
    expect(e.texto).toContain('Enviar código');
  });

  it('código fora do formato não entra no e-mail', () => {
    const e = montarBoasVindas({ email: 'maria@exemplo.com', codigo: '<b>1</b>', periodo: 'mensal' });
    expect(e.html).not.toContain('<b>1</b>');
    expect(e.html).toContain(linkAtivacao('maria@exemplo.com', false).replace(/&/g, '&amp;'));
  });

  it('o e-mail do comprador aparece escapado', () => {
    const e = montarBoasVindas({ email: 'a"b@exemplo.com', codigo: '482913', periodo: 'mensal' });
    expect(e.html).not.toContain('a"b@exemplo.com');
    expect(e.html).toContain('a&quot;b@exemplo.com');
  });
});

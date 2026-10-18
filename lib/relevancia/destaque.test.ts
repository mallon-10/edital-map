import { describe, expect, it } from 'vitest';
import { destacar } from './destaque';

const juntar = (t: { texto: string }[]) => t.map((x) => x.texto).join('');

describe('destacar (termos buscados e relacionados no título)', () => {
  it('marca a palavra inteira que começa pelo termo (plural incluído)', () => {
    expect(destacar('Aquisição de uniformes escolares', ['uniforme'])).toEqual([
      { texto: 'Aquisição de ', marcado: false },
      { texto: 'uniformes', marcado: true },
      { texto: ' escolares', marcado: false },
    ]);
  });
  it('sem diferença de acento e maiúsculas; expressão marca cada palavra', () => {
    const t = destacar('Luvas nitrílicas descartáveis', ['luva nitrílica']);
    expect(t.filter((x) => x.marcado).map((x) => x.texto)).toEqual(['Luvas', 'nitrílicas']);
    expect(destacar('Compra de EPIs', ['EPI']).filter((x) => x.marcado).map((x) => x.texto)).toEqual(['EPIs']);
  });
  it('palavras de menos de 3 letras do termo não marcam', () => {
    expect(destacar('Luva de couro', ['de']).some((x) => x.marcado)).toBe(false);
  });
  it('sem termos ou sem texto', () => {
    expect(destacar('Luvas', [])).toEqual([{ texto: 'Luvas', marcado: false }]);
    expect(destacar('', ['luva'])).toEqual([]);
  });
  it('os trechos juntos são o texto original', () => {
    const texto = 'Fardamento e jaleco (camisetas) para a Guarda Municipal';
    expect(juntar(destacar(texto, ['fardamento', 'jaleco', 'camiseta']))).toBe(texto);
  });
});

describe('destacar (correções)', () => {
  it('raiz de até 3 letras exige a palavra inteira (com s final opcional)', () => {
    expect(destacar('Epidemia e epiderme', ['EPI']).some((x) => x.marcado)).toBe(false);
    expect(destacar('Compra de EPI e EPIs', ['EPI']).filter((x) => x.marcado).map((x) => x.texto)).toEqual(['EPI', 'EPIs']);
  });
  it('texto em NFD marca e devolve o original intacto', () => {
    const texto = 'Luvas nitrílicas'.normalize('NFD');
    const t = destacar(texto, ['luva nitrílica']);
    expect(t.filter((x) => x.marcado).map((x) => x.texto)).toEqual(['Luvas', 'nitrílicas'.normalize('NFD')]);
    expect(t.map((x) => x.texto).join('')).toBe(texto);
  });
});

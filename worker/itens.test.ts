import { describe, expect, it } from 'vitest';
import { palavrasDosItens, resumirItens, totalDeItens } from './itens';

describe('palavrasDosItens', () => {
  it('junta as palavras de todas as descrições sem repetir, na ordem em que aparecem', () => {
    expect(palavrasDosItens(['Luva nitrílica tamanho M', 'LUVA de vaqueta tamanho G'])).toBe(
      'Luva nitrílica tamanho M de vaqueta G',
    );
  });
  it('separa só por espaço: pontuação e hífen ficam na palavra (o Postgres separa depois)', () => {
    expect(palavrasDosItens(['Guarda-pó  brim,\tcor: branca', 'guarda-pó brim, cor: azul'])).toBe('Guarda-pó brim, cor: branca azul');
  });
  it('sem descrições, texto vazio', () => {
    expect(palavrasDosItens([])).toBe('');
    expect(palavrasDosItens(['   '])).toBe('');
  });
});

describe('resumirItens', () => {
  it('conta tipos, benefício ME/EPP (1 = exclusiva, 3 = cota) e critérios sem repetir', () => {
    expect(
      resumirItens([
        { material_ou_servico: 'M', beneficio_id: 1, criterio_julgamento: 'Menor preço' },
        { material_ou_servico: 'M', beneficio_id: 3, criterio_julgamento: 'Menor preço' },
        { material_ou_servico: 'S', beneficio_id: 4, criterio_julgamento: 'Maior desconto' },
        { material_ou_servico: null, beneficio_id: null, criterio_julgamento: null },
      ]),
    ).toEqual({ total: 4, materiais: 2, servicos: 1, com_beneficio: 3, exclusivos: 1, cota: 1, criterios: ['Maior desconto', 'Menor preço'] });
  });
  it('lista vazia', () => {
    expect(resumirItens([])).toEqual({ total: 0, materiais: 0, servicos: 0, com_beneficio: 0, exclusivos: 0, cota: 0, criterios: [] });
  });
});

describe('totalDeItens', () => {
  it('lê o total do jsonb e devolve 0 sem resumo', () => {
    expect(totalDeItens({ total: 31, materiais: 31 })).toBe(31);
    expect(totalDeItens(null)).toBe(0);
    expect(totalDeItens({ total: '31' })).toBe(0);
  });
});

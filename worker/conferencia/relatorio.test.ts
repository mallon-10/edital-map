import { describe, expect, it } from 'vitest';
import { abertasCoerentes, montarRelatorio, veredito, type DadosRelatorio } from './relatorio';

function dados(extra: Partial<DadosRelatorio> = {}): DadosRelatorio {
  return {
    dia: '2026-10-20',
    amostra: [
      {
        candidata: {
          id: 'C1', cnpj: '00394452000103', ano: 2026, sequencial: 21982, uf: 'SC', modalidade_id: 6,
          valor_estimado: 1, link_origem: null, muitos_itens: false, motivo: 'sorteio',
        },
        resultado: { id: 'C1', status: 'ok', diferencas: [] },
      },
    ],
    abertas: [{ uf: 'SP', modalidade: 6, banco: 97, pncp: 100 }],
    buscas: [{ verificacao: 'Busca acha pelos itens', status: 'ok', detalhe: '' }],
    idempotencia: { antes: { contratacoes: 10, comItens: 8 }, depois: { contratacoes: 10, comItens: 8 }, novas: 0, inexplicadas: [] },
    ...extra,
  };
}

describe('abertasCoerentes', () => {
  it('banco com 90% ou mais do /proposta é coerente; acima dele também (credenciamentos longos)', () => {
    expect(abertasCoerentes({ uf: 'SP', modalidade: 6, banco: 90, pncp: 100 })).toBe(true);
    expect(abertasCoerentes({ uf: 'SP', modalidade: 12, banco: 130, pncp: 100 })).toBe(true);
    expect(abertasCoerentes({ uf: 'SP', modalidade: 6, banco: 0, pncp: 0 })).toBe(true);
  });
  it('abaixo de 90% não é', () => {
    expect(abertasCoerentes({ uf: 'SP', modalidade: 6, banco: 80, pncp: 100 })).toBe(false);
  });
});

describe('veredito', () => {
  it('passa quando tudo bate', () => {
    expect(veredito(dados())).toEqual({ passou: true, motivos: [] });
  });
  it('reprova abertas abaixo de 90% do /proposta', () => {
    const v = veredito(dados({ abertas: [{ uf: 'SP', modalidade: 6, banco: 80, pncp: 100 }] }));
    expect(v.passou).toBe(false);
    expect(v.motivos[0]).toContain('abertas');
  });
  it('reprova sem a verificação de idempotência', () => {
    expect(veredito(dados({ idempotencia: null })).motivos).toContain('Idempotência não verificada (rode com --idempotencia)');
  });
  it('desatualizada não reprova', () => {
    const d = dados();
    d.amostra[0].resultado = { id: 'C1', status: 'desatualizada', diferencas: [] };
    expect(veredito(d).passou).toBe(true);
  });
});

describe('montarRelatorio', () => {
  it('tem veredito, link do portal e a lista da conferência manual', () => {
    const t = montarRelatorio(dados());
    expect(t).toContain('# Conferência · 2026-10-20');
    expect(t).toContain('**Passou**');
    expect(t).toContain('https://pncp.gov.br/app/editais/00394452000103/2026/21982');
    expect(t).toContain('- [ ] ');
  });
  it('mostra as abertas por UF com a porcentagem', () => {
    expect(montarRelatorio(dados())).toContain('| SP | 6 | 97 | 100 | 97% |');
  });
  it('idempotência conta contratações e as que têm palavras e resumo dos itens', () => {
    expect(montarRelatorio(dados())).toContain('Contratações 10 → 10; com palavras e resumo dos itens 8 → 8.');
  });
});

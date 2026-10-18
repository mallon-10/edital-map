import { describe, expect, it } from 'vitest';
import { AVISO_RELEVANCIA, explicar, explicarPerfil, nivel, PESOS, pontuar, relevancia, type Acertos } from './pontuacao';
import { interpretarBusca } from './termos';

const UNIFORMES = interpretarBusca('uniformes');
const ac = (termosObjeto: string[], termosItens: string[] = [], frase = false): Acertos => ({ termosObjeto, termosItens, frase });

describe('pontuar (0–100, determinística)', () => {
  it('digitado no objeto com a expressão inteira: 60 + 15', () => {
    expect(pontuar(ac(['uniformes'], [], true), UNIFORMES)).toBe(75);
  });
  it('digitado no objeto sem a expressão inteira: 60', () => {
    expect(pontuar(ac(['uniformes']), UNIFORMES)).toBe(60);
  });
  it('digitado só nos itens: 35', () => {
    expect(pontuar(ac([], ['uniformes']), UNIFORMES)).toBe(35);
  });
  it('relacionado no objeto: 45; só nos itens: 25', () => {
    expect(pontuar(ac(['fardamento']), UNIFORMES)).toBe(45);
    expect(pontuar(ac([], ['fardamento']), UNIFORMES)).toBe(25);
  });
  it('vale o melhor tipo de acerto, mais 5 por termo distinto além do primeiro', () => {
    expect(pontuar(ac(['fardamento'], ['uniformes']), UNIFORMES)).toBe(50);
    expect(pontuar(ac(['uniformes', 'fardamento', 'jaleco'], ['camiseta'], true), UNIFORMES)).toBe(90);
  });
  it('os termos extras somam no máximo 15', () => {
    expect(pontuar(ac(['uniformes', 'fardamento', 'jaleco', 'camiseta', 'jaqueta', 'agasalho'], [], true), UNIFORMES)).toBe(90);
  });
  it('fica entre 0 e o teto em qualquer combinação', () => {
    for (const obj of [[], ['uniformes'], ['fardamento'], ['uniformes', 'fardamento', 'jaleco', 'camiseta']]) {
      for (const itens of [[], ['agasalho'], ['bermuda', 'avental']]) {
        for (const frase of [false, true]) {
          const p = pontuar(ac(obj, itens, frase), UNIFORMES);
          if (p === null) continue;
          expect(p).toBeGreaterThanOrEqual(0);
          expect(p).toBeLessThanOrEqual(PESOS.teto);
        }
      }
    }
  });
  it('sem termo, nada que bateu ou só termos fora da busca: sem pontuação', () => {
    expect(pontuar(ac([]), interpretarBusca(''))).toBeNull();
    expect(pontuar(ac([]), UNIFORMES)).toBeNull();
    expect(pontuar(ac(['xyz']), UNIFORMES)).toBeNull();
  });
  it('mesmos dados, mesmo número', () => {
    const a = ac(['fardamento', 'jaleco'], ['uniformes']);
    expect(pontuar(a, UNIFORMES)).toBe(pontuar({ ...a }, interpretarBusca('uniformes')));
  });
});

describe('nivel', () => {
  it('Alta ≥ 70, Média 40–69, Baixa < 40', () => {
    expect(nivel(70)).toBe('Alta');
    expect(nivel(69)).toBe('Média');
    expect(nivel(40)).toBe('Média');
    expect(nivel(39)).toBe('Baixa');
  });
});

describe('explicar (só cita o que bateu)', () => {
  it('digitado no objeto', () => {
    expect(explicar(ac(['uniformes'], [], true), UNIFORMES)).toBe('Menciona uniformes no objeto.');
  });
  it('relacionado no objeto, com o assunto do grupo', () => {
    expect(explicar(ac(['fardamento']), UNIFORMES)).toBe('Menciona fardamento, relacionado a uniformes profissionais, no objeto.');
    expect(explicar(ac(['fardamento', 'jaleco']), UNIFORMES)).toBe(
      'Menciona fardamento e jaleco, relacionados a uniformes profissionais, no objeto.',
    );
  });
  it('digitado só nos itens', () => {
    expect(explicar(ac([], ['luva nitrílica']), interpretarBusca('luva nitrílica'))).toBe('Menciona luva nitrílica nos itens.');
  });
  it('relacionado só nos itens', () => {
    expect(explicar(ac([], ['jaleco']), UNIFORMES)).toBe('Menciona jaleco, relacionado a uniformes profissionais, nos itens.');
  });
  it('nunca cita termo que não bateu', () => {
    const texto = explicar(ac(['fardamento']), UNIFORMES) ?? '';
    for (const r of UNIFORMES.relacionados.filter((x) => x.termo !== 'fardamento')) expect(texto).not.toContain(r.termo);
    expect(texto).not.toContain('uniformes no');
  });
  it('nada que bateu: sem explicação', () => {
    expect(explicar(ac([]), UNIFORMES)).toBeNull();
  });
});

describe('relevancia', () => {
  it('pontos, nível e explicação juntos', () => {
    expect(relevancia(ac(['uniformes'], [], true), UNIFORMES)).toEqual({ pontos: 75, nivel: 'Alta', explicacao: 'Menciona uniformes no objeto.' });
    expect(relevancia(ac([]), interpretarBusca(''))).toBeNull();
  });
  it('aviso fixo da spec', () => {
    expect(AVISO_RELEVANCIA).toBe(
      'Relevância mede o quanto o edital combina com a sua busca. Não indica chance de vencer nem garante que sua empresa pode participar.',
    );
  });
});

describe('explicarPerfil (Meu Radar)', () => {
  const b = interpretarBusca('uniforme, luva');
  it('relacionado no objeto: cita o assunto e o perfil (texto da spec)', () => {
    expect(explicarPerfil({ termosObjeto: ['fardamento'], termosItens: [], frase: false }, b)).toBe(
      'Menciona fardamento, relacionado a uniformes profissionais, um dos produtos que você monitora.',
    );
  });
  it('produto do perfil no objeto ou nos itens', () => {
    expect(explicarPerfil({ termosObjeto: ['uniforme'], termosItens: [], frase: true }, b)).toBe('Menciona uniforme no objeto, um dos produtos que você monitora.');
    expect(explicarPerfil({ termosObjeto: ['uniforme', 'luva'], termosItens: [], frase: false }, b)).toBe('Menciona uniforme e luva no objeto, produtos que você monitora.');
    expect(explicarPerfil({ termosObjeto: [], termosItens: ['luva'], frase: false }, b)).toBe('Menciona luva nos itens, um dos produtos que você monitora.');
  });
  it('relacionado só nos itens', () => {
    expect(explicarPerfil({ termosObjeto: [], termosItens: ['fardamento'], frase: false }, b)).toBe(
      'Menciona fardamento, relacionado a uniformes profissionais, nos itens, um dos produtos que você monitora.',
    );
  });
  it('nada da busca: null; a busca avulsa continua com o texto de antes', () => {
    expect(explicarPerfil({ termosObjeto: [], termosItens: [], frase: false }, b)).toBeNull();
    expect(relevancia({ termosObjeto: ['fardamento'], termosItens: [], frase: false }, b)?.explicacao).toBe(
      'Menciona fardamento, relacionado a uniformes profissionais, no objeto.',
    );
    expect(relevancia({ termosObjeto: ['fardamento'], termosItens: [], frase: false }, b, { perfil: true })?.explicacao).toBe(
      'Menciona fardamento, relacionado a uniformes profissionais, um dos produtos que você monitora.',
    );
  });
});

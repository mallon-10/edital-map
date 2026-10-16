import type { LinhaItem } from './mapear';

/** O que cada contratação guarda dos itens, além das palavras (coluna `itens_resumo`). */
export type ResumoItensBanco = {
  total: number;
  materiais: number;
  servicos: number;
  com_beneficio: number;
  /** Participação exclusiva para ME/EPP (tipoBeneficio 1). */
  exclusivos: number;
  /** Cota reservada para ME/EPP (tipoBeneficio 3). */
  cota: number;
  criterios: string[];
};

/**
 * Palavras únicas de todas as descrições, separadas por espaço, na ordem em que aparecem.
 * Só corta repetição para a chamada ao banco ficar pequena: o Postgres (gravar_resumo_itens) tira acento,
 * separa pontuação, reduz ao radical e descarta posições. Separar só por espaço não muda os lexemas,
 * porque o analisador do Postgres nunca junta duas palavras separadas por espaço.
 */
export function palavrasDosItens(descricoes: string[]): string {
  const vistas = new Set<string>();
  const saida: string[] = [];
  for (const descricao of descricoes) {
    for (const palavra of descricao.split(/\s+/)) {
      if (!palavra) continue;
      const chave = palavra.toLocaleLowerCase('pt-BR');
      if (vistas.has(chave)) continue;
      vistas.add(chave);
      saida.push(palavra);
    }
  }
  return saida.join(' ');
}

/** Tipos, ME/EPP e critérios dos itens, com as mesmas regras da função SQL resumo_itens da 0004. */
export function resumirItens(
  itens: Array<Pick<LinhaItem, 'material_ou_servico' | 'beneficio_id' | 'criterio_julgamento'>>,
): ResumoItensBanco {
  const criterios = new Set<string>();
  const r = { total: itens.length, materiais: 0, servicos: 0, com_beneficio: 0, exclusivos: 0, cota: 0 };
  for (const i of itens) {
    if (i.material_ou_servico === 'M') r.materiais++;
    else if (i.material_ou_servico === 'S') r.servicos++;
    if (i.beneficio_id !== null) r.com_beneficio++;
    if (i.beneficio_id === 1) r.exclusivos++;
    if (i.beneficio_id === 3) r.cota++;
    if (i.criterio_julgamento) criterios.add(i.criterio_julgamento);
  }
  return { ...r, criterios: [...criterios].sort() };
}

/** `total` do jsonb `itens_resumo` lido do banco; 0 quando a compra ainda não tem resumo. */
export function totalDeItens(resumo: unknown): number {
  const total = typeof resumo === 'object' && resumo !== null ? (resumo as { total?: unknown }).total : undefined;
  return typeof total === 'number' ? total : 0;
}

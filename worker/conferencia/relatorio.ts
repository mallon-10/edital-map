import { linkDoPortal } from '../mapear';
import type { Sorteada } from './amostra';
import type { ResultadoCompra } from './comparar';

export type LinhaContagem = { dia: string; uf: string; modalidade: number; banco: number; pncp: number };
export type VerificacaoBusca = { verificacao: string; status: 'ok' | 'falhou' | 'inconclusivo'; detalhe: string };
export type Idempotencia = {
  antes: { contratacoes: number; itens: number };
  depois: { contratacoes: number; itens: number };
  novas: number;
  inexplicadas: string[];
};
export type DadosRelatorio = {
  dia: string;
  amostra: Array<{ candidata: Sorteada; resultado: ResultadoCompra }>;
  contagens: LinhaContagem[];
  buscas: VerificacaoBusca[];
  idempotencia: Idempotencia | null;
};

export function veredito(d: DadosRelatorio): { passou: boolean; motivos: string[] } {
  const motivos: string[] = [];
  const ruins = d.amostra.filter((a) => a.resultado.status === 'divergente' || a.resultado.status === 'erro');
  if (ruins.length > 0) motivos.push(`${ruins.length} compra(s) da amostra com divergência ou erro`);
  const contagensErradas = d.contagens.filter((c) => c.banco !== c.pncp);
  if (contagensErradas.length > 0) motivos.push(`${contagensErradas.length} contagem(ns) por dia diferente(s) do PNCP`);
  for (const b of d.buscas) if (b.status !== 'ok') motivos.push(`Busca: ${b.verificacao} (${b.status})`);
  if (!d.idempotencia) motivos.push('Idempotência não verificada (rode com --idempotencia)');
  else if (d.idempotencia.inexplicadas.length > 0) {
    motivos.push(`${d.idempotencia.inexplicadas.length} compra(s) nova(s) na 2ª rodada sem explicação`);
  }
  return { passou: motivos.length === 0, motivos };
}

export function montarRelatorio(d: DadosRelatorio): string {
  const v = veredito(d);
  const linhas: string[] = [`# Conferência · ${d.dia}`, '', '## Veredito', ''];
  linhas.push(v.passou ? '**Passou** nas verificações automáticas.' : '**Não passou.**');
  for (const m of v.motivos) linhas.push(`- ${m}`);

  linhas.push('', `## Amostra (${d.amostra.length} compras)`, '', '| Compra | Por que entrou | Status | Diferenças | Portal |', '|---|---|---|---|---|');
  for (const { candidata, resultado } of d.amostra) {
    const difs = resultado.diferencas.map((x) => `${x.campo}: banco ${x.banco} · PNCP ${x.pncp}`).join('<br>');
    const obs = resultado.observacao ? ` (${resultado.observacao})` : '';
    linhas.push(`| ${candidata.id} | ${candidata.motivo} | ${resultado.status}${obs} | ${difs || '—'} | [abrir](${linkDoPortal(candidata)}) |`);
  }

  const erradas = d.contagens.filter((c) => c.banco !== c.pncp);
  linhas.push('', '## Contagem por dia', '', `${d.contagens.length - erradas.length} de ${d.contagens.length} combinações iguais ao PNCP.`);
  if (erradas.length > 0) {
    linhas.push('', '| Dia | UF | Modalidade | Banco | PNCP |', '|---|---|---|---|---|');
    for (const c of erradas) linhas.push(`| ${c.dia} | ${c.uf} | ${c.modalidade} | ${c.banco} | ${c.pncp} |`);
  }

  linhas.push('', '## Busca', '');
  for (const b of d.buscas) linhas.push(`- ${b.verificacao}: **${b.status}**. ${b.detalhe}`);

  linhas.push('', '## Idempotência', '');
  if (!d.idempotencia) linhas.push('Não verificada nesta execução.');
  else {
    const i = d.idempotencia;
    linhas.push(
      `Contratações ${i.antes.contratacoes} → ${i.depois.contratacoes}; itens ${i.antes.itens} → ${i.depois.itens}.`,
      `Compras novas na 2ª rodada: ${i.novas}; sem explicação: ${i.inexplicadas.length ? i.inexplicadas.join(', ') : 'nenhuma'}.`,
    );
  }

  linhas.push('', '## Conferência manual (dono do produto)', '', 'Abra no portal e confira prazo e valor:', '');
  for (const { candidata } of d.amostra.slice(0, 5)) linhas.push(`- [ ] [${candidata.id}](${linkDoPortal(candidata)})`);
  return `${linhas.join('\n')}\n`;
}

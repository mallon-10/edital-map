import { linkOficial } from './formato';
import { modalidadeCurta } from './participacao';
import { assunto, nomeProprio, textoLimpo } from './texto';
import type { EditalExportado } from './tipos';

/** Teto de linhas da planilha (a mesma busca da lista, desde o começo). */
export const MAX_EXPORTACAO = 2000;
export const COLUNAS = [
  'Título', 'Objeto completo', 'Órgão', 'Município', 'UF', 'Modalidade', 'Valor estimado', 'Prazo das propostas', 'Publicado em', 'Link do edital',
] as const;

const BOM = '﻿';
const SEPARADOR = ';';
const FIM_DE_LINHA = '\r\n';
const fmtPartes = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

function partes(d: Date) {
  const p = fmtPartes.formatToParts(d);
  const g = (t: Intl.DateTimeFormatPartTypes) => p.find((x) => x.type === t)?.value ?? '';
  return { dia: g('day'), mes: g('month'), ano: g('year'), hora: g('hour'), minuto: g('minute') };
}

/** "20/10/2026 10:00" (Brasília), como o Excel em português lê data e hora. */
export function dataHoraPlanilha(iso: string): string {
  const p = partes(new Date(iso));
  return `${p.dia}/${p.mes}/${p.ano} ${p.hora}:${p.minuto}`;
}

/** "15/10/2026" (Brasília); vazio sem data. */
export function dataPlanilha(iso: string | null): string {
  if (!iso) return '';
  const p = partes(new Date(iso));
  return `${p.dia}/${p.mes}/${p.ano}`;
}

/** "1234,50": vírgula decimal e sem separador de milhar (o Excel em português lê como número); nulo ou 0 = "Valor não informado". */
export function valorPlanilha(v: number | null): string {
  return v !== null && Number.isFinite(v) && v > 0 ? v.toFixed(2).replace('.', ',') : 'Valor não informado';
}

/**
 * Uma célula do CSV. Começo com = + - @ (ou tabulação/retorno) ganha um apóstrofo, para o Excel não executar como fórmula;
 * com ; aspas ou quebra de linha, vai entre aspas, com as aspas dobradas.
 */
export function celula(valor: string): string {
  const seguro = /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
  return /[;"\r\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
}

function linha(e: EditalExportado): string[] {
  // slug = cnpj-ano-sequencial (o CNPJ não tem hífen).
  const [cnpj, ano, sequencial] = e.slug.split('-');
  return [
    assunto(e.objeto).titulo,
    textoLimpo(e.objeto),
    nomeProprio(e.orgao_nome),
    e.municipio_nome ?? '',
    e.uf,
    modalidadeCurta(e.modalidade_nome) ?? '',
    valorPlanilha(e.valor_estimado),
    dataHoraPlanilha(e.encerramento_em),
    dataPlanilha(e.publicada_em),
    linkOficial({ link_origem: e.link_origem, cnpj, ano: Number(ano), sequencial: Number(sequencial) }),
  ];
}

/** CSV para o Excel em português: BOM UTF-8, separador ";", fim de linha CRLF e cabeçalho na primeira linha. */
export function gerarCsv(editais: EditalExportado[]): string {
  const linhas: ReadonlyArray<readonly string[]> = [COLUNAS, ...editais.map(linha)];
  return BOM + linhas.map((l) => l.map(celula).join(SEPARADOR)).join(FIM_DE_LINHA) + FIM_DE_LINHA;
}

/** "editais-2026-10-17.csv" (data de Brasília). */
export function nomeArquivo(agora: Date): string {
  const p = partes(agora);
  return `editais-${p.ano}-${p.mes}-${p.dia}.csv`;
}

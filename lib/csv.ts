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

/** Teto do arquivo em bytes: a Vercel limita respostas sem streaming a ~4,5 MB. */
export const MAX_BYTES_CSV = 4_000_000;

const bytes = (t: string) => Buffer.byteLength(t, 'utf8');

/**
 * CSV para o Excel em português: BOM UTF-8, separador ";", fim de linha CRLF e cabeçalho na primeira linha.
 * Passando de maxBytes, para de somar linhas e fecha com um aviso de corte.
 */
export function gerarCsv(editais: EditalExportado[], maxBytes: number = MAX_BYTES_CSV): string {
  const montar = (l: readonly string[]) => l.map(celula).join(SEPARADOR) + FIM_DE_LINHA;
  const aviso = (n: number) => montar([`Arquivo cortado em ${n} editais por tamanho; refine a busca para exportar o resto.`]);
  const partesCsv: string[] = [BOM + montar(COLUNAS)];
  let total = bytes(partesCsv[0]);
  // Reserva o espaço do aviso (o maior possível: n com o mesmo número de dígitos do total).
  const reserva = bytes(aviso(editais.length));
  for (let i = 0; i < editais.length; i++) {
    const l = montar(linha(editais[i]));
    // A célula do aviso vai entre aspas (tem ";"). A última linha só precisa caber; as demais deixam a reserva do aviso.
    const folga = i === editais.length - 1 ? 0 : reserva;
    if (total + bytes(l) + folga > maxBytes) {
      partesCsv.push(aviso(i));
      return partesCsv.join('');
    }
    partesCsv.push(l);
    total += bytes(l);
  }
  return partesCsv.join('');
}

/** "editais-2026-10-17.csv" (data de Brasília). */
export function nomeArquivo(agora: Date): string {
  const p = partes(agora);
  return `editais-${p.ano}-${p.mes}-${p.dia}.csv`;
}

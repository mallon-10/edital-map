import { etiqueta, moedaCurta } from '@/lib/formato';
import { assunto, nomeProprio } from '@/lib/texto';
import type { EditalResumo } from '@/lib/tipos';
import { ESTILO_ETIQUETA, PONTO_ETIQUETA } from './estilos';

type Props = { edital: EditalResumo; agora: Date; selecionado: boolean; aoSelecionar: () => void };

/** Card da lista: título limpo, valor curto à direita, órgão · UF e etiqueta de prazo. Clicar seleciona. */
export function CardCompacto({ edital, agora, selecionado, aoSelecionar }: Props) {
  const et = etiqueta(edital, agora);
  const valor = moedaCurta(edital.valor_estimado);
  const { titulo, tipo } = assunto(edital.objeto);
  return (
    <button
      type="button"
      onClick={aoSelecionar}
      aria-pressed={selecionado}
      className={`flex w-full shrink-0 flex-col gap-2 rounded-md border bg-raised p-3.5 text-left transition-colors ${
        selecionado ? 'border-ink shadow-[0_0_0_1px_#0c2340]' : 'border-line hover:border-line-strong'
      }`}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="line-clamp-3 text-[14px] font-semibold leading-5">{titulo}</span>
        {valor ? (
          <span className="shrink-0 whitespace-nowrap font-mono text-[13px] font-medium">{valor}</span>
        ) : (
          <span className="w-16 shrink-0 text-right text-[11px] leading-4 text-ink-muted">Valor não informado</span>
        )}
      </span>
      <span className="truncate text-xs text-ink-muted">
        {[tipo, nomeProprio(edital.orgao_nome), edital.uf].filter(Boolean).join(' · ')}
      </span>
      {edital.onde === 'itens' ? <span className="text-xs text-rio">Encontrado nos itens</span> : null}
      <span className={`inline-flex w-fit items-center gap-1.5 rounded-xs px-2 py-0.5 text-xs font-semibold ${ESTILO_ETIQUETA[et.tom]}`}>
        <span className={`size-[7px] rounded-full ${PONTO_ETIQUETA[et.tom]}`} aria-hidden="true" />
        {et.texto}
      </span>
    </button>
  );
}

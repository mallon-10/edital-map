import { aulasNumeradas, MODULOS_CURSO } from '@/lib/cursoLicitacao';

const TOTAL_AULAS = MODULOS_CURSO.reduce((t, m) => t + m.aulas.length, 0);

/**
 * "O que você vai ter acesso": embaixo do vídeo, junto com o botão de compra (só depois que a oferta sobe, para não
 * competir com o vídeo). Um cartão por módulo com as aulas numeradas como na área de membros. O espaço de baixo
 * acompanha a altura do botão fixo (--altura-barra), para a última aula não ficar escondida atrás dele.
 */
export function ConteudoCurso() {
  return (
    <section
      aria-labelledby="titulo-conteudo"
      className="mx-auto max-w-[880px] pb-[calc(var(--altura-barra,0px)+24px)] pt-10 motion-safe:animate-[vsl-aparecer_.6s_ease-out_both] sm:pt-14"
    >
      <div className="text-center">
        <p className="font-mono text-[11.5px] font-medium uppercase tracking-[0.14em] text-[#ff936b] sm:text-[12.5px]">O que você vai ter acesso</p>
        <h2 id="titulo-conteudo" className="mt-2 text-balance text-[clamp(1.45rem,5.6vw,2.2rem)] font-bold leading-[1.1] tracking-[-0.025em]">
          {TOTAL_AULAS} aulas em {MODULOS_CURSO.length} módulos
        </h2>
        <p className="mx-auto mt-2.5 max-w-[560px] text-[15px] leading-[1.5] text-surface/75 sm:text-[16px]">
          Do primeiro contato com o mercado público até a entrega e o pagamento. Na área de membros, no celular ou no computador, no seu ritmo.
        </p>
      </div>

      <ol className="m-0 mt-7 grid list-none gap-3 p-0 sm:mt-9 sm:grid-cols-2 sm:gap-4">
        {aulasNumeradas().map((m) => (
          <li key={m.numero} className="flex flex-col rounded-[18px] bg-surface/[0.06] p-4 text-left ring-1 ring-surface/10 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[11.5px] font-medium uppercase tracking-[0.12em] text-[#ff936b]">Módulo {m.numero}</span>
              <span className="rounded-full bg-surface/10 px-2.5 py-0.5 text-[12px] font-semibold text-surface/80">
                {m.aulas.length} aulas
              </span>
            </div>
            <h3 className="mt-1.5 text-[18px] font-bold leading-snug tracking-[-0.01em] sm:text-[19px]">{m.titulo}</h3>
            <p className="mt-1 text-[14px] leading-[1.45] text-surface/65">{m.resumo}</p>
            <ol className="m-0 mt-3.5 flex list-none flex-col p-0">
              {m.aulas.map((aula, i) => (
                <li key={aula} className="grid grid-cols-[28px_1fr] items-center gap-2.5 border-t border-surface/10 py-2.5 text-[14.5px] leading-snug sm:text-[15px]">
                  <span className="grid size-7 place-items-center rounded-full bg-pin/15 text-[12.5px] font-bold tabular-nums text-[#ff936b]" aria-hidden="true">
                    {m.inicio + i}
                  </span>
                  <span>
                    <span className="sr-only">Aula {m.inicio + i}: </span>
                    {aula}
                  </span>
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ol>
    </section>
  );
}

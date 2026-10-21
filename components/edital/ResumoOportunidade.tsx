/** Resumo da oportunidade em linguagem simples (frases de resumoOportunidade). */
export function ResumoOportunidade({ frases }: { frases: string[] }) {
  return (
    <section aria-labelledby="resumo" className="rounded-[22px] bg-raised p-5 lg:p-6">
      <h2 id="resumo" className="mb-2 text-[18px] font-semibold">Resumo da oportunidade</h2>
      <p className="text-[15px] leading-relaxed lg:text-[16px]">{frases.join(' ')}</p>
      <p className="mt-2 text-[13px] text-ink-muted">Montado com os dados publicados pelo órgão no PNCP. As regras valem conforme o edital oficial.</p>
    </section>
  );
}

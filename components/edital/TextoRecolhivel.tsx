/** Texto em parágrafos; acima do limite, mostra uma prévia e "Ler tudo" (só HTML: funciona sem JavaScript). */
export function TextoRecolhivel({ paragrafos, limite = 400 }: { paragrafos: string[]; limite?: number }) {
  const inteiro = paragrafos.join(' ');
  const conteudo = paragrafos.map((p, i) => (
    <p key={i} className="break-words">
      {p}
    </p>
  ));
  if (inteiro.length <= limite) return <div className="flex flex-col gap-2 text-[15px]">{conteudo}</div>;
  const corte = inteiro.lastIndexOf(' ', limite);
  const previa = inteiro.slice(0, corte > 0 ? corte : limite);
  return (
    <details className="group text-[15px]">
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <span className="block break-words group-open:hidden">{previa}…</span>
        <span className="mt-2 inline-block text-sm font-semibold text-pin-strong">
          <span className="group-open:hidden">Ler tudo</span>
          <span className="hidden group-open:inline">Mostrar menos</span>
        </span>
      </summary>
      <div className="mt-2 flex flex-col gap-2">{conteudo}</div>
    </details>
  );
}

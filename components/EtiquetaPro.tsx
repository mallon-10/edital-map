/** Etiqueta discreta dos recursos Pro, o mesmo "· Pro" do chip antigo (abertos a todos até a etapa de Planos ligar o cadeado). */
export function EtiquetaPro({ className = '' }: { className?: string }) {
  return (
    <span className={`shrink-0 font-semibold opacity-70 ${className}`} title="Recurso Pro, aberto a todos por enquanto">
      · Pro
    </span>
  );
}

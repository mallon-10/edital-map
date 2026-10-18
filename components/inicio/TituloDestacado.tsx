import { destacar } from '@/lib/relevancia/destaque';

/** Título com os termos que bateram no objeto marcados (o texto é o de assunto(); nada é inventado). */
export function TituloDestacado({ texto, termos }: { texto: string; termos: readonly string[] }) {
  return (
    <>
      {destacar(texto, termos).map((t, i) =>
        t.marcado ? (
          <mark key={i} className="rounded-xs bg-ouro-soft px-0.5 text-ink">
            {t.texto}
          </mark>
        ) : (
          <span key={i}>{t.texto}</span>
        ),
      )}
    </>
  );
}

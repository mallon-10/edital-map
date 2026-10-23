import Link from 'next/link';
import { pedacos } from '@/lib/guias/texto';

const LINK = 'font-semibold text-ink underline decoration-pin decoration-2 underline-offset-2 hover:text-pin-strong';

/** Texto dos guias e do glossário: `[rótulo](/caminho)` vira link do site; `[rótulo](https://oficial)` abre em outra aba. */
export function TextoComLinks({ texto }: { texto: string }) {
  return (
    <>
      {pedacos(texto).map((p, i) =>
        p.tipo === 'texto' ? (
          <span key={i}>{p.texto}</span>
        ) : p.externo ? (
          <a key={i} href={p.href} target="_blank" rel="noopener" className={LINK}>
            {p.texto}
          </a>
        ) : (
          <Link key={i} href={p.href} prefetch={false} className={LINK}>
            {p.texto}
          </Link>
        ),
      )}
    </>
  );
}

/** Caminho de migalhas (Início / Guias / …), o último sem link. */
export function Migalhas({ itens }: { itens: Array<{ nome: string; caminho: string }> }) {
  return (
    <nav aria-label="Caminho" className="flex flex-wrap gap-2 text-[13px] text-ink-muted">
      {itens.map((c, i) => (
        <span key={c.caminho} className="flex gap-2">
          {i > 0 ? <span aria-hidden="true">/</span> : null}
          {i < itens.length - 1 ? (
            <Link href={c.caminho} prefetch={false} className="hover:underline">
              {c.nome}
            </Link>
          ) : (
            <span>{c.nome}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/** JSON-LD com `<` escapado (o texto vem do conteúdo do repositório, mas o escape fica por garantia). */
export function DadosEstruturados({ dados }: { dados: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dados).replace(/</g, '\\u003c') }} />;
}

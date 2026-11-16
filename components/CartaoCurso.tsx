import Link from 'next/link';

/** Oferta do curso na página inicial: leva para a página de vendas em vídeo (/cursolicitacao), sem preço no cartão. */
export function CartaoCurso({ id, className = 'flex' }: { id: string; className?: string }) {
  return (
    <section aria-labelledby={id} className={`flex-col gap-3 rounded-[22px] bg-mata-soft p-5 lg:p-6 ${className}`}>
      <div className="flex flex-col gap-1">
        <h2 id={id} className="text-balance text-[20px] font-bold leading-tight">Aprenda a participar de qualquer licitação</h2>
        <p className="text-pretty text-[15px] leading-snug text-ink-muted">Do edital à proposta: entenda as exigências, organize os documentos e dispute com segurança.</p>
      </div>
      <Link
        href="/cursolicitacao"
        prefetch={false}
        className="mt-auto inline-flex min-h-12 w-full items-center justify-center rounded-full bg-mata px-3 py-2.5 text-center text-[15px] font-semibold leading-snug text-raised hover:brightness-110"
      >
        Quero aprender
      </Link>
    </section>
  );
}

import Link from 'next/link';

export const HREF_CURSO = '/cursolicitacao';

/** Botão verde no cartão do topo do edital, só no celular: ali as ofertas ficam fora da primeira tela. */
export function BotaoCurso() {
  return (
    <Link href={HREF_CURSO} prefetch={false} className="inline-flex min-h-12 items-center rounded-full bg-mata px-5 py-2.5 text-[15px] font-semibold leading-snug text-raised hover:brightness-110 lg:hidden">
      Aprenda a participar de licitações
    </Link>
  );
}

/** Oferta do curso na página inicial: leva para a página de vendas em vídeo (/cursolicitacao), sem preço no cartão. */
export function CartaoCurso({ id, className = 'flex' }: { id: string; className?: string }) {
  return (
    <section aria-labelledby={id} className={`flex-col gap-3 rounded-[22px] bg-mata-soft p-5 lg:p-6 ${className}`}>
      <div className="flex flex-col gap-1">
        <h2 id={id} className="text-balance text-[20px] font-bold leading-tight">Aprenda a participar de qualquer licitação</h2>
        <p className="text-pretty text-[15px] leading-snug text-ink-muted">Do edital à proposta: entenda as exigências, organize os documentos e dispute com segurança.</p>
      </div>
      <Link
        href={HREF_CURSO}
        prefetch={false}
        className="mt-auto inline-flex min-h-12 w-full items-center justify-center rounded-full bg-mata px-3 py-2.5 text-center text-[15px] font-semibold leading-snug text-raised hover:brightness-110"
      >
        Quero aprender
      </Link>
    </section>
  );
}

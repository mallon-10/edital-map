import Link from 'next/link';
import { Cabecalho } from '@/components/Cabecalho';

export default function EditalNaoEncontrado() {
  return (
    <>
      <Cabecalho />
      <main className="mx-auto max-w-[640px] px-4 py-16 text-center">
        <h1 className="text-[32px] font-bold tracking-[-0.015em]">Edital não encontrado</h1>
        <p className="mt-3 text-ink-muted">O endereço pode estar incompleto, ou o edital saiu do PNCP.</p>
        <Link href="/" className="mt-6 inline-block rounded-sm bg-pin px-5 py-3 text-sm font-semibold text-on-pin">Voltar ao mapa</Link>
      </main>
    </>
  );
}

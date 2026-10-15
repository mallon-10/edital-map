'use client';

export default function Erro({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-[640px] px-4 py-16 text-center">
      <h1 className="text-[28px] font-bold">Algo deu errado aqui</h1>
      <p className="mt-3 text-ink-muted">Pode ser uma instabilidade momentânea. Tente de novo.</p>
      <button type="button" onClick={reset} className="mt-6 rounded-sm bg-pin px-5 py-3 text-sm font-semibold text-on-pin">
        Tentar de novo
      </button>
    </main>
  );
}

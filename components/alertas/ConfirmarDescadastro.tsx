'use client';

import Link from 'next/link';
import { useState } from 'react';

/** Botão de /alertas/sair: o GET só mostra (robôs de e-mail abrem links); o POST para de enviar. */
export function ConfirmarDescadastro({ token, texto }: { token: string; texto: string }) {
  const [fase, setFase] = useState<'pergunta' | 'enviando' | 'pronto' | 'erro'>('pergunta');

  async function confirmar() {
    if (fase === 'enviando') return;
    setFase('enviando');
    try {
      const r = await fetch(`/api/descadastro?t=${encodeURIComponent(token)}`, { method: 'POST' });
      setFase(r.ok ? 'pronto' : 'erro');
    } catch {
      setFase('erro');
    }
  }

  if (fase === 'pronto') {
    return (
      <p role="status" className="text-[15px]">
        Pronto: você não vai mais receber {texto} por e-mail. Nada foi apagado; para voltar a receber, entre na conta e retome em{' '}
        <Link href="/alertas" prefetch={false} className="font-semibold text-pin-strong underline-offset-2 hover:underline">
          Alertas
        </Link>
        .
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[15px]">Parar de receber {texto} por e-mail? Nada é apagado: o envio só fica pausado.</p>
      <button
        type="button"
        onClick={() => void confirmar()}
        aria-disabled={fase === 'enviando' || undefined}
        className="inline-flex h-11 w-fit items-center rounded-sm bg-pin px-5 text-sm font-semibold text-on-pin aria-disabled:opacity-60"
      >
        {fase === 'enviando' ? 'Parando…' : 'Parar de receber'}
      </button>
      {fase === 'erro' ? (
        <p role="alert" className="text-sm font-semibold text-pin-strong">
          Não foi possível concluir agora. Tente de novo.
        </p>
      ) : null}
    </div>
  );
}

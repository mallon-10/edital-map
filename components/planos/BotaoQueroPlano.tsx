'use client';

import { useId, useRef, useState, type FormEvent } from 'react';
import { registrar } from '@/lib/cliente/registrar';
import type { PlanoPago } from '@/lib/eventos';

type Estado = { tipo: 'editando' } | { tipo: 'enviando' } | { tipo: 'erro'; mensagem: string } | { tipo: 'pronto'; email: string };

const NOME: Record<PlanoPago, string> = { basic: 'Basic', pro: 'Pro' };

/** "Quero o Basic" / "Quero o Pro": registra o interesse (quer_recurso) e abre o formulário da lista de espera. */
export function BotaoQueroPlano({ plano, destaque = false }: { plano: PlanoPago; destaque?: boolean }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const titulo = useId();
  const campo = useId();
  const [email, setEmail] = useState('');
  const [site, setSite] = useState('');
  const [estado, setEstado] = useState<Estado>({ tipo: 'editando' });

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEstado({ tipo: 'enviando' });
    try {
      const r = await fetch('/api/lista-espera', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, plano, site }),
      });
      const j = (await r.json().catch(() => ({}))) as { erro?: string };
      if (!r.ok) {
        setEstado({ tipo: 'erro', mensagem: j.erro ?? 'Não deu para registrar agora. Tente de novo.' });
        return;
      }
      setEstado({ tipo: 'pronto', email: email.trim().toLowerCase() });
    } catch {
      setEstado({ tipo: 'erro', mensagem: 'Sem conexão. Tente de novo.' });
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          registrar('quer_recurso', { recurso: plano === 'basic' ? 'plano_basic' : 'plano_pro' });
          dialogo.current?.showModal();
        }}
        className={`inline-flex h-10 items-center justify-center rounded-sm px-4 text-sm font-semibold ${
          destaque ? 'bg-pin text-on-pin' : 'border border-line-strong bg-raised text-ink hover:bg-sunken'
        }`}
      >
        Quero o {NOME[plano]}
      </button>
      <dialog
        ref={dialogo}
        aria-labelledby={titulo}
        className="m-auto w-[min(92vw,440px)] rounded-lg border border-line bg-raised p-6 text-left text-ink shadow-[0_8px_32px_rgba(12,35,64,.18)] backdrop:bg-ink/40"
      >
        <h2 id={titulo} className="text-lg font-bold">Plano {NOME[plano]}</h2>
        {estado.tipo === 'pronto' ? (
          <div role="status" className="mt-2 flex flex-col gap-4">
            <p className="text-[15px]">
              Pronto! Avisamos em <strong className="break-all">{estado.email}</strong> quando o pagamento abrir.
            </p>
            <button
              type="button"
              onClick={() => dialogo.current?.close()}
              className="h-10 self-start rounded-sm border border-line-strong bg-raised px-4 text-sm font-semibold hover:bg-sunken"
            >
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={enviar} noValidate className="mt-2 flex flex-col gap-3">
            <p className="text-[15px] text-ink-muted">O pagamento abre em breve. Deixe seu e-mail que avisamos assim que puder assinar.</p>
            <label htmlFor={campo} className="text-[13px] font-semibold">E-mail</label>
            <input
              id={campo}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-sm border border-line-strong bg-raised px-3"
            />
            <div aria-hidden="true" className="hidden">
              <label htmlFor={`${campo}-site`}>Não preencha</label>
              <input id={`${campo}-site`} tabIndex={-1} autoComplete="off" value={site} onChange={(e) => setSite(e.target.value)} />
            </div>
            {estado.tipo === 'erro' ? (
              <p role="alert" className="rounded-sm bg-pin-soft px-3 py-2 text-sm text-pin-strong">{estado.mensagem}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={estado.tipo === 'enviando'}
                className="h-10 rounded-sm bg-pin px-4 text-sm font-semibold text-on-pin disabled:opacity-60"
              >
                {estado.tipo === 'enviando' ? 'Enviando…' : 'Avisar quando abrir'}
              </button>
              <button
                type="button"
                onClick={() => dialogo.current?.close()}
                className="h-10 rounded-sm border border-line-strong bg-raised px-4 text-sm font-semibold hover:bg-sunken"
              >
                Fechar
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}

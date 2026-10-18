'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { IconeMais } from '@/components/inicio/Icones';
import { irParaEntrar } from '@/lib/cliente/pedido';
import { mudarSalvo } from '@/lib/cliente/salvos';
import { AvisoPlano } from './AvisoPlano';

/**
 * Menu do card do Meu Radar: "Descartar" (o card sai do radar no refresh; o edital vai para a aba Descartados).
 * Escape ou clique fora fecham. Recusado (grátis, plano não confirmado, falha): aviso junto ao botão.
 */
export function MenuCardRadar({ id }: { id: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ mensagem: string; planos: boolean } | null>(null);
  const caixa = useRef<HTMLSpanElement>(null);
  const botao = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const clique = (e: MouseEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('mousedown', clique);
    return () => document.removeEventListener('mousedown', clique);
  }, [aberto]);

  async function descartar() {
    setAberto(false);
    setAviso(null);
    setOcupado(true);
    const r = await mudarSalvo(id, { status: 'descartado' });
    setOcupado(false);
    if (r.ok) return router.refresh();
    if (r.codigo === 'entrar') return irParaEntrar();
    setAviso({ mensagem: r.erro, planos: r.codigo === 'plano' });
  }

  return (
    <span
      ref={caixa}
      className="relative inline-flex"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && aberto) {
          setAberto(false);
          botao.current?.focus();
        }
      }}
    >
      <button
        ref={botao}
        type="button"
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-busy={ocupado || undefined}
        aria-label="Mais ações"
        disabled={ocupado}
        onClick={() => setAberto((a) => !a)}
        className="inline-flex size-11 items-center justify-center rounded-sm text-ink-muted hover:bg-sunken disabled:opacity-60"
      >
        <IconeMais className="size-5" />
      </button>
      {aberto ? (
        <span role="menu" aria-label="Ações do edital" className="absolute right-0 top-full z-30 mt-1 flex w-44 flex-col rounded-md border border-line bg-raised p-1">
          <button
            role="menuitem"
            type="button"
            autoFocus
            onClick={() => void descartar()}
            className="flex h-11 items-center rounded-sm px-3 text-left text-sm font-semibold hover:bg-sunken"
          >
            Descartar
          </button>
        </span>
      ) : null}
      {aviso ? <AvisoPlano mensagem={aviso.mensagem} planos={aviso.planos} aoFechar={() => setAviso(null)} /> : null}
    </span>
  );
}

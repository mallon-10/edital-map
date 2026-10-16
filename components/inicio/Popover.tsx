'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Seta } from './Icones';
import { chip } from './estilos';

/** Chip que abre um painel. O painel é `fixed` para não ser cortado pela linha de chips que rola de lado no celular. */
export function Popover({ rotulo, ativo, children }: { rotulo: ReactNode; ativo: boolean; children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const [posicao, setPosicao] = useState({ top: 0, left: 0 });
  const botao = useRef<HTMLButtonElement>(null);
  const painel = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!aberto) return;
    const clique = (e: MouseEvent) => {
      const alvo = e.target as Node;
      if (!painel.current?.contains(alvo) && !botao.current?.contains(alvo)) setAberto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(false);
    };
    const fechar = () => setAberto(false);
    document.addEventListener('mousedown', clique);
    document.addEventListener('keydown', tecla);
    window.addEventListener('resize', fechar);
    return () => {
      document.removeEventListener('mousedown', clique);
      document.removeEventListener('keydown', tecla);
      window.removeEventListener('resize', fechar);
    };
  }, [aberto]);

  function alternar() {
    const r = botao.current?.getBoundingClientRect();
    if (r) setPosicao({ top: r.bottom + 6, left: Math.max(8, Math.min(r.left, window.innerWidth - 272)) });
    setAberto((a) => !a);
  }

  return (
    <>
      <button ref={botao} type="button" aria-expanded={aberto} aria-controls={id} onClick={alternar} className={chip(ativo)}>
        {rotulo}
        <Seta className="size-3.5" />
      </button>
      {aberto ? (
        <div
          ref={painel}
          id={id}
          role="dialog"
          style={{ position: 'fixed', top: posicao.top, left: posicao.left }}
          className="z-40 w-64 rounded-md border border-line bg-raised p-3 shadow-[0_8px_24px_rgba(12,35,64,.14)]"
        >
          {children}
        </div>
      ) : null}
    </>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { esquecerConta, useConta } from '@/lib/cliente/conta';
import { esquecerSalvos } from '@/lib/cliente/salvos';

const ITEM = 'flex h-11 w-full items-center rounded-sm px-3 text-left text-sm font-semibold hover:bg-sunken';

/**
 * "Entrar" sem sessão; com sessão, o menu da conta (e-mail, Meu Radar, Editar meu radar, Minhas Oportunidades, Alertas, Sair).
 * Sem prefetch: /entrar e /radar são dinâmicas e conferem a sessão no Supabase; o cabeçalho está em toda página.
 */
export function MenuConta() {
  const conta = useConta();
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  const itens = () => Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

  /** Fecha; com `voltarFoco`, o foco volta ao botão da conta (Escape, escolha pelo teclado). */
  function fechar(voltarFoco: boolean) {
    setAberto(false);
    if (voltarFoco) botao.current?.focus();
  }

  useEffect(() => {
    if (!aberto) return;
    // Ao abrir, o foco vai para o primeiro item do menu.
    itens()[0]?.focus();
    const clique = (e: MouseEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('mousedown', clique);
    return () => document.removeEventListener('mousedown', clique);
  }, [aberto]);

  /** Teclado dentro do menu: setas e Home/End andam pelos itens, Escape fecha e volta ao botão. Tab segue a ordem da página; o menu fecha quando o foco sai dele (onBlur da caixa). */
  function teclaNoMenu(e: KeyboardEvent<HTMLDivElement>) {
    const lista = itens();
    const i = lista.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      fechar(true);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const passo = e.key === 'ArrowDown' ? 1 : -1;
      lista[(i + passo + lista.length) % lista.length]?.focus();
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      lista[e.key === 'Home' ? 0 : lista.length - 1]?.focus();
    }
  }

  async function sairDaConta() {
    // JSON: a rota só aceita pedido do próprio site (proteção contra CSRF).
    await fetch('/api/conta/sair', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).catch(() => undefined);
    esquecerConta();
    esquecerSalvos();
    window.location.assign('/');
  }

  if (conta.carregando) return <span className="inline-block h-9 w-16" aria-hidden="true" />;
  if (!conta.email) {
    return (
      <Link href="/entrar" prefetch={false} className="inline-flex h-10 shrink-0 items-center rounded-full border border-line-strong bg-raised px-3.5 text-[13px] font-semibold text-ink hover:bg-sunken lg:h-11 lg:px-5 lg:text-sm">
        Entrar
      </Link>
    );
  }
  return (
    <div
      ref={caixa}
      className="relative"
      onBlur={(e) => {
        if (!aberto) return;
        const destino = e.relatedTarget as Node | null;
        if (destino) {
          if (!caixa.current?.contains(destino)) setAberto(false);
          return;
        }
        // Sem relatedTarget (Safari/Firefox no Mac não focam botão nem link no clique): só fecha se, depois do clique,
        // o foco de fato saiu da caixa. Clique fora já fecha pelo mousedown do documento.
        window.requestAnimationFrame(() => {
          const ativo = document.activeElement;
          if (document.hasFocus() && ativo && ativo !== document.body && !caixa.current?.contains(ativo)) setAberto(false);
        });
      }}
    >
      <button
        ref={botao}
        type="button"
        onClick={() => setAberto((a) => !a)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !aberto) {
            e.preventDefault();
            setAberto(true);
          } else if (e.key === 'Escape' && aberto) {
            e.preventDefault();
            fechar(true);
          }
        }}
        aria-expanded={aberto}
        aria-haspopup="menu"
        aria-label={`Conta ${conta.email}`}
        className="inline-flex h-10 items-center gap-2 rounded-full px-1.5 text-sm font-semibold hover:bg-raised lg:h-11 lg:px-2.5"
      >
        <span aria-hidden="true" className="inline-flex size-7 items-center justify-center rounded-full bg-pin-soft font-mono text-[13px] text-pin-strong">
          {conta.email.slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden max-w-[12rem] truncate lg:inline">{conta.email}</span>
      </button>
      {aberto ? (
        <div
          ref={menu}
          role="menu"
          aria-label="Conta"
          tabIndex={-1}
          onKeyDown={teclaNoMenu}
          // Clique com o mouse não tira o foco do menu (senão o onBlur da caixa o fecharia antes do clique).
          onMouseDown={(e) => e.preventDefault()}
          className="absolute right-0 top-full z-50 mt-2 flex w-64 flex-col rounded-md border border-line bg-raised p-1">
          <p className="truncate px-3 py-2 text-xs text-ink-muted">{conta.email}</p>
          <Link role="menuitem" href="/radar" prefetch={false} className={ITEM} onClick={() => setAberto(false)}>
            Meu Radar
          </Link>
          <Link role="menuitem" href="/radar/editar" prefetch={false} className={ITEM} onClick={() => setAberto(false)}>
            Editar meu radar
          </Link>
          <Link role="menuitem" href="/oportunidades" prefetch={false} className={ITEM} onClick={() => setAberto(false)}>
            Minhas Oportunidades
          </Link>
          <Link role="menuitem" href="/alertas" prefetch={false} className={ITEM} onClick={() => setAberto(false)}>
            Alertas
          </Link>
          <button role="menuitem" type="button" onClick={() => void sairDaConta()} className={ITEM}>
            Sair
          </button>
        </div>
      ) : null}
    </div>
  );
}

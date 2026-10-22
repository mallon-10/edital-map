import { useEffect, useId, useRef, useState } from 'react';
import { IconeCheck, IconeCopiar, IconeGiro, Seta } from '@/components/inicio/Icones';
import { hora } from '@/lib/formato';
import { CARTAO_CHECKOUT, NUMERO_PASSO, PASSO_AZUL } from './estilos';

export type Pix = { codigo: string; qrCode: string; imagem: string; expiraEm: string | null };

type Passo = { titulo: string; texto: string };

function Passos({ passos, className }: { passos: Passo[]; className: string }) {
  return (
    <ol className={`m-0 list-none flex-col gap-3.5 p-0 lg:gap-5 ${className}`}>
      {passos.map((p, i) => (
        <li key={p.titulo} className="grid grid-cols-[28px_1fr] gap-3 lg:grid-cols-[30px_1fr] lg:gap-3.5">
          {i === passos.length - 1 ? (
            <span aria-hidden="true" className={`${NUMERO_PASSO} bg-mata-soft text-mata`}>
              <IconeCheck className="size-4" />
            </span>
          ) : (
            <span aria-hidden="true" className={PASSO_AZUL}>
              {i + 1}
            </span>
          )}
          <span className="flex flex-col gap-0.5">
            <span className="text-[15px] font-bold lg:text-[17px]">{p.titulo}</span>
            <span className="text-[14px] text-ink-muted lg:text-[15px]">{p.texto}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function Qr({ pix, tamanho }: { pix: Pix; tamanho: number }) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element -- imagem gerada no navegador (data: URL) */}
      <img
        src={pix.imagem}
        alt="QR Code do Pix Automático"
        width={tamanho}
        height={tamanho}
        className="rounded-[20px] bg-white p-3 shadow-[inset_0_0_0_1px_#ddd6c6]"
      />
      {pix.expiraEm ? <p className="font-mono text-[12.5px] text-ink-muted">O código vale até {hora(pix.expiraEm)}</p> : null}
    </div>
  );
}

type Props = { pix: Pix; valor: string; unidade: 'mês' | 'ano'; aoPagarComCartao: () => void };

/**
 * Depois de gerar a cobrança: autorizar o Pix Automático no app do banco. Computador: QR grande e passos ao lado, Copia e
 * Cola embaixo. Celular: copiar o código primeiro (ninguém lê o QR da própria tela) e o QR num details. A espera
 * (pergunta ao servidor a cada 3 s) fica no CheckoutPro.
 */
export function TelaPix({ pix, valor, unidade, aoPagarComCartao }: Props) {
  const [copiado, setCopiado] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  const idCodigo = useId();

  useEffect(() => {
    if (!copiado) return;
    const id = window.setTimeout(() => setCopiado(false), 3000);
    return () => window.clearTimeout(id);
  }, [copiado]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(pix.qrCode);
      setCopiado(true);
    } catch {
      // Sem acesso à área de transferência: o código fica selecionado para copiar à mão.
      campo.current?.focus();
      campo.current?.select();
    }
  }

  const cobranca = `A primeira cobrança é de ${valor}`;
  return (
    <section aria-label="Pix Automático" className={`${CARTAO_CHECKOUT} flex flex-col gap-[18px] px-4 py-5 lg:gap-7 lg:p-8`}>
      <div className="hidden gap-8 lg:flex">
        <Qr pix={pix} tamanho={232} />
        <Passos
          className="flex"
          passos={[
            { titulo: 'Abra o app do seu banco', texto: 'Entre em Pix e escolha Ler QR Code. Se preferir, use o Pix Copia e Cola abaixo.' },
            { titulo: 'Confira e autorize', texto: `${cobranca}. As próximas caem sozinhas, todo ${unidade}.` },
            { titulo: 'Pronto', texto: 'Quando o banco confirmar, esta página avança sozinha e o Pro liga.' },
          ]}
        />
      </div>

      <div className="flex flex-col gap-2.5 lg:gap-2">
        <label htmlFor={idCodigo} className="sr-only text-[14px] font-semibold lg:not-sr-only">
          Pix Copia e Cola
        </label>
        <div className="flex flex-col gap-2.5 lg:flex-row">
          <input
            ref={campo}
            id={idCodigo}
            readOnly
            value={pix.qrCode}
            onFocus={(e) => e.currentTarget.select()}
            className="h-[50px] min-w-0 flex-1 truncate rounded-md bg-surface px-3.5 font-mono text-[16px] text-ink-muted lg:text-[13px]"
          />
          <button
            type="button"
            onClick={() => void copiar()}
            className={`inline-flex h-14 shrink-0 items-center justify-center gap-2 rounded-full px-6 text-[17px] font-bold lg:h-[50px] lg:text-[15px] lg:font-semibold ${
              copiado
                ? 'bg-mata-soft text-mata lg:bg-raised lg:shadow-[inset_0_0_0_1px_#0b6b53]'
                : 'bg-pin text-on-pin shadow-[0_8px_20px_rgba(255,90,31,.3)] lg:bg-raised lg:text-ink lg:shadow-[inset_0_0_0_1px_#847c6a] lg:hover:bg-sunken'
            }`}
          >
            {copiado ? <IconeCheck className="size-5" /> : <IconeCopiar className="size-5" />}
            <span aria-live="polite">{copiado ? 'Código copiado' : 'Copiar código Pix'}</span>
          </button>
        </div>
      </div>

      <Passos
        className="flex lg:hidden"
        passos={[
          { titulo: 'Copie o código', texto: 'Toque em Copiar código Pix.' },
          { titulo: 'Abra o app do banco', texto: 'Entre em Pix › Pix Copia e Cola.' },
          { titulo: 'Cole e autorize', texto: `${cobranca}; as próximas caem sozinhas.` },
        ]}
      />

      <p role="status" className="flex items-center gap-3 rounded-2xl bg-rio-soft px-4 py-3.5 text-[14px] font-semibold lg:text-[15px]">
        <IconeGiro className="size-5 shrink-0 animate-spin text-rio motion-reduce:animate-none" />
        Esperando a confirmação do banco. Depois de autorizar, volte para cá: esta página avança sozinha.
      </p>

      <details className="group border-t border-line pt-3 lg:hidden">
        <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
          Ler o QR Code em outro aparelho
          <Seta className="size-[18px] transition-transform group-open:rotate-180" />
        </summary>
        <div className="flex justify-center pt-3">
          <Qr pix={pix} tamanho={220} />
        </div>
      </details>

      <p className="text-[14px] text-ink-muted lg:text-[14.5px]">
        Prefere cartão?{' '}
        <button type="button" onClick={aoPagarComCartao} className="font-semibold text-pin-strong hover:underline">
          Pagar com cartão de crédito
        </button>
      </p>
    </section>
  );
}

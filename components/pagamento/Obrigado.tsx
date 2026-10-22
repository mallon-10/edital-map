import Link from 'next/link';
import type { ReactNode } from 'react';
import { IconeCheck, IconeGiro, SetaDireita } from '@/components/inicio/Icones';
import { data } from '@/lib/formato';
import { PLANOS, precoDoPlano, type Periodo } from '@/lib/planos';
import { EsperaPagamento } from './EsperaPagamento';
import { BOTAO_PAGAR, CARTAO_CHECKOUT, NUMERO_PASSO } from './estilos';

const PRO = PLANOS.find((p) => p.id === 'pro')!;
const TITULO = 'text-balance text-[30px] font-bold leading-[1.1] tracking-[-0.02em] lg:text-[38px] lg:tracking-[-0.025em]';
const CARTAO = `${CARTAO_CHECKOUT} flex flex-col gap-6 px-5 py-7 text-pretty lg:gap-7 lg:p-10`;

function Passo({ n, titulo, atual = false, children }: { n: number; titulo: string; atual?: boolean; children: ReactNode }) {
  return (
    <li
      className={`grid grid-cols-[28px_1fr] gap-3 rounded-[18px] p-4 lg:grid-cols-[30px_1fr] lg:gap-3.5 ${
        atual ? 'bg-[#fffaf7] shadow-[inset_0_0_0_2px_#ff5a1f]' : 'shadow-[inset_0_0_0_1px_#ddd6c6]'
      }`}
    >
      <span aria-hidden="true" className={`${NUMERO_PASSO} ${atual ? 'bg-pin text-on-pin' : 'bg-surface text-ink'}`}>
        {n}
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-[16px] font-bold lg:text-[16.5px]">{titulo}</span>
        <span className="text-[14.5px] text-ink-muted lg:text-[15px]">{children}</span>
      </span>
    </li>
  );
}

type Pago = { periodo: Periodo; validoAte: string; email: string | null; entrar: string };

/** Pagamento confirmado: o Pro já vale neste navegador; o próximo passo é ativar a conta com o código do e-mail. */
export function CartaoPago({ periodo, validoAte, email, entrar }: Pago) {
  return (
    <section aria-labelledby="titulo-obrigado" className={CARTAO}>
      <div className="flex flex-col items-center gap-3 text-center">
        <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-full bg-mata-soft text-mata lg:size-[68px]">
          <IconeCheck className="size-8" />
        </span>
        <p className="mt-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-mata lg:text-xs">Pagamento confirmado</p>
        <h1 id="titulo-obrigado" className={TITULO}>
          Pronto, o Pro está ativo
        </h1>
        <p className="max-w-[46ch] text-[16px] text-ink-muted lg:text-[17px]">Obrigado por assinar. O Pro já vale neste navegador e renova sozinho.</p>
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded-[18px] bg-surface px-5 py-[18px] sm:grid-cols-3">
        <div className="flex flex-col gap-0.5">
          <dt className="text-[13px] text-ink-muted">Plano</dt>
          <dd className="text-[16px] font-bold">Pro {periodo}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-[13px] text-ink-muted">Valor</dt>
          <dd className="text-[16px] font-bold tabular-nums">{precoDoPlano(PRO, periodo).principal}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-[13px] text-ink-muted">Válido até</dt>
          <dd className="font-mono text-[15px] font-medium tabular-nums">{data(validoAte)}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-4">
        <h2 className="text-[19px] font-bold tracking-[-0.01em] lg:text-[20px]">Agora, três passos para os editais chegarem</h2>
        <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
          <Passo n={1} titulo="Ative sua conta" atual>
            Na próxima tela, mandamos um código de 6 dígitos para{' '}
            {email ? <strong className="break-all font-semibold text-ink">{email}</strong> : 'o e-mail da compra'}. Com a conta, o Pro vale em
            qualquer aparelho.
          </Passo>
          <Passo n={2} titulo="Conte o que sua empresa vende">
            O Meu Radar usa isso para achar os editais certos para você.
          </Passo>
          <Passo n={3} titulo="Receba no seu e-mail">
            Alertas todo dia às 7h e o resumo da semana na segunda.
          </Passo>
        </ol>
      </div>

      <div className="flex flex-col items-center gap-3.5">
        <Link href={entrar} prefetch={false} className={BOTAO_PAGAR}>
          Ativar minha conta
          <SetaDireita className="size-5" />
        </Link>
        <Link href="/" className="text-[15px] font-semibold text-pin-strong hover:underline">
          Ou buscar editais agora
        </Link>
      </div>
    </section>
  );
}

/** O aviso da Cakto ainda não chegou: a página pergunta sozinha (EsperaPagamento). */
export function CartaoEsperando({ codigo }: { codigo: string }) {
  return (
    <section aria-labelledby="titulo-obrigado" className={`${CARTAO} items-center text-center`}>
      <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-full bg-rio-soft text-rio">
        <IconeGiro className="size-8 animate-spin motion-reduce:animate-none" />
      </span>
      <h1 id="titulo-obrigado" className={TITULO}>
        Recebemos seu pedido
      </h1>
      <EsperaPagamento codigo={codigo} />
    </section>
  );
}

export function CartaoNaoEncontrado() {
  return (
    <section aria-labelledby="titulo-obrigado" className={CARTAO}>
      <h1 id="titulo-obrigado" className={TITULO}>
        Pagamento
      </h1>
      <p className="text-[16px] text-ink-muted">
        Não encontramos este pedido. Se você já assinou, entre com o e-mail da compra em{' '}
        <Link href="/entrar" prefetch={false} className="font-semibold text-pin-strong hover:underline">
          Entrar
        </Link>{' '}
        e o Pro aparece.
      </p>
    </section>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { IconeCheck, IconeEmail } from '@/components/inicio/Icones';
import { registrar } from '@/lib/cliente/registrar';
import { ITENS_GRATIS, ITENS_PRO, jaEPro, precoNaPagina, type EstadoPlanos } from '@/lib/paginaPlanos';
import { AVISO_PLANOS, PLANOS } from '@/lib/planos';
import { AlternadorPeriodo } from './AlternadorPeriodo';
import { BotaoAssinar } from './BotaoAssinar';
import { H2, MONO, PILULA_LINHA, QUADRADO, TOM } from './estilos';
import { usePeriodo } from './Periodo';

const [GRATIS, PRO] = PLANOS;
const LISTA = 'm-0 flex list-none flex-col gap-[11px] border-t border-line p-0 pt-[18px] text-[15px]';
const ITEM = 'grid grid-cols-[20px_1fr] items-start gap-2.5';

function Preco({ plano }: { plano: typeof GRATIS }) {
  const { periodo } = usePeriodo();
  const p = precoNaPagina(plano, periodo);
  return (
    <div aria-live={plano.id === 'pro' ? 'polite' : undefined}>
      <p className="flex flex-wrap items-baseline gap-1.5">
        <span className="text-[42px] font-bold leading-none tracking-[-0.03em] tabular-nums">{p.valor}</span>
        <span className="text-[16px] font-medium text-ink-muted">{p.sufixo}</span>
      </p>
      {p.equivale ? <p className="mt-2 text-[17px] font-semibold text-mata">{p.equivale}</p> : null}
      <p className="mt-1 text-[13.5px] text-ink-muted">{p.nota}</p>
    </div>
  );
}

/**
 * Preços (#precos): alternador Mensal | Anual e os dois cartões. Grátis discreto (contorno); Pro com contorno
 * azul-marinho e "Recomendado" (âncora #pro). A seção avisa a medição uma vez quando entra na tela (viu_precos).
 */
export function SecaoPrecos({ pagamento, atual }: EstadoPlanos) {
  const secao = useRef<HTMLElement>(null);
  const pro = jaEPro(atual);

  useEffect(() => {
    const el = secao.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      (entradas) => {
        if (!entradas.some((e) => e.isIntersecting)) return;
        registrar('usou_recurso', { recurso: 'viu_precos' });
        obs.disconnect();
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section id="precos" ref={secao} aria-labelledby="titulo-precos" className="scroll-mt-4">
      <div className="mb-[18px] flex flex-col items-center gap-2 text-center">
        <p className={MONO}>Preços</p>
        <h2 id="titulo-precos" className={H2}>
          Pesquise de graça. Assine para receber.
        </h2>
        <p className="max-w-[60ch] text-[16px] text-ink-muted">A busca continua grátis e sem limite. O Pro cuida do monitoramento.</p>
        <div className="mt-2">
          <AlternadorPeriodo />
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[900px] items-start gap-3.5 sm:grid-cols-[1fr_1.12fr]">
        <article aria-labelledby="plano-gratis" className="flex flex-col gap-[18px] rounded-[26px] px-[22px] py-6 shadow-[inset_0_0_0_1px_#847c6a]">
          <div>
            <h3 id="plano-gratis" className="text-[22px] font-bold">
              {GRATIS.nome}
            </h3>
            <p className="text-[14.5px] text-ink-muted">Para pesquisar quando precisar.</p>
          </div>
          <Preco plano={GRATIS} />
          {pro ? null : (
            <Link href="/" prefetch={false} className={`${PILULA_LINHA} w-full`}>
              Continuar grátis
            </Link>
          )}
          <ul className={LISTA}>
            {ITENS_GRATIS.map((i) => (
              <li key={i} className={ITEM}>
                <IconeCheck className="mt-px size-5 text-mata" />
                <span>{i}</span>
              </li>
            ))}
          </ul>
        </article>

        <article
          id="pro"
          aria-labelledby="plano-pro"
          className="flex scroll-mt-4 flex-col gap-[18px] rounded-[26px] bg-raised px-[22px] py-6 shadow-[inset_0_0_0_2px_#0c2340,0_18px_44px_rgba(12,35,64,.10)]"
        >
          <div className="flex items-center gap-3.5">
            <span aria-hidden="true" className={`${QUADRADO} ${TOM.pin}`}>
              <IconeEmail className="size-[22px]" />
            </span>
            <div>
              <h3 id="plano-pro" className="flex flex-wrap items-center gap-2.5 text-[22px] font-bold">
                {PRO.nome}
                <span className="rounded-full bg-pin-soft px-2.5 py-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] text-pin-strong">
                  Recomendado
                </span>
              </h3>
              <p className="text-[14.5px] text-ink-muted">Para quem vende ao governo toda semana.</p>
            </div>
          </div>
          <Preco plano={PRO} />
          {pro ? (
            <p className="flex h-[54px] items-center justify-center rounded-full bg-mata-soft text-[15px] font-semibold text-mata lg:h-[60px]">
              Seu plano hoje
            </p>
          ) : (
            <BotaoAssinar origem="precos" pagamento={pagamento} atual={atual} extra="w-full" />
          )}
          <p className="-mt-2 text-center text-[12.5px] text-ink-muted">
            {pro
              ? 'Gerencie em Minha assinatura.'
              : pagamento
                ? 'Pix Automático ou cartão, processado pela Cakto.'
                : 'O pagamento abre em breve. Deixe seu e-mail e avisamos.'}
          </p>
          <ul className={LISTA}>
            <li className={MONO}>Tudo do Grátis, mais</li>
            {ITENS_PRO.map((i) => (
              <li key={i} className={ITEM}>
                <IconeCheck className="mt-px size-5 text-pin-strong" />
                <span>{i}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>

      {pro ? null : pagamento ? (
        <p className="mt-3.5 text-center text-[14px] text-ink-muted">
          Já assinou?{' '}
          <Link href="/entrar?voltar=/assinatura" prefetch={false} className="font-semibold text-pin-strong hover:underline">
            Entre com o e-mail da compra
          </Link>{' '}
          e o Pro vale em qualquer aparelho.
        </p>
      ) : (
        <p className="mx-auto mt-3.5 max-w-[900px] rounded-[22px] bg-raised p-4 text-center text-[13px] text-ink-muted">{AVISO_PLANOS}</p>
      )}
    </section>
  );
}

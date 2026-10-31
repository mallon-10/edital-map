'use client';

import { useEffect, useState } from 'react';
import { ChamadaPro } from '@/components/ChamadaPro';
import { rastrear } from '@/lib/cliente/rastrear';
import { CHAVE_OFERTA_BUSCA, lerSessaoOferta, marcarOfertaVista, ofertaPodeAparecer, type OfertaDaBusca, type SessaoOferta } from '@/lib/ofertaBusca';
import { IconeCheck, IconeFechar } from './Icones';

function lerSessao(): SessaoOferta {
  try {
    return lerSessaoOferta(window.sessionStorage.getItem(CHAVE_OFERTA_BUSCA));
  } catch {
    return lerSessaoOferta(null);
  }
}

function gravarSessao(s: SessaoOferta) {
  try {
    window.sessionStorage.setItem(CHAVE_OFERTA_BUSCA, JSON.stringify(s));
  } catch {
    // sem armazenamento: a oferta só pode voltar na próxima busca
  }
}

type Props = { oferta: OfertaDaBusca; segmento: string | null; total: number };

/** O que o Pro faz, sem promessa: são fatos do envio dos alertas. */
const BENEFICIOS = ['Todo dia às 7h', 'Só editais novos', 'Cancele quando quiser'];

/** O cartão em si, sem a regra da sessão: fundo azul-escuro, para não se confundir com os cartões dos editais. */
export function CartaoOfertaBusca({ oferta, segmento, total, aoFechar }: Props & { aoFechar: () => void }) {
  return (
    <aside aria-label="Receber novos editais" className="relative flex flex-col gap-4 rounded-[22px] bg-ink p-5 text-surface motion-safe:animate-entrar lg:p-6 xl:flex-row xl:items-center xl:gap-7">
      <button
        type="button"
        onClick={aoFechar}
        aria-label="Fechar a oferta"
        className="absolute right-1.5 top-1.5 flex size-11 items-center justify-center rounded-full text-[#c7d6d3] hover:bg-white/10 hover:text-surface"
      >
        <IconeFechar className="size-5" />
      </button>
      <div className="min-w-0 flex-1 pr-8 xl:pr-0">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[#a9c9c4]">Alertas por e-mail · Pro</p>
        <p className="mt-1.5 text-pretty text-[20px] font-bold leading-tight tracking-[-0.01em] lg:text-[23px]">{oferta.titulo}</p>
        <p className="mt-2 text-pretty text-[15px] leading-snug text-[#c7d6d3]">{oferta.texto}</p>
        <ul className="mt-3 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-[14px] font-semibold">
          {BENEFICIOS.map((b) => (
            <li key={b} className="flex items-center gap-1.5">
              <IconeCheck className="size-4 text-[#7fd1b0]" />
              {b}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex shrink-0 flex-col gap-2 xl:w-[290px] xl:pt-5">
        <p className="text-[24px] font-bold leading-none tracking-[-0.02em]">{oferta.preco}</p>
        <ChamadaPro
          href={oferta.href}
          origem="oferta_busca"
          segmento={segmento}
          resultados={total}
          className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-pin px-3 py-2.5 text-center text-[15px] font-semibold leading-snug text-on-pin transition-transform duration-150 hover:-translate-y-px motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          Receber novos editais deste segmento
        </ChamadaPro>
        <button type="button" onClick={aoFechar} className="inline-flex min-h-10 items-center justify-center text-[14px] font-semibold text-[#c7d6d3] underline-offset-2 hover:text-surface hover:underline">
          Continuar pesquisando grátis
        </button>
      </div>
    </aside>
  );
}

/**
 * Oferta do Pro depois da busca: um cartão no fluxo da página, nunca um pop-up, logo acima dos editais. A página monta um
 * por busca (key); fechar (no X ou em "Continuar pesquisando grátis") vale para a sessão inteira.
 */
export function OfertaBusca(p: Props) {
  const [visivel, setVisivel] = useState(false);
  const { chave } = p.oferta;
  const { segmento, total } = p;
  useEffect(() => {
    const sessao = lerSessao();
    if (!ofertaPodeAparecer(sessao)) return;
    setVisivel(true);
    if (sessao.vistas.includes(chave)) return;
    gravarSessao(marcarOfertaVista(sessao, chave));
    rastrear('pro_offer_viewed', { origem: 'oferta_busca', segmento, resultados: total });
  }, [chave, segmento, total]);
  if (!visivel) return null;

  function fechar() {
    setVisivel(false);
    gravarSessao({ ...lerSessao(), fechada: true });
  }
  return <CartaoOfertaBusca {...p} aoFechar={fechar} />;
}

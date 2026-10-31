'use client';

import { useEffect, useState } from 'react';
import { ChamadaPro } from '@/components/ChamadaPro';
import { rastrear } from '@/lib/cliente/rastrear';
import { CHAVE_OFERTA_BUSCA, lerSessaoOferta, marcarOfertaVista, ofertaPodeAparecer, type OfertaDaBusca, type SessaoOferta } from '@/lib/ofertaBusca';
import { IconeFechar, IconeSino } from './Icones';

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

/** O cartão em si, sem a regra da sessão. */
export function CartaoOfertaBusca({ oferta, segmento, total, aoFechar }: Props & { aoFechar: () => void }) {
  return (
    <aside aria-label="Receber novos editais" className="relative flex flex-col gap-4 rounded-[22px] bg-raised p-5 lg:flex-row lg:items-center lg:gap-8 lg:px-7 lg:py-6">
      <button
        type="button"
        onClick={aoFechar}
        aria-label="Fechar a oferta"
        className="absolute right-1.5 top-1.5 flex size-11 items-center justify-center rounded-full text-ink hover:bg-sunken"
      >
        <IconeFechar className="size-5" />
      </button>
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <span aria-hidden="true" className="hidden size-[60px] shrink-0 items-center justify-center rounded-[18px] bg-pin-soft lg:flex">
          <IconeSino className="size-[26px] text-pin-strong" />
        </span>
        <div className="min-w-0 pr-8 lg:pr-0">
          <p className="text-pretty text-[18px] font-bold leading-snug lg:text-[21px]">{oferta.titulo}</p>
          <p className="mt-1.5 text-pretty text-[15px] leading-relaxed text-ink-muted">{oferta.texto}</p>
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-2 lg:mr-6 lg:w-[310px]">
        <p className="font-mono text-[15px] font-semibold">{oferta.preco}</p>
        <ChamadaPro
          href={oferta.href}
          origem="oferta_busca"
          segmento={segmento}
          resultados={total}
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-pin px-5 py-2.5 text-center text-[15px] font-semibold leading-snug text-on-pin"
        >
          Receber novos editais deste segmento
        </ChamadaPro>
        <button type="button" onClick={aoFechar} className="inline-flex min-h-11 items-center justify-center text-[14px] font-semibold text-ink-muted underline-offset-2 hover:text-ink hover:underline">
          Continuar pesquisando grátis
        </button>
      </div>
    </aside>
  );
}

/**
 * Oferta do Pro depois da busca: um cartão no fluxo da página, nunca um pop-up. A página monta um por busca (key): cada
 * busca aparece uma vez na sessão, e fechar (no X ou em "Continuar pesquisando grátis") vale para a sessão inteira.
 */
export function OfertaBusca(p: Props) {
  const [visivel, setVisivel] = useState(false);
  const { chave } = p.oferta;
  const { segmento, total } = p;
  useEffect(() => {
    const sessao = lerSessao();
    if (!ofertaPodeAparecer(sessao, chave)) return;
    gravarSessao(marcarOfertaVista(sessao, chave));
    setVisivel(true);
    rastrear('pro_offer_viewed', { origem: 'oferta_busca', segmento, resultados: total });
  }, [chave, segmento, total]);
  if (!visivel) return null;

  function fechar() {
    setVisivel(false);
    gravarSessao({ ...lerSessao(), fechada: true });
  }
  return <CartaoOfertaBusca {...p} aoFechar={fechar} />;
}

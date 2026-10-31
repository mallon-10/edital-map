'use client';

import Link from 'next/link';
import { ChamadaPro } from '@/components/ChamadaPro';
import { useAoVer } from '@/lib/cliente/aoVer';
import { rastrear } from '@/lib/cliente/rastrear';
import { numero } from '@/lib/formato';
import { EDITAIS_GRATIS_POR_BUSCA } from '@/lib/limiteBusca';
import { hrefAssinar } from '@/lib/paginaPlanos';
import { PRECO_PRO_MENSAL } from '@/lib/planos';
import { IconeCadeado } from './Icones';

type Props = {
  /** Editais da busca que não vieram para o navegador (o total real menos os liberados). */
  bloqueados: number;
  /** O que foi pesquisado. */
  termo: string | null;
  /** Esta busca, para quem já assina entrar e voltar a ela. */
  voltar: string;
};

/** Cartões de exemplo sob o desfoque, sem dado de verdade: os editais bloqueados nem chegam ao navegador. */
const EXEMPLOS = [
  ['Aquisição de materiais para as unidades da rede municipal', 'Compra · Prefeitura Municipal', 'R$ 248 mil'],
  ['Registro de preços para fornecimento parcelado ao longo do ano', 'Compra · Secretaria de Administração', 'R$ 1,12 mi'],
  ['Contratação de empresa para fornecimento e entrega dos itens', 'Serviço · Fundo Municipal', 'R$ 96 mil'],
  ['Aquisição conforme especificações do termo de referência', 'Compra · Consórcio Intermunicipal', 'R$ 412 mil'],
] as const;

/** Depois dos editais liberados da busca: o resto desfocado, o cadeado e a compra do Pro. */
export function BloqueioBusca({ bloqueados, termo, voltar }: Props) {
  const cartao = useAoVer<HTMLElement>(() => rastrear('pro_offer_viewed', { origem: 'bloqueio_busca', segmento: termo, resultados: bloqueados }));
  const editais = bloqueados === 1 ? 'edital' : 'editais';
  return (
    <section ref={cartao} aria-labelledby="titulo-bloqueio-busca" className="relative min-h-[430px] overflow-hidden rounded-[22px] pb-1">
      <div aria-hidden="true" inert className="pointer-events-none flex select-none flex-col gap-2.5 opacity-70 blur-[5px] lg:gap-3">
        {EXEMPLOS.map(([titulo, orgao, valor]) => (
          <div key={titulo} className="flex flex-col gap-2 rounded-[22px] bg-raised p-5 lg:p-6">
            <div className="flex items-start justify-between gap-4">
              <p className="text-[17px] font-semibold leading-snug">{titulo}</p>
              <p className="shrink-0 font-mono text-[15px]">{valor}</p>
            </div>
            <p className="text-[14px] text-ink-muted">{orgao}</p>
            <span className="block h-7 w-36 rounded-full bg-ouro-soft" />
          </div>
        ))}
      </div>
      <div className="absolute inset-x-0 top-5 flex justify-center px-3 lg:top-9">
        <div className="flex w-full max-w-[480px] flex-col items-center gap-3 rounded-[22px] bg-raised p-6 text-center shadow-[0_14px_40px_rgba(12,35,64,0.2)] motion-safe:animate-entrar lg:p-7">
          <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-full bg-pin-soft text-pin-strong">
            <IconeCadeado className="size-7" />
          </span>
          <h3 id="titulo-bloqueio-busca" className="text-balance text-[21px] font-bold leading-tight lg:text-[23px]">
            Mais {numero(bloqueados)} {editais}{termo ? ` de ${termo}` : ''}
          </h3>
          <p className="text-pretty text-[15px] leading-snug text-ink-muted">
            Você está vendo os {EDITAIS_GRATIS_POR_BUSCA} primeiros. Com o Pro, libera todos os editais de cada pesquisa e recebe os novos por e-mail.
          </p>
          <ChamadaPro
            href={hrefAssinar('mensal')}
            origem="bloqueio_busca"
            segmento={termo}
            resultados={bloqueados}
            className="mt-1 inline-flex min-h-[52px] w-full items-center justify-center text-balance rounded-full bg-pin px-4 py-2.5 text-center text-[16px] font-semibold leading-snug text-on-pin"
          >
            Liberar todos os editais — {PRECO_PRO_MENSAL}
          </ChamadaPro>
          <Link
            href={`/entrar?voltar=${encodeURIComponent(voltar)}`}
            prefetch={false}
            className="inline-flex min-h-10 items-center text-sm font-semibold text-pin-strong underline-offset-2 hover:underline"
          >
            Já sou Pro: entrar
          </Link>
        </div>
      </div>
    </section>
  );
}

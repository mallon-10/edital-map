'use client';

import { useState } from 'react';
import { registrar } from '@/lib/cliente/registrar';
import type { Recurso } from '@/lib/eventos';

const ITENS: ReadonlyArray<{ id: Recurso; titulo: string; texto: string }> = [
  { id: 'preco_referencia', titulo: 'Preço de referência', texto: 'Quanto foi pago por itens parecidos em outras compras da região.' },
  { id: 'quem_venceu', titulo: 'Quem venceu compras parecidas', texto: 'Fornecedores que ganharam licitações do mesmo tipo.' },
  { id: 'resumo_ia', titulo: 'Resumo do edital com IA', texto: 'Exigências, prazos de entrega e amostras em poucas linhas.' },
];

export function VitrineEmBreve({ slug }: { slug: string }) {
  const [pedidos, setPedidos] = useState<Recurso[]>([]);
  return (
    <section className="flex flex-col gap-3 rounded-lg bg-ink p-5 text-surface">
      <h2 className="text-[13px] font-bold uppercase tracking-[0.06em] text-[#a9c9c4]">Em breve no Edital Map</h2>
      {ITENS.map((item) => {
        const pedido = pedidos.includes(item.id);
        return (
          <div key={item.id} className="flex flex-col gap-2 border-t border-white/15 pt-3 first-of-type:border-t-0 first-of-type:pt-0">
            <p className="font-semibold">{item.titulo}</p>
            <p className="text-sm text-[#c7d6d3]">{item.texto}</p>
            <button
              type="button"
              disabled={pedido}
              onClick={() => {
                registrar('quer_recurso', { recurso: item.id, edital: slug });
                setPedidos([...pedidos, item.id]);
              }}
              className="h-9 self-start rounded-sm bg-pin px-3 text-[13px] font-semibold text-on-pin disabled:bg-white/20 disabled:text-surface"
            >
              {pedido ? 'Anotado. Avisamos quando estiver pronto.' : 'Quero ser avisado'}
            </button>
          </div>
        );
      })}
    </section>
  );
}

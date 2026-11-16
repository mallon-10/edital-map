'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { rastrear } from '@/lib/cliente/rastrear';
import { registrar } from '@/lib/cliente/registrar';
import type { OrigemAssinar } from '@/lib/eventos';
import { hrefAssinar, jaEPro, type EstadoPlanos } from '@/lib/paginaPlanos';
import { BotaoQueroPlano } from './BotaoQueroPlano';
import { PILULA_LINHA, PILULA_PIN } from './estilos';
import { usePeriodo } from './Periodo';

/**
 * Ação principal da página de planos, no período do alternador: "Assinar o Pro" (checkout próprio em /assinar, com a
 * medição clicou_assinar); pagamento desligado, "Quero o Pro" (lista de espera); quem já é Pro vai aos alertas.
 */
export function BotaoAssinar({ origem, pagamento, atual, extra = '', rotulo = 'Assinar o Pro' }: EstadoPlanos & { origem: OrigemAssinar; extra?: string; rotulo?: string }) {
  const { periodo } = usePeriodo();
  // /planos?cupom=ALUNO50 (link da aula do curso): o cupom segue para o checkout, que confere e aplica.
  const [cupom, setCupom] = useState('');
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get('cupom')?.trim().slice(0, 40);
    if (c) setCupom(c);
  }, []);
  const classe = `${PILULA_PIN} ${extra}`;
  if (jaEPro(atual)) {
    return (
      <Link href="/alertas" prefetch={false} className={classe}>
        Ir para os meus alertas
      </Link>
    );
  }
  if (!pagamento) return <BotaoQueroPlano plano="pro" periodo={periodo} classe={classe} />;
  return (
    <Link
      href={cupom ? `${hrefAssinar(periodo)}${hrefAssinar(periodo).includes('?') ? '&' : '?'}cupom=${encodeURIComponent(cupom)}` : hrefAssinar(periodo)}
      prefetch={false}
      onClick={() => {
        registrar('usou_recurso', { recurso: 'clicou_assinar', periodo, origem });
        rastrear('pro_cta_clicked', { origem: `planos_${origem}`, plano: periodo }, { soGa: true });
      }}
      className={classe}
    >
      {rotulo}
    </Link>
  );
}

/** Topo e chamada final: a ação principal e, ao lado, "Ver preços" (ou "Minha assinatura" para quem já é Pro). */
export function AcoesPlanos({ origem, pagamento, atual, rotulo }: EstadoPlanos & { origem: OrigemAssinar; rotulo?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 lg:gap-3">
      <BotaoAssinar origem={origem} pagamento={pagamento} atual={atual} rotulo={rotulo} extra="min-w-0 flex-[1_1_100%] text-center leading-tight sm:flex-none" />
      {jaEPro(atual) ? (
        <Link href="/assinatura" prefetch={false} className={`${PILULA_LINHA} flex-1 sm:flex-none`}>
          Minha assinatura
        </Link>
      ) : (
        <a href="#precos" className={`${PILULA_LINHA} flex-1 sm:flex-none`}>
          Ver preços
        </a>
      )}
    </div>
  );
}

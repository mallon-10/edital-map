'use client';

import Link from 'next/link';
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
export function BotaoAssinar({ origem, pagamento, atual, extra = '' }: EstadoPlanos & { origem: OrigemAssinar; extra?: string }) {
  const { periodo } = usePeriodo();
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
      href={hrefAssinar(periodo)}
      prefetch={false}
      onClick={() => registrar('usou_recurso', { recurso: 'clicou_assinar', periodo, origem })}
      className={classe}
    >
      Assinar o Pro
    </Link>
  );
}

/** Topo e chamada final: a ação principal e, ao lado, "Ver preços" (ou "Minha assinatura" para quem já é Pro). */
export function AcoesPlanos({ origem, pagamento, atual }: EstadoPlanos & { origem: OrigemAssinar }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 lg:gap-3">
      <BotaoAssinar origem={origem} pagamento={pagamento} atual={atual} extra="min-w-0 flex-[1_1_100%] sm:flex-none" />
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

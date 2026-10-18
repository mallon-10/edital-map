'use client';

import Link from 'next/link';
import { useState } from 'react';
import { irParaEntrar, pedirJson } from '@/lib/cliente/pedido';
import { MENSAGENS_LIMITE_CONTA } from '@/lib/limitesConta';

/**
 * Resumo semanal do Pro (toda segunda às 7h): os editais novos da semana no Meu Radar, os que encerram em 7 dias, o
 * valor somado e quem mais compra. Liga e desliga aqui; o link do próprio e-mail também desliga.
 */
export function ResumoSemanal({ ligado: inicial, pro, temRadar }: { ligado: boolean; pro: boolean; temRadar: boolean }) {
  const [ligado, setLigado] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function trocar() {
    if (ocupado) return;
    setOcupado(true);
    setErro(null);
    const r = await pedirJson('/api/conta/resumo', 'POST', { ligado: !ligado });
    setOcupado(false);
    if (r.ok) return setLigado(!ligado);
    if (r.codigo === 'entrar') return irParaEntrar();
    setErro(r.erro);
  }

  return (
    <section aria-labelledby="resumo-semanal" className="flex flex-col gap-2 rounded-md border border-line bg-raised p-4">
      <h2 id="resumo-semanal" className="text-[17px] font-bold">
        Resumo semanal
      </h2>
      <p className="text-[14px] text-ink-muted">
        Toda segunda às 7h: os editais novos da semana no seu Meu Radar, os que encerram em até 7 dias, o valor estimado somado e os órgãos e cidades que
        mais compram.
      </p>
      {!pro ? (
        <p className="text-[14px] font-semibold">
          {MENSAGENS_LIMITE_CONTA.resumoPlano}{' '}
          <Link href="/planos" className="text-pin-strong underline-offset-2 hover:underline">
            Conhecer o Pro
          </Link>
        </p>
      ) : !temRadar ? (
        <p className="text-[14px]">
          O resumo usa o seu Meu Radar.{' '}
          <Link href="/radar/comecar" prefetch={false} className="font-semibold text-pin-strong underline-offset-2 hover:underline">
            Criar meu radar
          </Link>
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={ligado}
            aria-busy={ocupado || undefined}
            onClick={() => void trocar()}
            className="inline-flex h-11 items-center rounded-sm border border-line-strong bg-raised px-4 text-sm font-semibold hover:bg-sunken aria-checked:bg-mata-soft aria-checked:text-mata"
          >
            {ligado ? 'Ligado' : 'Desligado'}
          </button>
          <span className="text-[13px] text-ink-muted">{ligado ? 'Você recebe toda segunda.' : 'Você não recebe o resumo.'}</span>
        </div>
      )}
      {erro ? (
        <p role="alert" className="text-sm font-semibold text-pin-strong">
          {erro}
        </p>
      ) : null}
    </section>
  );
}

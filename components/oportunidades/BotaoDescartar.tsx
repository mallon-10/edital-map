'use client';

import { useState } from 'react';
import { irParaEntrar } from '@/lib/cliente/pedido';
import { mudarSalvo, useSalvos } from '@/lib/cliente/salvos';
import { LIMITES_CONTA } from '@/lib/limitesConta';
import { AvisoPlano } from './AvisoPlano';

const CLASSE =
  'inline-flex h-11 items-center rounded-sm border border-line-strong bg-raised px-4 text-sm font-semibold hover:bg-sunken aria-pressed:bg-sunken aria-pressed:text-ink-muted aria-busy:opacity-60';

const DESCARTAR_PLANO = 'Descartar editais é do plano Pro.';
const CONFIRMAR_DESFAZER = 'Desfazer o descarte? A observação deste edital também sai.';

/**
 * Página do edital: "Descartar" (some do Meu Radar; fica na aba Descartados). Descartado: "Descartado · Desfazer"
 * (remove dos salvos). Sem conta: /entrar e volta. Grátis: convite ao Pro. Recusado pela rota: volta ao que era.
 */
export function BotaoDescartar({ id }: { id: string }) {
  const estado = useSalvos();
  const [aviso, setAviso] = useState<{ mensagem: string; planos: boolean } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const atual = estado.fase === 'pronto' ? estado.salvos[id] : undefined;
  const descartado = atual?.status === 'descartado';

  async function tocar() {
    if (estado.fase === 'carregando' || ocupado) return;
    if (estado.fase === 'anonimo') return irParaEntrar();
    if (estado.fase === 'pronto' && !descartado && LIMITES_CONTA[estado.plano].salvos === 0) {
      setAviso({ mensagem: DESCARTAR_PLANO, planos: true });
      return;
    }
    if (descartado && atual?.nota && !window.confirm(CONFIRMAR_DESFAZER)) return;
    setAviso(null);
    setOcupado(true);
    const r = await mudarSalvo(id, descartado ? { remover: true } : { status: 'descartado' });
    setOcupado(false);
    if (r.ok) return;
    if (r.codigo === 'entrar') return irParaEntrar();
    setAviso({ mensagem: r.erro, planos: r.codigo === 'plano' });
  }

  return (
    <span className="relative inline-flex">
      <button type="button" onClick={() => void tocar()} aria-pressed={descartado} aria-busy={ocupado || undefined} className={CLASSE}>
        {descartado ? 'Descartado · Desfazer' : 'Descartar'}
      </button>
      {aviso ? <AvisoPlano mensagem={aviso.mensagem} planos={aviso.planos} aoFechar={() => setAviso(null)} /> : null}
    </span>
  );
}

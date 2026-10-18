'use client';

import { useState } from 'react';
import { IconeSalvar } from '@/components/inicio/Icones';
import { irParaEntrar } from '@/lib/cliente/pedido';
import { acaoDoBotao, mudarSalvo, useSalvos } from '@/lib/cliente/salvos';
import { bloqueioSalvar } from '@/lib/limitesConta';
import { CONFIRMAR_REMOVER, precisaConfirmar } from '@/lib/salvos';
import { AvisoPlano } from './AvisoPlano';

const ICONE =
  'inline-flex size-11 items-center justify-center rounded-sm text-ink-muted hover:bg-sunken aria-pressed:text-pin-strong aria-busy:opacity-60';
const BOTAO =
  'inline-flex h-11 items-center gap-2 rounded-sm border border-line-strong bg-raised px-4 text-sm font-semibold hover:bg-sunken aria-pressed:border-pin aria-pressed:bg-pin-soft aria-pressed:text-pin-strong aria-busy:opacity-60';

type Aviso = { mensagem: string; planos: boolean };

/**
 * Salvar um edital (ícone nos cards; botão na página do edital). Salvo vira "Salvo"; tocar de novo remove (confirma se
 * tiver status além de "Salvo" ou observação). Sem conta: /entrar e volta. Grátis: convite ao Pro. A mudança aparece na
 * hora e volta se a rota recusar (mudarSalvo).
 */
export function BotaoSalvar({ id, variante = 'icone' }: { id: string; variante?: 'icone' | 'botao' }) {
  const estado = useSalvos();
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const atual = estado.fase === 'pronto' ? estado.salvos[id] : undefined;
  const salvo = atual !== undefined && atual.status !== 'descartado';

  async function tocar() {
    const acao = acaoDoBotao(estado, id);
    if (acao === 'carregando' || ocupado) return;
    if (acao === 'entrar') return irParaEntrar();
    if (acao === 'bloqueado' && estado.fase === 'pronto') {
      const b = bloqueioSalvar(estado.plano, estado.usados);
      if (b) setAviso({ mensagem: b.mensagem, planos: b.codigo === 'plano' });
      return;
    }
    if (acao === 'remover' && atual && precisaConfirmar(atual) && !window.confirm(CONFIRMAR_REMOVER)) return;
    setAviso(null);
    setOcupado(true);
    const r = await mudarSalvo(id, acao === 'remover' ? { remover: true } : { status: 'salvo' });
    setOcupado(false);
    if (r.ok) return;
    if (r.codigo === 'entrar') return irParaEntrar();
    setAviso({ mensagem: r.erro, planos: r.codigo === 'plano' });
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => void tocar()}
        aria-pressed={salvo}
        aria-busy={ocupado || undefined}
        aria-label={variante === 'icone' ? (salvo ? 'Salvo. Tocar remove dos salvos' : 'Salvar edital') : undefined}
        title={variante === 'icone' ? (salvo ? 'Salvo' : 'Salvar') : undefined}
        className={variante === 'icone' ? ICONE : BOTAO}
      >
        <IconeSalvar cheio={salvo} className="size-5" />
        {variante === 'botao' ? (salvo ? 'Salvo' : 'Salvar') : null}
      </button>
      {aviso ? <AvisoPlano mensagem={aviso.mensagem} planos={aviso.planos} aoFechar={() => setAviso(null)} /> : null}
    </span>
  );
}

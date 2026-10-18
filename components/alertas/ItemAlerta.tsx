'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { irParaEntrar, pedirJson } from '@/lib/cliente/pedido';

type Props = {
  alerta: { id: string; nome: string; ativo: boolean };
  resumo: { produtos: string[]; local: string; extras: string[] };
  ultimo: string;
};
const BOTAO = 'inline-flex h-11 items-center rounded-sm border border-line-strong bg-raised px-4 text-sm font-semibold hover:bg-sunken';

/** Um alerta: nome, filtros, ativo/pausado, último envio; Editar, Pausar/Retomar e Excluir (com confirmação). */
export function ItemAlerta({ alerta, resumo, ultimo }: Props) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [anuncio, setAnuncio] = useState('');

  async function pedir(metodo: 'PATCH' | 'DELETE', corpo: unknown, depois?: () => void) {
    if (ocupado) return;
    setOcupado(true);
    setErro(null);
    const r = await pedirJson(`/api/alertas/${alerta.id}`, metodo, corpo);
    setOcupado(false);
    if (r.ok) {
      depois?.();
      return router.refresh();
    }
    if (r.codigo === 'entrar') return irParaEntrar();
    setErro(r.erro);
  }

  function excluir() {
    if (!window.confirm(`Excluir o alerta "${alerta.nome}"? Para só parar os e-mails, use Pausar.`)) return;
    // O item some da lista: o foco vai para o título da página antes, para não cair no corpo da página.
    void pedir('DELETE', {}, () => document.getElementById('titulo-alertas')?.focus());
  }

  return (
    <article className="flex flex-col gap-3 rounded-md border border-line bg-raised p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-[17px] font-bold">{alerta.nome}</h2>
        <span className={`rounded-xs px-2 py-0.5 text-xs font-semibold ${alerta.ativo ? 'bg-mata-soft text-mata' : 'bg-sunken text-ink-muted'}`}>
          {alerta.ativo ? 'Ativo' : 'Pausado'}
        </span>
      </div>
      <ul aria-label="Produtos do alerta" className="flex flex-wrap gap-2">
        {resumo.produtos.map((p) => (
          <li key={p} className="rounded-sm bg-pin-soft px-2.5 py-1 text-sm font-semibold text-pin-strong">
            {p}
          </li>
        ))}
      </ul>
      <p className="text-[13px] text-ink-muted">{[resumo.local, ...resumo.extras].join(' · ')}</p>
      <p className="text-[13px]">{ultimo}</p>
      <p aria-live="polite" className="sr-only">
        {anuncio}
      </p>
      {erro ? (
        <p role="alert" className="text-sm font-semibold text-pin-strong">
          {erro}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Link href={`/alertas/${alerta.id}/editar`} prefetch={false} className={BOTAO}>
          Editar
        </Link>
        <button type="button" aria-busy={ocupado || undefined} onClick={() => void pedir('PATCH', { ativo: !alerta.ativo }, () => setAnuncio(alerta.ativo ? 'Alerta pausado' : 'Alerta retomado'))} className={BOTAO}>
          {alerta.ativo ? 'Pausar' : 'Retomar'}
        </button>
        <button type="button" onClick={excluir} className={BOTAO}>
          Excluir
        </button>
      </div>
    </article>
  );
}

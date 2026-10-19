'use client';

import { useId, useState, type FormEvent } from 'react';
import { consultarCnpj, type RespostaCnpj } from '@/lib/cliente/cnpj';
import { PainelCnpj } from './PainelCnpj';

/** Campo do CNPJ da página /cnpj: mostra a empresa e os segmentos e leva à busca pronta. */
export function BuscaCnpj() {
  const campo = useId();
  const [cnpj, setCnpj] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [r, setR] = useState<RespostaCnpj | null>(null);

  async function consultar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    setR(null);
    try {
      setR(await consultarCnpj(cnpj));
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não deu para consultar agora.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-raised p-5">
      <form onSubmit={consultar} className="flex flex-col gap-2">
        <label htmlFor={campo} className="text-[15px] font-bold">CNPJ da sua empresa</label>
        <div className="flex flex-wrap gap-2">
          <input
            id={campo}
            inputMode="numeric"
            placeholder="00.000.000/0000-00"
            value={cnpj}
            onChange={(e) => setCnpj(e.target.value)}
            required
            className="h-11 min-w-0 flex-1 rounded-sm border border-line-strong bg-surface px-3 text-[15px]"
          />
          <button type="submit" disabled={enviando} className="h-11 rounded-sm bg-pin px-5 text-sm font-semibold text-on-pin disabled:opacity-60">
            {enviando ? 'Consultando…' : 'Ver licitações'}
          </button>
        </div>
        <p className="text-[12px] text-ink-muted">Usamos só a atividade pública da empresa na Receita. Nada é guardado.</p>
      </form>
      {erro ? (
        <p role="alert" className="text-sm text-pin-strong">
          {erro}
        </p>
      ) : null}
      {r ? <PainelCnpj key={r.empresa.razao} r={r} /> : null}
    </div>
  );
}

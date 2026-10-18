'use client';

import { useRouter } from 'next/navigation';
import { useId, useState, type FormEvent } from 'react';

/** "Tenho uma chave de acesso": liga este navegador à assinatura (até 3). */
export function FormChave() {
  const router = useRouter();
  const campo = useId();
  const [chave, setChave] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      const r = await fetch('/api/assinatura/ativar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chave }),
      });
      const j = (await r.json().catch(() => ({}))) as { erro?: string };
      if (!r.ok) {
        setErro(j.erro ?? 'Não deu para usar a chave agora. Tente de novo.');
        return;
      }
      router.refresh();
    } catch {
      setErro('Sem conexão. Tente de novo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3 rounded-lg border border-line bg-raised p-5">
      <label htmlFor={campo} className="text-[15px] font-bold">Tenho uma chave de acesso</label>
      <p className="text-[13px] text-ink-muted">A chave aparece na página de confirmação da compra (formato EM-XXXX-XXXX-XXXX).</p>
      <div className="flex flex-wrap gap-2">
        <input
          id={campo}
          value={chave}
          onChange={(e) => setChave(e.target.value)}
          placeholder="EM-XXXX-XXXX-XXXX"
          autoComplete="off"
          spellCheck={false}
          maxLength={40}
          required
          className="h-11 min-w-0 flex-1 rounded-sm border border-line-strong bg-surface px-3 font-mono text-[15px] uppercase tracking-wider"
        />
        <button type="submit" disabled={enviando} className="h-11 rounded-sm bg-pin px-5 text-sm font-semibold text-on-pin disabled:opacity-60">
          {enviando ? 'Conferindo…' : 'Usar chave'}
        </button>
      </div>
      {erro ? (
        <p role="alert" className="text-sm text-pin-strong">
          {erro}
        </p>
      ) : null}
    </form>
  );
}

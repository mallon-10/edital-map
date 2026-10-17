'use client';

import { useEffect, useState } from 'react';
import { lerTermoOrgao } from '@/lib/filtros';
import { numero } from '@/lib/formato';
import type { Orgao, OrgaoAberto } from '@/lib/tipos';

const ITEM = 'flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-sunken';
const ESPERA_MS = 300;

type Estado = { tipo: 'carregando' } | { tipo: 'pronto'; orgaos: OrgaoAberto[] } | { tipo: 'erro' };

/** Busca de órgão comprador: com 3 letras ou mais consulta /api/orgaos (órgãos com editais abertos, mais editais primeiro). */
export function PainelOrgao({ orgao, aoEscolher }: { orgao: Orgao | null; aoEscolher: (o: Orgao | null) => void }) {
  const [busca, setBusca] = useState('');
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' });
  const termo = lerTermoOrgao(busca);

  useEffect(() => {
    if (!termo) return;
    const controle = new AbortController();
    setEstado({ tipo: 'carregando' });
    // Espera a pessoa parar de digitar; a resposta de um termo antigo é descartada (abort).
    const espera = setTimeout(async () => {
      try {
        const r = await fetch(`/api/orgaos?q=${encodeURIComponent(termo)}`, { signal: controle.signal });
        if (!r.ok) throw new Error(String(r.status));
        const orgaos = (await r.json()) as OrgaoAberto[];
        if (!controle.signal.aborted) setEstado({ tipo: 'pronto', orgaos });
      } catch {
        if (!controle.signal.aborted) setEstado({ tipo: 'erro' });
      }
    }, ESPERA_MS);
    return () => {
      clearTimeout(espera);
      controle.abort();
    };
  }, [termo]);

  const aviso = 'px-2 py-2 text-sm text-ink-muted';
  return (
    <div className="flex flex-col gap-2">
      <input
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Nome do órgão"
        aria-label="Buscar órgão"
        autoComplete="off"
        maxLength={60}
        className="h-9 w-full rounded-sm border border-line-strong bg-raised px-2.5 text-sm"
      />
      <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto" aria-live="polite">
        <button type="button" onClick={() => aoEscolher(null)} aria-current={orgao ? undefined : 'true'} className={`${ITEM} font-semibold`}>
          Todos os órgãos
        </button>
        {orgao ? <p className="truncate px-2 py-1 text-xs text-ink-muted">Escolhido: {orgao.nome}</p> : null}
        {!termo ? <p className={aviso}>Digite 3 letras ou mais do nome.</p> : null}
        {termo && estado.tipo === 'carregando' ? <p className={aviso}>Buscando…</p> : null}
        {termo && estado.tipo === 'erro' ? <p className={aviso}>Não foi possível buscar agora.</p> : null}
        {termo && estado.tipo === 'pronto' && estado.orgaos.length === 0 ? (
          <p className={aviso}>Nenhum órgão com editais abertos com esse nome.</p>
        ) : null}
        {termo && estado.tipo === 'pronto'
          ? estado.orgaos.map((o) => (
              <button
                key={o.cnpj}
                type="button"
                onClick={() => aoEscolher({ cnpj: o.cnpj, nome: o.nome })}
                aria-current={orgao?.cnpj === o.cnpj ? 'true' : undefined}
                className={`${ITEM} ${orgao?.cnpj === o.cnpj ? 'bg-sunken font-semibold' : ''}`}
              >
                <span className="min-w-0">
                  <span className="block truncate">{o.nome}</span>
                  <span className="block text-xs text-ink-muted">{o.uf}</span>
                </span>
                <span className="shrink-0 font-mono text-xs text-ink-muted">{numero(o.qtd)}</span>
              </button>
            ))
          : null}
      </div>
    </div>
  );
}

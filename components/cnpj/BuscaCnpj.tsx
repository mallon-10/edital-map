'use client';

import Link from 'next/link';
import { useId, useState, type FormEvent } from 'react';
import { buscaDoCnpj } from '@/lib/cnpj';
import { ASSUNTOS } from '@/lib/seo/assuntos';

type Resposta = {
  empresa: { razao: string; fantasia: string | null; uf: string | null; municipio: string | null; ativa: boolean; atividade: string | null };
  assuntos: Array<{ slug: string; nome: string; principal: boolean }>;
};

/** Campo do CNPJ: mostra a empresa, os segmentos reconhecidos e leva à busca pronta (que conta como busca do dia). */
export function BuscaCnpj({ compacto = false }: { compacto?: boolean }) {
  const campo = useId();
  const [cnpj, setCnpj] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [r, setR] = useState<Resposta | null>(null);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());

  async function consultar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    setR(null);
    try {
      const res = await fetch(`/api/cnpj/${encodeURIComponent(cnpj.replace(/\D/g, ''))}`, { cache: 'no-store' });
      const j = (await res.json().catch(() => ({}))) as Resposta & { erro?: string };
      if (!res.ok) throw new Error(j.erro ?? 'Não deu para consultar agora.');
      setR(j);
      setMarcados(new Set(j.assuntos.filter((a) => a.principal).map((a) => a.slug)));
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não deu para consultar agora.');
    } finally {
      setEnviando(false);
    }
  }

  const busca = r ? buscaDoCnpj(ASSUNTOS.filter((a) => marcados.has(a.slug)), r.empresa.uf) : '/';
  const local = r?.empresa.municipio && r.empresa.uf ? `${r.empresa.municipio}/${r.empresa.uf}` : r?.empresa.uf;
  return (
    <div className={`flex flex-col gap-3 ${compacto ? '' : 'rounded-lg border border-line bg-raised p-5'}`}>
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
      {r ? (
        <section role="status" className="flex flex-col gap-2 rounded-md bg-sunken p-4">
          <span className="text-[15px] font-bold">{r.empresa.fantasia ?? r.empresa.razao}</span>
          <span className="text-[13px] text-ink-muted">
            {[r.empresa.atividade, local, r.empresa.ativa ? null : 'situação diferente de ativa'].filter(Boolean).join(' · ')}
          </span>
          {r.assuntos.length ? (
            <>
              <fieldset className="flex flex-col gap-1.5">
                <legend className="mb-1 text-[14px]">Segmentos encontrados (marque os que sua empresa vende):</legend>
                {r.assuntos.map((a) => (
                  <label key={a.slug} className="flex items-center gap-2 text-[14px]">
                    <input
                      type="checkbox"
                      checked={marcados.has(a.slug)}
                      onChange={(e) => {
                        const n = new Set(marcados);
                        if (e.target.checked) n.add(a.slug);
                        else n.delete(a.slug);
                        setMarcados(n);
                      }}
                      className="size-4 accent-pin"
                    />
                    <span>
                      {a.nome.replace(/^./, (c) => c.toUpperCase())}
                      {a.principal ? <span className="text-ink-muted"> · atividade principal</span> : null}
                    </span>
                  </label>
                ))}
              </fieldset>
              <Link
                href={busca}
                prefetch={false}
                aria-disabled={marcados.size === 0}
                className={`inline-flex h-11 items-center self-start rounded-sm bg-pin px-5 text-sm font-semibold text-on-pin ${marcados.size === 0 ? 'pointer-events-none opacity-50' : ''}`}
              >
                Ver editais {r.empresa.uf ? `em ${r.empresa.uf}` : ''}
              </Link>
            </>
          ) : (
            <span className="text-[14px]">
              Não reconhecemos o segmento dessa atividade. Busque pelo que sua empresa vende na{' '}
              <Link href={busca} prefetch={false} className="font-semibold text-pin-strong hover:underline">
                página inicial
              </Link>
              .
            </span>
          )}
        </section>
      ) : null}
    </div>
  );
}

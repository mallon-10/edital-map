'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { REGIOES } from '@/lib/eventos';

const SUGESTOES = ['EPI', 'uniforme profissional', 'botina de segurança', 'luva de segurança', 'capacete de segurança', 'fardamento'];

type Estado = { tipo: 'editando' } | { tipo: 'enviando' } | { tipo: 'erro'; mensagem: string } | { tipo: 'pronto' };

const CAIXA = 'flex flex-col gap-3 rounded-lg border border-line bg-raised p-5';

export function FormAlerta({ ufsIniciais }: { ufsIniciais: string[] }) {
  const [termos, setTermos] = useState<string[]>([]);
  const [novo, setNovo] = useState('');
  const [ufs, setUfs] = useState<string[]>(ufsIniciais);
  const [email, setEmail] = useState('');
  const [aceite, setAceite] = useState(false);
  const [site, setSite] = useState('');
  const [estado, setEstado] = useState<Estado>({ tipo: 'editando' });

  function adicionar(t: string) {
    const limpo = t.trim().replace(/\s+/g, ' ');
    if (limpo.length < 2 || limpo.length > 60 || termos.length >= 10) return;
    if (!termos.some((x) => x.toLowerCase() === limpo.toLowerCase())) setTermos([...termos, limpo]);
    setNovo('');
  }

  function alternarUf(uf: string) {
    setUfs(ufs.includes(uf) ? ufs.filter((u) => u !== uf) : [...ufs, uf]);
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const todos = novo.trim() ? [...termos, novo.trim()] : termos;
    setEstado({ tipo: 'enviando' });
    try {
      const r = await fetch('/api/alertas', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, termos: todos, ufs, aceite, site }),
      });
      const j = (await r.json().catch(() => ({}))) as { erro?: string };
      if (!r.ok) {
        setEstado({ tipo: 'erro', mensagem: j.erro ?? 'Não deu para registrar agora. Tente de novo.' });
        return;
      }
      setEstado({ tipo: 'pronto' });
    } catch {
      setEstado({ tipo: 'erro', mensagem: 'Sem conexão. Tente de novo.' });
    }
  }

  if (estado.tipo === 'pronto') {
    return (
      <div role="status" className={CAIXA}>
        <h2 className="text-xl font-bold">Pedido registrado</h2>
        <p>Vamos te avisar em <strong className="break-all">{email}</strong> quando os alertas estiverem prontos. Enquanto isso, o mapa já mostra os editais abertos.</p>
        <Link href="/" className="self-start rounded-sm bg-pin px-5 py-3 text-sm font-semibold text-on-pin">Voltar ao mapa</Link>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-5">
      <section className={CAIXA}>
        <h2 className="text-base font-bold">1. O que você vende</h2>
        <div className="flex flex-wrap gap-2">
          {termos.map((t) => (
            <span key={t} className="inline-flex h-9 max-w-full items-center gap-1 rounded-full bg-ink pl-3 pr-1 text-[13.5px] font-semibold text-surface">
              <span className="truncate" title={t}>{t}</span>
              <button type="button" onClick={() => setTermos(termos.filter((x) => x !== t))} aria-label={`Remover ${t}`} className="size-7 shrink-0">×</button>
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <label htmlFor="novo-termo" className="sr-only">Adicionar produto ou serviço</label>
          <input
            id="novo-termo"
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                adicionar(novo);
              }
            }}
            placeholder="Adicionar produto ou serviço"
            maxLength={60}
            className="h-11 min-w-0 flex-[1_1_240px] rounded-sm border border-line-strong px-3"
          />
          <button type="button" onClick={() => adicionar(novo)} className="h-11 rounded-sm bg-ink px-4 text-sm font-semibold text-surface">Adicionar</button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-muted">
          <span>Sugestões:</span>
          {SUGESTOES.filter((s) => !termos.some((t) => t.toLowerCase() === s.toLowerCase())).slice(0, 4).map((s) => (
            <button key={s} type="button" onClick={() => adicionar(s)} className="h-8 rounded-full border border-dashed border-line-strong px-3 font-semibold text-ink">
              + {s}
            </button>
          ))}
        </div>
      </section>

      <section className={CAIXA}>
        <h2 className="text-base font-bold">2. Onde você atende</h2>
        <p className="text-[13px] text-ink-muted">Editais abertos de todo o Brasil: marque os estados onde você atende.</p>
        {REGIOES.map(([regiao, lista]) => (
          <div key={regiao} className="flex flex-wrap items-center gap-2">
            <span className="w-24 text-[12.5px] font-semibold text-ink-muted">{regiao}</span>
            {lista.map((uf) => {
              const ativo = ufs.includes(uf);
              return (
                <button
                  key={uf}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => alternarUf(uf)}
                  className={`h-9 w-12 rounded-sm border text-[13px] font-semibold ${ativo ? 'border-mata bg-mata text-white' : 'border-line-strong bg-raised text-ink-muted'}`}
                >
                  {uf}
                </button>
              );
            })}
          </div>
        ))}
      </section>

      <section className={CAIXA}>
        <h2 className="text-base font-bold">3. Seu e-mail</h2>
        <label htmlFor="email" className="sr-only">E-mail</label>
        <input
          id="email"
          type="email"
          required
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@empresa.com.br"
          autoComplete="email"
          className="h-11 rounded-sm border border-line-strong px-3"
        />
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} className="mt-0.5 size-5 accent-mata" />
          Pode usar meu e-mail só para avisar quando os alertas estiverem prontos.
        </label>
        <Link href="/sobre" className="text-[13px] font-semibold text-pin-strong hover:underline">Como usamos seu e-mail</Link>
        <div aria-hidden="true" className="hidden">
          <label htmlFor="site">Não preencha</label>
          <input id="site" tabIndex={-1} autoComplete="off" value={site} onChange={(e) => setSite(e.target.value)} />
        </div>
      </section>

      {estado.tipo === 'erro' ? (
        <p role="alert" className="rounded-sm bg-pin-soft px-3 py-2 text-sm text-pin-strong">{estado.mensagem}</p>
      ) : null}
      <button
        type="submit"
        disabled={estado.tipo === 'enviando'}
        className="h-12 self-start rounded-md bg-pin px-6 text-[15px] font-bold text-on-pin disabled:opacity-60"
      >
        {estado.tipo === 'enviando' ? 'Registrando…' : 'Criar alerta'}
      </button>
    </form>
  );
}

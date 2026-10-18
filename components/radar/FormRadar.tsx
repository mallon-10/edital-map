'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MODALIDADES } from '@/lib/filtros';
import { corpoDoRascunho, erroDaEtapa, LIMITES_RADAR, sugestoesTermos, type RascunhoRadar } from '@/lib/radar';
import { CampoLocal } from './CampoLocal';
import { CampoTermos } from './CampoTermos';

type Etapa = 1 | 2 | 3;
type Props = { modo: 'comecar' | 'editar'; inicial: RascunhoRadar };

const TITULOS: Record<Etapa, string> = { 1: 'O que sua empresa vende?', 2: 'Onde sua empresa atende?', 3: 'Que tipo de oportunidade procura?' };
const PRINCIPAL = 'inline-flex h-12 items-center justify-center rounded-sm bg-pin px-6 text-[15px] font-semibold text-on-pin aria-disabled:opacity-60';
const SECUNDARIO = 'inline-flex h-12 items-center justify-center rounded-sm border border-line-strong bg-raised px-5 text-[15px] font-semibold hover:bg-sunken';
const CAMPO = 'h-11 w-full rounded-sm border border-line-strong bg-raised px-3 text-[15px] font-normal text-ink';
const FALHA = 'Não foi possível salvar agora. Tente de novo.';

/**
 * Radar da conta. "comecar": 3 etapas (produtos → onde atende → tipo de oportunidade, com "Pular" na 3ª).
 * "editar": as mesmas seções numa página só. Salvar (POST /api/radar, JSON do próprio site) leva ao Meu Radar.
 */
export function FormRadar({ modo, inicial }: Props) {
  const router = useRouter();
  const [d, setD] = useState<RascunhoRadar>(inicial);
  const [etapa, setEtapa] = useState<Etapa>(1);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const titulo = useRef<HTMLHeadingElement>(null);
  const primeira = useRef(true);

  // Troca de etapa: o foco vai para o título novo (leitor de tela anuncia; no celular, a tela volta ao topo).
  useEffect(() => {
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    titulo.current?.focus();
  }, [etapa]);

  const mudar = (parte: Partial<RascunhoRadar>) => {
    setD((x) => ({ ...x, ...parte }));
    setErro(null);
  };

  async function salvar(pular: boolean) {
    if (salvando) return;
    const etapas: Etapa[] = pular ? [1, 2] : [1, 2, 3];
    for (const e of etapas) {
      const msg = erroDaEtapa(d, e);
      if (msg) {
        setErro(msg);
        if (modo === 'comecar') setEtapa(e);
        return;
      }
    }
    setSalvando(true);
    try {
      const r = await fetch('/api/radar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(corpoDoRascunho(d, { pular })),
      });
      if (r.status === 401) {
        window.location.assign(`/entrar?voltar=${encodeURIComponent(modo === 'editar' ? '/radar/editar' : '/radar/comecar')}`);
        return;
      }
      const dados = (await r.json().catch(() => ({}))) as { erro?: unknown };
      if (!r.ok) {
        setErro(typeof dados.erro === 'string' ? dados.erro : FALHA);
        setSalvando(false);
        return;
      }
      router.push('/radar');
    } catch {
      setErro(FALHA);
      setSalvando(false);
    }
  }

  function avancar() {
    const msg = erroDaEtapa(d, etapa);
    if (msg) {
      setErro(msg);
      return;
    }
    setErro(null);
    setEtapa((e) => (e + 1) as Etapa);
  }

  const produtos = (
    <CampoTermos
      rotulo="Produtos ou serviços"
      ajuda="Escreva e aperte Enter. Pode separar vários com vírgula. Também buscamos termos parecidos (ex.: uniforme → fardamento)."
      termos={d.termos}
      max={LIMITES_RADAR.termos}
      tamanho={LIMITES_RADAR.tamanhoTermo}
      placeholder="Ex.: uniforme, luva, material de limpeza"
      sugerir={(t) => sugestoesTermos(t, d.termos)}
      aoMudar={(termos) => mudar({ termos })}
    />
  );
  const local = <CampoLocal valor={d} aoMudar={mudar} />;
  const oportunidade = (
    <div className="flex flex-col gap-5">
      <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold">Valor estimado (opcional)</legend>
        <label className="flex flex-col gap-1.5 text-[13px] text-ink-muted">
          Mínimo (R$)
          <input inputMode="decimal" value={d.valorMin} onChange={(e) => mudar({ valorMin: e.target.value })} placeholder="Sem mínimo" className={CAMPO} />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] text-ink-muted">
          Máximo (R$)
          <input inputMode="decimal" value={d.valorMax} onChange={(e) => mudar({ valorMax: e.target.value })} placeholder="Sem máximo" className={CAMPO} />
        </label>
        <p className="text-[13px] text-ink-muted sm:col-span-2">Com valor mínimo ou máximo, editais sem valor informado ficam de fora.</p>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Modalidades (opcional; nenhuma marcada = todas)</legend>
        <div className="flex flex-col gap-1">
          {MODALIDADES.map((mo) => (
            <label key={mo.id} className="flex min-h-11 items-center gap-3 text-[15px]">
              <input
                type="checkbox"
                checked={d.modalidades.includes(mo.id)}
                onChange={(e) => mudar({ modalidades: e.target.checked ? [...d.modalidades, mo.id] : d.modalidades.filter((x) => x !== mo.id) })}
                className="size-5 shrink-0 accent-[var(--color-pin)]"
              />
              {mo.nome}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex min-h-11 items-start gap-3 text-[15px]">
        <input type="checkbox" checked={d.soMeEpp} onChange={(e) => mudar({ soMeEpp: e.target.checked })} className="mt-0.5 size-5 shrink-0 accent-[var(--color-pin)]" />
        <span>
          <span className="font-semibold">Só exclusivas para ME/EPP</span>
          <span className="block text-[13px] text-ink-muted">Quando o órgão informa no PNCP que todos os itens são exclusivos.</span>
        </span>
      </label>
      <CampoTermos
        rotulo="Palavras para excluir (opcional)"
        ajuda="Editais com estas palavras no objeto não aparecem. Ex.: escolar."
        termos={d.termosExcluir}
        max={LIMITES_RADAR.excluir}
        tamanho={LIMITES_RADAR.tamanhoExcluir}
        aoMudar={(termosExcluir) => mudar({ termosExcluir })}
      />
    </div>
  );
  const aviso = (
    <p role="alert" className="text-sm font-semibold text-pin-strong empty:hidden">
      {erro ?? ''}
    </p>
  );

  if (modo === 'editar') {
    return (
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          void salvar(false);
        }}
        className="flex flex-col gap-8"
        noValidate
      >
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.015em]">Editar meu radar</h1>
        {([1, 2, 3] as const).map((n) => (
          <section key={n} className="flex flex-col gap-4 rounded-md border border-line bg-raised p-4">
            <h2 className="text-lg font-bold">{TITULOS[n]}</h2>
            {n === 1 ? produtos : n === 2 ? local : oportunidade}
          </section>
        ))}
        {aviso}
        <div className="flex flex-wrap gap-2">
          <button type="submit" aria-disabled={salvando || undefined} className={PRINCIPAL}>
            {salvando ? 'Salvando…' : 'Salvar alterações'}
          </button>
          <Link href="/radar" prefetch={false} className={SECUNDARIO}>
            Cancelar
          </Link>
        </div>
      </form>
    );
  }

  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        if (etapa < 3) avancar();
        else void salvar(false);
      }}
      className="flex flex-col gap-6"
      noValidate
    >
      <p className="font-mono text-xs font-semibold uppercase tracking-wider text-ink-muted">Etapa {etapa} de 3</p>
      <h1 ref={titulo} tabIndex={-1} className="text-[28px] font-bold leading-tight tracking-[-0.015em] focus:outline-none">
        {TITULOS[etapa]}
      </h1>
      {etapa === 1 ? produtos : etapa === 2 ? local : oportunidade}
      {aviso}
      <div className="flex flex-wrap gap-2">
        {etapa > 1 ? (
          <button
            type="button"
            onClick={() => {
              setErro(null);
              setEtapa((e) => (e - 1) as Etapa);
            }}
            className={SECUNDARIO}
          >
            Voltar
          </button>
        ) : null}
        <button type="submit" aria-disabled={salvando || undefined} className={PRINCIPAL}>
          {etapa < 3 ? 'Continuar' : salvando ? 'Salvando…' : 'Salvar meu radar'}
        </button>
        {etapa === 3 ? (
          <button type="button" onClick={() => void salvar(true)} aria-disabled={salvando || undefined} className={`${SECUNDARIO} aria-disabled:opacity-60`}>
            Pular
          </button>
        ) : null}
      </div>
    </form>
  );
}

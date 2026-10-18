'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { corpoDoRascunho, erroDaEtapa, LIMITES_RADAR, sugestoesTermos, type RascunhoRadar } from '@/lib/radar';
import { CampoLocal } from './CampoLocal';
import { CampoTermos } from './CampoTermos';
import { CamposOportunidade } from './CamposOportunidade';

type Etapa = 1 | 2 | 3;
type Props = { modo: 'comecar' | 'editar'; inicial: RascunhoRadar };

const TITULOS: Record<Etapa, string> = { 1: 'O que sua empresa vende?', 2: 'Onde sua empresa atende?', 3: 'Que tipo de oportunidade procura?' };
const PRINCIPAL = 'inline-flex h-12 items-center justify-center rounded-sm bg-pin px-6 text-[15px] font-semibold text-on-pin aria-disabled:opacity-60';
const SECUNDARIO = 'inline-flex h-12 items-center justify-center rounded-sm border border-line-strong bg-raised px-5 text-[15px] font-semibold hover:bg-sunken';
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
  const oportunidade = <CamposOportunidade d={d} mudar={mudar} />;
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

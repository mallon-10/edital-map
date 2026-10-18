'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { corpoDoRascunho, erroDaEtapa, LIMITES_RADAR, sugestoesTermos, type RascunhoRadar } from '@/lib/radar';
import { CampoLocal } from './CampoLocal';
import { CampoTermos } from './CampoTermos';
import { CamposOportunidade } from './CamposOportunidade';

type Secao = 1 | 2 | 3;
type Props = { modo: 'editar'; inicial: RascunhoRadar };

const TITULOS: Record<Secao, string> = { 1: 'O que sua empresa vende?', 2: 'Onde sua empresa atende?', 3: 'Que tipo de oportunidade procura?' };
const PRINCIPAL = 'inline-flex h-12 items-center justify-center rounded-sm bg-pin px-6 text-[15px] font-semibold text-on-pin aria-disabled:opacity-60';
const SECUNDARIO = 'inline-flex h-12 items-center justify-center rounded-sm border border-line-strong bg-raised px-5 text-[15px] font-semibold hover:bg-sunken';
const FALHA = 'Não foi possível salvar agora. Tente de novo.';

/**
 * Editar o radar da conta: produtos, onde atende e tipo de oportunidade numa página só. Salvar (POST /api/radar, JSON
 * do próprio site) leva ao Meu Radar. O primeiro radar é criado em /radar/comecar (OnboardingRadar, tela única).
 */
export function FormRadar({ inicial }: Props) {
  const router = useRouter();
  const [d, setD] = useState<RascunhoRadar>(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const mudar = (parte: Partial<RascunhoRadar>) => {
    setD((x) => ({ ...x, ...parte }));
    setErro(null);
  };

  async function salvar() {
    if (salvando) return;
    for (const e of [1, 2, 3] as const) {
      const msg = erroDaEtapa(d, e);
      if (msg) {
        setErro(msg);
        return;
      }
    }
    setSalvando(true);
    try {
      const r = await fetch('/api/radar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(corpoDoRascunho(d, { pular: false })),
      });
      if (r.status === 401) {
        window.location.assign(`/entrar?voltar=${encodeURIComponent('/radar/editar')}`);
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

  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        void salvar();
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

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { CampoLocal } from '@/components/radar/CampoLocal';
import { CampoTermos } from '@/components/radar/CampoTermos';
import { CamposOportunidade } from '@/components/radar/CamposOportunidade';
import { MAX_NOME_ALERTA, MENSAGENS_ALERTA, nomePadrao } from '@/lib/alertas/regras';
import { irParaEntrar, pedirJson } from '@/lib/cliente/pedido';
import { corpoDoRascunho, erroDaEtapa, LIMITES_RADAR, sugestoesTermos, type RascunhoRadar } from '@/lib/radar';

type Props = { modo: 'novo' | 'editar'; id?: string; nomeInicial: string; inicial: RascunhoRadar; origem: 'manual' | 'radar' };

const SECAO = 'flex flex-col gap-4 rounded-md border border-line bg-raised p-4';
const PRINCIPAL = 'inline-flex h-12 items-center justify-center rounded-sm bg-pin px-6 text-[15px] font-semibold text-on-pin aria-disabled:opacity-60';
const SECUNDARIO = 'inline-flex h-12 items-center justify-center rounded-sm border border-line-strong bg-raised px-5 text-[15px] font-semibold hover:bg-sunken';

/** Criar ou editar um alerta: nome + as mesmas seções do radar. Salvo, volta para /alertas. */
export function FormAlerta({ modo, id, nomeInicial, inicial, origem }: Props) {
  const router = useRouter();
  const [nome, setNome] = useState(nomeInicial);
  const [d, setD] = useState<RascunhoRadar>(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [planos, setPlanos] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const mudar = (parte: Partial<RascunhoRadar>) => {
    setD((x) => ({ ...x, ...parte }));
    setErro(null);
  };

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (salvando) return;
    for (const etapa of [1, 2, 3] as const) {
      const msg = erroDaEtapa(d, etapa);
      if (msg) return setErro(msg);
    }
    const nomeFinal = nome.trim() || nomePadrao(d.termos);
    if (!nomeFinal || nomeFinal.length > MAX_NOME_ALERTA) return setErro(MENSAGENS_ALERTA.nome);
    setSalvando(true);
    const corpo = { nome: nomeFinal, origem, ...corpoDoRascunho(d, { pular: false }) };
    const r = modo === 'novo' ? await pedirJson('/api/alertas', 'POST', corpo) : await pedirJson(`/api/alertas/${id}`, 'PATCH', corpo);
    if (r.ok) {
      router.push('/alertas');
      router.refresh();
      return;
    }
    setSalvando(false);
    if (r.codigo === 'entrar') return irParaEntrar();
    setErro(r.erro);
    setPlanos(r.codigo === 'plano');
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-6" noValidate>
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.015em]">{modo === 'novo' ? 'Criar alerta' : 'Editar alerta'}</h1>
        <p className="text-sm text-ink-muted">Os editais novos que combinam com este alerta chegam por e-mail às 7h, só nos dias em que houver novidade.</p>
      </div>
      <section className={SECAO}>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Nome do alerta
          <input
            value={nome}
            maxLength={MAX_NOME_ALERTA}
            onChange={(e) => {
              setNome(e.target.value);
              setErro(null);
            }}
            placeholder={nomePadrao(d.termos) || 'Ex.: Uniformes no Sul'}
            className="h-11 w-full rounded-sm border border-line-strong bg-raised px-3 text-[15px] font-normal text-ink"
          />
          <span className="text-[13px] font-normal text-ink-muted">Opcional: sem nome, usamos os produtos.</span>
        </label>
      </section>
      <section className={SECAO}>
        <h2 className="text-lg font-bold">O que sua empresa vende?</h2>
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
      </section>
      <section className={SECAO}>
        <h2 className="text-lg font-bold">Onde sua empresa atende?</h2>
        <CampoLocal valor={d} aoMudar={mudar} />
      </section>
      <section className={SECAO}>
        <h2 className="text-lg font-bold">Que tipo de oportunidade procura?</h2>
        <CamposOportunidade d={d} mudar={mudar} />
      </section>
      <p role="alert" className="text-sm font-semibold text-pin-strong empty:hidden">
        {erro ?? ''}
      </p>
      {planos ? (
        <Link href="/planos" className="w-fit text-sm font-semibold text-pin-strong underline-offset-2 hover:underline">
          Conhecer o Pro
        </Link>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button type="submit" aria-disabled={salvando || undefined} className={PRINCIPAL}>
          {salvando ? 'Salvando…' : modo === 'novo' ? 'Criar alerta' : 'Salvar alterações'}
        </button>
        <Link href="/alertas" prefetch={false} className={SECUNDARIO}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}

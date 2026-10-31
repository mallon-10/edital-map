'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { Lupa } from '@/components/inicio/Icones';
import { consultarCnpj, type RespostaCnpj } from '@/lib/cliente/cnpj';
import { esquecerRascunhoAlerta, lerRascunhoAlerta } from '@/lib/cliente/rascunhoAlerta';
import { normalizarCnpj } from '@/lib/cnpj';
import {
  corpoRadarRapido, localPadraoDoCnpj, marcadosDoCnpj, opcoesDoCnpj, pareceCnpj, produtosDoTexto, radarDoCnpj, type LocalCnpj,
} from '@/lib/onboardingRadar';
import { corpoDoRascunho, erroDaEtapa, MENSAGENS_RADAR, rascunhoDoRadar, type Radar, type RascunhoRadar } from '@/lib/radar';
import { CampoLocal } from './CampoLocal';

const PRINCIPAL = 'inline-flex h-12 items-center justify-center rounded-sm bg-pin px-6 text-[15px] font-semibold text-on-pin aria-disabled:opacity-60';
const SECUNDARIO = 'inline-flex h-11 shrink-0 items-center justify-center rounded-sm border border-line-strong bg-raised px-4 text-sm font-semibold hover:bg-sunken disabled:opacity-60';
const ESCOLHA = 'flex min-h-11 cursor-pointer items-center gap-2 rounded-sm px-2 text-[14px] hover:bg-raised';
const FALHA = 'Não foi possível salvar agora. Tente de novo.';
const SEM_SEGMENTO = 'Marque pelo menos um segmento.';
const CNPJ_INVALIDO = 'CNPJ inválido. Confira os 14 números.';

type Cnpj = { r: RespostaCnpj; marcados: string[]; local: LocalCnpj };

/**
 * Onboarding do Meu Radar numa tela só: o que a empresa vende (vírgula ou ponto e vírgula separam os produtos, que
 * viram chips) ou o CNPJ (empresa, segmentos da atividade e "Só em UF" ou "Todo o Brasil"). "Criar meu radar" salva
 * só produtos e local por POST /api/radar (validarRadar, limites de LIMITES_RADAR) e leva ao Meu Radar; o resto do
 * radar fica para /radar/editar. Quem assinou a partir da prévia de um alerta volta com aquela busca preenchida
 * (lib/cliente/rascunhoAlerta.ts), inclusive exclusões e valor.
 */
export function OnboardingRadar() {
  const router = useRouter();
  const id = useId();
  const [texto, setTexto] = useState('');
  const [produtos, setProdutos] = useState<string[]>([]);
  const [local, setLocal] = useState<RascunhoRadar>(() => rascunhoDoRadar(null, []));
  const [escolherLocal, setEscolherLocal] = useState(false);
  const [cnpj, setCnpj] = useState<Cnpj | null>(null);
  const [consultando, setConsultando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [daBusca, setDaBusca] = useState(false);

  useEffect(() => {
    const r = lerRascunhoAlerta();
    if (!r) return;
    setProdutos(r.termos);
    setLocal(r);
    setEscolherLocal(r.abrangencia !== 'brasil');
    setDaBusca(true);
  }, []);

  async function continuar(e?: FormEvent) {
    e?.preventDefault();
    if (consultando) return;
    setErro(null);
    const digitos = normalizarCnpj(texto);
    if (digitos) {
      setConsultando(true);
      try {
        const r = await consultarCnpj(digitos);
        setCnpj({ r, marcados: marcadosDoCnpj(r), local: localPadraoDoCnpj(r.empresa.uf) });
        setTexto('');
      } catch (falha) {
        setErro(`${falha instanceof Error ? falha.message : 'Não deu para consultar o CNPJ agora.'} Se preferir, digite o que sua empresa vende.`);
      } finally {
        setConsultando(false);
      }
      return;
    }
    if (pareceCnpj(texto)) {
      setErro(`${CNPJ_INVALIDO} Se preferir, digite o que sua empresa vende.`);
      return;
    }
    if (!texto.trim()) return;
    // Texto: produtos (o CNPJ consultado antes sai de cena).
    setCnpj(null);
    setProdutos((atuais) => produtosDoTexto(texto, atuais));
    setTexto('');
  }

  async function criar() {
    if (salvando || consultando) return;
    let corpo: Radar;
    if (cnpj) {
      const { termos, ufs } = radarDoCnpj(cnpj.marcados, cnpj.r.empresa.uf, cnpj.local);
      if (termos.length === 0) return setErro(SEM_SEGMENTO);
      corpo = corpoRadarRapido(termos, ufs);
    } else {
      // O que ficou no campo sem "Continuar" também entra (menos um CNPJ, que precisa ser consultado antes).
      const termos = texto.trim() && !pareceCnpj(texto) ? produtosDoTexto(texto, produtos) : produtos;
      if (termos.length === 0) return setErro(pareceCnpj(texto) ? 'Toque em Continuar para consultar o CNPJ.' : MENSAGENS_RADAR.semTermo);
      const d: RascunhoRadar = { ...local, termos, abrangencia: escolherLocal ? local.abrangencia : 'brasil' };
      const msg = erroDaEtapa(d, 2);
      if (msg) return setErro(msg);
      setProdutos(termos);
      setTexto('');
      corpo = corpoDoRascunho(d, { pular: !daBusca });
    }
    setErro(null);
    setSalvando(true);
    try {
      const r = await fetch('/api/radar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(corpo),
      });
      if (r.status === 401) {
        window.location.assign(`/entrar?voltar=${encodeURIComponent('/radar/comecar')}`);
        return;
      }
      const dados = (await r.json().catch(() => ({}))) as { erro?: unknown };
      if (!r.ok) {
        setErro(typeof dados.erro === 'string' ? dados.erro : FALHA);
        setSalvando(false);
        return;
      }
      esquecerRascunhoAlerta();
      router.push('/radar');
    } catch {
      setErro(FALHA);
      setSalvando(false);
    }
  }

  const empresa = cnpj?.r.empresa;
  const sede = empresa?.municipio && empresa.uf ? `${empresa.municipio}/${empresa.uf}` : empresa?.uf;
  const anuncio = cnpj && empresa
    ? `Empresa encontrada: ${empresa.fantasia ?? empresa.razao}. ${cnpj.r.assuntos.length ? 'Confira os segmentos marcados.' : 'Marque os segmentos que sua empresa vende.'}`
    : produtos.length
      ? `${produtos.length} ${produtos.length === 1 ? 'produto' : 'produtos'} na lista.`
      : '';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.015em]">Monte seu radar</h1>
        <p className="text-[15px] text-ink-muted">
          {daBusca ? 'Trouxemos a busca que você fez. Confira e crie seu radar: o alerta diário liga junto.' : 'Diga o que sua empresa vende e mostramos os editais abertos que combinam com ela.'}
        </p>
      </div>

      <form onSubmit={(e) => void continuar(e)} className="flex flex-col gap-2" noValidate>
        <label htmlFor={id} className="text-sm font-semibold">
          O que sua empresa vende? Ou digite o CNPJ
        </label>
        <p id={`${id}-ajuda`} className="text-[13px] text-ink-muted">
          Separe os produtos com vírgula. Com o CNPJ, buscamos a atividade da empresa na Receita.
        </p>
        <div className="flex gap-2">
          <div className="relative flex min-w-0 flex-1 items-center">
            <Lupa className="pointer-events-none absolute left-3 size-[18px] text-ink-muted" />
            <input
              id={id}
              aria-describedby={`${id}-ajuda`}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Ex.: uniforme, luva, material de limpeza"
              autoComplete="off"
              enterKeyHint="go"
              maxLength={300}
              className="h-11 w-full rounded-sm border border-line-strong bg-raised pl-10 pr-3 text-[15px]"
            />
          </div>
          <button type="submit" disabled={consultando} className={SECUNDARIO}>
            {consultando ? 'Consultando…' : 'Continuar'}
          </button>
        </div>
      </form>

      {/* Resumo curto para leitor de tela; o painel em si fica fora da região viva (marcar não reanuncia tudo). */}
      <p role="status" className="sr-only">
        {anuncio}
      </p>

      <div className="flex flex-col gap-4 empty:hidden">
        {cnpj && empresa ? (
          <section className="flex flex-col gap-3 rounded-md bg-sunken p-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] font-bold">{empresa.fantasia ?? empresa.razao}</span>
              <span className="text-[13px] text-ink-muted">
                {[empresa.atividade, sede, empresa.ativa ? null : 'situação diferente de ativa'].filter(Boolean).join(' · ')}
              </span>
            </div>
            <fieldset className="flex flex-col gap-1">
              <legend className="mb-1 text-[14px] font-semibold">
                {cnpj.r.assuntos.length
                  ? 'Segmentos encontrados (marque os que sua empresa vende):'
                  : 'A atividade registrada não é um dos segmentos que acompanhamos. Marque o que sua empresa vende:'}
              </legend>
              <div className="grid gap-1 sm:grid-cols-2">
                {opcoesDoCnpj(cnpj.r).map((a) => (
                  <label key={a.slug} className={ESCOLHA}>
                    <input
                      type="checkbox"
                      checked={cnpj.marcados.includes(a.slug)}
                      onChange={(e) => {
                        const marcados = e.target.checked ? [...cnpj.marcados, a.slug] : cnpj.marcados.filter((s) => s !== a.slug);
                        setCnpj({ ...cnpj, marcados });
                        setErro(null);
                      }}
                      className="size-4 accent-pin"
                    />
                    <span>
                      {a.nome.replace(/^./, (c) => c.toUpperCase())}
                      {a.principal ? <span className="text-ink-muted"> · atividade principal</span> : null}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="flex flex-col gap-1">
              <legend className="mb-1 text-[14px] font-semibold">Onde buscar editais</legend>
              {empresa.uf ? (
                <label className={ESCOLHA}>
                  <input type="radio" name="local-cnpj" checked={cnpj.local === 'uf'} onChange={() => setCnpj({ ...cnpj, local: 'uf' })} className="size-4 accent-pin" />
                  {`Só em ${empresa.uf}`}
                </label>
              ) : null}
              <label className={ESCOLHA}>
                <input type="radio" name="local-cnpj" checked={cnpj.local === 'brasil'} onChange={() => setCnpj({ ...cnpj, local: 'brasil' })} className="size-4 accent-pin" />
                Todo o Brasil
              </label>
            </fieldset>
            <button type="button" onClick={() => setCnpj(null)} className="inline-flex h-11 w-fit items-center text-sm font-semibold text-pin-strong underline-offset-2 hover:underline">
              Digitar os produtos em vez do CNPJ
            </button>
          </section>
        ) : null}

        {!cnpj && produtos.length ? (
          <section className="flex flex-col gap-3">
            <ul className="flex flex-wrap gap-2" aria-label="Produtos ou serviços">
              {produtos.map((t) => (
                <li key={t} className="inline-flex items-center gap-1 rounded-sm bg-pin-soft pl-3 text-sm font-semibold text-pin-strong">
                  {t}
                  <button
                    type="button"
                    onClick={() => setProdutos((p) => p.filter((x) => x !== t))}
                    aria-label={`Remover ${t}`}
                    className="inline-flex size-11 items-center justify-center rounded-xs text-lg leading-none hover:bg-raised"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            {escolherLocal ? (
              <CampoLocal valor={local} aoMudar={(p) => setLocal((x) => ({ ...x, ...p }))} />
            ) : (
              <p className="flex flex-wrap items-center gap-x-2 text-[14px]">
                <span>
                  Onde: <strong>Todo o Brasil</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEscolherLocal(true);
                    setLocal((x) => ({ ...x, abrangencia: 'estados' }));
                  }}
                  className="inline-flex h-11 items-center font-semibold text-pin-strong underline-offset-2 hover:underline"
                >
                  Escolher estados
                </button>
              </p>
            )}
          </section>
        ) : null}
      </div>

      <p role="alert" className="text-sm font-semibold text-pin-strong empty:hidden">
        {erro ?? ''}
      </p>

      <div className="flex flex-col gap-3">
        <button type="button" onClick={() => void criar()} aria-disabled={salvando || consultando || undefined} className={`${PRINCIPAL} sm:self-start`}>
          {salvando ? 'Criando…' : 'Criar meu radar'}
        </button>
        <p className="text-[13px] text-ink-muted">
          Prefere ajustar valor, modalidades e palavras para excluir? Dá para fazer depois em{' '}
          <Link href="/radar/editar" prefetch={false} className="inline-flex min-h-11 items-center align-middle font-semibold text-pin-strong underline underline-offset-2 lg:min-h-0">
            Ajustar meu radar
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

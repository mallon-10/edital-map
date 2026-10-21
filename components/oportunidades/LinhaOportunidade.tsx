'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { TAG_PRAZO } from '@/components/estilosPrazo';
import { irParaEntrar } from '@/lib/cliente/pedido';
import { atualizarSalvo, mudarSalvo } from '@/lib/cliente/salvos';
import { dataHora, moeda, prazo } from '@/lib/formato';
import { CONFIRMAR_REMOVER, MAX_OBSERVACAO, precisaConfirmar, ROTULO_STATUS, situacaoOficial, STATUS_SALVO, type SalvoDaConta, type StatusSalvo } from '@/lib/salvos';
import { assunto, nomeProprio } from '@/lib/texto';

const ROTULO = 'text-xs text-ink-muted';
const CAMPO = 'w-full rounded-sm border border-line-strong bg-raised px-3 text-[15px] text-ink disabled:opacity-60';

/**
 * Um edital salvo: título, órgão, município/UF, valor, prazo, situação oficial, o status pessoal (seletor), a observação
 * (salva ao sair do campo; só texto), "Abrir edital" e "Remover". Mudar o status ou remover recarrega a página (contagens
 * das abas); recusado, o status volta ao que era e a mensagem da rota aparece. Antes de mudar o status ou remover, a
 * observação pendente é gravada (se não gravar, nada muda: a linha não sai da aba levando o texto não salvo). O seletor
 * fica desligado durante o pedido e recebe o foco de volta no fim (teclado não se perde).
 */
export function LinhaOportunidade({ salvo: s, agora }: { salvo: SalvoDaConta; agora: string }) {
  const router = useRouter();
  const idStatus = useId();
  const idObs = useId();
  const [status, setStatus] = useState<StatusSalvo>(s.status);
  const [obs, setObs] = useState(s.observacao ?? '');
  // Refs: o texto atual e o gravado valem também depois de um await (o estado da renderização ficaria velho).
  const obsAtual = useRef(s.observacao ?? '');
  const gravada = useRef(s.observacao ?? '');
  const emCurso = useRef<Promise<boolean> | null>(null);
  const refStatus = useRef<HTMLSelectElement>(null);
  const [estadoObs, setEstadoObs] = useState<'quieto' | 'salvando' | 'salvo'>('quieto');
  const [ocupado, setOcupado] = useState(false);
  const focarStatus = useRef(false);
  const [erro, setErro] = useState<string | null>(null);

  // O seletor desligado perde o foco; religado depois de uma mudança de status, o foco volta para ele.
  useEffect(() => {
    if (ocupado || !focarStatus.current) return;
    focarStatus.current = false;
    refStatus.current?.focus();
  }, [ocupado]);
  const quando = new Date(agora);
  const e = s.edital;
  const sit = situacaoOficial(e, quando);
  // Encerrada, revogada ou anulada: a situação já diz tudo; o prazo só aparece enquanto o edital está aberto.
  const p = e?.encerramento_em && (sit === null || sit === 'Suspensa') ? prazo(e.encerramento_em, quando) : null;

  function falhou(r: { codigo: string; erro: string }) {
    if (r.codigo === 'entrar') return irParaEntrar();
    setErro(r.erro);
  }

  async function mudarStatus(novo: StatusSalvo) {
    const anterior = status;
    setErro(null);
    setStatus(novo);
    setOcupado(true);
    focarStatus.current = true;
    if (!(await salvarObservacao())) {
      setStatus(anterior);
      setOcupado(false);
      return;
    }
    const r = await atualizarSalvo(s.id, { status: novo });
    setOcupado(false);
    if (!r.ok) {
      setStatus(anterior);
      return falhou(r);
    }
    router.refresh();
  }

  /**
   * Grava a observação se mudou. true: gravada (ou nada a gravar); false: falhou (mensagem já na tela). Um pedido por
   * vez: quem chega durante outro (o blur do campo e logo o status) espera por ele e confere de novo o que falta.
   */
  function salvarObservacao(): Promise<boolean> {
    if (emCurso.current) return emCurso.current.then((ok) => (ok ? salvarObservacao() : false));
    const texto = obsAtual.current;
    if (texto.trim() === gravada.current.trim()) return Promise.resolve(true);
    const pedido = (async () => {
      setErro(null);
      setEstadoObs('salvando');
      const r = await atualizarSalvo(s.id, { observacao: texto });
      if (!r.ok) {
        setEstadoObs('quieto');
        falhou(r);
        return false;
      }
      gravada.current = texto;
      // Digitou durante o pedido: o que está no campo ainda não foi gravado.
      setEstadoObs(obsAtual.current === texto ? 'salvo' : 'quieto');
      return true;
    })().finally(() => {
      emCurso.current = null;
    });
    emCurso.current = pedido;
    return pedido;
  }

  async function remover() {
    setErro(null);
    const salvou = await salvarObservacao();
    if (!salvou) return;
    if (precisaConfirmar({ status, nota: gravada.current.trim().length > 0 }) && !window.confirm(CONFIRMAR_REMOVER)) return;
    setOcupado(true);
    const r = await mudarSalvo(s.id, { remover: true });
    setOcupado(false);
    if (!r.ok) return falhou(r);
    router.refresh();
  }

  return (
    <article className="flex flex-col gap-3 rounded-md border border-line bg-raised p-4">
      <div className="flex flex-wrap items-center gap-2">
        {p ? <span className={`rounded-xs px-2 py-0.5 text-xs font-semibold ${TAG_PRAZO[p.tom]}`}>{p.texto}</span> : null}
        {sit ? <span className="rounded-xs bg-sunken px-2 py-0.5 text-xs font-semibold text-ink-muted">{sit}</span> : null}
        <span className="rounded-xs bg-pin-soft px-2 py-0.5 text-xs font-semibold text-pin-strong">{ROTULO_STATUS[status]}</span>
      </div>
      <h2 className="text-[16px] font-bold leading-snug">{e ? assunto(e.objeto).titulo : 'Edital não disponível'}</h2>
      {e ? (
        <>
          <p className="text-[13px] text-ink-muted">
            {nomeProprio(e.orgao_nome)} · {e.municipio_nome ?? 'Município não informado'}/{e.uf}
          </p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
            <div>
              <dt className={ROTULO}>Valor estimado</dt>
              <dd className={moeda(e.valor_estimado) ? 'font-mono font-medium' : 'text-ink-muted'}>{moeda(e.valor_estimado) ?? 'Valor não informado'}</dd>
            </div>
            <div>
              <dt className={ROTULO}>Propostas até</dt>
              <dd className="whitespace-nowrap font-mono text-[12px] sm:text-[13px]">{e.encerramento_em ? dataHora(e.encerramento_em) : 'Não informado'}</dd>
            </div>
          </dl>
        </>
      ) : (
        <p className="text-[13px] text-ink-muted">O edital saiu do PNCP ou da nossa base. Você pode remover da lista.</p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[220px_1fr]">
        <label htmlFor={idStatus} className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Meu status
          <select
            ref={refStatus}
            id={idStatus}
            value={status}
            disabled={ocupado}
            onChange={(ev) => void mudarStatus(ev.target.value as StatusSalvo)}
            className={`${CAMPO} h-11`}
          >
            {STATUS_SALVO.map((st) => (
              <option key={st} value={st}>
                {ROTULO_STATUS[st]}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={idObs} className="text-[13px] font-semibold">
            Observação
          </label>
          <textarea
            id={idObs}
            value={obs}
            maxLength={MAX_OBSERVACAO}
            rows={2}
            onChange={(ev) => {
              obsAtual.current = ev.target.value;
              setObs(ev.target.value);
              setEstadoObs('quieto');
            }}
            onBlur={() => void salvarObservacao()}
            placeholder="Ex.: pedir amostra, conferir atestado"
            className={`${CAMPO} py-2`}
          />
          <div className="flex justify-between gap-2 text-xs text-ink-muted">
            <span aria-live="polite">{estadoObs === 'salvando' ? 'Salvando…' : estadoObs === 'salvo' ? 'Salvo ✓' : ''}</span>
            <span className="font-mono">
              {obs.length}/{MAX_OBSERVACAO}
            </span>
          </div>
        </div>
      </div>
      {erro ? (
        <p role="alert" className="text-sm font-semibold text-pin-strong">
          {erro}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {e ? (
          <Link href={`/edital/${e.slug}`} prefetch={false} className="inline-flex h-11 items-center rounded-sm bg-pin px-4 text-sm font-semibold text-on-pin">
            Abrir edital
          </Link>
        ) : null}
        <button
          type="button"
          disabled={ocupado}
          onClick={() => void remover()}
          className="inline-flex h-11 items-center rounded-sm border border-line-strong bg-raised px-4 text-sm font-semibold hover:bg-sunken disabled:opacity-60"
        >
          Remover
        </button>
      </div>
    </article>
  );
}

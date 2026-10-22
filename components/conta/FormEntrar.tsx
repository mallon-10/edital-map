'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { DIGITOS_CODIGO, lerCodigo, lerEmail, MENSAGENS_CONTA, segundosParaReenvio } from '@/lib/conta';

const CAMPO = 'h-12 w-full rounded-sm border border-line-strong bg-raised px-3 text-[16px]';
const PRINCIPAL = 'inline-flex h-12 w-full items-center justify-center rounded-sm bg-pin px-5 text-[15px] font-semibold text-on-pin aria-disabled:opacity-60';
const LINK = 'text-sm font-semibold text-pin-strong underline-offset-2 hover:underline aria-disabled:cursor-default aria-disabled:text-ink-muted aria-disabled:no-underline';

async function postar(caminho: string, corpo: unknown): Promise<{ ok: boolean; dados: Record<string, unknown> }> {
  try {
    const r = await fetch(caminho, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) });
    return { ok: r.ok, dados: (await r.json().catch(() => ({}))) as Record<string, unknown> };
  } catch {
    return { ok: false, dados: { erro: MENSAGENS_CONTA.falha } };
  }
}

const erroDe = (d: Record<string, unknown>) => (typeof d.erro === 'string' ? d.erro : MENSAGENS_CONTA.falha);

/**
 * Login por código: e-mail → "Enviar código" → código de 6 números → entra. Reenvio liberado depois de 60 s. Vindo das
 * boas-vindas do Pro (o código já foi no e-mail), começa na etapa do código, com o reenvio liberado.
 */
export function FormEntrar({ destino, emailInicial = '', etapaInicial = 'email' }: { destino: string; emailInicial?: string; etapaInicial?: 'email' | 'codigo' }) {
  const [etapa, setEtapa] = useState<'email' | 'codigo'>(etapaInicial);
  // Vindo da confirmação do pagamento (/obrigado), o e-mail da compra já chega preenchido.
  const [email, setEmail] = useState(emailInicial);
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [enviadoEm, setEnviadoEm] = useState<number | null>(null);
  const [agora, setAgora] = useState(() => Date.now());
  const campoCodigo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (enviadoEm === null) return;
    const t = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [enviadoEm]);
  useEffect(() => {
    if (etapa === 'codigo') campoCodigo.current?.focus();
  }, [etapa]);

  const espera = enviadoEm === null ? 0 : segundosParaReenvio(enviadoEm, agora);

  async function enviar(e?: FormEvent) {
    e?.preventDefault();
    if (ocupado) return;
    const valido = lerEmail(email);
    if (!valido) {
      setErro(MENSAGENS_CONTA.email);
      return;
    }
    setOcupado(true);
    setErro(null);
    const r = await postar('/api/conta/codigo', { email: valido });
    setOcupado(false);
    if (!r.ok) {
      setErro(erroDe(r.dados));
      return;
    }
    const t = Date.now();
    setEnviadoEm(t);
    setAgora(t);
    setCodigo('');
    setEtapa('codigo');
  }

  async function entrar(e: FormEvent) {
    e.preventDefault();
    if (ocupado) return;
    const c = lerCodigo(codigo);
    if (!c) {
      setErro(MENSAGENS_CONTA.codigo);
      return;
    }
    setOcupado(true);
    setErro(null);
    const r = await postar('/api/conta/entrar', { email: lerEmail(email), codigo: c, destino });
    if (!r.ok) {
      setOcupado(false);
      setErro(erroDe(r.dados));
      return;
    }
    // Carga completa: o cabeçalho e as páginas leem a sessão nova.
    window.location.assign(typeof r.dados.destino === 'string' ? r.dados.destino : destino);
  }

  const aviso = erro ? (
    <p role="alert" className="text-sm font-semibold text-pin-strong">
      {erro}
    </p>
  ) : null;

  if (etapa === 'email') {
    return (
      <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.015em]">Entrar no Edital Map</h1>
        <p className="text-[15px] text-ink-muted">
          Digite seu e-mail. Enviamos um código de {DIGITOS_CODIGO} números para você entrar, sem senha. Se for a primeira vez, a conta é criada na hora.
        </p>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          E-mail
          <input type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={CAMPO} />
        </label>
        {aviso}
        <button type="submit" aria-disabled={ocupado || undefined} className={PRINCIPAL}>
          {ocupado ? 'Enviando…' : 'Enviar código'}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={entrar} className="flex flex-col gap-4" noValidate>
      <h1 className="text-[28px] font-bold leading-tight tracking-[-0.015em]">Digite o código</h1>
      <p className="text-[15px] text-ink-muted">
        Enviamos um código de {DIGITOS_CODIGO} números para <strong className="text-ink">{lerEmail(email)}</strong>. Confira também a caixa de spam.
      </p>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Código
        <input
          ref={campoCodigo}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={DIGITOS_CODIGO + 2}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/[^\d ]/g, ''))}
          className={`${CAMPO} font-mono text-[22px] tracking-[0.3em]`}
        />
      </label>
      {aviso}
      <button type="submit" aria-disabled={ocupado || undefined} className={PRINCIPAL}>
        {ocupado ? 'Entrando…' : 'Entrar'}
      </button>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => (espera === 0 ? void enviar() : undefined)} aria-disabled={espera > 0 || ocupado || undefined} className={LINK}>
          {espera > 0 ? `Reenviar código em ${espera} s` : 'Reenviar código'}
        </button>
        <button
          type="button"
          onClick={() => {
            setEtapa('email');
            setErro(null);
          }}
          className={LINK}
        >
          Trocar e-mail
        </button>
      </div>
    </form>
  );
}

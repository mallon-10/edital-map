'use client';

import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import { sdkCakto, type CartaoDigitado, type Endereco } from '@/lib/cliente/caktoSdk';
import { medir } from '@/lib/cliente/medir';
import { validarComprador } from '@/lib/pagamento/comprador';
import { type Periodo, PLANOS, precoDoPlano } from '@/lib/planos';

type Campo = 'nome' | 'email' | 'celular' | 'documento';
type Metodo = 'pix' | 'cartao';
type Pix = { codigo: string; qrCode: string; imagem: string; expiraEm: string | null };

const PRO = PLANOS.find((p) => p.id === 'pro')!;
const ENTRADA = 'h-11 w-full rounded-sm border border-line-strong bg-surface px-3 text-[15px] text-ink';
const ROTULO = 'flex flex-col gap-1 text-[13px] font-semibold text-ink';
const so = (t: string) => t.replace(/\D/g, '');

function CampoTexto({ rotulo, erro, largo = false, children }: { rotulo: string; erro?: string; largo?: boolean; children: ReactNode }) {
  return (
    <label className={`${ROTULO} ${largo ? 'col-span-2' : ''}`}>
      {rotulo}
      {children}
      {erro ? <span className="text-[12px] font-normal text-pin-strong">{erro}</span> : null}
    </label>
  );
}

/** Checkout próprio do Pro (spec do pagamento, revisão 2, §4): Pix Automático (padrão) ou cartão com 3D Secure. */
export function CheckoutPro({ clienteId, periodoInicial }: { clienteId: string; periodoInicial: Periodo }) {
  const router = useRouter();
  const [periodo, setPeriodo] = useState<Periodo>(periodoInicial);
  const [metodo, setMetodo] = useState<Metodo>('pix');
  const [dados, setDados] = useState({ nome: '', email: '', celular: '', documento: '' });
  const [cartao, setCartao] = useState({ numero: '', nomeCartao: '', validade: '', cvv: '' });
  const [endereco, setEndereco] = useState({ cep: '', rua: '', numero: '', complemento: '', cidade: '', uf: '' });
  const [erros, setErros] = useState<Partial<Record<Campo, string>>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [pix, setPix] = useState<Pix | null>(null);
  const idTitulo = useId();

  // O antifraude começa no carregamento (quanto antes, mais sinais); falha aqui não impede o Pix.
  useEffect(() => {
    void sdkCakto(clienteId).catch(() => undefined);
  }, [clienteId]);

  // CEP completo: rua, cidade e UF pelo ViaCEP (o número e o complemento ficam com a pessoa).
  useEffect(() => {
    const cep = so(endereco.cep);
    if (cep.length !== 8) return;
    let cancelado = false;
    fetch(`https://viacep.com.br/ws/${cep}/json/`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { logradouro?: string; localidade?: string; uf?: string; erro?: boolean } | null) => {
        if (cancelado || !j || j.erro) return;
        setEndereco((e) => ({ ...e, rua: j.logradouro || e.rua, cidade: j.localidade || e.cidade, uf: j.uf || e.uf }));
      })
      .catch(() => undefined);
    return () => {
      cancelado = true;
    };
  }, [endereco.cep]);

  // Pix na tela: pergunta a cada 3 s se o pagamento entrou; entrou, vai para a confirmação.
  useEffect(() => {
    if (!pix) return;
    const id = window.setInterval(async () => {
      const r = await fetch(`/api/checkout/estado?codigo=${pix.codigo}`, { cache: 'no-store' }).catch(() => null);
      const j = r ? ((await r.json().catch(() => ({}))) as { estado?: string }) : {};
      if (j.estado === 'pago') {
        window.clearInterval(id);
        router.push(`/obrigado/${pix.codigo}`);
      }
    }, 3000);
    return () => window.clearInterval(id);
  }, [pix, router]);

  async function enviarAoServidor(corpo: Record<string, unknown>) {
    const r = await fetch('/api/assinar', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ periodo, metodo, comprador: dados, ...corpo }),
    });
    const j = (await r.json().catch(() => ({}))) as {
      codigo?: string; estado?: string; qrCode?: string; expiraEm?: string | null; erro?: string; erros?: Partial<Record<Campo, string>>;
    };
    if (!r.ok) {
      setErros(j.erros ?? {});
      throw new Error(j.erro ?? 'Não conseguimos criar a cobrança agora. Tente de novo.');
    }
    return j;
  }

  async function pagar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    const v = validarComprador(dados);
    if (!v.ok) {
      setErros(v.erros);
      return;
    }
    setErros({});
    setEnviando(true);
    medir('checkout', { chave: 'dia' });
    try {
      if (metodo === 'pix') {
        const j = await enviarAoServidor({});
        if (!j.codigo || !j.qrCode) throw new Error('A Cakto não devolveu o QR Code. Tente de novo.');
        const imagem = await QRCode.toDataURL(j.qrCode, { width: 260, margin: 1 });
        setPix({ codigo: j.codigo, qrCode: j.qrCode, imagem, expiraEm: j.expiraEm ?? null });
        return;
      }
      const [mes, ano] = cartao.validade.split('/').map((x) => so(x));
      const digitado: CartaoDigitado = { holderName: cartao.nomeCartao.trim(), cardNumber: so(cartao.numero), cvv: so(cartao.cvv), expMonth: mes ?? '', expYear: (ano ?? '').slice(-2) };
      const end: Endereco = {
        street: endereco.rua.trim(), number: endereco.numero.trim(), complement: endereco.complemento.trim(),
        city: endereco.cidade.trim(), state: endereco.uf.trim().toUpperCase(), zipcode: so(endereco.cep),
      };
      if (digitado.cardNumber.length < 13 || !digitado.holderName || digitado.cvv.length < 3 || !digitado.expMonth || !digitado.expYear) {
        throw new Error('Confira os dados do cartão.');
      }
      if (!end.street || !end.number || !end.city || end.state.length !== 2 || end.zipcode.length !== 8) {
        throw new Error('Confira o endereço de cobrança do cartão.');
      }
      const sdk = await sdkCakto(clienteId);
      const { cardToken } = await sdk.createToken(digitado);
      const auth = await sdk.authenticate3DS({
        card: digitado,
        customer: {
          amount: periodo === 'anual' ? PRO.centavosAno : PRO.centavosMes, currency: 'BRL', email: v.comprador.email, name: v.comprador.nome,
          phone: v.comprador.celular, paymentMethod: 'credit', address: end,
        },
      });
      if (!auth.success) throw new Error('O banco não confirmou o cartão. Tente de novo ou pague com Pix.');
      await sdk.completeAntifraudProfile();
      const j = await enviarAoServidor({
        cartao: {
          token: cardToken,
          threeDSecure: { cavv: auth.cavv, eci: auth.eci, xid: auth.xid, referenceId: auth.referenceId, version: auth.version },
          antifraude: sdk.getAntifraudReference(),
        },
      });
      if (j.estado === 'recusado') throw new Error(j.erro ?? 'O banco recusou o pagamento.');
      router.push(`/obrigado/${j.codigo}`);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não deu certo agora. Tente de novo.');
    } finally {
      setEnviando(false);
    }
  }

  const preco = precoDoPlano(PRO, periodo);

  if (pix) {
    return (
      <section aria-labelledby={idTitulo} className="flex flex-col items-center gap-4 rounded-lg border border-line bg-raised p-6 text-center">
        <h2 id={idTitulo} className="text-[19px] font-bold">Autorize o Pix Automático no app do seu banco</h2>
        <p className="max-w-[46ch] text-[14px] text-ink-muted">
          Leia o QR Code (ou cole o código) no app do banco e confirme a autorização. A primeira cobrança é de {preco.principal}; as próximas caem
          sozinhas, e você cancela quando quiser.
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element -- imagem gerada no navegador (data: URL) */}
        <img src={pix.imagem} alt="QR Code do Pix Automático" width={260} height={260} className="rounded-md border border-line bg-white p-2" />
        <button
          type="button"
          onClick={() => void navigator.clipboard?.writeText(pix.qrCode)}
          className="inline-flex h-11 items-center rounded-sm border border-line-strong bg-raised px-5 text-sm font-semibold hover:bg-sunken"
        >
          Copiar código Pix
        </button>
        <p role="status" className="text-[13px] text-ink-muted">Esperando a confirmação do banco… Esta página avança sozinha.</p>
        <button type="button" onClick={() => setPix(null)} className="text-[13px] font-semibold text-pin-strong hover:underline">
          Voltar e trocar os dados
        </button>
      </section>
    );
  }

  return (
    <form onSubmit={pagar} noValidate className="flex flex-col gap-5 rounded-lg border border-line bg-raised p-5 md:p-6">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[15px] font-bold">Plano Pro</legend>
        <div className="grid grid-cols-2 gap-2">
          {(['mensal', 'anual'] as const).map((p) => {
            const pr = precoDoPlano(PRO, p);
            return (
              <label
                key={p}
                className={`flex cursor-pointer flex-col gap-0.5 rounded-md border p-3 ${periodo === p ? 'border-pin bg-pin-soft' : 'border-line'}`}
              >
                <input type="radio" name="periodo" value={p} checked={periodo === p} onChange={() => setPeriodo(p)} className="sr-only" />
                <span className="text-[14px] font-bold">{p === 'mensal' ? 'Mensal' : 'Anual'}</span>
                <span className="font-mono text-[13px]">{pr.principal}</span>
                {pr.equivalente ? <span className="text-[12px] text-ink-muted">{pr.equivalente}</span> : null}
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="grid gap-3 md:grid-cols-2">
        <legend className="mb-2 text-[15px] font-bold">Seus dados</legend>
        <CampoTexto rotulo="Nome completo" erro={erros.nome}>
          <input className={ENTRADA} autoComplete="name" value={dados.nome} onChange={(e) => setDados({ ...dados, nome: e.target.value })} />
        </CampoTexto>
        <CampoTexto rotulo="E-mail (é com ele que você entra no Edital Map)" erro={erros.email}>
          <input className={ENTRADA} type="email" autoComplete="email" value={dados.email} onChange={(e) => setDados({ ...dados, email: e.target.value })} />
        </CampoTexto>
        <CampoTexto rotulo="Celular com DDD" erro={erros.celular}>
          <input className={ENTRADA} type="tel" inputMode="tel" autoComplete="tel-national" value={dados.celular} onChange={(e) => setDados({ ...dados, celular: e.target.value })} />
        </CampoTexto>
        <CampoTexto rotulo="CPF ou CNPJ" erro={erros.documento}>
          <input className={ENTRADA} inputMode="numeric" value={dados.documento} onChange={(e) => setDados({ ...dados, documento: e.target.value })} />
        </CampoTexto>
      </fieldset>

      <div role="tablist" aria-label="Forma de pagamento" className="grid grid-cols-2 gap-2">
        {(['pix', 'cartao'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={metodo === m}
            onClick={() => setMetodo(m)}
            className={`h-11 rounded-sm border text-sm font-semibold ${metodo === m ? 'border-ink bg-ink text-surface' : 'border-line-strong bg-raised text-ink hover:bg-sunken'}`}
          >
            {m === 'pix' ? 'Pix Automático' : 'Cartão de crédito'}
          </button>
        ))}
      </div>

      {metodo === 'pix' ? (
        <p className="text-[13px] text-ink-muted">Você autoriza uma vez no app do banco e a renovação cai sozinha. Sem cartão.</p>
      ) : (
        <fieldset className="grid grid-cols-2 gap-3">
          <legend className="sr-only">Cartão</legend>
          <CampoTexto rotulo="Número do cartão" largo>
            <input className={ENTRADA} inputMode="numeric" autoComplete="cc-number" value={cartao.numero} onChange={(e) => setCartao({ ...cartao, numero: e.target.value })} />
          </CampoTexto>
          <CampoTexto rotulo="Nome impresso no cartão" largo>
            <input className={ENTRADA} autoComplete="cc-name" value={cartao.nomeCartao} onChange={(e) => setCartao({ ...cartao, nomeCartao: e.target.value })} />
          </CampoTexto>
          <CampoTexto rotulo="Validade (MM/AA)">
            <input className={ENTRADA} inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" value={cartao.validade} onChange={(e) => setCartao({ ...cartao, validade: e.target.value })} />
          </CampoTexto>
          <CampoTexto rotulo="CVV">
            <input className={ENTRADA} inputMode="numeric" autoComplete="cc-csc" value={cartao.cvv} onChange={(e) => setCartao({ ...cartao, cvv: e.target.value })} />
          </CampoTexto>
          <CampoTexto rotulo="CEP de cobrança">
            <input className={ENTRADA} inputMode="numeric" autoComplete="postal-code" value={endereco.cep} onChange={(e) => setEndereco({ ...endereco, cep: e.target.value })} />
          </CampoTexto>
          <CampoTexto rotulo="Número">
            <input className={ENTRADA} value={endereco.numero} onChange={(e) => setEndereco({ ...endereco, numero: e.target.value })} />
          </CampoTexto>
          <CampoTexto rotulo="Rua" largo>
            <input className={ENTRADA} autoComplete="address-line1" value={endereco.rua} onChange={(e) => setEndereco({ ...endereco, rua: e.target.value })} />
          </CampoTexto>
          <CampoTexto rotulo="Complemento (opcional)" largo>
            <input className={ENTRADA} autoComplete="address-line2" value={endereco.complemento} onChange={(e) => setEndereco({ ...endereco, complemento: e.target.value })} />
          </CampoTexto>
          <CampoTexto rotulo="Cidade">
            <input className={ENTRADA} autoComplete="address-level2" value={endereco.cidade} onChange={(e) => setEndereco({ ...endereco, cidade: e.target.value })} />
          </CampoTexto>
          <CampoTexto rotulo="UF">
            <input className={ENTRADA} maxLength={2} autoComplete="address-level1" value={endereco.uf} onChange={(e) => setEndereco({ ...endereco, uf: e.target.value })} />
          </CampoTexto>
          <p className="col-span-2 text-[12px] text-ink-muted">
            Os dados do cartão vão direto do seu navegador para a Cakto, protegidos; o Edital Map não vê nem guarda o número do cartão.
          </p>
        </fieldset>
      )}

      {erro ? (
        <p role="alert" className="rounded-sm bg-pin-soft px-3 py-2 text-sm text-pin-strong">
          {erro}
        </p>
      ) : null}

      <button type="submit" disabled={enviando} className="h-12 rounded-sm bg-pin px-5 text-[15px] font-bold text-on-pin disabled:opacity-60">
        {enviando ? 'Processando…' : metodo === 'pix' ? `Gerar QR Code · ${preco.principal}` : `Pagar ${preco.principal}`}
      </button>
      <p className="text-center text-[12px] text-ink-muted">Pagamento processado pela Cakto. Cancele quando quiser.</p>
    </form>
  );
}

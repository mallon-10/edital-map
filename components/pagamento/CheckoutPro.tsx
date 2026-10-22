'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { IconeCadeado, SetaEsquerda } from '@/components/inicio/Icones';
import {
  mascaraCelular,
  mascaraDocumento,
  textosCheckout,
  validarCartao,
  type CampoCartao,
  type CartaoForm,
  type EnderecoForm,
  type Metodo,
} from '@/lib/checkout';
import { sdkCakto } from '@/lib/cliente/caktoSdk';
import { dadosGa4, medir } from '@/lib/cliente/medir';
import { validarComprador } from '@/lib/pagamento/comprador';
import { PLANOS, type Periodo } from '@/lib/planos';
import { Campo } from './Campo';
import { CamposCartao, type EstadoCep } from './CamposCartao';
import { BOTAO_PAGAR, CARTAO_CHECKOUT, LINK_VOLTAR, PASSO_AZUL } from './estilos';
import { FormaPagamento, PassosPix } from './FormaPagamento';
import { Garantias, ResumoPedido } from './ResumoPedido';
import { TelaPix, type Pix } from './TelaPix';

type CampoComprador = 'nome' | 'email' | 'celular' | 'documento';
type Erros = Partial<Record<CampoComprador | CampoCartao, string>>;

const PRO = PLANOS.find((p) => p.id === 'pro')!;
const TITULO_PASSO = 'flex items-center gap-2.5 text-[18px] font-bold tracking-[-0.01em] lg:gap-3 lg:text-[20px]';
const so = (t: string) => t.replace(/\D/g, '');

/** Primeiro campo marcado com erro recebe o foco (o leitor de tela lê o erro junto). */
function focarErro() {
  requestAnimationFrame(() => document.querySelector<HTMLInputElement>('input[aria-invalid="true"]')?.focus());
}

/**
 * Checkout próprio do Pro (spec do pagamento, revisão 2, §4; visual na spec 2026-10-22-checkout-design.md): Pix Automático
 * (padrão) ou cartão com 3D Secure. Resumo do pedido ao lado (em cima no celular); depois do QR, a tela do Pix.
 */
export function CheckoutPro({ clienteId, periodoInicial }: { clienteId: string; periodoInicial: Periodo }) {
  const router = useRouter();
  const [periodo, setPeriodo] = useState<Periodo>(periodoInicial);
  const [metodo, setMetodo] = useState<Metodo>('pix');
  const [dados, setDados] = useState<Record<CampoComprador, string>>({ nome: '', email: '', celular: '', documento: '' });
  const [cartao, setCartao] = useState<CartaoForm>({ numero: '', nomeCartao: '', validade: '', cvv: '' });
  const [endereco, setEndereco] = useState<EnderecoForm>({ cep: '', rua: '', numero: '', complemento: '', cidade: '', uf: '' });
  const [busca, setBusca] = useState<{ cep: string; achou: boolean } | null>(null);
  const [enderecoAberto, setEnderecoAberto] = useState(false);
  const [erros, setErros] = useState<Erros>({});
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [pix, setPix] = useState<Pix | null>(null);
  const idDados = useId();
  const idPagamento = useId();
  const textos = textosCheckout(periodo, metodo);

  const cep = so(endereco.cep);
  const estadoCep: EstadoCep = cep.length !== 8 ? 'vazio' : busca?.cep !== cep ? 'buscando' : busca.achou ? 'achou' : 'falhou';

  // O antifraude começa no carregamento (quanto antes, mais sinais); falha aqui não impede o Pix.
  useEffect(() => {
    void sdkCakto(clienteId).catch(() => undefined);
  }, [clienteId]);

  // CEP completo: rua, cidade e UF pelo ViaCEP (o número e o complemento ficam com a pessoa).
  useEffect(() => {
    if (cep.length !== 8) return;
    let cancelado = false;
    fetch(`https://viacep.com.br/ws/${cep}/json/`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { logradouro?: string; localidade?: string; uf?: string; erro?: boolean } | null) => {
        if (cancelado) return;
        const achou = Boolean(j && !j.erro && j.localidade);
        if (j && achou) {
          setEndereco((e) => ({ ...e, rua: j.logradouro ?? '', cidade: j.localidade ?? '', uf: j.uf ?? '' }));
          setErros((e) => ({ ...e, cep: undefined, rua: undefined, cidade: undefined, uf: undefined }));
        }
        setBusca({ cep, achou });
      })
      .catch(() => {
        if (!cancelado) setBusca({ cep, achou: false });
      });
    return () => {
      cancelado = true;
    };
  }, [cep]);

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

  function limpar(campo: keyof Erros) {
    setErro(null);
    setErros((e) => (e[campo] ? { ...e, [campo]: undefined } : e));
  }

  function mudarDado(campo: CampoComprador, valor: string) {
    setDados((d) => ({ ...d, [campo]: valor }));
    limpar(campo);
  }

  // Ao sair de um campo já preenchido, o erro dele aparece na hora (campo vazio só reclama no envio).
  function sairDado(campo: CampoComprador) {
    if (!dados[campo].trim()) return;
    const v = validarComprador(dados);
    if (!v.ok && v.erros[campo]) setErros((e) => ({ ...e, [campo]: v.erros[campo] }));
  }

  function valorCartao(c: CampoCartao): string {
    if (c === 'enderecoNumero') return endereco.numero;
    if (c === 'numero' || c === 'nomeCartao' || c === 'validade' || c === 'cvv') return cartao[c];
    return endereco[c];
  }

  function sairCartao(campo: CampoCartao) {
    if (!valorCartao(campo).trim()) return;
    const v = validarCartao(cartao, endereco, new Date());
    if (!v.ok && v.erros[campo]) setErros((e) => ({ ...e, [campo]: v.erros[campo] }));
  }

  async function enviarAoServidor(corpo: Record<string, unknown>) {
    const r = await fetch('/api/assinar', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ periodo, metodo, comprador: dados, ga: await dadosGa4(), ...corpo }),
    });
    const j = (await r.json().catch(() => ({}))) as {
      codigo?: string; estado?: string; qrCode?: string; expiraEm?: string | null; erro?: string; erros?: Partial<Record<CampoComprador, string>>;
    };
    if (!r.ok) {
      setErros(j.erros ?? {});
      if (j.erros && Object.keys(j.erros).length > 0) focarErro();
      throw new Error(j.erro ?? 'Não conseguimos criar a cobrança agora. Tente de novo.');
    }
    return j;
  }

  async function pagar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    const v = validarComprador(dados);
    const c = metodo === 'cartao' ? validarCartao(cartao, endereco, new Date()) : null;
    if (!v.ok || (c && !c.ok)) {
      const doCartao = c && !c.ok ? c.erros : {};
      setErros({ ...(v.ok ? {} : v.erros), ...doCartao });
      if (doCartao.rua || doCartao.cidade || doCartao.uf) setEnderecoAberto(true);
      setErro('Confira os campos marcados.');
      focarErro();
      return;
    }
    setErros({});
    setEnviando(true);
    medir('checkout', { chave: 'dia' });
    try {
      if (metodo === 'pix') {
        const j = await enviarAoServidor({});
        if (!j.codigo || !j.qrCode) throw new Error('A Cakto não devolveu o QR Code. Tente de novo.');
        const imagem = await QRCode.toDataURL(j.qrCode, { width: 464, margin: 1 });
        setPix({ codigo: j.codigo, qrCode: j.qrCode, imagem, expiraEm: j.expiraEm ?? null });
        window.scrollTo({ top: 0 });
        return;
      }
      if (!c?.ok) throw new Error('Confira os dados do cartão.');
      const sdk = await sdkCakto(clienteId);
      const { cardToken } = await sdk.createToken(c.cartao);
      const auth = await sdk.authenticate3DS({
        card: c.cartao,
        customer: {
          amount: periodo === 'anual' ? PRO.centavosAno : PRO.centavosMes, currency: 'BRL', email: v.comprador.email, name: v.comprador.nome,
          phone: v.comprador.celular, paymentMethod: 'credit', address: c.endereco,
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

  function trocarMetodo(m: Metodo) {
    setMetodo(m);
    setErro(null);
  }

  function pagarComCartao() {
    setPix(null);
    trocarMetodo('cartao');
  }

  return (
    <div className="flex flex-col gap-5 text-pretty lg:gap-6">
      <div className="flex flex-col gap-1">
        {pix ? (
          <button type="button" onClick={() => setPix(null)} className={LINK_VOLTAR}>
            <SetaEsquerda className="size-4" />
            Voltar e trocar os dados
          </button>
        ) : (
          <Link href="/planos" prefetch={false} className={LINK_VOLTAR}>
            <SetaEsquerda className="size-4" />
            Voltar aos planos
          </Link>
        )}
        <h1 className="text-balance text-[30px] font-bold leading-[1.1] tracking-[-0.02em] lg:mt-1 lg:text-[40px] lg:tracking-[-0.025em]">
          {pix ? 'Autorize o Pix no app do banco' : 'Assinar o Pro'}
        </h1>
        <p className="text-[15.5px] text-ink-muted lg:text-[17px]">
          {pix ? 'Falta só esse passo. Você autoriza uma vez e as renovações caem sozinhas.' : 'Leva menos de um minuto. Você cancela quando quiser.'}
        </p>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6">
        <ResumoPedido
          periodo={periodo}
          aoEscolher={setPeriodo}
          textos={textos}
          travado={Boolean(pix)}
          className={`${pix ? 'order-last' : ''} lg:sticky lg:top-6 lg:order-2`}
        />
        {pix ? (
          <TelaPix pix={pix} valor={textos.valor} unidade={periodo === 'anual' ? 'ano' : 'mês'} aoPagarComCartao={pagarComCartao} />
        ) : (
          <form onSubmit={pagar} noValidate className={`${CARTAO_CHECKOUT} flex min-w-0 flex-col gap-7 px-4 py-5 lg:gap-9 lg:p-8`}>
            <section aria-labelledby={idDados} className="flex flex-col gap-4 lg:gap-[18px]">
              <h2 id={idDados} className={TITULO_PASSO}>
                <span aria-hidden="true" className={PASSO_AZUL}>
                  1
                </span>
                Seus dados
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:gap-x-4 lg:gap-y-[18px]">
                <Campo
                  rotulo="Nome completo"
                  autoComplete="name"
                  placeholder="Maria da Silva"
                  value={dados.nome}
                  onChange={(e) => mudarDado('nome', e.target.value)}
                  onBlur={() => sairDado('nome')}
                  erro={erros.nome}
                />
                <Campo
                  rotulo="E-mail"
                  type="email"
                  autoComplete="email"
                  placeholder="voce@empresa.com.br"
                  value={dados.email}
                  onChange={(e) => mudarDado('email', e.target.value)}
                  onBlur={() => sairDado('email')}
                  erro={erros.email}
                  dica="É com ele que você entra e recebe os alertas."
                />
                <Campo
                  rotulo="Celular com DDD"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="(11) 98765-4321"
                  value={dados.celular}
                  onChange={(e) => mudarDado('celular', mascaraCelular(e.target.value))}
                  onBlur={() => sairDado('celular')}
                  erro={erros.celular}
                />
                <Campo
                  rotulo="CPF ou CNPJ"
                  inputMode="numeric"
                  placeholder="Só os números"
                  value={dados.documento}
                  onChange={(e) => mudarDado('documento', mascaraDocumento(e.target.value))}
                  onBlur={() => sairDado('documento')}
                  erro={erros.documento}
                />
              </div>
            </section>

            <section aria-labelledby={idPagamento} className="flex flex-col gap-4 lg:gap-[18px]">
              <h2 id={idPagamento} className={TITULO_PASSO}>
                <span aria-hidden="true" className={PASSO_AZUL}>
                  2
                </span>
                Forma de pagamento
              </h2>
              <FormaPagamento metodo={metodo} aoEscolher={trocarMetodo} idTitulo={idPagamento} />
              {metodo === 'pix' ? (
                <PassosPix />
              ) : (
                <CamposCartao
                  cartao={cartao}
                  endereco={endereco}
                  erros={erros}
                  cep={estadoCep}
                  enderecoAberto={enderecoAberto}
                  aoMudarCartao={(campo, valor) => {
                    setCartao((c) => ({ ...c, [campo]: valor }));
                    limpar(campo);
                  }}
                  aoMudarEndereco={(campo, valor) => {
                    setEndereco((e) => ({ ...e, [campo]: valor }));
                    if (campo !== 'complemento') limpar(campo === 'numero' ? 'enderecoNumero' : campo);
                  }}
                  aoSair={sairCartao}
                  aoAbrirEndereco={() => setEnderecoAberto(true)}
                />
              )}
            </section>

            <div className="flex flex-col gap-2.5 lg:gap-3">
              {erro ? (
                <p role="alert" className="rounded-[14px] bg-pin-soft px-3.5 py-3 text-[14px] font-semibold text-pin-strong">
                  {erro}
                </p>
              ) : null}
              <button type="submit" disabled={enviando} className={BOTAO_PAGAR}>
                <IconeCadeado className="size-5" />
                {enviando ? 'Processando…' : textos.botao}
              </button>
              <p className="text-center text-[13px] text-ink-muted">{textos.letraMiuda}</p>
            </div>
          </form>
        )}
        {pix ? null : <Garantias className="flex lg:hidden" />}
      </div>
    </div>
  );
}

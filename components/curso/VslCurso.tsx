'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CAMINHO_CURSO,
  CURSO,
  campanhaDoEndereco,
  linkDoCheckout,
  marcosNovos,
  momentoDaOferta,
  precoDoCurso,
  type VariacaoTitulo,
  variacaoDoTitulo,
} from '@/lib/cursoLicitacao';
import { ID_GA4 } from '@/lib/medicao';

const CHAVE_CAMPANHA = 'em_curso_campanha';
const CHAVE_OFERTA = 'em_curso_oferta';

/** Eventos da VSL: GA4 (quando configurado) e Pixel da Meta (carregado por components/TagGoogle.tsx, com o mesmo consentimento). */
const META: Record<string, [string, string]> = {
  vsl_start: ['trackCustom', 'VSL_Inicio'],
  vsl_progress_25: ['trackCustom', 'VSL_25'],
  vsl_progress_50: ['trackCustom', 'VSL_50'],
  vsl_progress_75: ['trackCustom', 'VSL_75'],
  vsl_progress_90: ['trackCustom', 'VSL_90'],
  vsl_complete: ['trackCustom', 'VSL_Completo'],
  offer_view: ['track', 'ViewContent'],
  begin_checkout: ['track', 'InitiateCheckout'],
};

function lerSessao(chave: string): string | null {
  try {
    return window.sessionStorage.getItem(chave);
  } catch {
    return null;
  }
}
function gravarSessao(chave: string, valor: string): void {
  try {
    window.sessionStorage.setItem(chave, valor);
  } catch {
    // sem armazenamento: segue sem lembrar
  }
}

const IconeSom = ({ ligado }: { ligado: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="size-[18px]" aria-hidden="true">
    <path d="M11 5 6 9H2v6h4l5 4V5z" />
    {ligado ? <path d="M15.5 8.5a5 5 0 0 1 0 7" /> : <path d="m22 9-6 6M16 9l6 6" />}
  </svg>
);

const TITULOS: Record<VariacaoTitulo, React.ReactNode> = {
  A: (
    <>
      Aprenda a <em>vender para o governo</em>, mesmo sendo uma empresa pequena.
    </>
  ),
  B: (
    <>
      Prefeituras, escolas e hospitais compram todos os dias. <em>Sua empresa</em> pode ser uma das fornecedoras.
    </>
  ),
  C: (
    <>
      Você sabia que o governo <em>compra de MEI</em> e de pequenas empresas?
    </>
  ),
};

export function VslCurso() {
  const { video, oferta } = CURSO;
  const temVideo = !!video.src;
  const vertical = video.proporcao === '9/16';
  const preco = precoDoCurso(CURSO.precoCentavos);

  const [variacao, setVariacao] = useState<VariacaoTitulo>('A');
  const [checkout, setCheckout] = useState<string>(CURSO.checkoutUrl);
  const [ofertaVisivel, setOfertaVisivel] = useState(false);
  const [mudo, setMudo] = useState(true);
  const [avisoSom, setAvisoSom] = useState(true);
  const [pausado, setPausado] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const barraRef = useRef<HTMLSpanElement>(null);
  const caixaRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const disparados = useRef(new Set<string>());
  const marcos = useRef(new Set<number>());
  const deuSinal = useRef(false);
  const liberada = useRef(false);

  const evento = useCallback((nome: string, extra: Record<string, string | number> = {}, umaVez = true) => {
    if (umaVez) {
      if (disparados.current.has(nome)) return;
      disparados.current.add(nome);
    }
    const params = { pagina_origem: CAMINHO_CURSO, variacao: document.documentElement.dataset.titulo ?? 'A', ...extra };
    try {
      if (ID_GA4) window.gtag?.('event', nome, { ...params, send_to: ID_GA4 });
    } catch {
      // medição é secundária
    }
    const m = META[nome];
    try {
      if (m) {
        const valor = CURSO.precoCentavos !== null && (nome === 'offer_view' || nome === 'begin_checkout');
        window.fbq?.(m[0], m[1], valor ? { content_name: CURSO.nome, value: CURSO.precoCentavos! / 100, currency: 'BRL' } : {});
      }
    } catch {
      // idem
    }
  }, []);

  const liberarOferta = useCallback(
    (motivo: string) => {
      if (liberada.current) return;
      liberada.current = true;
      if (lerSessao(CHAVE_OFERTA) !== '1') {
        gravarSessao(CHAVE_OFERTA, '1');
        evento('offer_view', { motivo });
      }
      setOfertaVisivel(true);
    },
    [evento],
  );

  // Endereço: variação do título, campanha guardada na sessão, oferta já vista nesta sessão.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const v = variacaoDoTitulo(q.get('h'));
    document.documentElement.dataset.titulo = v;
    setVariacao(v);

    let campanha: Record<string, string> = {};
    try {
      campanha = JSON.parse(lerSessao(CHAVE_CAMPANHA) ?? '{}') as Record<string, string>;
    } catch {
      campanha = {};
    }
    const nova = campanhaDoEndereco(q);
    if (Object.keys(nova).length) {
      campanha = nova;
      gravarSessao(CHAVE_CAMPANHA, JSON.stringify(campanha));
    }
    setCheckout(linkDoCheckout(CURSO.checkoutUrl, campanha));

    if (q.has('oferta') || lerSessao(CHAVE_OFERTA) === '1') {
      liberada.current = true;
      setOfertaVisivel(true);
    }
    if (!temVideo) liberarOferta('sem_video');
    return () => {
      delete document.documentElement.dataset.titulo;
    };
  }, [liberarOferta, temVideo]);

  // Vídeo: começa sem som, com o aviso para ativar. Um player que nunca dá sinal não segura a oferta.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    const tentativa = v.play();
    tentativa?.catch(() => setPausado(true));
    const espera = window.setTimeout(() => {
      if (!deuSinal.current) liberarOferta('sem_sinal_player');
    }, oferta.esperaPlayerSeg * 1000);
    return () => window.clearTimeout(espera);
  }, [liberarOferta, oferta.esperaPlayerSeg]);

  const aoTempo = () => {
    const v = videoRef.current;
    if (!v) return;
    deuSinal.current = true;
    const d = v.duration || 0;
    if (barraRef.current && d) barraRef.current.style.width = `${(v.currentTime / d) * 100}%`;
    if (v.muted) return; // só conta quem está assistindo com som
    if (v.currentTime > 0) evento('vsl_start');
    for (const m of marcosNovos(v.currentTime, d, marcos.current)) {
      marcos.current.add(m);
      evento(`vsl_progress_${m}`, { percent: m });
    }
    const momento = momentoDaOferta(d, oferta.antesDoFimSeg);
    if (momento !== null && v.currentTime >= momento) liberarOferta('video');
  };

  const ativarSom = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    v.currentTime = 0;
    void v.play().catch(() => setPausado(true));
    setMudo(false);
    setAvisoSom(false);
  };

  const alternarSom = () => {
    const v = videoRef.current;
    if (!v) return;
    if (avisoSom) return ativarSom();
    v.muted = !v.muted;
    setMudo(v.muted);
  };

  const tocarOuPausar = () => {
    const v = videoRef.current;
    if (!v) return;
    if (avisoSom) return ativarSom();
    if (v.paused) void v.play().catch(() => setPausado(true));
    else v.pause();
  };

  // Sem barra do celular nesta página; com a oferta, a altura dela vira o espaço de baixo (o aviso de cookies sobe junto)
  // e a página rola o mínimo para o botão não cobrir o vídeo.
  useEffect(() => {
    const raiz = document.documentElement;
    if (!ofertaVisivel || !popRef.current) {
      raiz.style.setProperty('--altura-barra', '0px');
      return () => raiz.style.removeProperty('--altura-barra');
    }
    const pop = popRef.current;
    const ajustar = () => {
      const h = pop.offsetHeight + 12;
      raiz.style.setProperty('--altura-barra', `${h}px`);
      const caixa = caixaRef.current?.getBoundingClientRect();
      const limite = window.innerHeight - h;
      if (caixa && caixa.bottom > limite && caixa.top > 8) {
        const reduzMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollBy({ top: Math.min(caixa.bottom - limite + 8, caixa.top - 8), behavior: reduzMovimento ? 'auto' : 'smooth' });
      }
    };
    const quadro = requestAnimationFrame(ajustar);
    return () => {
      cancelAnimationFrame(quadro);
      raiz.style.removeProperty('--altura-barra');
    };
  }, [ofertaVisivel]);

  const aoComprar = (e: React.MouseEvent<HTMLAnchorElement>) => {
    evento('checkout_click', { botao: 'video' }, false);
    evento('begin_checkout', { botao: 'video' });
    if (!checkout) {
      e.preventDefault();
      window.alert('Prévia: o link do checkout do curso ainda não foi configurado (CURSO.checkoutUrl em lib/cursoLicitacao.ts).');
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-ink text-surface">
      {/* Página-vídeo: fundo escuro até embaixo; o aviso de cookies acompanha a altura da oferta também no computador. */}
      <style>{`
        body{background:var(--color-ink)}
        [role="dialog"][aria-label="Cookies"]{bottom:calc(var(--altura-barra,0px) + 10px)!important}
        @keyframes vsl-subir{from{transform:translateY(110%)}to{transform:none}}
        .vsl-titulo em{font-style:normal;color:#ff936b;white-space:nowrap}
      `}</style>

      <p className="bg-[#081a31] px-4 py-2 text-center text-[12.5px] font-semibold leading-snug sm:text-[14px]">
        Curso online para quem quer começar a vender para o governo.
      </p>

      <main className="w-full flex-1 px-4 pb-8 sm:px-5">
        <header className="flex justify-center pt-4 sm:pt-6">
          <span className="inline-flex items-center gap-2.5">
            <svg viewBox="0 0 22 28" className="h-8 w-[25px] sm:h-9 sm:w-[28px]" aria-hidden="true">
              <path d="M11 0C4.9 0 0 4.9 0 11c0 8.3 11 17 11 17s11-8.7 11-17C22 4.9 17.1 0 11 0z" fill="#ff5a1f" />
              <path d="M15 0v6h6" fill="#b33a0e" />
              <circle cx="11" cy="11" r="3.5" fill="#f4f1e8" />
            </svg>
            <span className="text-left">
              <span className="block text-[17px] font-bold leading-none tracking-[-0.02em] sm:text-[19px]">edital map</span>
              <span className="mt-1 block font-mono text-[10px] font-medium uppercase leading-none tracking-[0.1em] text-surface/65 sm:text-[11px]">
                {CURSO.assinatura}
              </span>
            </span>
          </span>
        </header>

        <section className="mx-auto max-w-[1040px] pt-3 text-center sm:pt-4">
          <h1 className="vsl-titulo mx-auto mt-2 max-w-[900px] text-balance text-[clamp(1.55rem,7vw,3.05rem)] font-bold leading-[1.08] tracking-[-0.03em]">
            {TITULOS[variacao]}
          </h1>
          <p className="mx-auto mt-3 max-w-[640px] text-[clamp(0.98rem,2.6vw,1.2rem)] leading-[1.5] text-surface/90 sm:mt-4">
            Entenda como funciona uma licitação, onde encontrar as oportunidades do seu ramo, quais documentos separar e como montar o preço da proposta, começando do zero.
          </p>

          <div className={`mx-auto mt-5 w-full sm:mt-7 ${vertical ? 'max-w-[420px]' : 'max-w-[880px]'}`}>
            <div
              ref={caixaRef}
              className="relative overflow-hidden rounded-[12px] bg-[#081a31] shadow-[0_24px_50px_-20px_rgba(0,0,0,.6)] ring-1 ring-surface/10"
              style={{ aspectRatio: video.proporcao }}
            >
              {temVideo ? (
                <>
                  <video
                    ref={videoRef}
                    src={video.src}
                    poster={video.capa || undefined}
                    preload="auto"
                    playsInline
                    muted
                    autoPlay
                    onClick={tocarOuPausar}
                    onTimeUpdate={aoTempo}
                    onLoadedMetadata={() => (deuSinal.current = true)}
                    onPlay={() => setPausado(false)}
                    onPause={(e) => setPausado(!e.currentTarget.ended)}
                    onEnded={() => {
                      evento('vsl_complete');
                      liberarOferta('fim');
                    }}
                    onError={() => liberarOferta('erro_video')}
                    className="absolute inset-0 size-full bg-black object-cover"
                  />
                  <span ref={barraRef} className="pointer-events-none absolute bottom-0 left-0 h-1 w-0 bg-pin" />
                  {pausado && !avisoSom ? (
                    <span className="pointer-events-none absolute inset-0 grid place-items-center bg-ink/50 text-[16px] font-bold">Toque para continuar</span>
                  ) : null}
                  {avisoSom ? (
                    <button
                      type="button"
                      onClick={ativarSom}
                      className="absolute left-1/2 top-1/2 z-[2] inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-surface px-4 py-3 text-[15px] font-bold text-ink shadow-[0_6px_18px_rgba(0,0,0,.25)] sm:px-5 sm:py-3.5 sm:text-[16px]"
                    >
                      <IconeSom ligado={false} />
                      Toque para ativar o som
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={alternarSom}
                    aria-label={mudo ? 'Ativar o som' : 'Desativar o som'}
                    className="absolute right-2 top-2 z-[2] inline-flex items-center gap-2 rounded-full bg-surface px-3 py-2 text-[12.5px] font-bold text-ink shadow-[0_6px_18px_rgba(0,0,0,.25)] sm:right-3 sm:top-3 sm:px-3.5 sm:py-2.5 sm:text-[13.5px]"
                  >
                    <IconeSom ligado={!mudo} />
                    {mudo ? 'Som desligado' : 'Som'}
                  </button>
                </>
              ) : (
                <div className="absolute inset-0 grid place-items-center">
                  <svg viewBox="0 0 90 160" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden="true">
                    <circle cx="80" cy="140" r="52" fill="#0c2340" />
                    <circle cx="8" cy="16" r="30" fill="#0c2340" />
                  </svg>
                  <span className="relative grid size-[72px] place-items-center rounded-full bg-surface shadow-[0_10px_30px_rgba(0,0,0,.25)]">
                    <span className="ml-1.5 border-y-[13px] border-l-[21px] border-y-transparent border-l-ink" />
                  </span>
                  <span className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink/85 px-3 py-2 text-[13px] font-bold">
                    Vídeo em breve
                  </span>
                </div>
              )}
            </div>
            <p className="mt-3 flex items-center justify-center gap-2 text-[13.5px] text-surface/70">
              <IconeSom ligado />
              Ative o som para assistir.
            </p>
          </div>
        </section>
      </main>

      {ofertaVisivel ? (
        <div ref={popRef} role="region" aria-label="Comprar o curso" className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-[560px] rounded-[18px] bg-surface p-4 pb-3 text-center text-ink shadow-[0_-8px_40px_rgba(0,0,0,.35)] motion-safe:animate-[vsl-subir_.6s_cubic-bezier(.2,.8,.2,1)_both]">
            <a
              href={checkout || '#'}
              onClick={aoComprar}
              className="flex min-h-[60px] w-full items-center justify-center rounded-[12px] bg-pin px-6 py-4 text-[clamp(1rem,3.6vw,1.15rem)] font-bold uppercase tracking-[0.02em] text-ink shadow-[0_5px_0_#b33a0e,0_14px_26px_-12px_rgba(12,35,64,.6)] transition-transform hover:-translate-y-px active:translate-y-[3px] active:shadow-[0_2px_0_#b33a0e]"
            >
              Quero entrar no curso
            </a>
            <p className="mt-3 text-[14px]">
              {preco ? (
                <>
                  <b className="font-bold">{preco}</b> · pagamento único
                </>
              ) : (
                'Acesso imediato depois da compra'
              )}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

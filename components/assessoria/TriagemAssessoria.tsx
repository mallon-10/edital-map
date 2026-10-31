'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { PRECO_ASSESSORIA, type EditalAssessoria } from '@/lib/assessoria';
import { rastrear } from '@/lib/cliente/rastrear';
import { registrar } from '@/lib/cliente/registrar';
import { avisoDaTriagem, linkTriagem, perguntasDaTriagem, resultadoDaTriagem, type IdPergunta, type RespostasTriagem } from '@/lib/triagem';

const CARTAO = 'flex flex-col gap-4 rounded-[22px] bg-raised p-5 lg:p-6';
const TITULO = 'text-balance text-[21px] font-bold leading-snug outline-none';
const PRINCIPAL = 'inline-flex min-h-12 w-full items-center justify-center rounded-full bg-pin px-5 py-2.5 text-center text-[15px] font-semibold leading-snug text-on-pin';
const WHATSAPP = 'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-mata px-5 py-2.5 text-center text-[15px] font-semibold leading-snug text-raised hover:brightness-110';
const SECUNDARIO = 'inline-flex min-h-12 w-full items-center justify-center rounded-full border border-line-strong bg-raised px-5 py-2.5 text-center text-[15px] font-semibold leading-snug hover:bg-sunken';
const REFAZER = 'inline-flex min-h-11 items-center justify-center self-center text-[14px] font-semibold text-ink-muted underline-offset-2 hover:text-ink hover:underline';
/** Sem número configurado (ou inválido), a pessoa ainda tem como falar com a gente. */
const CONTATO = 'mailto:mallon@escalav.com.br?subject=Assessoria%20Edital%20Map';

const origemDa = (edital: EditalAssessoria | null) => (edital ? 'edital' : 'assessoria');

/** Abre o WhatsApp com a mensagem pronta; sem o número, o e-mail. O clique conta como pedido no painel do dono (quer_recurso). */
function BotaoConversa({ respostas, numero, edital, children }: { respostas: RespostasTriagem; numero: string | null; edital: EditalAssessoria | null; children: string }) {
  if (!numero) {
    return (
      <a href={CONTATO} className={WHATSAPP}>
        Escrever para a gente
      </a>
    );
  }
  const medir = () => {
    registrar('quer_recurso', edital ? { recurso: 'assessoria', edital: edital.slug } : { recurso: 'assessoria_inicio' });
    rastrear('assessoria_whatsapp_clicked', { origem: origemDa(edital), resultado: resultadoDaTriagem(respostas), edital: edital?.slug });
  };
  return (
    <a
      href={linkTriagem(numero, respostas, edital)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={medir}
      onAuxClick={(e) => {
        if (e.button === 1) medir();
      }}
      className={WHATSAPP}
    >
      {/* Logo do WhatsApp (Simple Icons). */}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="shrink-0">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
      </svg>
      {children}
    </a>
  );
}

type Resultado = { respostas: RespostasTriagem; numero: string | null; edital: EditalAssessoria | null; aoRefazer: () => void };

/** O fim da triagem muda conforme as respostas: o serviço, a busca grátis e o Pro, ou o esclarecimento do limite. */
export function ResultadoAssessoria({ respostas, numero, edital, aoRefazer }: Resultado) {
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => titulo.current?.focus(), []);
  const resultado = resultadoDaTriagem(respostas);
  const aviso = avisoDaTriagem(respostas);
  const refazer = (
    <button type="button" onClick={aoRefazer} className={REFAZER}>
      Refazer as perguntas
    </button>
  );
  if (resultado === 'buscar') {
    return (
      <section aria-labelledby="resultado-triagem" className={CARTAO}>
        <h2 id="resultado-triagem" ref={titulo} tabIndex={-1} className={TITULO}>O primeiro passo é encontrar o edital certo</h2>
        <p className="text-pretty text-[15px] text-ink-muted">
          A assessoria trabalha em cima de um edital. Pesquise de graça e, quando achar uma licitação, volte pela página dela. Para receber os novos editais do seu segmento por e-mail, conheça o Pro.
        </p>
        <Link href="/" prefetch={false} className={PRINCIPAL}>Pesquisar editais grátis</Link>
        <Link href="/planos" prefetch={false} className={SECUNDARIO}>Conhecer o Pro</Link>
        <Link href="/guias" prefetch={false} className={SECUNDARIO}>Ler os guias de licitação</Link>
        {refazer}
      </section>
    );
  }
  if (resultado === 'terceirizacao') {
    return (
      <section aria-labelledby="resultado-triagem" className={CARTAO}>
        <h2 id="resultado-triagem" ref={titulo} tabIndex={-1} className={TITULO}>Nosso serviço é de orientação e preparação</h2>
        <p className="text-pretty text-[15px] text-ink-muted">
          Não executamos a licitação pela sua empresa: não enviamos proposta nem representamos ninguém em sessões públicas. Se quiser, fale com a gente para esclarecer o que podemos fazer.
        </p>
        <BotaoConversa respostas={respostas} numero={numero} edital={edital}>Esclarecer pelo WhatsApp</BotaoConversa>
        {refazer}
      </section>
    );
  }
  return (
    <section aria-labelledby="resultado-triagem" className={CARTAO}>
      <h2 id="resultado-triagem" ref={titulo} tabIndex={-1} className={TITULO}>A assessoria combina com o que você procura</h2>
      <p className="text-pretty text-[15px] text-ink-muted">
        Assessoria Edital Map, a partir de {PRECO_ASSESSORIA}. Escopo e preço definitivo são confirmados antes de você contratar, conforme o edital e o prazo.
      </p>
      {aviso ? <p role="note" className="text-pretty rounded-[14px] bg-pin-soft px-4 py-3 text-[14px] text-pin-strong">{aviso}</p> : null}
      <BotaoConversa respostas={respostas} numero={numero} edital={edital}>Falar no WhatsApp</BotaoConversa>
      <p className="text-[13px] text-ink-muted">Abrimos a conversa com as suas respostas{edital ? ' e o link do edital' : ''}. Você revisa antes de enviar.</p>
      {refazer}
    </section>
  );
}

/** Triagem antes do WhatsApp: uma pergunta por vez, um toque em cada, sem nenhum dado pessoal. */
export function TriagemAssessoria({ numero, edital }: { numero: string | null; edital: EditalAssessoria | null }) {
  const perguntas = perguntasDaTriagem(Boolean(edital));
  const inicio: Partial<RespostasTriagem> = edital ? { licitacao: 'encontrei' } : {};
  const [respostas, setRespostas] = useState(inicio);
  const [passo, setPasso] = useState(0);
  const comecou = useRef(false);
  const titulo = useRef<HTMLHeadingElement>(null);
  const origem = origemDa(edital);
  const fim = passo >= perguntas.length;
  const atual = perguntas[passo];

  useEffect(() => {
    if (passo > 0 && !fim) titulo.current?.focus();
  }, [passo, fim]);

  function escolher(id: IdPergunta, valor: string) {
    if (!comecou.current) {
      comecou.current = true;
      rastrear('assessoria_qualification_started', { origem, edital: edital?.slug });
    }
    const novas = { ...respostas, [id]: valor };
    setRespostas(novas);
    setPasso(passo + 1);
    if (passo + 1 >= perguntas.length) {
      rastrear('assessoria_qualification_completed', { origem, edital: edital?.slug, resultado: resultadoDaTriagem(novas as RespostasTriagem) });
    }
  }

  if (fim) {
    return (
      <ResultadoAssessoria
        respostas={respostas as RespostasTriagem}
        numero={numero}
        edital={edital}
        aoRefazer={() => {
          setRespostas(inicio);
          setPasso(0);
        }}
      />
    );
  }
  return (
    <section aria-labelledby="pergunta-triagem" className={CARTAO}>
      <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted lg:text-xs">
        Pergunta {passo + 1} de {perguntas.length}
      </p>
      {edital ? (
        <p className="rounded-[14px] bg-surface px-4 py-3 text-[14px]">
          <span className="block text-[12.5px] text-ink-muted">Edital desta solicitação</span>
          <span className="font-semibold">{edital.titulo}</span>
        </p>
      ) : null}
      <h2 id="pergunta-triagem" ref={titulo} tabIndex={-1} className={TITULO}>{atual.pergunta}</h2>
      <div role="group" aria-labelledby="pergunta-triagem" className="flex flex-col gap-2">
        {atual.opcoes.map((o) => (
          <button key={o.valor} type="button" onClick={() => escolher(atual.id, o.valor)} className="min-h-[52px] rounded-[16px] border border-line-strong bg-raised px-4 py-2.5 text-left text-[15px] font-semibold leading-snug hover:bg-sunken">
            {o.rotulo}
          </button>
        ))}
      </div>
      {passo > 0 ? (
        <button type="button" onClick={() => setPasso(passo - 1)} className={REFAZER}>
          Voltar
        </button>
      ) : null}
    </section>
  );
}

'use client';

import { registrar } from '@/lib/cliente/registrar';

// Curtos para caber numa linha na coluna da direita (~290 px de texto).
const ITENS = ['Resumo em linguagem simples', 'Documentos exigidos', 'Passo a passo para participar'];

type Props = { href: string; slug: string; id: string; className?: string };

const medirClique = (slug: string) => registrar('quer_recurso', { recurso: 'assessoria', edital: slug });

/** Botão verde do cartão do topo do edital: a assessoria visível sem rolar (o cartão grande fica mais abaixo). */
export function BotaoAssessoria({ href, slug }: { href: string; slug: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => medirClique(slug)}
      onAuxClick={(e) => {
        if (e.button === 1) medirClique(slug);
      }}
      className="inline-flex h-12 items-center gap-2 rounded-full bg-mata px-5 text-[15px] font-semibold text-raised hover:brightness-110"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
        <path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5z" />
      </svg>
      Quero ajuda para participar
    </a>
  );
}

/** "Quer participar desta licitação?": abre o WhatsApp do João com a mensagem pronta (spec 2026-10-21-assessoria-whatsapp). */
export function CartaoAssessoria({ href, slug, id, className = '' }: Props) {
  const medir = () => medirClique(slug);
  return (
    <section aria-labelledby={id} className={`flex-col gap-4 rounded-[22px] bg-mata-soft p-5 lg:p-6 ${className}`}>
      <p className="inline-flex h-[26px] items-center self-start rounded-full bg-raised px-2.5 text-xs font-semibold text-mata">
        Assessoria Edital Map
      </p>
      <div className="flex flex-col gap-2">
        <h2 id={id} className="text-balance text-[20px] font-bold leading-tight">Quer participar desta licitação?</h2>
        <p className="text-pretty text-[15px] leading-relaxed text-ink-muted">
          Não sabe por onde começar? A gente analisa o edital e prepara um passo a passo para a sua empresa.
        </p>
      </div>
      <ul className="flex flex-col gap-2 text-[15px] leading-snug">
        {ITENS.map((item) => (
          <li key={item} className="flex items-start gap-2.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-px shrink-0 text-mata">
              <circle cx="12" cy="12" r="9" />
              <path d="m8.5 12 2.5 2.5 4.5-5" />
            </svg>
            <span className="min-w-0 text-pretty">{item}</span>
          </li>
        ))}
      </ul>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={medir}
        onAuxClick={(e) => {
          if (e.button === 1) medir();
        }}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-mata px-5 py-2.5 text-center text-[15px] font-semibold leading-snug text-raised hover:brightness-110"
      >
        Receber orientação
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="shrink-0">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </a>
      <p className="text-pretty text-[13px] leading-relaxed text-ink-muted">Serviço pago, com o valor combinado antes. Atendimento pelo WhatsApp, conforme o prazo e o escopo do edital.</p>
    </section>
  );
}

'use client';

import { registrar } from '@/lib/cliente/registrar';

// Curtos para caber numa linha na coluna da direita (~290 px de texto).
const ITENS = ['Resumo em linguagem simples', 'Documentos exigidos', 'Passo a passo para participar'];

type Props = {
  href: string;
  /** Slug do edital; sem ele (página inicial) o clique conta como assessoria_inicio. */
  edital?: string;
  id: string;
  titulo?: string;
  texto?: string;
  className?: string;
};

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
      {/* Logo do WhatsApp (Simple Icons). */}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="shrink-0">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
      </svg>
      Quero ajuda para participar
    </a>
  );
}

/** "Quer participar desta licitação?": abre o WhatsApp do João com a mensagem pronta (spec 2026-10-21-assessoria-whatsapp). */
export function CartaoAssessoria({
  href,
  edital,
  id,
  titulo = 'Quer participar desta licitação?',
  texto = 'Não sabe por onde começar? A gente analisa o edital e prepara um passo a passo para a sua empresa.',
  className = '',
}: Props) {
  const medir = () => (edital ? medirClique(edital) : registrar('quer_recurso', { recurso: 'assessoria_inicio' }));
  return (
    <section aria-labelledby={id} className={`flex-col gap-4 rounded-[22px] bg-mata-soft p-5 lg:p-6 ${className}`}>
      <p className="inline-flex h-[26px] items-center self-start rounded-full bg-raised px-2.5 text-xs font-semibold text-mata">
        Assessoria Edital Map
      </p>
      <div className="flex flex-col gap-2">
        <h2 id={id} className="text-balance text-[20px] font-bold leading-tight">{titulo}</h2>
        <p className="text-pretty text-[15px] leading-relaxed text-ink-muted">{texto}</p>
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

import { PinoMini } from '@/components/inicio/Icones';

type EditalExemplo = { prazo: string; urgente: boolean; titulo: string; orgao: string; valor: string };

/** Editais de exemplo, sem órgão nem cidade de verdade: o desenho é ilustrativo e diz isso na tela. */
const EXEMPLOS: readonly EditalExemplo[] = [
  {
    prazo: 'Encerra em 3 dias',
    urgente: true,
    titulo: 'Aquisição de uniformes escolares para a rede municipal de ensino',
    orgao: 'Prefeitura Municipal · interior de SP',
    valor: 'R$ 412.380,00',
  },
  {
    prazo: 'Propostas até 06/11 às 10:00',
    urgente: false,
    titulo: 'Registro de preços de camisetas e agasalhos',
    orgao: 'Secretaria de Educação · região metropolitana de SP',
    valor: 'R$ 96.500,00',
  },
];

/**
 * O e-mail dos alertas desenhado (mesmas pílulas de prazo, valor em mono e "Ver edital" de lib/alertas/email.ts), com o
 * selo e a legenda "Exemplo ilustrativo". Para o leitor de tela, uma imagem com descrição.
 */
export function EmailIlustrativo() {
  return (
    <figure aria-labelledby="legenda-email" className="mx-3 mb-3 mt-0 flex flex-col justify-center gap-2.5 rounded-[20px] bg-surface px-4 py-5 lg:m-3 lg:flex-[1_1_48%] lg:rounded-[22px] lg:p-8">
      <span aria-hidden="true" className="self-start rounded-full bg-ink px-2.5 py-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] text-surface">
        Exemplo ilustrativo
      </span>
      <div
        role="img"
        aria-label="Exemplo ilustrativo de um e-mail de alerta do Edital Map com editais de uniformes escolares"
        className="overflow-hidden rounded-[20px] bg-raised shadow-[0_1px_2px_rgba(12,35,64,.05),0_14px_36px_rgba(12,35,64,.09)]"
      >
        <div aria-hidden="true" className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2.5 border-b border-line px-4 py-3.5 text-[13px]">
          <span className="row-span-2 flex size-[34px] items-center justify-center rounded-full bg-pin-soft">
            <PinoMini className="h-[18px] w-[14px]" />
          </span>
          <span className="font-semibold">Edital Map · Alertas</span>
          <span className="font-mono text-[12px] text-ink-muted">07:07</span>
          <span className="col-span-2 truncate text-ink-muted">4 editais novos para &quot;Uniformes escolares&quot;</span>
        </div>
        <div aria-hidden="true" className="flex flex-col gap-2.5 p-4">
          <div>
            <p className="text-[18px] font-bold leading-tight">Uniformes escolares</p>
            <p className="font-mono text-[12px] font-bold text-pin-strong">4 editais novos</p>
          </div>
          {EXEMPLOS.map((e) => (
            <div key={e.titulo} className="rounded-2xl bg-surface px-3.5 py-3">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${
                  e.urgente ? 'bg-pin-soft text-pin-strong' : 'bg-ouro-soft text-ouro-strong'
                }`}
              >
                <span className={`size-[7px] rounded-full ${e.urgente ? 'bg-pin' : 'bg-ouro'}`} />
                {e.prazo}
              </span>
              <p className="mt-1.5 text-[14.5px] font-bold leading-snug">{e.titulo}</p>
              <p className="mt-0.5 text-[12.5px] text-ink-muted">{e.orgao}</p>
              <div className="mt-2 flex items-end justify-between gap-2">
                <span className="font-mono text-[14px] font-semibold">{e.valor}</span>
                <span className="whitespace-nowrap rounded-full bg-pin px-3 py-1.5 text-[12px] font-semibold text-on-pin">Ver edital</span>
              </div>
            </div>
          ))}
          <p className="text-[12px] text-ink-muted">+ 2 editais no e-mail completo</p>
        </div>
      </div>
      <figcaption id="legenda-email" className="text-[12.5px] text-ink-muted">
        Exemplo ilustrativo. No e-mail real, os editais vêm do PNCP e seguem os filtros do seu alerta.
      </figcaption>
    </figure>
  );
}

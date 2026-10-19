import Link from 'next/link';
import { linksDaInicio } from '@/lib/seo/marca';
import type { CidadePagina } from '@/lib/seo/municipios';

/**
 * Texto da página inicial para quem chega e para o Google: o que é o Edital Map e os links para as páginas de
 * licitações por assunto, estado e cidade (não contam busca).
 */
export function SobreInicio({ cidades }: { cidades: readonly CidadePagina[] }) {
  const l = linksDaInicio(cidades);
  const grupos = [
    { id: 'por-assunto', titulo: 'Licitações por assunto', links: l.assuntos },
    { id: 'por-estado', titulo: 'Licitações por estado', links: l.estados },
    { id: 'por-cidade', titulo: 'Cidades com mais licitações', links: l.cidades },
  ].filter((g) => g.links.length > 0);
  return (
    <section aria-labelledby="sobre-inicio" className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 border-t border-line px-4 py-8 md:px-6">
      <div className="flex max-w-[78ch] flex-col gap-3">
        <h2 id="sobre-inicio" className="text-xl font-bold text-ink">Edital Map: licitações abertas no Brasil, no mapa</h2>
        <p className="text-[15px] text-ink-muted">
          O Edital Map (editalmap.com.br) reúne num mapa os editais abertos de todo o Brasil publicados no PNCP, o Portal
          Nacional de Contratações Públicas: pregão eletrônico, concorrência, dispensa e credenciamento, atualizados a cada
          3 horas. Digite o que sua empresa vende ou o CNPJ e veja as licitações de hoje, com prazo, valor estimado e órgão
          comprador, e receba os editais novos por e-mail com os Alertas.
        </p>
        <p className="text-[15px] text-ink-muted">
          Para participar, leia o edital oficial e envie a proposta pelo sistema indicado nele.{' '}
          <Link href="/licitacoes" prefetch={false} className="font-semibold text-ink underline">Veja como funciona</Link>.
        </p>
      </div>
      {grupos.map((g) => (
        <nav key={g.id} aria-labelledby={g.id} className="flex flex-col gap-3">
          <h3 id={g.id} className="text-base font-bold text-ink">{g.titulo}</h3>
          <ul className="flex flex-wrap gap-2">
            {g.links.map((x) => (
              <li key={x.caminho}>
                <Link
                  href={x.caminho}
                  prefetch={false}
                  className="inline-flex rounded-sm border border-line bg-raised px-3 py-1.5 text-[13px] text-ink hover:bg-sunken"
                >
                  {x.nome}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ))}
    </section>
  );
}

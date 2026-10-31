import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
import { DadosEstruturados, Migalhas } from '@/components/guias/TextoComLinks';
import { moedaCurta, numero } from '@/lib/formato';
import { dataPorExtenso, type Panorama, porcento, respostaDoPanorama } from '@/lib/panorama';
import { jsonLdMigalhas } from '@/lib/seo/textos';
import { OPEN_GRAPH_BASE, url } from '@/lib/seo/site';
import { atualizadoEm } from '@/lib/servidor/consultas';
import { dadosDoPanorama } from '@/lib/servidor/panorama';

const TITULO = 'Panorama das licitações abertas no Brasil';
const DESCRICAO = 'Quantas licitações estão abertas no Brasil hoje: números do PNCP por estado, modalidade e assunto, com valor mediano e metodologia.';
const MIGALHAS = [{ nome: 'Início', caminho: '/' }, { nome: 'Licitações', caminho: '/licitacoes' }, { nome: 'Panorama', caminho: '/panorama' }];

export const metadata: Metadata = {
  title: { absolute: `${TITULO} · Edital Map` },
  description: DESCRICAO,
  alternates: { canonical: '/panorama' },
  openGraph: { ...OPEN_GRAPH_BASE, title: TITULO, description: DESCRICAO, url: '/panorama' },
};

const CELULA = 'border-t border-line px-3 py-2 text-[15px]';
const TITULO_COLUNA = 'px-3 py-2 text-left text-[13px] font-semibold text-ink-muted';
const NUMERO = 'text-right tabular-nums';
const LINK = 'font-semibold text-ink underline decoration-pin decoration-2 underline-offset-2';

function jsonLd(p: Panorama, data: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: TITULO,
    description: DESCRICAO,
    url: url('/panorama'),
    inLanguage: 'pt-BR',
    dateModified: data,
    isAccessibleForFree: true,
    spatialCoverage: { '@type': 'Country', name: 'Brasil' },
    creator: { '@id': url('/#organizacao') },
    isBasedOn: 'https://pncp.gov.br/',
    variableMeasured: ['Editais abertos', 'Editais abertos por estado', 'Editais abertos por modalidade', 'Valor estimado mediano'],
  };
}

function Destaque({ valor, texto }: { valor: string; texto: string }) {
  return (
    <div className="rounded-[22px] bg-raised p-5">
      <p className="text-[26px] font-bold leading-tight">{valor}</p>
      <p className="mt-1 text-[14px] text-ink-muted">{texto}</p>
    </div>
  );
}

/** Números próprios, para quem pergunta (gente e assistentes de IA). Tudo em tabela de verdade, sem gráfico por cima. */
export default async function PaginaPanorama() {
  await connection();
  const [p, atualizado] = await Promise.all([dadosDoPanorama(), atualizadoEm()]);
  const data = atualizado ?? new Date().toISOString();
  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex w-full max-w-[860px] flex-col gap-8 px-4 pb-28 pt-6 text-ink md:px-6 lg:pb-12">
        <DadosEstruturados dados={jsonLd(p, data)} />
        <DadosEstruturados dados={jsonLdMigalhas(MIGALHAS)} />
        <Migalhas itens={MIGALHAS} />
        <header className="flex flex-col gap-3">
          <h1 className="text-[30px] font-bold leading-tight tracking-[-0.015em] md:text-[36px]">{TITULO}</h1>
          <p className="text-[17px]">{respostaDoPanorama(p, data)}</p>
          <p className="text-[14px] text-ink-muted">
            Atualizado em <time dateTime={data}>{dataPorExtenso(data)}</time>. Pode citar estes números com link para esta página.
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Principais números">
          <Destaque valor={numero(p.total)} texto="editais abertos" />
          <Destaque valor={moedaCurta(p.medianaValor) ?? 'Não informado'} texto="valor estimado mediano" />
          <Destaque valor={numero(p.publicadosSete)} texto="publicados nos últimos 7 dias" />
          <Destaque valor={porcento(p.encerramSetePorcentagem)} texto="encerram em até 7 dias" />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-[22px] font-bold">Qual modalidade tem mais editais abertos?</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse">
              <thead>
                <tr><th className={TITULO_COLUNA}>Modalidade</th><th className={`${TITULO_COLUNA} ${NUMERO}`}>Editais</th><th className={`${TITULO_COLUNA} ${NUMERO}`}>% do total</th><th className={`${TITULO_COLUNA} ${NUMERO}`}>Valor mediano</th></tr>
              </thead>
              <tbody>
                {p.modalidades.map((m) => (
                  <tr key={m.id}>
                    <td className={CELULA}><Link href={m.caminho} prefetch={false} className={LINK}>{m.nome}</Link></td>
                    <td className={`${CELULA} ${NUMERO}`}>{numero(m.total)}</td>
                    <td className={`${CELULA} ${NUMERO}`}>{porcento(m.porcentagem)}</td>
                    <td className={`${CELULA} ${NUMERO}`}>{moedaCurta(m.medianaValor) ?? 'Não informado'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[15px] text-ink-muted">
            Para entender cada uma, leia o guia das{' '}
            <Link href="/guias/modalidades-de-licitacao" prefetch={false} className={LINK}>modalidades de licitação</Link>.
          </p>
        </section>

        {p.assuntos.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-[22px] font-bold">O que o governo mais está comprando?</h2>
            <p className="text-[15px] text-ink-muted">Um edital pode entrar em mais de um assunto, então a soma passa do total.</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[360px] border-collapse">
                <thead>
                  <tr><th className={TITULO_COLUNA}>Assunto</th><th className={`${TITULO_COLUNA} ${NUMERO}`}>Editais abertos</th></tr>
                </thead>
                <tbody>
                  {p.assuntos.map((a) => (
                    <tr key={a.slug}>
                      <td className={CELULA}><Link href={a.caminho} prefetch={false} className={LINK}>{a.nome}</Link></td>
                      <td className={`${CELULA} ${NUMERO}`}>{numero(a.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="text-[22px] font-bold">Quantas licitações estão abertas em cada estado?</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[360px] border-collapse">
              <thead>
                <tr><th className={TITULO_COLUNA}>Estado</th><th className={`${TITULO_COLUNA} ${NUMERO}`}>Editais</th><th className={`${TITULO_COLUNA} ${NUMERO}`}>% do total</th></tr>
              </thead>
              <tbody>
                {p.ufs.map((u) => (
                  <tr key={u.uf}>
                    <td className={CELULA}><Link href={u.caminho} prefetch={false} className={LINK}>{u.nome}</Link></td>
                    <td className={`${CELULA} ${NUMERO}`}>{numero(u.total)}</td>
                    <td className={`${CELULA} ${NUMERO}`}>{porcento(u.porcentagem)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="flex max-w-[72ch] flex-col gap-3 text-[16px]">
          <h2 className="text-[22px] font-bold">Como estes números são calculados?</h2>
          <ul className="flex list-disc flex-col gap-2 pl-5">
            <li>Fonte: Portal Nacional de Contratações Públicas (PNCP), lido a cada 3 horas, nas 27 unidades da federação.</li>
            <li>Modalidades: pregão eletrônico, pregão presencial, concorrência, dispensa e credenciamento. Inexigibilidade, leilão, concurso e diálogo competitivo ficam de fora.</li>
            <li>Edital aberto: prazo de proposta ainda em curso, sem revogação nem anulação. Suspenso continua na conta. Editais repetidos no PNCP contam uma vez.</li>
            <li>Valor mediano: metade dos editais tem valor estimado abaixo dele e metade acima. Só contam os {porcento(p.comValorPorcentagem)} que informam valor. Não somamos os valores porque um único edital com valor digitado errado no PNCP mudaria todo o resultado.</li>
            <li>Compras publicadas apenas em portais próprios, fora do PNCP, não aparecem aqui.</li>
          </ul>
          <p>
            Para ver os editais, use a <Link href="/" prefetch={false} className={LINK}>busca no mapa</Link> ou a lista de{' '}
            <Link href="/licitacoes" prefetch={false} className={LINK}>licitações abertas</Link>.
          </p>
        </section>
      </main>
    </>
  );
}

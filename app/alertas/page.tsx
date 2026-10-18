import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
import { ItemAlerta } from '@/components/alertas/ItemAlerta';
import { ResumoSemanal } from '@/components/alertas/ResumoSemanal';
import { CartaoRecursoPlano } from '@/components/conta/CartaoRecursoPlano';
import { AVISO_ENVIO_INDISPONIVEL, envioIndisponivel, textoUltimoEnvio } from '@/lib/alertas/regras';
import { avisoPlanoNavegador, bloqueioAlerta, MENSAGENS_LIMITE_CONTA } from '@/lib/limitesConta';
import { resumoDoRadar } from '@/lib/radar';
import { alertasDaConta } from '@/lib/servidor/alertas';
import { lerRadar, planoDaConta, resumoSemanalLigado } from '@/lib/servidor/conta';
import { municipiosPorIbge } from '@/lib/servidor/municipios';
import { contextoDaPagina } from '@/lib/servidor/registro';
import { usuarioAtual } from '@/lib/servidor/sessao';

export const metadata: Metadata = {
  title: 'Alertas por e-mail',
  description: 'Receba às 7h, por e-mail, os editais novos do que sua empresa vende, na sua região.',
  alternates: { canonical: '/alertas' },
};

const PRINCIPAL = 'inline-flex h-11 items-center rounded-sm bg-pin px-5 text-sm font-semibold text-on-pin';
const SECUNDARIO = 'inline-flex h-11 items-center rounded-sm border border-line-strong bg-raised px-5 text-sm font-semibold hover:bg-sunken';

/**
 * Alertas da conta (Fase 4, §3): lista com último envio, criar (também a partir do Meu Radar), editar, pausar/retomar,
 * excluir; e o resumo semanal do Pro. Sem conta: convite para entrar (é o que o Google vê). Pedidos antigos por e-mail
 * (pedidos_alerta) ficam guardados no banco para um convite futuro.
 */
export default async function PaginaAlertas() {
  await connection();
  const usuario = await usuarioAtual();
  if (!usuario) {
    return (
      <>
        <Cabecalho />
        <main className="mx-auto flex max-w-[760px] flex-col gap-5 px-4 py-8 md:px-6">
          <h1 className="text-[32px] font-bold leading-tight tracking-[-0.015em]">Alertas por e-mail</h1>
          <p className="text-[15px] text-ink-muted">
            Diga o que sua empresa vende e onde atende: todo dia às 7h mandamos por e-mail os editais novos que combinam, sem repetir. Alertas são do plano
            Pro.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/entrar?voltar=/alertas" prefetch={false} className={PRINCIPAL}>
              Entrar para criar alertas
            </Link>
            <Link href="/planos" className={SECUNDARIO}>
              Conhecer o Pro
            </Link>
          </div>
        </main>
      </>
    );
  }

  const ctx = await contextoDaPagina();
  const [alertas, plano, radar, resumoLigado] = await Promise.all([
    alertasDaConta(usuario),
    planoDaConta(usuario, ctx),
    lerRadar(usuario),
    resumoSemanalLigado(usuario),
  ]);
  const cidades = await municipiosPorIbge([...new Set(alertas.flatMap((a) => a.municipios))]);
  const bloqueio = bloqueioAlerta(plano.plano, alertas.length);
  const aviso = avisoPlanoNavegador(plano);
  const indisponivel = envioIndisponivel(alertas.map((a) => a.ultimoEnvio));

  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex w-full max-w-[860px] flex-col gap-5 px-4 py-6 lg:px-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-[28px] font-bold leading-tight tracking-[-0.015em]">Alertas por e-mail</h1>
          <p className="text-sm text-ink-muted">Todo dia às 7h, os editais novos de cada alerta chegam em {usuario.email}, só quando houver novidade.</p>
        </div>
        {aviso ? (
          <p role="note" className="rounded-sm bg-pin-soft px-3 py-2 text-[14px] text-pin-strong">
            {aviso}
          </p>
        ) : null}
        {indisponivel ? (
          <p role="status" className="rounded-sm bg-pin-soft px-3 py-2 text-[14px] font-semibold text-pin-strong">
            {AVISO_ENVIO_INDISPONIVEL}
          </p>
        ) : null}
        {bloqueio?.codigo === 'plano' ? (
          <CartaoRecursoPlano titulo={MENSAGENS_LIMITE_CONTA.alertasPlano} texto={MENSAGENS_LIMITE_CONTA.alertasConvite} />
        ) : bloqueio ? (
          <p className="text-[14px] text-ink-muted">{bloqueio.mensagem}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Link href="/alertas/novo" prefetch={false} className={PRINCIPAL}>
              Criar alerta
            </Link>
            {radar ? (
              <Link href="/alertas/novo?de=radar" prefetch={false} className={SECUNDARIO}>
                Criar alerta a partir do meu radar
              </Link>
            ) : null}
          </div>
        )}
        {alertas.length === 0 ? (
          <p className="text-[15px] text-ink-muted">Você ainda não tem alertas.</p>
        ) : (
          <section aria-label="Seus alertas" className="flex flex-col gap-3">
            {alertas.map((a) => (
              <ItemAlerta
                key={a.id}
                alerta={{ id: a.id, nome: a.nome, ativo: a.ativo }}
                resumo={resumoDoRadar(a, cidades.filter((c) => a.municipios.includes(c.ibge)))}
                ultimo={textoUltimoEnvio(a.ultimoEnvio)}
              />
            ))}
          </section>
        )}
        <ResumoSemanal ligado={resumoLigado} pro={plano.plano === 'pro'} temRadar={radar !== null} />
      </main>
    </>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
import { ItemAlerta } from '@/components/alertas/ItemAlerta';
import { ResumoSemanal } from '@/components/alertas/ResumoSemanal';
import { PaginaBloqueada } from '@/components/conta/PaginaBloqueada';
import { AVISO_ENVIO_INDISPONIVEL, envioIndisponivel, textoUltimoEnvio } from '@/lib/alertas/regras';
import { MENSAGENS_CONTA } from '@/lib/conta';
import { avisoPlanoNavegador, bloqueioAlerta } from '@/lib/limitesConta';
import { resumoDoRadar } from '@/lib/radar';
import { acessoAoPro } from '@/lib/servidor/acessoPro';
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
 * excluir; e o resumo semanal do Pro. Só Pro: o grátis, com ou sem conta, vê a página bloqueada (é o que o Google vê,
 * com o texto da oferta). Pedidos antigos por e-mail
 * (pedidos_alerta) ficam guardados no banco para um convite futuro. Alertas fora do ar: o título, os botões e o resumo
 * semanal ficam, e um aviso curto entra no lugar da lista (sem error.tsx; o teto de 5 continua garantido na API e no banco).
 */
export default async function PaginaAlertas() {
  await connection();
  const usuario = await usuarioAtual();
  const ctx = await contextoDaPagina();
  const acesso = await acessoAoPro(usuario, ctx);
  if (acesso !== 'liberado') return <PaginaBloqueada recurso="alertas" logado={usuario !== null} incerto={acesso === 'incerto'} />;
  if (!usuario) redirect('/entrar?voltar=/alertas');

  const [lidos, plano, radar, resumoLigado] = await Promise.all([
    alertasDaConta(usuario).catch((erro: unknown) => {
      console.error('alertas da conta:', erro);
      return null;
    }),
    planoDaConta(usuario, ctx),
    lerRadar(usuario),
    resumoSemanalLigado(usuario),
  ]);
  const falhou = lidos === null;
  const alertas = lidos ?? [];
  const cidades = await municipiosPorIbge([...new Set(alertas.flatMap((a) => a.municipios))]);
  const bloqueio = bloqueioAlerta(plano.plano, alertas.length);
  const aviso = avisoPlanoNavegador(plano);
  // Alerta pausado não envia: uma falha antiga dele não vira aviso de "envio indisponível".
  const indisponivel = envioIndisponivel(alertas.filter((a) => a.ativo).map((a) => a.ultimoEnvio));

  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex w-full max-w-[860px] flex-col gap-5 px-4 py-6 lg:px-6">
        <div className="flex flex-col gap-1">
          <h1 id="titulo-alertas" tabIndex={-1} className="text-[28px] font-bold leading-tight tracking-[-0.015em] focus:outline-none">
            Alertas por e-mail
          </h1>
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
        {bloqueio ? (
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
        {falhou ? (
          <p role="alert" className="rounded-sm bg-pin-soft px-3 py-2 text-[14px] font-semibold text-pin-strong">
            {MENSAGENS_CONTA.carregar}
          </p>
        ) : alertas.length === 0 ? (
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
        <ResumoSemanal ligado={resumoLigado} pro={plano.daConta === 'pro'} incerto={plano.falhou} aviso={aviso} temRadar={radar !== null} />
      </main>
    </>
  );
}

import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
import { FormAlerta } from '@/components/alertas/FormAlerta';
import { lerIdAlerta } from '@/lib/alertas/regras';
import { rascunhoDoRadar } from '@/lib/radar';
import { lerAlerta } from '@/lib/servidor/alertas';
import { municipiosPorIbge } from '@/lib/servidor/municipios';
import { usuarioAtual } from '@/lib/servidor/sessao';

/** Página da conta: fora do Google. */
export const metadata: Metadata = { title: 'Editar alerta', robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }> };

/** Editar um alerta da conta (outro id, ou de outra conta: 404). Editar não depende do plano. */
export default async function EditarAlerta({ params }: Props) {
  await connection();
  const id = lerIdAlerta((await params).id);
  const usuario = await usuarioAtual();
  if (!usuario) redirect(id ? `/entrar?voltar=${encodeURIComponent(`/alertas/${id}/editar`)}` : '/entrar?voltar=/alertas');
  const alerta = id ? await lerAlerta(usuario, id) : null;
  if (!alerta) notFound();
  const cidades = await municipiosPorIbge(alerta.municipios);
  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-4 py-8">
        <FormAlerta modo="editar" id={alerta.id} nomeInicial={alerta.nome} inicial={rascunhoDoRadar(alerta, cidades)} origem="manual" />
      </main>
    </>
  );
}

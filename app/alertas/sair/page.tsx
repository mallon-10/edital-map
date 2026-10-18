import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { Cabecalho } from '@/components/Cabecalho';
import { ConfirmarDescadastro } from '@/components/alertas/ConfirmarDescadastro';
import { lerSegredo, lerTokenDescadastro } from '@/lib/alertas/token';
import { textoDoDescadastro } from '@/lib/servidor/descadastro';

export const metadata: Metadata = { title: 'Parar de receber', robots: { index: false, follow: false }, referrer: 'no-referrer' };

type Props = { searchParams: Promise<{ t?: string | string[] }> };

const LINK = 'font-semibold text-pin-strong underline-offset-2 hover:underline';

/**
 * Link "Parar de receber" dos e-mails, sem login: confere o token (ALERTAS_SEGREDO) e pede a confirmação. O GET nunca
 * aplica nada (leitores de e-mail abrem os links antes da pessoa); só o botão faz o POST em /api/descadastro.
 */
export default async function SairDosAlertas({ searchParams }: Props) {
  await connection();
  const { t } = await searchParams;
  const token = typeof t === 'string' ? t : null;
  const segredo = lerSegredo(process.env.ALERTAS_SEGREDO);
  const alvo = lerTokenDescadastro(token, segredo);
  let texto: string | null | 'erro' = null;
  if (alvo) {
    try {
      texto = await textoDoDescadastro(alvo);
    } catch (erro) {
      console.error('descadastro (confirmação) falhou:', erro instanceof Error ? erro.message : 'erro desconhecido');
      texto = 'erro';
    }
  }
  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-4 px-4 py-10">
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.015em]">Parar de receber</h1>
        {!segredo ? (
          <p className="text-[15px]">
            O descadastro pelo link está indisponível agora. Tente de novo mais tarde ou entre na sua conta e pause em{' '}
            <Link href="/alertas" prefetch={false} className={LINK}>
              Alertas
            </Link>
            .
          </p>
        ) : !alvo || !token ? (
          <p className="text-[15px]">
            Este link não vale. Para parar os e-mails, entre na sua conta e pause em{' '}
            <Link href="/alertas" prefetch={false} className={LINK}>
              Alertas
            </Link>
            .
          </p>
        ) : texto === 'erro' ? (
          <p className="text-[15px]">Não foi possível abrir agora. Tente de novo em instantes.</p>
        ) : texto === null ? (
          <p className="text-[15px]">{alvo.tipo === 'alerta' ? 'Este alerta não existe mais.' : 'Esta conta não tem alertas.'} Nada a fazer.</p>
        ) : (
          <ConfirmarDescadastro token={token} texto={texto} />
        )}
      </main>
    </>
  );
}

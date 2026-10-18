'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { useEffect, useState } from 'react';
import { escolherConsentimento } from '@/lib/cliente/medir';
import { CHAVE_CONSENTIMENTO, ID_GA4, ID_GOOGLE_ADS, lerConsentimento } from '@/lib/medicao';

/**
 * Tag do Google com Consent Mode v2: o padrão negado roda antes da tag; a escolha guardada (aceito/recusado) é aplicada
 * logo em seguida. Sem escolha, o aviso aparece no rodapé, acima da barra do celular. Fora de /alertas/sair (o token
 * de descadastro do e-mail fica no endereço) e page_location sempre sem o parâmetro `t`.
 */
export const tagNaPagina = (caminho: string | null) => !caminho?.startsWith('/alertas/sair');

export const PADRAO = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});
try{var c=localStorage.getItem('${CHAVE_CONSENTIMENTO}');if(c==='aceito'){gtag('consent','update',{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted',analytics_storage:'granted'});}}catch(e){}
var u=new URL(location.href);u.searchParams.delete('t');var p={page_location:u.href};
gtag('js',new Date());gtag('config','${ID_GOOGLE_ADS}',p);${ID_GA4 ? `gtag('config','${ID_GA4}',p);` : ''}`;

export function TagGoogle() {
  const [mostrar, setMostrar] = useState(false);
  const comTag = tagNaPagina(usePathname());
  useEffect(() => {
    try {
      setMostrar(lerConsentimento(window.localStorage) === null);
    } catch {
      setMostrar(true);
    }
  }, []);
  const escolher = (v: 'aceito' | 'recusado') => {
    escolherConsentimento(v);
    setMostrar(false);
  };
  return (
    <>
      {comTag ? (
        <>
          <Script id="consentimento-google" strategy="afterInteractive">
            {PADRAO}
          </Script>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ID_GOOGLE_ADS}`} strategy="afterInteractive" />
        </>
      ) : null}
      {mostrar ? (
        <div
          role="dialog"
          aria-label="Cookies"
          className="fixed inset-x-3 bottom-[calc(var(--altura-barra,0px)+12px)] z-50 mx-auto flex max-w-[560px] flex-col gap-3 rounded-lg border border-line bg-raised p-4 text-[13px] text-ink shadow-[0_8px_32px_rgba(12,35,64,.18)] sm:flex-row sm:items-center lg:bottom-4"
        >
          <p className="flex-1">
            Usamos cookies do Google para medir nossos anúncios. Você escolhe.{' '}
            <Link href="/sobre#cookies" prefetch={false} className="font-semibold text-pin-strong hover:underline">
              Saiba mais
            </Link>
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => escolher('recusado')} className="h-10 flex-1 rounded-sm border border-line-strong bg-raised px-4 font-semibold hover:bg-sunken">
              Recusar
            </button>
            <button type="button" onClick={() => escolher('aceito')} className="h-10 flex-1 rounded-sm border border-line-strong bg-raised px-4 font-semibold hover:bg-sunken">
              Aceitar
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

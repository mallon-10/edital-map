'use client';

import Link from 'next/link';
import Script from 'next/script';
import { useEffect, useState } from 'react';
import { escolherConsentimento } from '@/lib/cliente/medir';
import { CHAVE_CONSENTIMENTO, ID_GOOGLE_ADS, lerConsentimento } from '@/lib/medicao';

/**
 * Tag do Google com Consent Mode v2: o padrão negado roda antes da tag; a escolha guardada (aceito/recusado) é aplicada
 * logo em seguida. Sem escolha, o aviso aparece no rodapé, acima da barra do celular.
 */
const PADRAO = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});
try{var c=localStorage.getItem('${CHAVE_CONSENTIMENTO}');if(c==='aceito'){gtag('consent','update',{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted',analytics_storage:'granted'});}}catch(e){}
gtag('js',new Date());gtag('config','${ID_GOOGLE_ADS}');`;

export function TagGoogle() {
  const [mostrar, setMostrar] = useState(false);
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
      <Script id="consentimento-google" strategy="afterInteractive">
        {PADRAO}
      </Script>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${ID_GOOGLE_ADS}`} strategy="afterInteractive" />
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

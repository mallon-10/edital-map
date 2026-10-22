'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { useEffect, useState } from 'react';
import { escolherConsentimento } from '@/lib/cliente/medir';
import { CHAVE_CONSENTIMENTO, ID_GA4, ID_GOOGLE_ADS, ID_META_PIXEL, lerConsentimento } from '@/lib/medicao';

/**
 * Tag do Google com Consent Mode v2 e Pixel da Meta (mesma escolha): o padrão negado roda antes da tag; a escolha guardada (aceito/recusado) é aplicada
 * logo em seguida. Sem escolha, o aviso aparece no rodapé, acima da barra do celular, compacto (texto e botões numa
 * faixa só quando cabem). Fora de /alertas/sair (o token de descadastro do e-mail fica no endereço). Só quando o endereço traz o parâmetro `t` o config leva page_location
 * sem ele; nos outros casos o config é o de sempre (um page_location fixo no config valeria para as navegações seguintes).
 */
export const tagNaPagina = (caminho: string | null) => !caminho?.startsWith('/alertas/sair');

export const PADRAO = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});
try{var c=localStorage.getItem('${CHAVE_CONSENTIMENTO}');if(c==='aceito'){gtag('consent','update',{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted',analytics_storage:'granted'});}}catch(e){}
var p=null;try{var u=new URL(location.href);if(u.searchParams.has('t')){u.searchParams.delete('t');p={page_location:u.href};}}catch(e){}
function cfg(id){if(p){gtag('config',id,p);}else{gtag('config',id);}}
gtag('js',new Date());cfg('${ID_GOOGLE_ADS}');${ID_GA4 ? `cfg('${ID_GA4}');` : ''}`;

/** Pixel da Meta: consentimento revogado até o "Aceitar" (os eventos esperam), depois init e PageView. */
export const COMANDOS_META = `var c=null;try{c=localStorage.getItem('${CHAVE_CONSENTIMENTO}');}catch(e){}
fbq('consent',c==='aceito'?'grant':'revoke');fbq('init','${ID_META_PIXEL}');fbq('track','PageView');`;

const CARREGAR_META = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;
s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');`;

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
          <Script id="pixel-meta" strategy="afterInteractive">
            {CARREGAR_META + COMANDOS_META}
          </Script>
        </>
      ) : null}
      {mostrar ? (
        <div
          role="dialog"
          aria-label="Cookies"
          className="fixed inset-x-3 bottom-[calc(var(--altura-barra,0px)+10px)] z-50 mx-auto flex max-w-[600px] flex-wrap items-center gap-x-3 gap-y-2 rounded-[22px] border border-line bg-raised py-2.5 pl-4 pr-2.5 text-[13px] text-ink shadow-[0_8px_32px_rgba(12,35,64,.18)] lg:bottom-4"
        >
          <p className="min-w-0 flex-[1_1_200px] leading-snug">
            Usamos cookies do Google e da Meta para medir nossos anúncios. Você escolhe.{' '}
            <Link href="/sobre#cookies" prefetch={false} className="font-semibold text-pin-strong hover:underline">
              Saiba mais
            </Link>
          </p>
          <div className="flex flex-auto gap-1.5 sm:flex-none">
            <button type="button" onClick={() => escolher('recusado')} className="h-10 flex-1 rounded-full border border-line-strong bg-raised px-4 font-semibold hover:bg-sunken">
              Recusar
            </button>
            <button type="button" onClick={() => escolher('aceito')} className="h-10 flex-1 rounded-full border border-line-strong bg-raised px-4 font-semibold hover:bg-sunken">
              Aceitar
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

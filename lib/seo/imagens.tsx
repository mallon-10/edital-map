/** Desenhos da marca para o ImageResponse (logo, ícone da Apple e imagem de compartilhamento). */
const PINO =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-3 0 28 28"><path d="M11 0C4.9 0 0 4.9 0 11c0 8.3 11 17 11 17s11-8.7 11-17C22 4.9 17.1 0 11 0z" fill="#ff5a1f"/><path d="M15 0v6h6" fill="#b33a0e"/><circle cx="11" cy="11" r="3.5" fill="#f4f1e8"/></svg>';
const PINO_URL = `data:image/svg+xml;base64,${Buffer.from(PINO).toString('base64')}`;

const FUNDO = '#f4f1e8';
const TINTA = '#0c2340';

/** Pino da marca centrado num quadrado claro. */
export function Quadrado({ lado }: { lado: number }) {
  return (
    <div style={{ width: lado, height: lado, background: FUNDO, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
      <img src={PINO_URL} width={lado * 0.7} height={lado * 0.7} />
    </div>
  );
}

/** 1200×630: marca, frase e endereço. */
export function Compartilhar() {
  return (
    <div style={{ width: 1200, height: 630, background: FUNDO, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 80, color: TINTA }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={PINO_URL} width={120} height={120} />
        <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -2 }}>Edital Map</div>
      </div>
      <div style={{ fontSize: 48, marginTop: 40, lineHeight: 1.2 }}>Licitações abertas no Brasil, no mapa</div>
      <div style={{ fontSize: 30, marginTop: 24, color: '#3e5373' }}>Editais do PNCP atualizados a cada 3 horas · editalmap.com.br</div>
    </div>
  );
}

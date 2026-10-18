/**
 * SDK da Cakto no navegador (https://docs.cakto.com.br/sdk/visao-geral): tokenização do cartão, 3D Secure e perfil
 * antifraude. Uma instância por página (o antifraude não fecha com duas). Só o `client_id` (público) vai ao navegador.
 */
const URL_SDK = 'https://cakto-sdk.pages.dev/cakto-sdk.min.js';

export type CartaoDigitado = { holderName: string; cardNumber: string; cvv: string; expMonth: string; expYear: string };
export type Endereco = { street: string; number: string; complement: string; city: string; state: string; zipcode: string };
type Resultado3DS = { success: boolean; error?: string; cavv?: string; eci?: string; xid?: string; referenceId?: string; version?: string };

export type SdkCakto = {
  initAntifraud(): Promise<void>;
  createToken(c: CartaoDigitado): Promise<{ cardToken: string }>;
  authenticate3DS(p: {
    card: CartaoDigitado;
    customer: { amount: number; currency: 'BRL'; email: string; name: string; phone: string; paymentMethod: 'credit'; address: Endereco };
  }): Promise<Resultado3DS>;
  completeAntifraudProfile(): Promise<void>;
  getAntifraudReference(): string;
};

declare global {
  interface Window {
    Cakto?: { CaktoSDK: new (o: { client_id: string }) => SdkCakto };
  }
}

let instancia: Promise<SdkCakto> | null = null;

function carregarScript(): Promise<void> {
  return new Promise((ok, falha) => {
    if (window.Cakto) return ok();
    const s = document.createElement('script');
    s.src = URL_SDK;
    s.async = true;
    s.onload = () => ok();
    s.onerror = () => falha(new Error('não carregou o SDK da Cakto'));
    document.head.append(s);
  });
}

/** Carrega o script uma vez, cria a instância e já começa o antifraude (quanto antes, mais sinais). */
export function sdkCakto(clientId: string): Promise<SdkCakto> {
  instancia ??= carregarScript()
    .then(async () => {
      if (!window.Cakto) throw new Error('SDK da Cakto ausente');
      const sdk = new window.Cakto.CaktoSDK({ client_id: clientId });
      await sdk.initAntifraud().catch(() => undefined);
      return sdk;
    })
    .catch((erro: unknown) => {
      instancia = null;
      throw erro;
    });
  return instancia;
}

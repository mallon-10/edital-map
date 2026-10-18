import './ambiente';
import { lerSegredo } from '../lib/alertas/token';
import { criarBancoAlertas } from './alertas/banco';
import { executarAlertas, mensagemDeErro, motivoSemEnvio, type DepsEnvio } from './alertas/executar';
import { limparLog } from './alertas/log';
import { criarEnvioResend } from './alertas/resend';
import { criarSupabase } from './banco';
import { lerSupabase } from './config';

/**
 * Envio diário dos alertas (GitHub Actions, 10:00 UTC = 7h em Brasília). Sai com código 1 se houve falha ou se o envio
 * está sem chave/segredo. Log público: só contagens (limparLog tira e-mail, uuid completo e a chave).
 */
const { url, chave } = lerSupabase();
const chaveResend = process.env.RESEND_API_KEY?.trim() || null;
const log = (linha: string) => console.log(limparLog(linha, [chaveResend]));
const esperar = (ms: number) => new Promise<void>((pronto) => setTimeout(pronto, ms));
const deps: DepsEnvio = {
  enviar: chaveResend ? criarEnvioResend({ chave: chaveResend, esperar }) : null,
  segredo: lerSegredo(process.env.ALERTAS_SEGREDO),
  agora: () => new Date(),
  esperar,
  log,
};

try {
  const resumo = await executarAlertas({ ...deps, banco: criarBancoAlertas(criarSupabase(url, chave)) });
  log(`[alertas] ${JSON.stringify(resumo)}`);
  process.exitCode = resumo.falhas > 0 || motivoSemEnvio(deps) ? 1 : 0;
} catch (erro) {
  log(`[alertas] rodada interrompida: ${mensagemDeErro(erro)}`);
  process.exitCode = 1;
}

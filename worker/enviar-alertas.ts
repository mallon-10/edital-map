import './ambiente';
import { lerSegredo } from '../lib/alertas/token';
import { criarBancoAlertas } from './alertas/banco';
import { avisosDoResumo, executarAlertas, mensagemDeErro, motivoSemEnvio, type DepsEnvio } from './alertas/executar';
import { limparLog } from './alertas/log';
import { lerModo } from './alertas/modo';
import { criarEnvioResend } from './alertas/resend';
import { avisosDoResumoSemanal, criarBancoResumo, executarResumo } from './alertas/resumo';
import { criarSupabase } from './banco';
import { lerSupabase } from './config';

/**
 * Envios por e-mail (GitHub Actions, 10:07 UTC = 7h07 em Brasília): `--modo alertas` (padrão) todo dia; `--modo resumo`
 * na segunda, depois dos alertas (resumo semanal do Pro, com o teto que os alertas deixaram). Sai com código 1 se houve
 * falha ou se o envio está sem chave/segredo; teto ou cota (contas adiadas) viram anotação do GitHub, sem mudar o código
 * de saída. Log público: só contagens (limparLog tira e-mail, token, uuid completo e os segredos abaixo, que nunca são
 * impressos).
 */
const { url, chave } = lerSupabase();
const chaveResend = process.env.RESEND_API_KEY?.trim() || null;
const segredo = lerSegredo(process.env.ALERTAS_SEGREDO);
const segredos = [chaveResend, process.env.RESEND_API_KEY, process.env.ALERTAS_SEGREDO, segredo, chave, chave.trim()];
const log = (linha: string) => console.log(limparLog(linha, segredos));
const esperar = (ms: number) => new Promise<void>((pronto) => setTimeout(pronto, ms));
const deps: DepsEnvio = {
  enviar: chaveResend ? criarEnvioResend({ chave: chaveResend, esperar }) : null,
  segredo,
  agora: () => new Date(),
  esperar,
  log,
};

let rotulo = 'envio';
try {
  const modo = lerModo(process.argv.slice(2));
  rotulo = modo;
  const sb = criarSupabase(url, chave);
  let falhas: number;
  if (modo === 'resumo') {
    const r = await executarResumo({ ...deps, banco: criarBancoResumo(sb) });
    log(`[resumo] ${JSON.stringify(r)}`);
    for (const aviso of avisosDoResumoSemanal(r)) log(aviso);
    falhas = r.falhas;
  } else {
    const r = await executarAlertas({ ...deps, banco: criarBancoAlertas(sb) });
    log(`[alertas] ${JSON.stringify(r)}`);
    for (const aviso of avisosDoResumo(r)) log(aviso);
    falhas = r.falhas;
  }
  process.exitCode = falhas > 0 || motivoSemEnvio(deps) ? 1 : 0;
} catch (erro) {
  // Anotação do GitHub: a rodada nem começou ou parou no meio (ex.: a contagem dos e-mails de hoje falhou duas vezes).
  log(`::error::[${rotulo}] rodada interrompida: ${mensagemDeErro(erro)}`);
  process.exitCode = 1;
}

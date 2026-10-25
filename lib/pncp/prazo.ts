/**
 * Sinal que aborta depois de `ms` ou quando `pai` abortar. Feito à mão porque AbortSignal.timeout e
 * AbortSignal.any faltam em WebViews Android antigas, e a busca no PNCP roda no navegador de quem visita.
 * `encerrar` limpa o relógio quando a chamada acaba antes.
 */
export function comPrazo(ms: number, pai?: AbortSignal): { signal: AbortSignal; encerrar: () => void } {
  const controle = new AbortController();
  const abortar = () => controle.abort();
  const relogio = setTimeout(abortar, ms);
  if (pai?.aborted) abortar();
  pai?.addEventListener('abort', abortar);
  return {
    signal: controle.signal,
    encerrar: () => {
      clearTimeout(relogio);
      pai?.removeEventListener('abort', abortar);
    },
  };
}

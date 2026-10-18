/**
 * `--modo alertas` (diário, padrão) ou `--modo resumo` (resumo semanal do Pro, segunda). Aceita também `--modo=resumo`.
 * Vazio vale alertas; outro valor é erro (o job não roda o modo errado em silêncio).
 */
export function lerModo(argv: readonly string[]): 'alertas' | 'resumo' {
  const i = argv.indexOf('--modo');
  const comIgual = argv.find((a) => a.startsWith('--modo='));
  const bruto = i >= 0 ? argv[i + 1] : comIgual?.slice('--modo='.length);
  const valor = bruto?.trim() || 'alertas';
  if (valor !== 'alertas' && valor !== 'resumo') throw new Error(`Modo inválido: ${valor} (use alertas ou resumo)`);
  return valor;
}

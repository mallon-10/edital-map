/**
 * `--modo alertas` (diário, padrão) ou `--modo resumo` (resumo semanal do Pro, segunda). Aceita também `--modo=resumo`.
 * Sem `--modo`, alertas. `--modo` sem valor (nada depois, outra opção `--…` ou vazio) e valor desconhecido são erro: o
 * job não roda o modo errado em silêncio.
 */
export function lerModo(argv: readonly string[]): 'alertas' | 'resumo' {
  const i = argv.indexOf('--modo');
  const comIgual = argv.find((a) => a.startsWith('--modo='));
  if (i < 0 && comIgual === undefined) return 'alertas';
  const bruto = i >= 0 ? argv[i + 1] : comIgual?.slice('--modo='.length);
  const valor = bruto?.trim() ?? '';
  if (valor === '' || valor.startsWith('--')) throw new Error('--modo sem valor (use alertas ou resumo)');
  if (valor !== 'alertas' && valor !== 'resumo') throw new Error(`Modo inválido: ${valor} (use alertas ou resumo)`);
  return valor;
}

/**
 * Páginas só do computador do dono (`*.local.tsx`, hoje o painel /admin): o Next só reconhece a extensão no `next dev`,
 * então no build de produção a rota nem existe.
 */
export function extensoesDePagina(ambiente: string | undefined): string[] {
  const padrao = ['tsx', 'ts', 'jsx', 'js'];
  return ambiente === 'development' ? ['local.tsx', ...padrao] : padrao;
}

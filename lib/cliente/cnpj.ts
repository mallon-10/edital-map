/** Resposta de GET /api/cnpj/{cnpj}. */
export type RespostaCnpj = {
  empresa: { razao: string; fantasia: string | null; uf: string | null; municipio: string | null; ativa: boolean; atividade: string | null };
  assuntos: Array<{ slug: string; nome: string; principal: boolean }>;
};

/** Consulta a empresa pelo CNPJ (só dígitos). Erro da rota vira Error com a mensagem em português. */
export async function consultarCnpj(cnpj: string): Promise<RespostaCnpj> {
  const r = await fetch(`/api/cnpj/${encodeURIComponent(cnpj.replace(/\D/g, ''))}`, { cache: 'no-store' });
  const j = (await r.json().catch(() => ({}))) as RespostaCnpj & { erro?: string };
  if (!r.ok) throw new Error(j.erro ?? 'Não deu para consultar o CNPJ agora.');
  return j;
}

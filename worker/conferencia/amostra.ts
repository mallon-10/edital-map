export type Candidata = {
  id: string;
  cnpj: string;
  ano: number;
  sequencial: number;
  uf: string;
  modalidade_id: number;
  valor_estimado: number | null;
  link_origem: string | null;
  muitos_itens: boolean;
};

export type Sorteada = Candidata & { motivo: string };

export function sortearAmostra(candidatas: Candidata[], tamanho: number, aleatorio: () => number = Math.random): Sorteada[] {
  const escolhidas = new Map<string, Sorteada>();
  const pegar = (filtro: (c: Candidata) => boolean, motivo: string) => {
    if (escolhidas.size >= tamanho) return;
    const opcoes = candidatas.filter((c) => filtro(c) && !escolhidas.has(c.id));
    if (opcoes.length === 0) return;
    const c = opcoes[Math.floor(aleatorio() * opcoes.length)];
    escolhidas.set(c.id, { ...c, motivo });
  };
  const jaTem = (filtro: (c: Sorteada) => boolean) => [...escolhidas.values()].some(filtro);

  pegar((c) => c.muitos_itens, 'mais de 10 itens');
  pegar((c) => c.valor_estimado === 0, 'valor 0');
  pegar((c) => c.link_origem === null, 'link vazio');
  for (const uf of [...new Set(candidatas.map((c) => c.uf))].sort()) {
    if (!jaTem((e) => e.uf === uf)) pegar((c) => c.uf === uf, `UF ${uf}`);
  }
  for (const m of [...new Set(candidatas.map((c) => c.modalidade_id))].sort((a, b) => a - b)) {
    if (!jaTem((e) => e.modalidade_id === m)) pegar((c) => c.modalidade_id === m, `modalidade ${m}`);
  }
  const alvo = Math.min(tamanho, candidatas.length);
  while (escolhidas.size < alvo) pegar(() => true, 'sorteio');
  return [...escolhidas.values()];
}

import { appendFile } from 'node:fs/promises';

type Ocorrencia = { chave: string; mensagem: string };

export class Resumo {
  readonly inicio: number;
  paginas = 0;
  validos = 0;
  contratacoesGravadas = 0;
  comprasComItens = 0;
  itensGravados = 0;
  readonly invalidos: Array<{ id: string; motivo: string }> = [];
  readonly erros: Ocorrencia[] = [];
  readonly avisos: Ocorrencia[] = [];

  constructor(
    readonly titulo: string,
    private readonly relogio: () => number = Date.now,
  ) {
    this.inicio = relogio();
  }

  contarPagina(): void {
    this.paginas++;
  }
  contarValidos(n: number): void {
    this.validos += n;
  }
  contarInvalido(id: string, motivo: string): void {
    this.invalidos.push({ id, motivo });
  }
  contarContratacoes(n: number): void {
    this.contratacoesGravadas += n;
  }
  contarItens(compras: number, itens: number): void {
    this.comprasComItens += compras;
    this.itensGravados += itens;
  }
  registrarErro(chave: string, mensagem: string): void {
    this.erros.push({ chave, mensagem });
  }
  registrarAviso(chave: string, mensagem: string): void {
    this.avisos.push({ chave, mensagem });
  }

  taxaInvalidos(): number {
    const total = this.validos + this.invalidos.length;
    return total === 0 ? 0 : this.invalidos.length / total;
  }
  falhou(limiteInvalidos: number): boolean {
    return this.erros.length > 0 || this.taxaInvalidos() > limiteInvalidos;
  }
  segundos(): number {
    return Math.round((this.relogio() - this.inicio) / 1000);
  }

  texto(http?: { chamadas: number; novasTentativas: number }): string {
    const pct = (this.taxaInvalidos() * 100).toFixed(1).replace('.', ',');
    const linhas = [
      `## ${this.titulo}`,
      '',
      '| Métrica | Valor |',
      '|---|---|',
      `| Tempo | ${this.segundos()} s |`,
      `| Páginas lidas | ${this.paginas} |`,
      `| Contratações válidas | ${this.validos} |`,
      `| Contratações gravadas | ${this.contratacoesGravadas} |`,
      `| Compras com itens buscados | ${this.comprasComItens} |`,
      `| Itens gravados | ${this.itensGravados} |`,
      `| Registros inválidos | ${this.invalidos.length} (${pct}%) |`,
    ];
    if (http) linhas.push(`| Chamadas HTTP | ${http.chamadas} |`, `| Novas tentativas | ${http.novasTentativas} |`);
    linhas.push(`| Erros | ${this.erros.length} |`, `| Avisos | ${this.avisos.length} |`);

    const secao = (titulo: string, itens: Array<{ rotulo: string; texto: string }>) => {
      if (itens.length === 0) return;
      linhas.push('', `### ${titulo}`, ...itens.slice(0, 20).map((i) => `- \`${i.rotulo}\`: ${i.texto}`));
      if (itens.length > 20) linhas.push(`- … e mais ${itens.length - 20}`);
    };
    secao('Erros', this.erros.map((e) => ({ rotulo: e.chave, texto: e.mensagem })));
    secao('Avisos', this.avisos.map((a) => ({ rotulo: a.chave, texto: a.mensagem })));
    secao('Registros inválidos', this.invalidos.map((i) => ({ rotulo: i.id, texto: i.motivo })));
    return linhas.join('\n');
  }

  async publicar(
    http?: { chamadas: number; novasTentativas: number },
    destino: string | undefined = process.env.GITHUB_STEP_SUMMARY,
  ): Promise<void> {
    const t = this.texto(http);
    console.log(t);
    if (destino) await appendFile(destino, `${t}\n`);
  }
}

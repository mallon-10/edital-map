import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Resumo } from './resumo';

describe('Resumo', () => {
  it('calcula a taxa de inválidos sobre as contratações', () => {
    const r = new Resumo('t');
    expect(r.taxaInvalidos()).toBe(0);
    r.contarValidos(19);
    r.contarInvalido('X', 'motivo');
    expect(r.taxaInvalidos()).toBeCloseTo(0.05);
  });
  it('falha com erro de chave ou com inválidos acima do limite', () => {
    const r = new Resumo('t');
    r.contarValidos(10);
    r.registrarAviso('itens:X', 'timeout');
    expect(r.falhou(0.05)).toBe(false);
    r.contarInvalido('Y', 'm');
    expect(r.falhou(0.05)).toBe(true);
    const s = new Resumo('t');
    s.registrarErro('atualizacao:SC:6', 'HTTP 503');
    expect(s.falhou(0.05)).toBe(true);
  });
  it('monta o texto com as métricas', () => {
    let agora = 1_000;
    const r = new Resumo('Sincronização PNCP', () => agora);
    r.contarPagina();
    r.contarPagina();
    r.contarContratacoes(80);
    r.contarItens(3, 42);
    r.contarForaDaRetencao(5);
    r.registrarErro('atualizacao:SC:6', 'HTTP 503');
    agora = 6_000;
    const t = r.texto({ chamadas: 10, novasTentativas: 1 });
    expect(t).toContain('## Sincronização PNCP');
    expect(t).toContain('| Tempo | 5 s |');
    expect(t).toContain('| Páginas lidas | 2 |');
    expect(t).toContain('| Itens lidos | 42 |');
    expect(t).toContain('| Fora da retenção (não gravadas) | 5 |');
    expect(t).toContain('| Chamadas HTTP | 10 |');
    expect(t).toContain('- `atualizacao:SC:6`: HTTP 503');
  });
  it('mostra as respostas 429 só quando informadas', () => {
    const r = new Resumo('t');
    expect(r.texto({ chamadas: 1, novasTentativas: 0, respostas429: 3 })).toContain('| Respostas 429 | 3 |');
    expect(r.texto({ chamadas: 1, novasTentativas: 0 })).not.toContain('429');
  });
  it('publica no arquivo do Job Summary', async () => {
    const arquivo = join(mkdtempSync(join(tmpdir(), 'resumo-')), 'summary.md');
    await new Resumo('Rodada').publicar(undefined, arquivo);
    expect(readFileSync(arquivo, 'utf8')).toContain('## Rodada');
  });
});

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { trocarEndereco, type Janela } from './endereco';

function janelaFalsa(endereco: string, estado: unknown) {
  const [pathname, busca = ''] = endereco.split('?');
  const replaceState = vi.fn();
  const janela: Janela = {
    location: { pathname, search: busca ? `?${busca}` : '' },
    history: { state: estado, replaceState },
  };
  return { janela, replaceState };
}

describe('trocarEndereco', () => {
  const estadoDoNext = { __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: { tree: ['', {}], renderedSearch: '?q=luva' } };

  it('não escreve quando o endereço já é o pedido', () => {
    const { janela, replaceState } = janelaFalsa('/?q=luva&uf=PR', estadoDoNext);
    trocarEndereco('/?q=luva&uf=PR', janela);
    expect(replaceState).not.toHaveBeenCalled();
  });

  it('troca o endereço passando o mesmo objeto de estado (o do Next, com __NA), nunca null', () => {
    const { janela, replaceState } = janelaFalsa('/?uf=PR&q=luva', estadoDoNext);
    trocarEndereco('/?q=luva&uf=PR', janela);
    expect(replaceState).toHaveBeenCalledTimes(1);
    expect(replaceState).toHaveBeenCalledWith(estadoDoNext, '', '/?q=luva&uf=PR');
    expect(replaceState.mock.calls[0][0]).toBe(estadoDoNext);
  });

  it('sem estado do Next (não deveria acontecer), repassa o que houver em vez de inventar', () => {
    const { janela, replaceState } = janelaFalsa('/', null);
    trocarEndereco('/?tela=lista', janela);
    expect(replaceState).toHaveBeenCalledWith(null, '', '/?tela=lista');
  });
});

/** Arquivos .ts/.tsx de uma pasta (com subpastas), sem os testes. */
function fontes(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) return fontes(caminho);
    return /\.tsx?$/.test(nome) && !/\.test\.tsx?$/.test(nome) ? [caminho] : [];
  });
}

describe('endereço sem apagar o estado do Next', () => {
  it('nenhum replaceState/pushState com null em components/, lib/ e app/ (a volta do edital ficaria sem tela)', () => {
    const raiz = fileURLToPath(new URL('../../', import.meta.url));
    const achados = ['components', 'lib', 'app']
      .flatMap((p) => fontes(join(raiz, p)))
      .filter((arquivo) => /(replaceState|pushState)\(\s*null/.test(readFileSync(arquivo, 'utf8')));
    expect(achados).toEqual([]);
  });

  it('o Explorador escreve o endereço só pelo trocarEndereco', () => {
    const raiz = fileURLToPath(new URL('../../', import.meta.url));
    const explorador = readFileSync(join(raiz, 'components/Explorador.tsx'), 'utf8');
    expect(explorador).not.toMatch(/history\.(replaceState|pushState)\(/);
    expect(explorador).toContain('trocarEndereco(');
  });
});

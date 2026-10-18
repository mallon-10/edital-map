import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TIPOS_EVENTO_CONTA } from '../lib/eventos';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const ler = (caminho: string) => readFileSync(join(RAIZ, caminho), 'utf8');
const listar = (pasta: string) =>
  (readdirSync(join(RAIZ, pasta), { recursive: true }) as string[])
    .filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith('.test.ts'))
    .map((f) => join(pasta, f).replace(/\\/g, '/'));
const codigo = [...listar('app'), ...listar('components'), ...listar('lib'), 'proxy.ts'];

describe('isolamento entre contas', () => {
  it('nenhum arquivo de app/ fala em user_id (o dono vem só da sessão)', () => {
    const com = listar('app').filter((f) => /user_?id/i.test(ler(f)));
    expect(com).toEqual([]);
  });
  it('só lib/servidor/conta.ts lê ou grava perfis e radares', () => {
    const com = codigo.filter((f) => /from\(['"](perfis|radares)['"]\)/.test(ler(f)));
    expect(com).toEqual(['lib/servidor/conta.ts']);
  });
  it('toda função exportada de conta.ts recebe o Usuario da sessão', () => {
    const fonte = ler('lib/servidor/conta.ts');
    const funcoes = [...fonte.matchAll(/export async function (\w+)\(([^)]*)\)/g)];
    expect(funcoes.length).toBeGreaterThanOrEqual(4);
    for (const [, nome, params] of funcoes) expect(params, nome).toMatch(/^usuario: Usuario\b/);
    expect(fonte).toContain(".eq('user_id', usuario.id)");
    expect(fonte).toContain('user_id: usuario.id');
  });
  it('só sessao.ts cria um Usuario', () => {
    const com = codigo.filter((f) => /as Usuario\b/.test(ler(f)));
    expect(com).toEqual(['lib/servidor/sessao.ts']);
  });
  it('rotas e páginas da conta conferem a sessão no servidor', () => {
    for (const f of ['app/api/radar/route.ts', 'app/api/radar/visita/route.ts', 'app/radar/page.tsx', 'app/radar/comecar/page.tsx', 'app/radar/editar/page.tsx', 'app/api/conta/route.ts']) {
      expect(ler(f), f).toContain('usuarioAtual()');
    }
  });
  it('toda rota POST de /api/conta e /api/radar chama recusaForaDoSite', () => {
    const posts = [...listar('app/api/conta'), ...listar('app/api/radar')].filter((f) => /export async function POST/.test(ler(f)));
    expect(posts.length).toBeGreaterThanOrEqual(5);
    for (const f of posts) expect(ler(f), f).toContain('recusaForaDoSite(request)');
  });
});

describe('chaves e bibliotecas só no servidor', () => {
  it('@supabase/ssr só em sessao.ts e sessaoProxy.ts', () => {
    const com = codigo.filter((f) => ler(f).includes('@supabase/ssr'));
    expect(com.sort()).toEqual(['lib/servidor/sessao.ts', 'lib/sessaoProxy.ts']);
  });
  it('nenhum componente ou código do navegador lê variável SUPABASE_', () => {
    const navegador = [...listar('components'), ...listar('lib/cliente')].filter((f) => ler(f).includes('process.env.SUPABASE_'));
    expect(navegador).toEqual([]);
    const cliente = codigo.filter((f) => ler(f).startsWith("'use client'") && ler(f).includes('SUPABASE_'));
    expect(cliente).toEqual([]);
  });
});

describe('eventos da conta', () => {
  it('cada tipo é gravado em algum lugar do servidor (fora da lista em lib/eventos.ts)', () => {
    const fonte = codigo.filter((f) => f !== 'lib/eventos.ts').map(ler).join('\n');
    for (const t of TIPOS_EVENTO_CONTA) expect(fonte).toContain(`'${t}'`);
  });
});

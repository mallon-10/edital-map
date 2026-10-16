// DESCARTÁVEL: página local para olhar os dados da Fase 1. Não é o produto (Fase 2).
// Rodar: npx tsx visualizar/servidor.ts  →  http://localhost:3333
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

process.loadEnvFile(new URL('../.env', import.meta.url));
const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});
const PAGINA = readFileSync(new URL('./pagina.html', import.meta.url), 'utf8');

async function municipios() {
  const todos: unknown[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await sb.from('municipios').select('lat, lng').range(de, de + 999);
    if (error) throw new Error(error.message);
    todos.push(...(data ?? []));
    if (!data || data.length < 1000) return todos;
  }
}

async function resumo() {
  const agora = new Date().toISOString();
  const contar = async (tabela: string, filtro?: (q: any) => any) => {
    let q: any = sb.from(tabela).select('*', { count: 'exact', head: true });
    if (filtro) q = filtro(q);
    const { count, error } = await q;
    if (error) throw new Error(error.message);
    return count ?? 0;
  };
  const [compras, abertas, comItens] = await Promise.all([
    contar('contratacoes'),
    contar('contratacoes', (q) => q.gt('encerramento_em', agora)),
    contar('contratacoes', (q) => q.not('itens_resumo', 'is', null)),
  ]);
  const { data: estados } = await sb
    .from('sync_estado')
    .select('chave, status, ultima_execucao')
    .order('ultima_execucao', { ascending: false });
  return { compras, abertas, itens: comItens, estados: estados ?? [] };
}

async function rpc(nome: string, args: Record<string, unknown>) {
  const { data, error } = await sb.rpc(nome, args);
  if (error) throw new Error(error.message);
  return data;
}

// O Supabase devolve no máximo 1.000 linhas por resposta: o mapa precisa paginar.
async function rpcTodas(nome: string, args: Record<string, unknown>) {
  const todas: unknown[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await sb.rpc(nome, args).range(de, de + 999);
    if (error) throw new Error(error.message);
    todas.push(...((data as unknown[]) ?? []));
    if (!data || (data as unknown[]).length < 1000) return todas;
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const q = url.searchParams.get('q')?.trim() || null;
  const uf = url.searchParams.get('uf') || null;
  const ufs = uf ? [uf] : null;
  try {
    let corpo: unknown;
    if (url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(PAGINA);
      return;
    } else if (url.pathname === '/api/municipios') corpo = await municipios();
    else if (url.pathname === '/api/resumo') corpo = await resumo();
    else if (url.pathname === '/api/mapa') corpo = await rpcTodas('mapa', { q, p_ufs: ufs });
    else if (url.pathname === '/api/busca') {
      const ibge = url.searchParams.get('ibge');
      if (ibge) {
        // Editais abertos de um município (clique no mapa), com a mesma busca aplicada.
        const { data, error } = await sb
          .rpc('abertas', { q, p_ufs: ufs })
          .select('id, slug, objeto, orgao_nome, municipio_nome, uf, valor_estimado, encerramento_em, modalidade_nome')
          .eq('codigo_ibge', ibge)
          .order('encerramento_em', { ascending: true })
          .limit(100);
        if (error) throw new Error(error.message);
        corpo = data;
      } else corpo = await rpc('buscar', { q, p_ufs: ufs, p_limite: 100 });
    }
    else {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(corpo));
  } catch (erro) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ erro: erro instanceof Error ? erro.message : String(erro) }));
  }
}).listen(3333, '127.0.0.1', () => console.log('Edital Map (visualização provisória): http://localhost:3333'));

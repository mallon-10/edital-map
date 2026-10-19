import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TIPOS_EVENTO_OPORTUNIDADES } from '../lib/eventos';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const ler = (caminho: string) => readFileSync(join(RAIZ, caminho), 'utf8');
const listar = (pasta: string) =>
  (readdirSync(join(RAIZ, pasta), { recursive: true }) as string[])
    .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f))
    .map((f) => join(pasta, f).replace(/\\/g, '/'));
const site = [...listar('app'), ...listar('components'), ...listar('lib'), 'proxy.ts'];
const codigo = [...site, ...listar('worker')];

describe('workflow dos envios por e-mail', () => {
  const wf = ler('.github/workflows/alertas.yml');
  const linhas = wf.split(/\r?\n/);
  const comentarios = linhas.filter((l) => l.trim().startsWith('#')).join('\n');
  const semComentarios = linhas.filter((l) => !l.trim().startsWith('#')).join('\n');

  it('uma só agenda diária às 10:07 UTC (7h07 em Brasília, fora da hora cheia) e disparo à mão com o modo', () => {
    // O GitHub atrasa ou perde agendamentos na hora cheia; alguns minutos depois das 7h é mais confiável.
    expect([...semComentarios.matchAll(/- cron: '([^']+)'/g)].map((m) => m[1])).toEqual(['7 10 * * *']);
    expect(comentarios).toMatch(/10:07 UTC/);
    expect(comentarios).toMatch(/hora cheia/);
    expect(wf).toContain('workflow_dispatch:');
    expect(wf).toMatch(/modo:\r?\n\s+description: .+\r?\n\s+type: choice\r?\n\s+options:\r?\n\s+- alertas\r?\n\s+- resumo\r?\n\s+- ambos\r?\n\s+default: alertas/);
  });

  it('um só job, com os alertas antes do resumo; o resumo só na segunda (agenda) ou pelo modo escolhido', () => {
    expect(semComentarios.match(/^jobs:/gm)).toHaveLength(1);
    expect(semComentarios.match(/^ {4}runs-on:/gm)).toHaveLength(1);
    expect(semComentarios.match(/^ {4}timeout-minutes:/gm)).toHaveLength(1);
    const iAlertas = semComentarios.indexOf('npm run worker:alertas');
    const iResumo = semComentarios.indexOf('npm run worker:resumo');
    expect(iAlertas).toBeGreaterThan(0);
    expect(iResumo).toBeGreaterThan(iAlertas);
    // a segunda é calculada num passo anterior, em UTC (10:07 UTC é o mesmo dia em Brasília)
    const iSegunda = semComentarios.indexOf('date -u +%u');
    expect(iSegunda).toBeGreaterThan(0);
    expect(iSegunda).toBeLessThan(iAlertas);
    expect(semComentarios).toContain('$GITHUB_OUTPUT');
    // o resumo roda mesmo se os alertas falharem (mas não depois de um cancelamento à mão); `!` no começo de um valor
    // YAML vira tag, então a condição vai dentro de ${{ }}
    const condResumo = semComentarios.slice(semComentarios.lastIndexOf('if:', iResumo), iResumo);
    expect(condResumo).toMatch(/^if: \$\{\{ !cancelled\(\) && \(/);
    expect(condResumo).toContain("github.event_name == 'schedule'");
    expect(condResumo).toContain("== '1'");
    expect(condResumo).toContain("inputs.modo == 'resumo'");
    expect(condResumo).toContain("inputs.modo == 'ambos'");
    // os alertas: toda agenda, ou a pedido (alertas | ambos); nunca no modo resumo
    const condAlertas = semComentarios.slice(semComentarios.lastIndexOf('if:', iAlertas), iAlertas);
    expect(condAlertas).toContain("github.event_name == 'schedule'");
    expect(condAlertas).toContain("inputs.modo == 'alertas'");
    expect(condAlertas).toContain("inputs.modo == 'ambos'");
    expect(condAlertas).not.toContain("inputs.modo == 'resumo'");
  });

  it('explica no próprio arquivo por que a ordem importa (teto diário do Resend, dividido com os códigos de login)', () => {
    expect(comentarios).toMatch(/100/);
    expect(comentarios).toMatch(/Resend/);
    expect(comentarios).toMatch(/login/i);
    expect(comentarios).toMatch(/ordem|antes/i);
  });

  it('uma rodada por vez, com teto de tempo, só leitura do repositório', () => {
    expect(wf).toMatch(/concurrency:\r?\n\s+group: alertas-email\r?\n\s+cancel-in-progress: false/);
    expect(wf).toMatch(/timeout-minutes: 15/);
    expect(wf).toMatch(/permissions:\r?\n\s+contents: read/);
  });

  it('os 4 segredos pelo ambiente nos dois passos de envio e nenhum impresso', () => {
    for (const s of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY', 'ALERTAS_SEGREDO']) {
      expect(wf.split(`${s}: \${{ secrets.${s} }}`).length - 1, s).toBe(2);
    }
    // qualquer outro uso de secrets.* seria um segredo fora desses dois passos
    expect((semComentarios.match(/secrets\./g) ?? []).length).toBe(8);
    // o único echo permitido grava o dia da semana no $GITHUB_OUTPUT (nada de segredo)
    const ecos = semComentarios.split('\n').filter((l) => /\b(echo|printf|cat)\b/.test(l));
    expect(ecos).toHaveLength(1);
    expect(ecos[0]).toContain('echo "dia_da_semana=$(date -u +%u)" >> "$GITHUB_OUTPUT"');
    expect(semComentarios).not.toMatch(/set -x|ACTIONS_STEP_DEBUG|ACTIONS_RUNNER_DEBUG/);
  });

  it('scripts e .env.example', () => {
    const scripts = JSON.parse(ler('package.json')).scripts as Record<string, string>;
    expect(scripts['worker:alertas']).toBe('tsx worker/enviar-alertas.ts');
    expect(scripts['worker:resumo']).toBe('tsx worker/enviar-alertas.ts --modo resumo');
    const exemplo = ler('.env.example');
    expect(exemplo).toMatch(/^RESEND_API_KEY=$/m);
    expect(exemplo).toMatch(/^ALERTAS_SEGREDO=$/m);
  });

  it('rodada interrompida (ex.: a contagem de hoje falhou duas vezes) vira anotação ::error:: e código 1', () => {
    const fonte = ler('worker/enviar-alertas.ts');
    const pegar = fonte.slice(fonte.lastIndexOf('} catch (erro) {'));
    expect(pegar).toMatch(/log\(`::error::\[\$\{rotulo\}\] rodada interrompida: \$\{mensagemDeErro\(erro\)\}`\)/);
    expect(pegar).toContain('process.exitCode = 1');
  });
});

describe('isolamento: salvos, alertas e resumo', () => {
  it('no site, só os módulos do servidor tocam salvos, alertas, envios e alertas_enviados', () => {
    const com = site.filter((f) => /from\(['"](salvos|alertas|envios_alerta|envios_resumo|alertas_enviados)['"]\)/.test(ler(f)));
    expect(com.sort()).toEqual(['lib/servidor/alertas.ts', 'lib/servidor/descadastro.ts', 'lib/servidor/salvos.ts']);
  });
  it('toda função exportada de salvos.ts e alertas.ts recebe o Usuario da sessão e filtra por ele', () => {
    for (const f of ['lib/servidor/salvos.ts', 'lib/servidor/alertas.ts']) {
      const fonte = ler(f);
      const funcoes = [...fonte.matchAll(/export async function (\w+)\(([^)]*)\)/g)];
      expect(funcoes.length, f).toBeGreaterThanOrEqual(5);
      for (const [, nome, params] of funcoes) expect(params, `${f} ${nome}`).toMatch(/^usuario: Usuario\b/);
      expect(fonte).toMatch(/\.eq\('user_id', usuario\.id\)|p_user: usuario\.id/);
    }
    expect(ler('lib/servidor/alertas.ts')).toContain('user_id: usuario.id');
  });
  it('rotas que mudam salvos, alertas e a preferência do resumo conferem a sessão e a origem', () => {
    const rotas = [...listar('app/api/salvos'), ...listar('app/api/alertas'), 'app/api/conta/resumo/route.ts'];
    const mudam = rotas.filter((f) => /export async function (POST|PATCH|DELETE)/.test(ler(f)));
    expect(mudam.length).toBeGreaterThanOrEqual(4);
    for (const f of mudam) {
      expect(ler(f), f).toContain('recusaForaDoSite(request)');
      expect(ler(f), f).toContain('usuarioAtual()');
    }
  });
  it('descadastro: só com token assinado, sem sessão (exceção documentada)', () => {
    const f = ler('app/api/descadastro/route.ts');
    expect(f).toContain('lerTokenDescadastro(');
    expect(f).not.toContain('usuarioAtual');
    expect(ler('app/alertas/sair/page.tsx')).toContain('lerTokenDescadastro(');
  });
  it('páginas da conta conferem a sessão', () => {
    for (const f of ['app/oportunidades/page.tsx', 'app/alertas/page.tsx', 'app/alertas/novo/page.tsx', 'app/alertas/[id]/editar/page.tsx']) {
      expect(ler(f), f).toContain('usuarioAtual()');
    }
  });
  it('nenhum arquivo de app/ fala em user_id (o dono vem só da sessão ou do token)', () => {
    expect(listar('app').filter((f) => /user_?id/i.test(ler(f)))).toEqual([]);
  });
});

describe('segredos do e-mail', () => {
  it('RESEND_API_KEY só no job e no envio do código (server-only); ALERTAS_SEGREDO só no job, em /alertas/sair e no descadastro', () => {
    expect(codigo.filter((f) => ler(f).includes('process.env.RESEND_API_KEY')).sort()).toEqual(
      ['lib/servidor/emailCodigo.ts', 'worker/enviar-alertas.ts'].sort(),
    );
    expect(ler('lib/servidor/emailCodigo.ts')).toMatch(/^import 'server-only';/);
    expect(codigo.filter((f) => ler(f).includes('process.env.ALERTAS_SEGREDO')).sort()).toEqual(
      ['app/alertas/sair/page.tsx', 'app/api/descadastro/route.ts', 'worker/enviar-alertas.ts'].sort(),
    );
  });
  it('nada de node:crypto nem segredo do e-mail no navegador', () => {
    const navegador = [...listar('components'), ...listar('lib/cliente')];
    expect(navegador.filter((f) => /node:crypto|alertas\/token|RESEND_API_KEY|ALERTAS_SEGREDO/.test(ler(f)))).toEqual([]);
  });
});

describe('eventos da Fase 4', () => {
  it('cada tipo é gravado em algum lugar (site ou job), fora da lista em lib/eventos.ts', () => {
    const fonte = codigo.filter((f) => f !== 'lib/eventos.ts').map(ler).join('\n');
    for (const t of TIPOS_EVENTO_OPORTUNIDADES) expect(fonte, t).toContain(`'${t}'`);
  });
});

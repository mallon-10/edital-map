import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { rascunhoDaBusca } from './alertaDaBusca';
import type { FiltrosTela } from './tipos';

vi.mock('next/navigation', () => ({ usePathname: () => '/radar', useRouter: () => ({}) }));

const { PaginaBloqueada } = await import('@/components/conta/PaginaBloqueada');

const tela = (p: Parameters<typeof PaginaBloqueada>[0]) => renderToStaticMarkup(createElement(PaginaBloqueada, p)).replace(/<!-- -->/g, '');
const ler = (caminho: string) => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');
const VAZIO: FiltrosTela = { q: '', uf: '', cidade: null, valorMin: null, modalidades: [], seteDias: false, orgao: null, raio: null };

describe('Meu Radar para quem não assina', () => {
  const html = tela({ recurso: 'radar', logado: false });
  it('mostra o valor, não só o bloqueio', () => {
    expect(html).toContain('Seu radar de oportunidades, sempre atualizado.');
    expect(html).toContain('Imagine entrar no Edital Map e encontrar apenas as licitações relacionadas ao que sua empresa vende.');
    expect(html).not.toContain('Meu Radar é do plano Pro');
  });
  it('a demonstração é chamada de demonstração e tem prazo, valor, lugar e status', () => {
    expect(html).toContain('Demonstração');
    for (const t of ['Encerra em', 'R$', 'Em análise', 'Vou participar']) expect(html, t).toContain(t);
  });
  it('chamada com o preço, para o checkout', () => {
    expect(html).toContain('Ativar meu Radar — R$ 37,90/mês');
    expect(html).toContain('href="/assinar?periodo=mensal"');
  });
  it('quem já assinou encontra a entrada', () => {
    expect(html).toContain('Já sou Pro: entrar');
    expect(tela({ recurso: 'radar', logado: true })).not.toContain('Já sou Pro: entrar');
  });
  it('resultados reais só de uma busca já feita, e a tela diz de onde vieram', () => {
    const c = ler('components/conta/PreviaRadar.tsx');
    expect(c).toContain('lerUltimaBusca()');
    expect(c).toContain('/api/busca?');
    expect(c).toContain('Demonstração com resultados reais da sua busca');
  });
});

describe('Alertas para quem não assina', () => {
  const html = tela({ recurso: 'alertas', logado: false });
  it('como funciona, em três passos', () => {
    for (const t of ['Escolha o que sua empresa vende', 'Defina as regiões de interesse', 'Receba novos editais automaticamente']) expect(html, t).toContain(t);
  });
  it('e-mail de exemplo marcado como tal, com a rotina certa', () => {
    expect(html).toContain('Exemplo ilustrativo');
    expect(html).toContain('Alertas de novas oportunidades todos os dias às 7h e resumo semanal às segundas-feiras.');
  });
  it('chamada pedida', () => {
    expect(html).toContain('Quero receber alertas diários');
    expect(html).toContain('href="/assinar?periodo=mensal"');
  });
});

describe('prévia do alerta vinda da busca', () => {
  const previa = rascunhoDaBusca({ ...VAZIO, q: 'uniforme', uf: 'SC' });
  const html = tela({ recurso: 'alertas', logado: false, previa, voltar: '/alertas/novo?q=uniforme&uf=SC', busca: '/?q=uniforme&uf=SC' });
  it('mostra o que foi configurado', () => {
    expect(html).toContain('Prévia do seu alerta');
    expect(html).toContain('uniforme');
    expect(html).toContain('Estados: SC');
  });
  it('diz que a ativação depende da assinatura e nunca que o alerta existe', () => {
    expect(html).toContain('Este alerta ainda não foi criado');
    expect(html).toContain('A ativação depende da assinatura');
    expect(html).not.toMatch(/alerta criado|alerta ativado|alerta ligado/i);
  });
  it('chamada para ativar e o caminho de volta à busca', () => {
    expect(html).toContain('Ativar este alerta — R$ 37,90/mês');
    expect(html).toContain('Continuar pesquisando grátis');
    expect(html).toContain('href="/?q=uniforme&amp;uf=SC"');
  });
  it('quem já é Pro entra e volta para a mesma prévia', () => {
    expect(html).toContain(`/entrar?voltar=${encodeURIComponent('/alertas/novo?q=uniforme&uf=SC')}`);
  });
  it('sem produto (edital sem assunto conhecido), não finge um', () => {
    const sem = tela({ recurso: 'alertas', logado: false, previa: rascunhoDaBusca({ ...VAZIO, uf: 'SC' }), busca: '/?uf=SC' });
    expect(sem).toContain('Você escolhe os produtos ao ativar');
  });
});

describe('Minhas Oportunidades', () => {
  it('continua com o exemplo apagado e o cadeado', () => {
    const html = tela({ recurso: 'oportunidades', logado: false });
    expect(html).toContain('Liberar o Pro');
    expect(html).toContain('Minhas Oportunidades é do plano Pro');
  });
});

describe('continuidade depois da compra', () => {
  it('a prévia guarda os filtros e o onboarding os usa, apagando no fim', () => {
    expect(ler('components/conta/VitrineAlertas.tsx')).toContain('<GuardarRascunho');
    const o = ler('components/radar/OnboardingRadar.tsx');
    expect(o).toContain('lerRascunhoAlerta()');
    expect(o).toContain('esquecerRascunhoAlerta()');
  });
  it('Pro chega ao formulário preenchido e, sem sessão, entra e volta para ele', () => {
    const p = ler('app/alertas/novo/page.tsx');
    expect(p).toContain('rascunhoDaBusca(');
    expect(p).toContain('encodeURIComponent(destino)');
  });
});

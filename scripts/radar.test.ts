import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ler = (caminho: string) => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');

describe('página Meu Radar', () => {
  const pagina = ler('app/radar/page.tsx');
  it('exige conta e manda quem não tem radar para o onboarding', () => {
    expect(pagina).toContain('await usuarioAtual()');
    expect(pagina).toContain("redirect('/entrar?voltar=/radar')");
    expect(pagina).toContain("redirect('/radar/comecar')");
  });
  it('fora do Google', () => {
    expect(pagina).toContain('robots: { index: false, follow: false }');
  });
  it('não conta busca do grátis (o radar é o perfil, não uma busca avulsa)', () => {
    expect(pagina).not.toContain('decidirBusca');
    expect(pagina).not.toContain('registrar_uso');
  });
  it('prévia de 5 no grátis com o cartão dos planos; páginas só fora da prévia', () => {
    expect(pagina).toContain('vistaDoRadar(');
    expect(pagina).toContain('<CartaoPreviaRadar');
    expect(pagina).toMatch(/!vista\.previa \? \(\s*<PaginacaoRadar/);
  });
  it('a prévia usa o mesmo total do cartão (contagens, sem cache), não o total da lista em cache', () => {
    expect(pagina).toContain('<CartaoPreviaRadar total={contagens.total} />');
    expect(pagina).toContain('contagens.total > VISIVEIS_GRATIS');
  });
  it('lista com os cards da Fase 2 e a visita registrada ao sair', () => {
    expect(pagina).toContain('<CardLista');
    expect(pagina).toContain('<RegistrarVisitaRadar />');
    const visita = ler('components/radar/RegistrarVisitaRadar.tsx');
    // JSON do próprio site (a rota passa por recusaForaDoSite); keepalive sobrevive à saída da página.
    expect(visita).toContain("fetch('/api/radar/visita'");
    expect(visita).toContain('keepalive: true');
    expect(visita).toContain("'content-type': 'application/json'");
    // Celular (iOS pula o pagehide): também ao esconder a aba; voltar do bfcache libera um novo registro.
    expect(visita).toContain("addEventListener('visibilitychange'");
    expect(visita).toContain("document.visibilityState === 'hidden'");
    expect(visita).toContain("addEventListener('pageshow'");
    expect(visita).toMatch(/persisted\) feito = false/);
  });
});

describe('onboarding', () => {
  it('onboarding_iniciado só uma vez por visitante (recarregar ou voltar não infla o funil)', () => {
    const pagina = ler('app/radar/comecar/page.tsx');
    expect(pagina).toContain("gravarEventoUmaVez(ctx, 'onboarding_iniciado'");
    expect(pagina).not.toContain("gravarEvento(ctx, 'onboarding_iniciado'");
  });
});

describe('editar radar', () => {
  const pagina = ler('app/radar/editar/page.tsx');
  it('exige conta; sem radar vai ao onboarding; formulário no modo editar com os municípios pelo nome', () => {
    expect(pagina).toContain('await usuarioAtual()');
    expect(pagina).toContain("redirect('/entrar?voltar=/radar/editar')");
    expect(pagina).toContain("redirect('/radar/comecar')");
    expect(pagina).toContain('<FormRadar modo="editar"');
    expect(pagina).toContain('municipiosPorIbge(radar.municipios)');
  });
  it('fora do Google', () => {
    expect(pagina).toContain('robots: { index: false, follow: false }');
  });
});

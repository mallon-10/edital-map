import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ler = (caminho: string) => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');
const existe = (caminho: string) => existsSync(new URL(`../${caminho}`, import.meta.url));

describe('/alertas com conta', () => {
  const pagina = ler('app/alertas/page.tsx');
  it('sem conta: convite para entrar (o formulário antigo saiu)', () => {
    expect(pagina).toContain('usuarioAtual()');
    expect(pagina).toContain('/entrar?voltar=/alertas');
    expect(pagina).not.toContain('FormAlerta ufsIniciais');
    expect(existe('components/FormAlerta.tsx')).toBe(false);
    expect(ler('lib/eventos.ts')).not.toContain('validarPedidoAlerta');
    expect(ler('lib/servidor/registro.ts')).not.toContain('gravarPedido');
  });
  it('com conta: criar, criar a partir do radar, aviso do plano no navegador, envio indisponível, resumo semanal', () => {
    for (const t of ['href="/alertas/novo"', 'href="/alertas/novo?de=radar"', 'Criar alerta a partir do meu radar', 'avisoPlanoNavegador(', 'envioIndisponivel(', 'AVISO_ENVIO_INDISPONIVEL', '<ResumoSemanal']) {
      expect(pagina, t).toContain(t);
    }
  });
  it('item: editar, pausar/retomar e excluir com confirmação', () => {
    const item = ler('components/alertas/ItemAlerta.tsx');
    for (const t of ['/editar', "'Pausar'", "'Retomar'", 'window.confirm(', "'DELETE'", '{ ativo: !alerta.ativo }']) expect(item, t).toContain(t);
  });
  it('formulário: nome + as mesmas seções do radar; POST ao criar, PATCH ao editar', () => {
    const form = ler('components/alertas/FormAlerta.tsx');
    for (const t of ['<CampoTermos', '<CampoLocal', '<CamposOportunidade', "pedirJson('/api/alertas', 'POST'", "'PATCH'", 'maxLength={MAX_NOME_ALERTA}']) {
      expect(form, t).toContain(t);
    }
    expect(ler('components/radar/FormRadar.tsx')).toContain('<CamposOportunidade');
  });
  it('páginas novas exigem conta e ficam fora do Google; edital leva a /alertas', () => {
    for (const f of ['app/alertas/novo/page.tsx', 'app/alertas/[id]/editar/page.tsx']) {
      expect(ler(f), f).toContain('usuarioAtual()');
      expect(ler(f), f).toContain('robots: { index: false, follow: false }');
    }
    expect(ler('app/edital/[slug]/page.tsx')).toContain('href="/alertas"');
  });
});

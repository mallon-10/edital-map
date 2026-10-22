import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const m = vi.hoisted(() => ({ gerarCodigo: vi.fn(async (_e: string): Promise<string | null> => '482913') }));
vi.mock('./emailCodigo', () => ({ gerarCodigo: m.gerarCodigo }));

const { enviarBoasVindas } = await import('./emailBoasVindas');

const resposta = (status: number) => new Response(JSON.stringify(status < 300 ? { id: 'msg' } : { name: 'erro' }), { status });
let fetchFalso: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubEnv('RESEND_API_KEY', 're_teste');
  m.gerarCodigo.mockClear();
  m.gerarCodigo.mockResolvedValue('482913');
  fetchFalso = vi.fn(async () => resposta(200));
  vi.stubGlobal('fetch', fetchFalso);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const corpoEnviado = (i = 0) => JSON.parse(String((fetchFalso.mock.calls[i] as [string, RequestInit])[1].body)) as Record<string, unknown>;
const cabecalhos = (i = 0) => (fetchFalso.mock.calls[i] as [string, RequestInit])[1].headers as Record<string, string>;

describe('enviarBoasVindas', () => {
  it('gera o código da conta e manda o e-mail pelo Resend, com chave de idempotência pelo pedido', async () => {
    expect(await enviarBoasVindas('maria@exemplo.com', 'mensal', 'ped-1', 0)).toBe(true);
    expect(m.gerarCodigo).toHaveBeenCalledWith('maria@exemplo.com');
    expect(fetchFalso).toHaveBeenCalledTimes(1);
    expect((fetchFalso.mock.calls[0] as [string])[0]).toBe('https://api.resend.com/emails');
    const corpo = corpoEnviado();
    expect(corpo).toMatchObject({ from: 'Edital Map <nao-responda@editalmap.com.br>', to: ['maria@exemplo.com'] });
    expect(String(corpo.html)).toContain('482913');
    expect(cabecalhos()['idempotency-key']).toMatch(/^boas-vindas-[0-9a-f]{64}$/);
  });

  it('sem chave do Resend: não tenta', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    expect(await enviarBoasVindas('maria@exemplo.com', 'mensal', 'ped-1', 0)).toBe(false);
    expect(fetchFalso).not.toHaveBeenCalled();
    expect(m.gerarCodigo).not.toHaveBeenCalled();
  });

  it('código não gerado: manda mesmo assim, com o botão para pedir o código', async () => {
    m.gerarCodigo.mockResolvedValue(null);
    expect(await enviarBoasVindas('maria@exemplo.com', 'anual', 'ped-1', 0)).toBe(true);
    expect(String(corpoEnviado().html)).toContain('Enviar código');
  });

  it('Resend fora (5xx ou rede): tenta de novo até 3 vezes com a mesma chave', async () => {
    fetchFalso.mockResolvedValueOnce(resposta(500)).mockRejectedValueOnce(new Error('rede')).mockResolvedValueOnce(resposta(200));
    expect(await enviarBoasVindas('maria@exemplo.com', 'mensal', 'ped-1', 0)).toBe(true);
    expect(fetchFalso).toHaveBeenCalledTimes(3);
    expect(cabecalhos(2)['idempotency-key']).toBe(cabecalhos(0)['idempotency-key']);
  });

  it('recusa definitiva (4xx) não repete; nada vai a log com o e-mail', async () => {
    fetchFalso.mockResolvedValue(resposta(422));
    expect(await enviarBoasVindas('maria@exemplo.com', 'mensal', 'ped-1', 0)).toBe(false);
    expect(fetchFalso).toHaveBeenCalledTimes(1);
    expect(JSON.stringify((console.error as unknown as ReturnType<typeof vi.fn>).mock.calls)).not.toContain('maria@exemplo.com');
  });
});

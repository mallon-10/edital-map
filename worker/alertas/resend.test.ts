import { describe, expect, it, vi } from 'vitest';
import { cotaEsgotada, criarEnvioResend, ESPERAS_REENVIO_MS, repetivel, type Mensagem } from './resend';

const MSG: Mensagem = {
  para: 'dono@empresa.com.br', assunto: '1 edital novo para "EPI"', html: '<p>x</p>', texto: 'x',
  cabecalhos: { 'List-Unsubscribe': '<https://www.editalmap.com.br/api/descadastro?t=t>', 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  idempotencia: 'alertas/u/abc',
};
const resposta = (status: number, corpo: unknown) => new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json' } });

describe('envio pelo Resend', () => {
  it('aceito de primeira: id e 1 tentativa; pedido com chave, remetente, cabeçalhos e idempotência', async () => {
    const buscar = vi.fn(async (..._a: unknown[]) => resposta(200, { id: 'msg-1' }));
    const esperar = vi.fn(async (_ms: number) => undefined);
    const r = await criarEnvioResend({ chave: 're_teste', buscar: buscar as unknown as typeof fetch, esperar })(MSG);
    expect(r).toEqual({ ok: true, id: 'msg-1', tentativas: 1 });
    const [url, init] = buscar.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    const h = init.headers as Record<string, string>;
    expect(h.authorization).toBe('Bearer re_teste');
    expect(h['idempotency-key']).toBe('alertas/u/abc');
    expect(JSON.parse(String(init.body))).toEqual({
      from: 'Edital Map <alertas@editalmap.com.br>', to: ['dono@empresa.com.br'], subject: MSG.assunto, html: MSG.html, text: MSG.texto, headers: MSG.cabecalhos,
    });
    expect(esperar).not.toHaveBeenCalled();
  });
  it('sem opções de rastreio no pedido (rastreio de clique e abertura é do domínio no Resend)', async () => {
    const buscar = vi.fn(async (..._a: unknown[]) => resposta(200, { id: 'msg-1' }));
    await criarEnvioResend({ chave: 'k', buscar: buscar as unknown as typeof fetch, esperar: async () => undefined })(MSG);
    const corpo = JSON.parse(String((buscar.mock.calls[0] as [string, RequestInit])[1].body)) as Record<string, unknown>;
    expect(Object.keys(corpo).sort()).toEqual(['from', 'headers', 'html', 'subject', 'text', 'to']);
  });
  it('429 e 5xx: tenta de novo esperando 2, 4 e 8 s', async () => {
    const buscar = vi.fn().mockResolvedValueOnce(resposta(429, { message: 'limite' })).mockResolvedValueOnce(resposta(503, {})).mockResolvedValueOnce(resposta(200, { id: 'msg-2' }));
    const esperar = vi.fn(async (_ms: number) => undefined);
    expect(await criarEnvioResend({ chave: 'k', buscar: buscar as unknown as typeof fetch, esperar })(MSG)).toEqual({ ok: true, id: 'msg-2', tentativas: 3 });
    expect(esperar.mock.calls.map((c) => c[0])).toEqual([2000, 4000]);
  });
  it('429 rate_limit_exceeded e 409 (idempotência em andamento) repetem', async () => {
    const buscar = vi
      .fn()
      .mockResolvedValueOnce(resposta(429, { name: 'rate_limit_exceeded', message: 'Too many requests. You can only make 2 requests per second.' }))
      .mockResolvedValueOnce(resposta(409, { name: 'concurrent_idempotent_requests', message: 'em andamento' }))
      .mockResolvedValueOnce(resposta(200, { id: 'msg-4' }));
    const esperar = vi.fn(async (_ms: number) => undefined);
    expect(await criarEnvioResend({ chave: 'k', buscar: buscar as unknown as typeof fetch, esperar })(MSG)).toEqual({ ok: true, id: 'msg-4', tentativas: 3 });
    expect(esperar.mock.calls.map((c) => c[0])).toEqual([2000, 4000]);
  });
  it('falha final depois de 4 tentativas; o erro não traz a chave', async () => {
    const buscar = vi.fn(async () => resposta(500, { message: 'fora' }));
    const esperar = vi.fn(async (_ms: number) => undefined);
    const r = await criarEnvioResend({ chave: 're_segredo', buscar: buscar as unknown as typeof fetch, esperar })(MSG);
    expect(r).toEqual({ ok: false, erro: 'Resend 500: fora', tentativas: 4 });
    expect(esperar.mock.calls.map((c) => c[0])).toEqual([...ESPERAS_REENVIO_MS]);
    expect(JSON.stringify(r)).not.toContain('re_segredo');
  });
  it('4xx (pedido errado) não repete; rede caída repete', async () => {
    const um = vi.fn(async () => resposta(422, { message: 'inválido' }));
    expect(await criarEnvioResend({ chave: 'k', buscar: um as unknown as typeof fetch, esperar: async () => undefined })(MSG)).toEqual({ ok: false, erro: 'Resend 422: inválido', tentativas: 1 });
    const rede = vi.fn().mockRejectedValueOnce(new Error('ECONNRESET')).mockResolvedValueOnce(resposta(200, { id: 'msg-3' }));
    expect(await criarEnvioResend({ chave: 'k', buscar: rede as unknown as typeof fetch, esperar: async () => undefined })(MSG)).toEqual({ ok: true, id: 'msg-3', tentativas: 2 });
  });
  it('cota esgotada (diária ou mensal): falha final sem repetir, marcada', async () => {
    for (const corpo of [
      { name: 'daily_quota_exceeded', message: 'You have reached your daily email sending quota.' },
      { name: 'monthly_quota_exceeded', message: 'You have reached your monthly email sending quota.' },
      { name: 'outro', message: 'Sending quota exceeded' },
    ]) {
      const buscar = vi.fn(async () => resposta(429, corpo));
      const esperar = vi.fn(async (_ms: number) => undefined);
      const r = await criarEnvioResend({ chave: 'k', buscar: buscar as unknown as typeof fetch, esperar })(MSG);
      expect(r).toEqual({ ok: false, erro: `Resend 429: ${corpo.message}`, tentativas: 1, cotaEsgotada: true });
      expect(buscar).toHaveBeenCalledTimes(1);
      expect(esperar).not.toHaveBeenCalled();
    }
  });
  it('o erro não leva e-mail nem a chave, mesmo se o Resend os devolver', async () => {
    const buscar = vi.fn(async () => resposta(422, { message: 'Invalid `to` field: dono@empresa.com.br (key re_segredo123)' }));
    const r = await criarEnvioResend({ chave: 're_segredo123', buscar: buscar as unknown as typeof fetch, esperar: async () => undefined })(MSG);
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r)).not.toContain('dono@empresa.com.br');
    expect(JSON.stringify(r)).not.toContain('re_segredo123');
  });
  it('o que repete', () => {
    expect([null, 409, 429, 500, 503].map(repetivel)).toEqual([true, true, true, true, true]);
    expect([200, 400, 401, 403, 422].map(repetivel)).toEqual([false, false, false, false, false]);
  });
  it('o que é cota esgotada', () => {
    expect(cotaEsgotada(429, { name: 'daily_quota_exceeded' })).toBe(true);
    expect(cotaEsgotada(429, { name: 'monthly_quota_exceeded' })).toBe(true);
    expect(cotaEsgotada(429, { message: 'daily QUOTA reached' })).toBe(true);
    expect(cotaEsgotada(429, { name: 'rate_limit_exceeded', message: 'Too many requests' })).toBe(false);
    expect(cotaEsgotada(429, null)).toBe(false);
    expect(cotaEsgotada(403, { name: 'daily_quota_exceeded' })).toBe(false);
  });
});

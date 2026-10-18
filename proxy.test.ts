import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { proxy } from './proxy';

const pedir = (ua: string) => new NextRequest('https://www.editalmap.com.br/edital/x', { headers: { 'user-agent': ua } });

describe('proxy', () => {
  it('navegador sem cookie recebe em_visitante', async () => {
    const r = await proxy(pedir('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0 Safari/537.36'));
    expect(r.cookies.get('em_visitante')?.value).toMatch(/^[0-9a-f-]{36}$/);
  });
  it('link do e-mail de entrar cai na inicial com ?code=: segue para /entrar/confirmar', async () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0 Safari/537.36';
    const r = await proxy(new NextRequest('https://www.editalmap.com.br/?code=0b6f8a52-3c1d-4e2f-9a7b-1c2d3e4f5a6b', { headers: { 'user-agent': ua } }));
    expect(r.status).toBe(307);
    expect(r.headers.get('location')).toBe('https://www.editalmap.com.br/entrar/confirmar?code=0b6f8a52-3c1d-4e2f-9a7b-1c2d3e4f5a6b');
    // Busca normal na inicial não é desviada.
    const busca = await proxy(new NextRequest('https://www.editalmap.com.br/?q=luva', { headers: { 'user-agent': ua } }));
    expect(busca.headers.get('location')).toBeNull();
  });
  it('robô segue sem cookie (nada é contado)', async () => {
    const r = await proxy(pedir('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'));
    expect(r.cookies.get('em_visitante')).toBeUndefined();
  });
});

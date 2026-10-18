import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { proxy } from './proxy';

const pedir = (ua: string) => new NextRequest('https://www.editalmap.com.br/edital/x', { headers: { 'user-agent': ua } });

describe('proxy', () => {
  it('navegador sem cookie recebe em_visitante', async () => {
    const r = await proxy(pedir('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0 Safari/537.36'));
    expect(r.cookies.get('em_visitante')?.value).toMatch(/^[0-9a-f-]{36}$/);
  });
  it('robô segue sem cookie (nada é contado)', async () => {
    const r = await proxy(pedir('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'));
    expect(r.cookies.get('em_visitante')).toBeUndefined();
  });
});

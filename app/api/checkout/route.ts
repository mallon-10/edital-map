/** Endereço da revisão 1 (checkout hospedado da Cakto): o checkout agora é próprio, em /assinar. */
export function GET(request: Request) {
  const url = new URL(request.url);
  const periodo = url.searchParams.get('periodo') === 'anual' ? 'anual' : 'mensal';
  return new Response(null, { status: 308, headers: { Location: new URL(`/assinar?periodo=${periodo}`, url).toString() } });
}

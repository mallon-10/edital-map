import { gerarCsv, nomeArquivo } from '@/lib/csv';
import { LIMITES } from '@/lib/eventos';
import { lerFiltros } from '@/lib/filtros';
import { exportarEditais } from '@/lib/servidor/consultas';
import { contexto, exportacaoDentroDoLimite, gravarEvento } from '@/lib/servidor/registro';

/** Planilha (CSV) com os editais da busca atual: os mesmos parâmetros de /api/busca, desde o começo, até 2.000 (e 4 MB). */
export async function GET(request: Request) {
  const filtros = lerFiltros(new URL(request.url).searchParams);
  try {
    const ctx = await contexto();
    if (!(await exportacaoDentroDoLimite(ctx.ipHash, LIMITES.exportacoesPorHora))) {
      return Response.json(
        { erro: `Limite de ${LIMITES.exportacoesPorHora} exportações por hora atingido. Tente de novo mais tarde.` },
        { status: 429 },
      );
    }
    const editais = await exportarEditais(filtros);
    const agora = new Date();
    // A medição (que também conta o limite) não pode impedir o download.
    await gravarEvento(ctx, 'usou_recurso', { recurso: 'exportou', total: editais.length }).catch((erro: unknown) => console.error(erro));
    return new Response(gerarCsv(editais), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${nomeArquivo(agora)}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (erro) {
    console.error(erro);
    return Response.json({ erro: 'Não foi possível exportar agora. Tente de novo.' }, { status: 502 });
  }
}

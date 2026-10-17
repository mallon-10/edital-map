import type { MultiPolygon, Polygon } from 'geojson';

/** Nome de cada UF, para os rótulos do mapa. */
export const NOMES_UF: Readonly<Record<string, string>> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal',
  ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais',
  PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
};

/**
 * Posição manual do nome ([lng, lat]) para a UF cujo centro calculado fique ruim no mapa.
 * Começa vazio; só entra UF que a conferência visual (Task 7) mostrar fora do lugar.
 */
export const AJUSTES_ROTULO: Readonly<Record<string, [number, number]>> = {};

/** Centro por área ([lng, lat]) do maior anel externo: num multipolígono, as ilhas não puxam o nome. */
export function centroDoEstado(g: Polygon | MultiPolygon): [number, number] {
  const poligonos = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  let melhor: [number, number] = [0, 0];
  let maiorArea = 0;
  for (const [anel] of poligonos) {
    let a = 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < anel.length - 1; i++) {
      const [x0, y0] = anel[i];
      const [x1, y1] = anel[i + 1];
      const f = x0 * y1 - x1 * y0;
      a += f;
      cx += (x0 + x1) * f;
      cy += (y0 + y1) * f;
    }
    if (Math.abs(a) > maiorArea) {
      maiorArea = Math.abs(a);
      melhor = [cx / (3 * a), cy / (3 * a)];
    }
  }
  return melhor;
}

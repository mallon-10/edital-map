import type { LinhaMunicipio } from './banco';

export const UF_POR_CODIGO: Record<string, string> = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
  '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL', '28': 'SE', '29': 'BA',
  '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP',
  '41': 'PR', '42': 'SC', '43': 'RS',
  '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF',
};

export const CABECALHO_MUNICIPIOS = 'codigo_ibge,nome,latitude,longitude,capital,codigo_uf,siafi_id,ddd,fuso_horario';

export function lerMunicipiosCsv(texto: string): LinhaMunicipio[] {
  const linhas = texto
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '');
  if (linhas[0] !== CABECALHO_MUNICIPIOS) throw new Error(`Cabeçalho inesperado: ${linhas[0]}`);
  return linhas.slice(1).map((linha, i) => {
    const campos = linha.split(',');
    if (campos.length !== 9) throw new Error(`Linha ${i + 2}: esperava 9 campos, veio ${campos.length}`);
    const [codigo, nome, latitude, longitude, , codigoUf] = campos;
    const uf = UF_POR_CODIGO[codigoUf];
    if (!uf) throw new Error(`Linha ${i + 2}: codigo_uf desconhecido ${codigoUf}`);
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error(`Linha ${i + 2}: coordenadas inválidas`);
    return { codigo_ibge: codigo, nome, uf, lat, lng };
  });
}

export function validarMunicipios(linhas: LinhaMunicipio[]): void {
  if (linhas.length !== 5571) throw new Error(`Esperava 5571 municípios, veio ${linhas.length}`);
  const ufs = new Set(linhas.map((m) => m.uf));
  if (ufs.size !== 27) throw new Error(`Esperava 27 UFs, veio ${ufs.size}`);
  const codigos = new Set(linhas.map((m) => m.codigo_ibge));
  if (codigos.size !== linhas.length) throw new Error('Há código IBGE repetido');
}

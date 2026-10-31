import 'server-only';
import { type AssuntoContado, montarPanorama, type Panorama, type PanoramaBruto } from '../panorama';
import { ASSUNTOS } from '../seo/assuntos';
import { comNovaTentativa, emLotes } from '../seo/sitemap';
import { abertosPorUf, cacheHora } from './consultas';
import { supabaseServidor } from './supabase';

const CONTAGENS_POR_VEZ = 4;

/** Números da página /panorama: 0025 e a contagem de cada assunto, a mesma do sitemap. Cache de 1 h, tudo junto. */
export function dadosDoPanorama(): Promise<Panorama> {
  return cacheHora('panorama', async () => {
    const { data, error } = await supabaseServidor().rpc('panorama_abertos', {});
    if (error) throw new Error(`panorama_abertos: ${error.message}`);
    const contagens = await emLotes(ASSUNTOS, CONTAGENS_POR_VEZ, async (a): Promise<AssuntoContado> => {
      const porUf = await comNovaTentativa(() => abertosPorUf(a.termo));
      return { slug: a.slug, nome: a.nome, total: Object.values(porUf ?? {}).reduce((soma, n) => soma + n, 0) };
    });
    return montarPanorama(data as PanoramaBruto, contagens);
  });
}

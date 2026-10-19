/**
 * Robôs de busca e de pré-visualização. Robô não recebe em_visitante (proxy.ts): sem cookie nada é gravado em nome dele
 * (eventos, visitante). Imitar um robô dá o mesmo que apagar os cookies.
 */
const ROBO = /googlebot|google-inspectiontool|bingbot|duckduckbot|yandex|applebot|facebookexternalhit|bot\b|bot\/|crawler|spider|slurp/i;

export function ehRobo(userAgent: string | null): boolean {
  return !!userAgent && ROBO.test(userAgent);
}

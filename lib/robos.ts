/**
 * Robôs de busca e de pré-visualização. Robô não recebe em_visitante (proxy.ts): sem cookie nada é contado nem gravado em
 * uso_diario. Imitar um robô dá o mesmo que apagar os cookies (o limite do grátis é um lembrete; spec de Planos §3).
 */
const ROBO = /googlebot|google-inspectiontool|bingbot|duckduckbot|yandex|applebot|facebookexternalhit|bot\b|bot\/|crawler|spider|slurp/i;

export function ehRobo(userAgent: string | null): boolean {
  return !!userAgent && ROBO.test(userAgent);
}

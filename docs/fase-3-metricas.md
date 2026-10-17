# Fase 3 · Brasil todo · métricas

## M1 · palavras e resumo dos itens (SC, PR, RS)

| Momento | Banco | contratacoes | itens | Abertas |
|---|---|---|---|---|
| Antes da 0005 (16/10 22:33 UTC) | 321,5 MB | 133,9 MB | 175,0 MB | 9.247 |
| Depois da 0005 + releitura (16/10 ~23:00 UTC) | 358,9 MB | 171,2 MB | 175,0 MB | 9.268 |

O aumento em `contratacoes` são versões antigas das linhas (o `UPDATE` da 0005 e da releitura); saem com o `VACUUM FULL` do M2.

- 0005 aplicada em 6,6 s.
- Conferência [M1-a] (perdidas = 0 em todos os termos): nitrílica 69/69, luva 320/320, botina 31/31, capacete 48/48, "EPI e uniformes" 556/556, "cadeira de rodas" 95 → 150 (55 a mais, palavras em itens diferentes do mesmo edital, por desenho).
- [M1-b] 0 sem resumo, 0 com total diferente; [M1-c] permissões certas (anon sem execução; service_role com execução); [M1-d] 9.247 = 9.247.
- Releitura: 9.267 compras, 9.227 com itens, 40 falhas, 8 min. Depois dela: 0 abertas sem resumo.
- Primeira rodada do sync com o worker novo (GitHub, workflow_dispatch): 4 min 46 s, 24 compras com itens buscados, 160 itens lidos, 0 erros.

## M2 · sem a tabela de itens, retenção e sync a cada 3 h

| Momento | Banco | contratacoes | Linhas | Abertas |
|---|---|---|---|---|
| Antes da 0006 (16/10 ~22:45 UTC) | 358,9 MB | 171,2 MB | 89 mil | 9.268 |
| Depois da 0006 (antes do VACUUM) | 183,9 MB | 171,2 MB | 11.819 | 9.268 |
| Depois do `VACUUM FULL` (2 s) | 52,9 MB | 40,2 MB | 11.819 | 9.268 |

- [M2]: tabela `itens` não existe mais; 0 contratações fora da retenção; jobs `sync-pncp` '17 */3 * * *' e `retencao-contratacoes` '45 4 * * *' ativos.
- Main recebeu só o M2 (até 6cd4b53): workflow do GitHub a cada 3 h, ainda com `UFS: SC,PR,RS`.

## M3 · Brasil todo

- `/proposta` (modalidade 12): `dataFinal` = hoje → 7 registros; hoje + 365 → 8.446. Carga com `--proposta-ate 2027-10-16`.
- Carga nacional (máquina do dono, 16/10 ~22:50 → 17/10 ~02:47 UTC): 14.226 s (3 h 57 min), 2.827 páginas, 140.680 contratações válidas, 68.866 gravadas, 71.814 fora da retenção, 25.297 compras com itens, 520.660 itens lidos, 0 inválidos, 0 erros, 211 respostas 429. Por modalidade: 6 → 1.050 pág / 4.935 s; 8 → 1.350 / 6.667 s; 4 → 192 / 1.578 s; 7 → 21 / 64 s; 12 → 214 / 982 s.
- Meio da carga (depois de 6 e 8): banco 131,3 MB.
- Depois da carga: 34.562 abertas nas 27 UFs (SP 5.946, MG 5.407, RS 3.480, PR 3.368, BA 2.817, RJ 1.409, GO 1.299, CE 1.129, … AP 52); 45.267 contratações; 0 abertas sem resumo; banco 158 MB.
- Sync nacional local até as chaves BR ficarem em dia: 724 s, 217 páginas, 4.377 gravadas, 0 erros.
- Rodadas nacionais no GitHub: 18,3 min (workflow_dispatch, 1 dia e meio de atualizações), 19,4 min (schedule, 04:26 UTC), 1,4 min (schedule, 10:44 UTC, 8 páginas). Repositório tornado público em 17/10 (decisão do dono) para o Actions não ter limite de minutos.
- Site: `/api/mapa` com 27 UFs e 3.485 municípios (1,8 s sem cache); busca "nitrilica" em SP: 49; site no ar com "Editais abertos de todo o Brasil".
- Conferência nacional (docs/conferencias/2026-10-17.md): passou. Abertas por UF × modalidade em SP, BA e AM entre 100% e 108% do `/proposta`; amostra de 20 compras de 17 UFs sem divergência; idempotência 45.302 → 45.302.
- Retenção: job `retencao-contratacoes` rodou em 17/10 04:45 UTC com sucesso.
- Banco final (17/10 ~12:30 UTC): 163,0 MB (`contratacoes` 150,3 MB).

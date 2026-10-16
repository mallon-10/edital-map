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

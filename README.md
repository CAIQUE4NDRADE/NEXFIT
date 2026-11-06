# NEXFIT

**Treino · Dieta · Foco** — app web (PWA) de musculação com timer de descanso, histórico de cargas, evolução corporal e sincronização na nuvem.

- Hospedagem: GitHub Pages
- Banco e login: Supabase (RLS em todas as tabelas — cada usuário só vê os próprios dados)
- Funciona offline e pode ser instalado na tela inicial do celular

## Estrutura
| Arquivo | O que é |
|---|---|
| `index.html` | App completo |
| `nexfit-cloud.js` | Login e sincronização com o Supabase |
| `sw.js` | Modo offline |
| `img/` | Imagens dos exercícios |
| `supabase/schema.sql` | Banco completo (pode rodar de novo sem erro) |

## Roadmap
- [x] Fase 1 — App leve, NEXFIT, timer à prova de tela apagada
- [x] Fase 2 — Login e sincronização dos treinos
- [ ] Fase 3 — Dieta (refeições, calorias, macros) e água
- [ ] Fase 4 — Painel "Hoje": metas, sequência de dias, hábitos, lembretes
- [ ] Fase 5 — Coach IA (Supabase Edge Function)

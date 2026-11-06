# NEXFIT 2.0

**Treine. Acompanhe. Evolua.** — app de treino, comida e evolução feito para ser fácil para qualquer pessoa, inclusive quem não tem costume com tecnologia.

🔗 **https://caique4ndrade.github.io/NEXFIT/**

## O que faz
- **Colar o treino do personal** — copia a mensagem do WhatsApp, cola, e o app entende e monta as fichas (séries, repetições, carga, descanso, dias da semana, cardio).
- **Treino ao vivo** — um exercício por vez, foto, carga da última vez, botão gigante *TERMINEI A SÉRIE*, desfazer, corrigir, trocar exercício (aparelho ocupado).
- **Cronômetro automático** — começa sozinho ao terminar a série, ±15 s, pausar, pular; conta pelo relógio real, sobrevive à tela bloqueada e ao recarregar; avisa com voz, som, vibração e notificação.
- **Comida e água** — Tabela TACO (591 alimentos), medidas caseiras (concha, colher, unidade), calorias e macros, copos de água, repetir refeição de ontem, alimento pelo rótulo.
- **Evolução** — peso, cargas por exercício, recordes, medidas, fotos (antes/depois), calendário, frequência semanal, comparação entre períodos.
- **Acessível** — tema claro/escuro, letra Normal/Grande/Muito grande, botões de no mínimo 56 px, texto sempre ao lado do ícone, contraste AA.
- **Funciona sem internet** (PWA) e com login opcional (Supabase) para usar em vários aparelhos.

## Estrutura
```
index.html            casca do app
css/tokens.css        cores, temas e tamanhos (design system)
css/app.css           layout e componentes
css/screens.css       estilos de cada tela
js/app.js             rotas, tema, cronômetro na tela
js/store.js           dados + migração do app antigo (SOUZA EVOLUTION / NEXFIT v1)
js/timer.js           motor do cronômetro (timestamps, persistência)
js/alerts.js          som, voz, vibração, notificação, tela acesa
js/workout.js         lógica do treino ao vivo
js/fichas.js          lógica das fichas (criar, importar, trocar)
js/parser.js          leitor do texto do personal
js/stats.js           cálculos (recordes, sequência, comparação)
js/cloud.js           login e sincronização (Supabase)
js/ui.js, charts.js   componentes e gráficos reutilizáveis
js/screens/*.js       telas: hoje, treinar, aovivo, importar, ficha, biblioteca, comida, evolucao, ajustes
js/data/*.js          exercícios, alimentos TACO, fichas antigas
supabase/schema.sql   banco (RLS em todas as tabelas)
```
Sem build: HTML + JavaScript (módulos) puro. Para mexer, edite os arquivos e faça push — o GitHub Pages publica sozinho.

## Créditos
Desenvolvido por **Caique Andrade** — [github.com/CAIQUE4NDRADE](https://github.com/CAIQUE4NDRADE).

Alimentos: Tabela TACO 4ª ed. (NEPA/UNICAMP) via [taco-api](https://github.com/raulfdm/taco-api) (MIT). Ícones: [Lucide](https://lucide.dev) (ISC). Fontes: Atkinson Hyperlegible e Inter.

O NEXFIT ajuda a anotar e acompanhar; não substitui médico, nutricionista ou profissional de educação física.

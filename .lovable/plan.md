
# Plano: Comidinhas como Recompensa de Quests 🎯

Hoje qualquer comidinha pode ser dada a qualquer momento — o que tira a graça. Vamos transformar **cada comidinha em uma recompensa que precisa ser desbloqueada cumprindo uma tarefa fofa**, muitas delas voltadas pra rotina de casal.

---

## 1. Conceito de Quests

Cada **quest** tem:
- **título** ("foto com um garfo 🍴", "selfie juntos 💑")
- **dica** ("vai na cozinha e mostra um garfo!")
- **tipo de prova**: hoje só foto (extensível depois)
- **alvo da prova**: descrição que a IA verifica na foto (ex: "garfo, talher de mesa", "duas pessoas no enquadramento", "uma única pessoa que NÃO é quem está logado")
- **recompensa**: 1+ comidinhas (rarity → quantidade), com bônus de XP imediato
- **categoria**: `casa` (objetos do dia) | `casal` (interação dos dois) | `romantico` (premium)
- **cooldown**: por ex. mesma quest só pode ser repetida a cada X horas, pra não viciar
- **status por jogador**: disponível, em verificação, completada hoje, em cooldown

### Exemplos iniciais (~24 quests)
| Categoria | Quest | Prova | Recompensa |
|---|---|---|---|
| casa | Foto com um garfo | "garfo / talher" | 1 comidinha comum |
| casa | Foto com uma colher | "colher" | 1 comidinha comum |
| casa | Foto com a televisão | "televisão / TV" | 1 comidinha incomum |
| casa | Foto da geladeira aberta | "geladeira aberta com comida" | 2 comidinhas comuns |
| casa | Foto do céu da janela | "céu, vista de janela" | 1 comidinha incomum |
| casa | Foto do pet/objeto fofo | "bichinho ou pelúcia" | 1 comidinha incomum |
| casal | **Selfie juntos** 💑 | "duas pessoas, próximas" | 1 super-comidinha rara + XP duplo |
| casal | Foto do/a parceiro/a | "uma pessoa que não sou eu" | 1 comidinha mágica + XP triplo |
| casal | Foto de mãos dadas | "duas mãos juntas" | 1 comidinha rara |
| casal | Café da manhã pros dois | "duas xícaras / dois pratos" | 1 comidinha rara |
| romantico | Foto de um pôr-do-sol | "pôr-do-sol / sunset" | 1 comidinha mágica |
| romantico | Foto de um lugar novo juntos | "exterior + duas pessoas" | 1 comidinha mágica + skin secreto* |

*recompensas cosméticas ficam pra fase 2.

---

## 2. Mudanças no Banco

### Nova tabela `quests` (catálogo, leitura pública)
```
id uuid pk
slug text unique           -- 'foto-garfo'
title text
hint text
proof_type text            -- 'photo'
proof_target text          -- prompt que vai pra IA
category text              -- 'casa' | 'casal' | 'romantico'
reward_food_rarity text    -- comum/incomum/rara/mágica
reward_food_count int      -- quantos itens libera
reward_xp int
cooldown_minutes int       -- 0 = uma vez só, >0 = repetível
is_active bool
created_at timestamptz
```

### Nova tabela `quest_completions` (log + cooldown + estoque)
```
id uuid pk
quest_id uuid fk quests
partner_name text
photo_id uuid fk photos    -- foto que serviu de prova
status text                -- 'pending' | 'approved' | 'rejected'
ai_reason text             -- explicação curta da IA
created_at timestamptz
```

### Nova tabela `pantry_items` (despensa de comidinhas conquistadas)
```
id uuid pk
partner_name text          -- ou 'casal' (compartilhado)
food_id uuid fk food_items
source_quest_id uuid fk quests
consumed bool default false
consumed_at timestamptz
created_at timestamptz
```

### Alteração em `food_items`
- adicionar coluna `is_unlockable bool default true` — toda comidinha vira "trancada por padrão" e só aparece via despensa.
- manter um pequeno conjunto de food_items "starter" (`is_unlockable=false`) para o jogador nunca ficar sem nada de graça.

### RLS
Todas com `public read` + `public insert` (mesmo padrão atual do app). `quest_completions` e `pantry_items` também `update` público pra marcar consumo / aprovação.

---

## 3. Verificação por IA (sem pedir API key)

Usar **Lovable AI Gateway** com `google/gemini-2.5-flash` (multimodal, barato, rápido) numa **edge function** `verify-quest`:

Input: `{ quest_id, photo_url, partner_name }`
Fluxo:
1. Busca a quest (proof_target).
2. Envia pra Gemini: imagem + prompt "A imagem contém X? Responda JSON `{match: bool, reason: string}`".
3. Insere `quest_completions` com status `approved`/`rejected`.
4. Se aprovada:
   - cria N linhas em `pantry_items` (uma por comidinha aleatória da raridade).
   - dá XP imediato no `pet_state`.
   - registra `interactions` ("Cumpriu a missão X e ganhou Y").

Edge function fica em `supabase/functions/verify-quest/index.ts`. Sem necessidade de secret extra (LOVABLE_API_KEY já existe).

---

## 4. Mudanças no Frontend

### Novo drawer `QuestsDrawer.tsx`
- Botão novo na barra de ações: **🎯 missões**
- Lista as quests agrupadas por categoria, com:
  - dica + ícone da categoria
  - tag de recompensa ("ganha 1 super-comidinha 💖")
  - badge "feita hoje ✅" / "disponível em 2h ⏳" / "tirar foto 📸"
- Ao clicar em "tirar foto" → abre câmera/file picker → mostra preview → "enviar pra verificação".
- Estado durante verificação: spinner "Mochi tá conferindo… 🔍".
- Resultado:
  - ✅ "missão cumprida! ganhou 🍓 morango raro" + animação
  - ❌ "Mochi não conseguiu ver [proof_target] 🥺 — tenta de novo?" + razão da IA

### Mudança no `FoodDrawer.tsx`
- Em vez de listar `food_items` direto, lista `pantry_items` do casal **não consumidos**.
- Cada item agora some depois de usado.
- Estado vazio: "sua despensa tá vazia! cumpra missões pra ganhar comidinhas 🎯" com botão atalho pra QuestsDrawer.
- Comidinhas starter (`is_unlockable=false`) sempre disponíveis numa aba "básicas".

### Refatoração leve no `PetRoom.tsx`
- `feed()` agora consome o `pantry_item` (`update consumed=true`) e usa o `food_item` referenciado.
- Adiciona handler `openQuests`.

### Reaproveita `PhotosDrawer`?
Sim — o upload da prova usa o mesmo bucket `mochi-photos`, mas a foto fica vinculada à quest via `photo_id` em `quest_completions`. As fotos provadas continuam aparecendo na galeria (com tag "missão cumprida" opcional).

---

## 5. Anti-trapaça leve

- **Cooldown por quest** (configurável por linha) evita spam.
- IA recusa fotos óbvias de tela/print quando o prompt incluir "foto real, não captura de tela".
- Para "foto do parceiro": a IA recebe o nome de quem está logado e só aprova se aparecer **uma pessoa diferente** (passa-se `partner_name` no prompt). Não é perfeito, mas suficiente pro contexto íntimo do casal.

---

## 6. Migração de dados

- Marcar todos os `food_items` atuais como `is_unlockable=true` exceto 3-4 starters (ex: maçã, água, biscoito).
- Inserir o catálogo inicial de ~24 quests via migration de seed.
- Dar 2-3 itens starter na pantry de cada parceiro pra teste.

---

## 7. Entregáveis (ordem de implementação)

1. **Migração SQL**: tabelas `quests`, `quest_completions`, `pantry_items` + coluna `is_unlockable` + seed de quests + seed de starters na pantry.
2. **Edge function** `verify-quest` usando Lovable AI (Gemini Flash).
3. **Tipos** em `src/lib/mochi-types.ts` (Quest, QuestCompletion, PantryItem).
4. **Componente** `QuestsDrawer.tsx`.
5. **Refatorar** `FoodDrawer.tsx` pra ler `pantry_items`.
6. **Refatorar** `PetRoom.tsx`: novo botão 🎯, `feed()` consome pantry, atalho do drawer vazio.
7. **Toasts e animação** de "missão cumprida" + "comidinha desbloqueada" reaproveitando `FloatingHearts`.
8. **Teste manual**: cumprir uma quest casa (garfo) e uma quest casal (selfie).

---

## Perguntas rápidas pra confirmar antes de implementar

1. **Despensa compartilhada ou por parceiro?** Faz mais sentido cada parceiro ter a própria despensa (incentiva os dois jogarem), ou despensa única do casal?
2. **Quero deixar selfie/foto do parceiro como quest *diária* (cooldown 20h) ou *infinita* (sempre rende)?** Diária protege o valor; infinita é mais doce.
3. **Quer também quests que NÃO usam foto** (ex: "dar carinho 5x hoje", "alimentar 3x") como missões diárias automáticas? Posso já incluir, mas sobe o escopo.
4. **A IA pode rejeitar?** Se sim, usa "tenta de novo" sem cooldown extra. Se você prefere "sempre aceita" (modo confiança), é só remover a etapa de IA — mas perde a graça.

Me responde e já mando ver. 💗

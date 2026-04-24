// Verifica se uma foto cumpre uma quest usando Lovable AI Gateway (Gemini Flash multimodal).
// Public endpoint (verify_jwt=false) — autenticação do app é feita pelo código secreto do casal.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface VerifyBody {
  quest_id: string;
  partner_name: string;
  photo_path: string; // path no bucket mochi-photos
  photo_id?: string | null;
}

interface VerifyResult {
  match: boolean;
  reason: string;
  cuteness: number; // 1-10
  vibe: "bonitinho" | "feio" | "meh";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as VerifyBody;
    if (!body?.quest_id || !body?.partner_name || !body?.photo_path) {
      return json({ error: "missing required fields" }, 400);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return json({ error: "LOVABLE_API_KEY not configured" }, 500);
    }

    // 1. Busca a quest
    const questRes = await fetch(
      `${SUPABASE_URL}/rest/v1/quests?id=eq.${body.quest_id}&select=*`,
      {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
      },
    );
    const quests = (await questRes.json()) as Array<{
      id: string;
      slug: string;
      title: string;
      proof_target: string;
      reward_food_rarity: string;
      reward_food_count: number;
      reward_xp: number;
      cooldown_minutes: number;
    }>;
    const quest = quests[0];
    if (!quest) return json({ error: "quest not found" }, 404);

    // 2. Cooldown — última approved/pending desse parceiro pra essa quest
    const cooldownStart = new Date(
      Date.now() - quest.cooldown_minutes * 60_000,
    ).toISOString();
    const recentRes = await fetch(
      `${SUPABASE_URL}/rest/v1/quest_completions?partner_name=eq.${encodeURIComponent(
        body.partner_name,
      )}&quest_id=eq.${quest.id}&status=eq.approved&created_at=gte.${cooldownStart}&select=id,created_at&order=created_at.desc&limit=1`,
      {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
      },
    );
    const recent = (await recentRes.json()) as Array<{ created_at: string }>;
    if (recent.length > 0) {
      return json(
        {
          status: "cooldown",
          message: "essa missão já foi cumprida — espera um pouquinho 🌙",
        },
        200,
      );
    }

    // 3. Cria registro pending
    const photoPublicUrl = `${SUPABASE_URL}/storage/v1/object/public/mochi-photos/${body.photo_path}`;

    const completionInsert = await fetch(
      `${SUPABASE_URL}/rest/v1/quest_completions`,
      {
        method: "POST",
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          quest_id: quest.id,
          partner_name: body.partner_name,
          photo_id: body.photo_id ?? null,
          photo_path: body.photo_path,
          status: "pending",
        }),
      },
    );
    const completion = ((await completionInsert.json()) as Array<{
      id: string;
    }>)[0];

    // 4. Chama Lovable AI Gateway (Gemini multimodal) usando tool calling pra structured output
    const aiRes = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "Você é o Mochi, um juíz simpático e meio exigente de um joguinho de tamagotchi. Avalia se a foto cumpre a missão pedida E também avalia o quão legal/caprichada a foto é. Seja generoso quando o item está claramente visível, mas rejeite se for outra coisa, captura de tela óbvia ou imagem genérica baixada da internet. Para cuteness (na verdade 'qualidade visual'): 1-3 = feio/sujo/baguncado/sem graça, 4-6 = ok/médio, 7-10 = realmente caprichado/bonito/com vibe boa. Vibe: 'bonitinho' se cuteness>=7, 'meh' se 4-6, 'feio' se <=3. Tom: descontraído, direto, sem ser meloso ou exagerado. Evita palavras como 'fofo', 'amor', 'lindo'. Prefere 'legal', 'bom', 'caprichado'. Responda SEMPRE chamando a função evaluate_quest.",
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Missão: "${quest.title}". A foto precisa mostrar: ${quest.proof_target}.`,
                },
                {
                  type: "image_url",
                  image_url: { url: photoPublicUrl },
                },
              ],
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "evaluate_quest",
                description: "Avalia se a foto cumpre a missão e o quanto é fofa",
                parameters: {
                  type: "object",
                  properties: {
                    match: {
                      type: "boolean",
                      description: "true se a foto cumpre a missão",
                    },
                    reason: {
                      type: "string",
                      description:
                        "explicação curta e fofa em português (máx 80 chars)",
                    },
                    cuteness: {
                      type: "integer",
                      description: "nota de fofura da foto, de 1 (feio) a 10 (lindo)",
                      minimum: 1,
                      maximum: 10,
                    },
                    vibe: {
                      type: "string",
                      enum: ["bonitinho", "feio", "meh"],
                      description: "veredito visual do Mochi",
                    },
                  },
                  required: ["match", "reason", "cuteness", "vibe"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "evaluate_quest" },
          },
        }),
      },
    );

    if (aiRes.status === 429) {
      await markRejected(
        SUPABASE_URL,
        SERVICE_KEY,
        completion.id,
        "muitas tentativas, tenta de novo em alguns segundos",
      );
      return json(
        { status: "rejected", reason: "tá com muitas missões agora 🥺" },
        200,
      );
    }
    if (aiRes.status === 402) {
      await markRejected(
        SUPABASE_URL,
        SERVICE_KEY,
        completion.id,
        "sem créditos de IA",
      );
      return json(
        { status: "error", reason: "Mochi precisa de mais créditos de IA 💔" },
        402,
      );
    }
    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("AI error", aiRes.status, txt);
      await markRejected(SUPABASE_URL, SERVICE_KEY, completion.id, "erro IA");
      return json({ status: "error", reason: "Mochi não conseguiu olhar 🥺" }, 500);
    }

    const aiJson = await aiRes.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    let result: VerifyResult = {
      match: false,
      reason: "Mochi não soube responder",
      cuteness: 5,
      vibe: "meh",
    };
    if (toolCall?.function?.arguments) {
      try {
        result = JSON.parse(toolCall.function.arguments) as VerifyResult;
        // sanitiza
        if (typeof result.cuteness !== "number") result.cuteness = 5;
        result.cuteness = Math.max(1, Math.min(10, Math.round(result.cuteness)));
        if (!["bonitinho", "feio", "meh"].includes(result.vibe)) {
          result.vibe = result.cuteness >= 7 ? "bonitinho" : result.cuteness <= 3 ? "feio" : "meh";
        }
      } catch {
        // mantém default
      }
    }

    // 5. Se rejeitada
    if (!result.match) {
      await fetch(
        `${SUPABASE_URL}/rest/v1/quest_completions?id=eq.${completion.id}`,
        {
          method: "PATCH",
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "rejected",
            ai_reason: result.reason,
            cuteness: result.cuteness,
            vibe: result.vibe,
          }),
        },
      );
      return json({ status: "rejected", reason: result.reason, cuteness: result.cuteness, vibe: result.vibe }, 200);
    }

    // 6. Aprovada — sortear N comidinhas da raridade certa, criar pantry_items, dar XP
    const foodsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/food_items?rarity=eq.${quest.reward_food_rarity}&is_active=eq.true&select=id,name,emoji`,
      {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
      },
    );
    const allFoods = (await foodsRes.json()) as Array<{
      id: string;
      name: string;
      emoji: string;
    }>;

    // fallback: se não houver foods da raridade, pega qualquer
    let pool = allFoods;
    if (pool.length === 0) {
      const anyRes = await fetch(
        `${SUPABASE_URL}/rest/v1/food_items?is_active=eq.true&select=id,name,emoji&limit=20`,
        {
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
          },
        },
      );
      pool = await anyRes.json();
    }

    const picked: Array<{ id: string; name: string; emoji: string }> = [];
    for (let i = 0; i < quest.reward_food_count && pool.length > 0; i++) {
      picked.push(pool[Math.floor(Math.random() * pool.length)]);
    }

    if (picked.length > 0) {
      await fetch(`${SUPABASE_URL}/rest/v1/pantry_items`, {
        method: "POST",
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          picked.map((f) => ({
            partner_name: body.partner_name,
            food_id: f.id,
            source_quest_id: quest.id,
          })),
        ),
      });
    }

    // XP imediato no pet
    const petRes = await fetch(
      `${SUPABASE_URL}/rest/v1/pet_state?id=eq.1&select=xp,level,happiness`,
      {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
      },
    );
    const pet = ((await petRes.json()) as Array<{
      xp: number;
      level: number;
      happiness: number;
    }>)[0];
    // Bônus/penalidade de humor de acordo com a fofura da foto
    // cute >=8: +10 happiness, XP cheio
    // cute 4-7: +5 happiness (padrão), XP cheio
    // cute <=3: -3 happiness (Mochi achou feio), XP reduzido
    let happinessDelta = 5;
    let xpMultiplier = 1;
    if (result.cuteness >= 8) {
      happinessDelta = 10;
      xpMultiplier = 1;
    } else if (result.cuteness <= 3) {
      happinessDelta = -3;
      xpMultiplier = 0.5;
    }
    const xpReward = Math.max(1, Math.round(quest.reward_xp * xpMultiplier));

    if (pet) {
      const newXp = pet.xp + xpReward;
      const newLevel = Math.floor(newXp / 100) + 1;
      const newHappy = Math.max(0, Math.min(100, pet.happiness + happinessDelta));
      await fetch(`${SUPABASE_URL}/rest/v1/pet_state?id=eq.1`, {
        method: "PATCH",
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          xp: newXp,
          level: newLevel,
          happiness: newHappy,
          last_interaction_at: new Date().toISOString(),
          last_interaction_by: body.partner_name,
          updated_at: new Date().toISOString(),
        }),
      });
    }

    // log na timeline
    const vibeMsg =
      result.vibe === "bonitinho"
        ? "curtiu"
        : result.vibe === "feio"
          ? "torceu o nariz mas aceitou"
          : "achou ok";
    await fetch(`${SUPABASE_URL}/rest/v1/interactions`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        partner_name: body.partner_name,
        interaction_type: "quest",
        xp_delta: xpReward,
        happiness_delta: happinessDelta,
        message: `${vibeMsg} a foto de "${quest.title}" e ganhou ${picked
          .map((p) => p.emoji)
          .join("")}`,
      }),
    });

    // marca completion como aprovada
    await fetch(
      `${SUPABASE_URL}/rest/v1/quest_completions?id=eq.${completion.id}`,
      {
        method: "PATCH",
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "approved",
          ai_reason: result.reason,
          cuteness: result.cuteness,
          vibe: result.vibe,
        }),
      },
    );

    return json(
      {
        status: "approved",
        reason: result.reason,
        rewards: picked,
        xp: xpReward,
        happiness_delta: happinessDelta,
        cuteness: result.cuteness,
        vibe: result.vibe,
      },
      200,
    );
  } catch (e) {
    console.error("verify-quest error", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function markRejected(
  url: string,
  key: string,
  id: string,
  reason: string,
) {
  await fetch(`${url}/rest/v1/quest_completions?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "rejected", ai_reason: reason }),
  });
}

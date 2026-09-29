import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DIALECT_PROMPTS: Record<string, string> = {
  "sumadijsko-vojvodjanski": `Ti si čet-bot koji govori šumadijsko-vojvođanskim dijalektom srpskog jezika (ekavski, centralna Srbija).
Koristi ekavicu (mleko, dete, reka). Tipične reči: "bre", "ćale", "keva", "salaš". Skraćuj: "'oćeš", "'ajde". Budi opušten, kao sa komšijom.`,

  "kosovsko-resavski": `Ti si čet-bot koji govori kosovsko-resavskim dijalektom (stariji ekavski, Kosovo i Pomoravlje).
Gubi "h": "leb", "oću". Mešaj padeže. Koristi "da + prezent" umesto infinitiva. Reči: "čoek", "ba", "more". Govori toplo i mudro.`,

  "prizrensko-timocki": `Ti si čet-bot koji govori prizrensko-timočkim (torlačkim) dijalektom (jugoistočna Srbija).
NEMA PADEŽA - koristi predloge. Postpozitivni član: "čovekat", "ženata". Reči: "ubavo", "merak", "bujrum". Tvrdo ć→č, đ→dž. Budi duhovit i direktan.`,

  "zaplanjsko-svrljski": `Ti si čet-bot koji govori zaplanjsko-svrljiškim dijalektom (poddijalekt torlačkog, Zaplanje i Svrljig).
NEMA PADEŽA. Postpozitivni član. Tvrdo ć→č. Pevajuća intonacija. Reči: "ćišma", "kazujem", "čujem" (osećam). "bil" umesto "bio", "otišal" umesto "otišao". Govori toplo i prizemno.`,

  "zetsko-juznosandzacki": `Ti si čet-bot koji govori zetsko-južnosandžačkim dijalektom (ijekavski, Crna Gora i Sandžak).
Ijekavica: "mlijeko", "dijete". Crnogorsko jotovanje: "śutra", "đe". Reči: "nijesam", "vala", "no". Koristi aoriste. Govori dostojanstveno.`,

  "istocnohercegovacki": `Ti si čet-bot koji govori istočnohercegovačkim dijalektom (ijekavski, osnova književnog jezika).
Ijekavica: "mlijeko", "dijete". Puna deklinacija. Reči: "vala", "bolan/bona". Aorist u upotrebi: "rekoh". Govori sa šarmom pripovedača.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, dialect } = await req.json();

    if (!messages || !Array.isArray(messages) || !dialect) {
      return new Response(
        JSON.stringify({ error: "Missing messages or dialect" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = DIALECT_PROMPTS[dialect];
    if (!systemPrompt) {
      return new Response(
        JSON.stringify({ error: "Unknown dialect" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const HF_API_KEY = Deno.env.get("HF_API_KEY");
    if (!HF_API_KEY) {
      throw new Error("HF_API_KEY is not configured");
    }

    const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "Qwen/Qwen2.5-72B-Instruct",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Previše zahteva, pokušajte ponovo za koji minut." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("HF API error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Greška AI servisa" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat-dialect error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Nepoznata greška" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DIALECT_NAMES: Record<string, string> = {
  standardni: "standardni srpski jezik",
  "sumadijsko-vojvodjanski": "šumadijsko-vojvođanski dijalekat (ekavski, centralna Srbija)",
  "kosovsko-resavski": "kosovsko-resavski dijalekat (stariji ekavski)",
  "prizrensko-timocki": "prizrensko-timočki (torlački) dijalekat (jugoistočna Srbija, bez padeža, postpozitivni član)",
  "zaplanjsko-svrljski": "zaplanjsko-svrljiški dijalekat (poddijalekt torlačkog, Zaplanje i Svrljig, bez padeža, pevajuća intonacija)",
  "zetsko-juznosandzacki": "zetsko-južnosandžački dijalekat (ijekavski, Crna Gora i Sandžak)",
  "istocnohercegovacki": "istočnohercegovački dijalekat (ijekavski, osnova književnog jezika)",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, from, to } = await req.json();

    if (!text || !from || !to) {
      return new Response(
        JSON.stringify({ error: "Missing text, from, or to" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fromName = DIALECT_NAMES[from];
    const toName = DIALECT_NAMES[to];
    if (!fromName || !toName) {
      return new Response(
        JSON.stringify({ error: "Unknown dialect" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const HF_API_KEY = Deno.env.get("HF_API_KEY");
    if (!HF_API_KEY) throw new Error("HF_API_KEY is not configured");

    const systemPrompt = `Ti si stručnjak za srpske dijalekte i prevodilac. Tvoj zadatak je da prevedeš tekst sa jednog dijalekta ili standardnog srpskog na drugi dijalekat ili standardni srpski.

Prevedi TAČNO i AUTENTIČNO, koristeći sve fonetske, morfološke i leksičke osobine ciljnog dijalekta/jezika. Ne dodaj objašnjenja, samo prevod.`;

    const userPrompt = `Prevedi sledeći tekst sa ${fromName} na ${toName}:

"${text}"

Daj SAMO prevod, bez objašnjenja.`;

    const response = await fetch("https://router.huggingface.co/hf-inference/models/mistralai/Mistral-Large-Latest/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistralai/Mistral-Large-Latest",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
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

    const data = await response.json();
    const translation = data.choices?.[0]?.message?.content?.trim() || "";

    return new Response(
      JSON.stringify({ translation }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("translate-dialect error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Nepoznata greška" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

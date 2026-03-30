
## Plan: Dialekti app sa Hugging Face Inference API

### 1. Kloniranje dialekti repozitorijuma
- Kopirati sve fajlove iz GitHub repo-a u ovaj projekat:
  - `src/pages/Index.tsx` — glavni chat UI sa dialect selector-om
  - `src/lib/dialect-prompts.ts` — definicije dijalekta i njihove osobine
  - `src/components/DialectInfoPanel.tsx` — panel sa info o dijalektu
  - `src/components/TranslationPanel.tsx` — panel za prevođenje između dijalekata
  - `src/index.css` — dizajn sistem sa Space Grotesk fontom
  - `supabase/functions/chat-dialect/index.ts` — edge funkcija za chat
  - `supabase/functions/translate-dialect/index.ts` — edge funkcija za prevod
  - Dodati `react-markdown` dependency

### 2. Dodavanje Hugging Face API ključa
- Sačuvati `HF_API_KEY` kao Supabase secret

### 3. Zamena AI Gateway-a sa Hugging Face u `chat-dialect/index.ts`
- Umesto Lovable AI Gateway, pozvati Hugging Face Inference API endpoint za Mistral Large
- Endpoint: `https://router.huggingface.co/hf-inference/models/mistralai/Mistral-Large-Latest/v1/chat/completions`
- Koristiti isti OpenAI-kompatibilan format (messages, stream: true)
- Autentikacija: `Bearer HF_API_KEY`
- Logika ostaje ista: system prompt prema izabranom dijalektu → streaming odgovor

### 4. Zamena AI Gateway-a u `translate-dialect/index.ts`
- Ista promena: HF Inference API umesto Lovable Gateway
- Non-streaming poziv za prevod teksta između dijalekata

### 5. Frontend ostaje nepromenjen
- Isti chat interfejs, isti streaming parser, isti dialect selector

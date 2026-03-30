import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DIALECTS, type DialectId } from "@/lib/dialect-prompts";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

const TRANSLATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate-dialect`;

const TranslationPanel = () => {
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [fromDialect, setFromDialect] = useState<string>("standardni");
  const [toDialect, setToDialect] = useState<string>("prizrensko-timocki");
  const [isLoading, setIsLoading] = useState(false);

  const allOptions = [
    { id: "standardni", name: "Standardni srpski" },
    ...DIALECTS.map((d) => ({ id: d.id, name: d.name })),
  ];

  const translate = async () => {
    if (!sourceText.trim() || isLoading) return;
    setIsLoading(true);
    setTranslatedText("");

    try {
      const resp = await fetch(TRANSLATE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          text: sourceText.trim(),
          from: fromDialect,
          to: toDialect,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Greška" }));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }

      const data = await resp.json();
      setTranslatedText(data.translation || "");
    } catch (e: any) {
      toast.error(e.message || "Greška pri prevođenju");
    } finally {
      setIsLoading(false);
    }
  };

  const swap = () => {
    setFromDialect(toDialect);
    setToDialect(fromDialect);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5 text-primary" />
          Prevođenje dijalekata
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Select value={fromDialect} onValueChange={setFromDialect}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allOptions.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="ghost" size="icon" onClick={swap} className="shrink-0">
            <ArrowRightLeft className="h-4 w-4" />
          </Button>

          <Select value={toDialect} onValueChange={setToDialect}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allOptions.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Textarea
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          placeholder="Unesite tekst za prevod..."
          rows={3}
          className="resize-none"
        />

        <Button onClick={translate} disabled={!sourceText.trim() || isLoading} className="w-full">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Prevedi
        </Button>

        {translatedText && (
          <div className="rounded-lg bg-muted p-3 text-sm whitespace-pre-wrap">
            {translatedText}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TranslationPanel;

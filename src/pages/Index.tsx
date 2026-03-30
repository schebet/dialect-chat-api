import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { DIALECTS, type DialectId } from "@/lib/dialect-prompts";
import { Send, Bot, User, Globe, Info, ArrowRightLeft, Menu } from "lucide-react";
import { toast } from "sonner";
import DialectInfoPanel from "@/components/DialectInfoPanel";
import TranslationPanel from "@/components/TranslationPanel";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-dialect`;

async function streamChat({
  messages,
  dialect,
  onDelta,
  onDone,
}: {
  messages: Msg[];
  dialect: DialectId;
  onDelta: (text: string) => void;
  onDone: () => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, dialect }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Greška" }));
    throw new Error(err.error || `HTTP ${resp.status}`);
  }

  if (!resp.body) throw new Error("No response body");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let done = false;

  while (!done) {
    const { done: readerDone, value } = await reader.read();
    if (readerDone) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIdx: number;
    while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, newlineIdx);
      buffer = buffer.slice(newlineIdx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") { done = true; break; }
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }

  onDone();
}

const Index = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [dialect, setDialect] = useState<DialectId>("sumadijsko-vojvodjanski");
  const [isLoading, setIsLoading] = useState(false);
  const [sideTab, setSideTab] = useState<string>("info");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Msg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: [...messages, userMsg],
        dialect,
        onDelta: upsert,
        onDone: () => setIsLoading(false),
      });
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Greška pri komunikaciji sa AI servisom");
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const selectedDialect = DIALECTS.find((d) => d.id === dialect);

  return (
    <div className="flex h-screen bg-background">
      {/* Chat panel */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="border-b px-3 sm:px-4 py-3 flex items-center justify-between gap-2 sm:gap-4 bg-card">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg font-bold tracking-tight truncate">Srpski Dijalekt Čet-bot</h1>
              <p className="text-xs text-muted-foreground truncate hidden sm:block">
                {selectedDialect?.region}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={dialect} onValueChange={(v) => setDialect(v as DialectId)}>
              <SelectTrigger className="w-[140px] sm:w-[260px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIALECTS.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    <span className="font-medium">{d.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Mobile drawer trigger */}
            <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
              <DrawerTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden shrink-0">
                  <Menu className="h-4 w-4" />
                </Button>
              </DrawerTrigger>
              <DrawerContent className="max-h-[85vh]">
                <DrawerHeader>
                  <DrawerTitle>Информације и превод</DrawerTitle>
                </DrawerHeader>
                <div className="px-4 pb-6 overflow-auto">
                  <Tabs defaultValue="info" className="w-full">
                    <TabsList className="grid grid-cols-2 mb-3">
                      <TabsTrigger value="info" className="gap-1.5">
                        <Info className="h-3.5 w-3.5" />
                        О дијалекту
                      </TabsTrigger>
                      <TabsTrigger value="translate" className="gap-1.5">
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                        Превод
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="info" className="mt-0">
                      <DialectInfoPanel dialect={dialect} />
                    </TabsContent>
                    <TabsContent value="translate" className="mt-0">
                      <TranslationPanel />
                    </TabsContent>
                  </Tabs>
                </div>
              </DrawerContent>
            </Drawer>
          </div>
        </header>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          <div className="max-w-2xl mx-auto py-6 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-20 space-y-4">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">Здраво!</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Изаберите дијалекат и почните разговор. Одговараћу на{" "}
                  <strong>{selectedDialect?.name}</strong> дијалекту.
                </p>
                <div className="flex flex-wrap gap-2 justify-center pt-2">
                  {["Како си?", "Реци ми нешто о свом крају", "Испричај ми вицу"].map(
                    (q) => (
                      <button
                        key={q}
                        onClick={() => {
                          setInput(q);
                          textareaRef.current?.focus();
                        }}
                        className="px-3 py-1.5 rounded-full border text-sm hover:bg-muted transition-colors text-muted-foreground"
                      >
                        {q}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={`rounded-2xl px-4 py-3 max-w-[80%] ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-1">
                    <User className="h-4 w-4 text-secondary-foreground" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="border-t bg-card p-2 sm:p-4">
          <div className="max-w-2xl mx-auto flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Напишите поруку..."
              className="min-h-[44px] max-h-[120px] resize-none rounded-xl text-sm"
              rows={1}
            />
            <Button
              onClick={send}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-11 w-11 rounded-xl shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Side panel */}
      <div className="hidden lg:flex flex-col w-[360px] border-l bg-card">
        <Tabs value={sideTab} onValueChange={setSideTab} className="flex flex-col h-full">
          <TabsList className="mx-4 mt-3 grid grid-cols-2">
            <TabsTrigger value="info" className="gap-1.5">
              <Info className="h-3.5 w-3.5" />
              О дијалекту
            </TabsTrigger>
            <TabsTrigger value="translate" className="gap-1.5">
              <ArrowRightLeft className="h-3.5 w-3.5" />
              Превод
            </TabsTrigger>
          </TabsList>
          <TabsContent value="info" className="flex-1 overflow-auto px-4 pb-4 mt-0">
            <DialectInfoPanel dialect={dialect} />
          </TabsContent>
          <TabsContent value="translate" className="flex-1 overflow-auto px-4 pb-4 mt-0">
            <TranslationPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;

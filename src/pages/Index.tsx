import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import { Sparkles } from "lucide-react";
import { sanitizeText } from "@/utils/sanitize";

interface Message {
  role: "user" | "assistant";
  content: string;
  files?: { url: string; type: string; name: string }[];
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (input: string, files?: File[]) => {
    // Sanitizar input do usuário
    const sanitizedInput = sanitizeText(input);
    
    if (!sanitizedInput && (!files || files.length === 0)) {
      return;
    }

    const fileData = files ? await Promise.all(
      files.map(async (file) => ({
        url: URL.createObjectURL(file),
        type: file.type,
        name: file.name,
      }))
    ) : undefined;
    
    const userMsg: Message = { 
      role: "user", 
      content: sanitizedInput,
      files: fileData 
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    let assistantSoFar = "";
    const upsertAssistant = (nextChunk: string) => {
      assistantSoFar += nextChunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const hasImages = fileData?.some(file => file.type.startsWith('image/'));

      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          hasImages
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) {
          toast({
            title: "Limite excedido",
            description: "Muitas requisições. Tente novamente mais tarde.",
            variant: "destructive",
          });
        } else if (resp.status === 402) {
          toast({
            title: "Créditos insuficientes",
            description: "Adicione créditos ao seu workspace.",
            variant: "destructive",
          });
        } else {
          throw new Error("Falha ao iniciar stream");
        }
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error("Sem corpo de resposta");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {}
        }
      }
    } catch (e) {
      console.error(e);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao enviar a mensagem.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                AI Chatbot
              </h1>
              <p className="text-sm text-muted-foreground">Seu assistente virtual inteligente</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-20 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold">Bem-vindo ao AI Chatbot!</h2>
              <p className="text-muted-foreground">
                Como posso ajudar você hoje? Faça uma pergunta para começar.
              </p>
            </div>
          )}
          {messages.map((msg, idx) => (
            <ChatMessage key={idx} role={msg.role} content={msg.content} files={msg.files} />
          ))}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-3 animate-fade-in">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow">
                <Sparkles className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div className="bg-card border border-border rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <ChatInput onSend={sendMessage} disabled={isLoading} />
    </div>
  );
};

export default Index;

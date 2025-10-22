import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import { Sparkles } from "lucide-react";

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
    const fileData = files ? await Promise.all(
      files.map(async (file) => ({
        url: URL.createObjectURL(file),
        type: file.type,
        name: file.name,
      }))
    ) : undefined;
    
    const userMsg: Message = { 
      role: "user", 
      content: input,
      files: fileData 
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    // Simular resposta da IA sem backend
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const responses = [
        "Olá! Sou um assistente virtual. Como posso ajudar você hoje?",
        "Essa é uma ótima pergunta! Infelizmente, estou funcionando em modo offline no momento.",
        "Entendo sua solicitação. No momento, estou operando sem conexão com serviços externos.",
        "Obrigado por sua mensagem! Estou aqui para ajudar, mas funcionando em modo demonstração.",
        "Interessante! Estou processando sua solicitação em modo local.",
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      // Simular streaming de resposta
      let currentText = "";
      for (let i = 0; i < randomResponse.length; i++) {
        currentText += randomResponse[i];
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, idx) => (idx === prev.length - 1 ? { ...m, content: currentText } : m));
          }
          return [...prev, { role: "assistant", content: currentText }];
        });
        await new Promise(resolve => setTimeout(resolve, 30));
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

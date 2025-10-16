import { Bot, User } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

const ChatMessage = ({ role, content }: ChatMessageProps) => {
  const isUser = role === "user";

  return (
    <div className={`flex gap-3 animate-fade-in ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow">
          <Bot className="w-5 h-5 text-white" />
        </div>
      )}
      <div
        className={`max-w-[70%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-gradient-to-r from-primary to-secondary text-white"
            : "bg-card border border-border"
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <User className="w-5 h-5 text-foreground" />
        </div>
      )}
    </div>
  );
};

export default ChatMessage;

import { useState } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

const ChatInput = ({ onSend, disabled }: ChatInputProps) => {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message);
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-card/50 backdrop-blur-sm">
      <div className="flex gap-2 max-w-4xl mx-auto">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua mensagem..."
          className="resize-none min-h-[60px] bg-background/50 border-border focus:border-primary"
          disabled={disabled}
        />
        <Button
          type="submit"
          disabled={!message.trim() || disabled}
          className="self-end bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </form>
  );
};

export default ChatInput;

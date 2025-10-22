import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Send, Image, Mic } from "lucide-react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

const messageSchema = z.object({
  message: z.string().trim().max(5000, "Mensagem muito longa (máximo 5000 caracteres)"),
});

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
const ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/webm"];

interface ChatInputProps {
  onSend: (message: string, files?: File[]) => void;
  disabled?: boolean;
}

const ChatInput = ({ onSend, disabled }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const validateFile = (file: File, allowedTypes: string[]): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "Arquivo muito grande",
        description: `${file.name} excede o tamanho máximo de 10MB`,
        variant: "destructive",
      });
      return false;
    }

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Tipo de arquivo não permitido",
        description: `${file.name} não é um tipo de arquivo válido`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (disabled) return;

    // Validar mensagem
    const validation = messageSchema.safeParse({ message });
    if (!validation.success) {
      toast({
        title: "Erro na mensagem",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    if ((message.trim() || selectedFiles.length > 0)) {
      onSend(message.trim(), selectedFiles);
      setMessage("");
      setSelectedFiles([]);
    }
  };

  const handleFileSelect = (files: FileList | null, type: "image" | "audio") => {
    if (!files) return;

    const allowedTypes = type === "image" ? ALLOWED_IMAGE_TYPES : ALLOWED_AUDIO_TYPES;
    const validFiles: File[] = [];

    Array.from(files).forEach(file => {
      if (validateFile(file, allowedTypes)) {
        validFiles.push(file);
      }
    });

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-card/50 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto space-y-2">
        {selectedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-2 bg-muted px-3 py-1 rounded-lg">
                <span className="text-sm">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            multiple
            onChange={(e) => handleFileSelect(e.target.files, "image")}
            className="hidden"
          />
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/webm"
            multiple
            onChange={(e) => handleFileSelect(e.target.files, "audio")}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => imageInputRef.current?.click()}
            disabled={disabled}
            className="self-end"
          >
            <Image className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => audioInputRef.current?.click()}
            disabled={disabled}
            className="self-end"
          >
            <Mic className="w-4 h-4" />
          </Button>
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
            disabled={(!message.trim() && selectedFiles.length === 0) || disabled}
            className="self-end bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </form>
  );
};

export default ChatInput;

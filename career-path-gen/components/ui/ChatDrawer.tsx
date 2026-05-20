"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Trash2, Bot, User } from "lucide-react";
import { api } from "@/lib/api";
import { ChatMessage } from "@/types";
import toast from "react-hot-toast";

interface ChatDrawerProps {
  profileId: string;
  roadmapId?: string;
}

export default function ChatDrawer({ profileId, roadmapId }: ChatDrawerProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when drawer opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await api.sendChatMessage({ message: text, profileId, roadmapId });
      setMessages(res.history);
    } catch (err: any) {
      toast.error(err.message || "Chat failed. Please try again.");
      // Remove the optimistic user message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setSending(false);
    }
  };

  const clearChat = async () => {
    try {
      await api.clearChat(profileId);
      setMessages([]);
      toast.success("Conversation cleared.");
    } catch {
      toast.error("Could not clear chat.");
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const SUGGESTIONS = [
    "What roles can I reach in 2 years?",
    "Which skill gap is blocking me most?",
    "Is my success probability realistic?",
    "What should I focus on this month?",
  ];

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-[var(--primary)] text-white px-4 py-3 rounded-full shadow-lg hover:bg-[var(--secondary)] transition-all hover:scale-105 active:scale-95"
      >
        <MessageCircle className="w-5 h-5" />
        <span className="text-sm font-medium">Ask AI Advisor</span>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div className={`fixed bottom-0 right-0 z-50 h-[85vh] w-full max-w-md bg-white shadow-2xl rounded-tl-2xl rounded-bl-none flex flex-col transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-[var(--primary)] rounded-tl-2xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">AI Career Advisor</p>
              <p className="text-white/70 text-xs">Ask anything about your roadmap</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button onClick={clearChat} className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Clear conversation">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="w-14 h-14 bg-[var(--primary)]/10 rounded-full flex items-center justify-center mb-4">
                <Bot className="w-7 h-7 text-[var(--primary)]" />
              </div>
              <p className="text-[var(--dark)] font-semibold mb-1">Your Personal Career Advisor</p>
              <p className="text-[var(--muted)] text-sm mb-6">Ask me anything about your career roadmap, skill gaps, or transition strategy.</p>
              <div className="w-full space-y-2">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    className="w-full text-left text-sm px-4 py-2.5 rounded-lg border border-slate-200 hover:border-[var(--accent)] hover:bg-slate-50 text-slate-600 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === "user" ? "bg-[var(--accent)]" : "bg-[var(--primary)]/10"}`}>
                {msg.role === "user"
                  ? <User className="w-3.5 h-3.5 text-white" />
                  : <Bot className="w-3.5 h-3.5 text-[var(--primary)]" />
                }
              </div>
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-[var(--primary)] text-white rounded-tr-sm"
                  : "bg-slate-100 text-[var(--text)] rounded-tl-sm"
              }`}>
                {msg.content}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                <Bot className="w-3.5 h-3.5 text-[var(--primary)]" />
              </div>
              <div className="bg-slate-100 px-4 py-3 rounded-2xl rounded-tl-sm">
                <div className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-4 border-t border-slate-100">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus-within:border-[var(--accent)] focus-within:bg-white transition-colors">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about your career path..."
              className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder-[var(--muted)] outline-none"
              disabled={sending}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="w-8 h-8 bg-[var(--primary)] text-white rounded-lg flex items-center justify-center hover:bg-[var(--secondary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-xs text-[var(--muted)] mt-1.5 text-center">Press Enter to send · Powered by LLaMA 3.3</p>
        </div>
      </div>
    </>
  );
}

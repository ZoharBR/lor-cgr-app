import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { sendMessageToAi } from '../services/geminiService';

const AiAssistant: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Olá! Sou o LOR AI, seu Analista de Redes Sênior. Posso ajudar com configurações Mikrotik/Huawei, analisar logs, verificar status do PHPIPAM ou auxiliar em backups. Qual a missão de hoje?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const responseText = await sendMessageToAi(input);

    const aiMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: responseText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, aiMsg]);
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200">
      <div className="bg-slate-850 p-4 border-b border-slate-700 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <i className="fas fa-brain text-white"></i>
          </div>
          <div>
            <h2 className="font-bold text-white">LOR AI Analyst</h2>
            <p className="text-xs text-accent flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-accent"></span> Online (Gemini 3 Flash)
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl p-4 shadow-md ${
              msg.role === 'user' 
                ? 'bg-primary text-white rounded-br-none' 
                : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
            }`}>
              {msg.role === 'model' && (
                  <div className="text-xs text-slate-400 mb-1 font-bold">LOR AI</div>
              )}
              <div className="whitespace-pre-wrap text-sm leading-relaxed font-sans">{msg.text}</div>
              <div className="text-[10px] opacity-50 text-right mt-2">
                {msg.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {loading && (
           <div className="flex justify-start">
             <div className="bg-slate-800 p-4 rounded-2xl rounded-bl-none border border-slate-700">
                <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-75"></div>
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-150"></div>
                </div>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-slate-850 border-t border-slate-700">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Descreva o problema ou comando (ex: 'Faça backup do Router Core', 'Analise uso de CPU da OLT')..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 pr-12 text-white focus:outline-none focus:border-primary resize-none shadow-inner"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={loading}
            className="absolute right-3 bottom-3 p-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiAssistant;
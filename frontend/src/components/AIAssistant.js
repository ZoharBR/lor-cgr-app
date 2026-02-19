'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, Send, Loader2, Server, Shield, Zap, AlertTriangle } from 'lucide-react'

export default function AIAssistant() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: 'Ola! Sou seu assistente de IA para NOC.\n\nPosso ajudar com:\n- Configuracao de equipamentos\n- Troubleshooting de rede\n- Seguranca e firewall\n- Performance e otimizacao\n\nComo posso ajuda-lo?',
      timestamp: new Date()
    }])
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // CHAMAR A API CORRETA: /api/ai/chat/
      const res = await fetch('/api/ai/chat/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input.trim(),
          session_id: sessionId
        })
      })

      const data = await res.json()
      
      if (data.session_id) setSessionId(data.session_id)

      setMessages(prev => [...prev, {
        id: 'assistant-' + Date.now(),
        role: 'assistant',
        content: data.message || data.error || 'Sem resposta',
        timestamp: new Date()
      }])
    } catch (e) {
      setMessages(prev => [...prev, {
        id: 'assistant-' + Date.now(),
        role: 'assistant',
        content: 'Erro ao conectar com a IA: ' + e.message,
        timestamp: new Date()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickAction = (action) => {
    setInput(action)
    inputRef.current?.focus()
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between bg-card border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Assistente IA NOC</h1>
            <p className="text-sm text-muted-foreground">Especialista em redes</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={'flex ' + (msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={'max-w-[80%] rounded-2xl px-4 py-3 ' + (msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border')}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
              <div className="text-xs mt-2 opacity-50">{msg.timestamp.toLocaleTimeString()}</div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Pensando...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="px-6 py-2 border-t border-border flex gap-2 overflow-x-auto">
        <button onClick={() => handleQuickAction('Quais equipamentos tenho cadastrados?')} className="flex items-center gap-2 px-3 py-1.5 bg-accent rounded-lg text-sm whitespace-nowrap">
          <Server className="w-4 h-4" /> Equipamentos
        </button>
        <button onClick={() => handleQuickAction('Analise a seguranca da minha rede')} className="flex items-center gap-2 px-3 py-1.5 bg-accent rounded-lg text-sm whitespace-nowrap">
          <Shield className="w-4 h-4" /> Seguranca
        </button>
        <button onClick={() => handleQuickAction('Troubleshooting de cliente sem internet')} className="flex items-center gap-2 px-3 py-1.5 bg-accent rounded-lg text-sm whitespace-nowrap">
          <AlertTriangle className="w-4 h-4" /> Troubleshooting
        </button>
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }}}
            placeholder="Pergunte sobre redes, equipamentos, troubleshooting..."
            className="flex-1 px-4 py-3 bg-background border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            rows={1}
          />
          <button onClick={sendMessage} disabled={isLoading || !input.trim()} className="px-4 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  )
}

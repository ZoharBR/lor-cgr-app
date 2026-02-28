
import { useState, useRef, useEffect } from 'react'
import { Bot, Send, Loader2, Server, Shield, AlertTriangle, Terminal, Activity, ChevronDown, ChevronUp, Trash2, Wrench, Wifi, WifiOff, HardDrive, BarChart3 } from 'lucide-react'

const StatusBadge = ({ status }) => {
  const isOnline = status === true || status === 'online' || status === 'Online'
  return (
    <span className={'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ' + (isOnline ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30')}>
      {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
      {isOnline ? 'Online' : 'Offline'}
    </span>
  )
}

const ToolCard = ({ tool, result, expanded, onToggle }) => (
  <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden my-2">
    <button onClick={onToggle} className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-700/50">
      <div className="flex items-center gap-2">
        <Wrench className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-medium text-amber-400">{tool}</span>
      </div>
      {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
    </button>
    {expanded && result && (
      <div className="border-t border-slate-700 p-3">
        <pre className="text-xs text-slate-300 bg-slate-900/50 p-2 rounded overflow-x-auto max-h-60">{typeof result === 'string' ? result : JSON.stringify(result, null, 2)}</pre>
      </div>
    )}
  </div>
)

const DeviceTable = ({ devices }) => {
  if (!Array.isArray(devices) || devices.length === 0) return <div className="text-slate-400 text-sm">Nenhum dispositivo</div>
  return (
    <div className="overflow-x-auto my-2">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-slate-700"><th className="text-left py-2 px-3 text-slate-400">Nome</th><th className="text-left py-2 px-3 text-slate-400">IP</th><th className="text-left py-2 px-3 text-slate-400">Status</th><th className="text-left py-2 px-3 text-slate-400">Tipo</th></tr></thead>
        <tbody>
          {devices.slice(0, 10).map((d, i) => (
            <tr key={d.id || i} className="border-b border-slate-800 hover:bg-slate-800/50">
              <td className="py-2 px-3"><div className="flex items-center gap-2"><HardDrive className="w-4 h-4 text-slate-500" /><span className="font-medium">{d.name || d.hostname}</span></div></td>
              <td className="py-2 px-3 font-mono text-slate-400">{d.ip_address || d.ip}</td>
              <td className="py-2 px-3"><StatusBadge status={d.status || d.is_online} /></td>
              <td className="py-2 px-3 text-slate-400">{d.device_type || d.tipo}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {devices.length > 10 && <div className="text-xs text-slate-500 text-center py-2">Mostrando 10 de {devices.length}</div>}
    </div>
  )
}

const StatsCard = ({ stats }) => {
  if (!stats) return null
  const items = [
    { label: 'Total', value: stats.total_devices, color: 'text-blue-400' },
    { label: 'Online', value: stats.online_devices, color: 'text-green-400' },
    { label: 'Offline', value: stats.offline_devices, color: 'text-red-400' },
    { label: 'Backups', value: stats.total_backups, color: 'text-purple-400' },
  ]
  return (
    <div className="grid grid-cols-2 gap-2 my-2">
      {items.map((item, i) => (
        <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
          <div className="text-xs text-slate-400">{item.label}</div>
          <div className={'text-2xl font-bold ' + item.color}>{item.value || 0}</div>
        </div>
      ))}
    </div>
  )
}

const ParsedContent = ({ content, toolsExecuted }) => {
  const [expandedTools, setExpandedTools] = useState({})
  return (
    <div className="space-y-2">
      {toolsExecuted && toolsExecuted.length > 0 && toolsExecuted.map((t, i) => <ToolCard key={i} tool={t.name} result={t.result} expanded={expandedTools[i]} onToggle={() => setExpandedTools(p => ({ ...p, [i]: !p[i] }))} />)}
      {typeof content === 'string' && content.includes('"devices"') && (() => { try { const p = JSON.parse(content); if (p.devices) return <DeviceTable devices={p.devices} />; } catch {} return null })()}
      {typeof content === 'string' && content.includes('total_devices') && (() => { try { const p = JSON.parse(content); if (p.total_devices !== undefined) return <StatsCard stats={p} />; } catch {} return null })()}
      <div className="whitespace-pre-wrap">{typeof content === 'string' ? content : JSON.stringify(content, null, 2)}</div>
    </div>
  )
}

export default function AIAssistant() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [availableTools, setAvailableTools] = useState([])
  const messagesEndRef = useRef(null)

  useEffect(() => { fetch('/api/ai/tools/').then(r => r.json()).then(d => d.tools && setAvailableTools(d.tools)).catch(() => {}) }, [])
  useEffect(() => { setMessages([{ id: 'welcome', role: 'assistant', content: 'Ola! Sou o Assistente IA do NOC LOR CGR.\n\nPosso ajudar com:\n- Listar dispositivos\n- Status da rede\n- Comandos SSH\n- Consultas LibreNMS/phpIPAM\n\nComo posso ajudar?', timestamp: new Date() }]) }, [])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = async (msgText = null) => {
    const text = msgText || input.trim()
    if (!text || isLoading) return
    setMessages(p => [...p, { id: 'user-' + Date.now(), role: 'user', content: text, timestamp: new Date() }])
    setInput('')
    setIsLoading(true)
    try {
      const res = await fetch('/api/ai/chat/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, session_id: sessionId }) })
      const data = await res.json()
      if (data.session_id) setSessionId(data.session_id)
      setMessages(p => [...p, { id: 'assistant-' + Date.now(), role: 'assistant', content: data.message || data.error || 'Sem resposta', timestamp: new Date(), toolsExecuted: data.tools_executed || [] }])
    } catch (e) {
      setMessages(p => [...p, { id: 'assistant-' + Date.now(), role: 'assistant', content: 'Erro: ' + e.message, timestamp: new Date() }])
    } finally { setIsLoading(false) }
  }

  const clearChat = () => { setMessages([{ id: 'welcome', role: 'assistant', content: 'Chat limpo! Como posso ajudar?', timestamp: new Date() }]); setSessionId(null) }

  const toolButtons = [
    { icon: Server, label: 'Dispositivos', action: 'Liste todos os dispositivos com status' },
    { icon: Activity, label: 'Status', action: 'Quantos dispositivos online e offline?' },
    { icon: BarChart3, label: 'Dashboard', action: 'Mostre as estatisticas do dashboard' },
    { icon: Terminal, label: 'SSH', action: 'Execute show system routerboard no primeiro router' },
  ]

  const quickActions = [
    { icon: Shield, label: 'Seguranca', action: 'Analise a seguranca da rede' },
    { icon: AlertTriangle, label: 'Troubleshoot', action: 'Cliente sem internet, troubleshooting' },
  ]

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex items-center justify-between bg-card border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
            <Bot className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Assistente IA NOC</h1>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-muted-foreground">{availableTools.length} ferramentas</span>
            </div>
          </div>
        </div>
        <button onClick={clearChat} className="p-2 hover:bg-accent rounded-lg" title="Limpar"><Trash2 className="w-5 h-5 text-muted-foreground" /></button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={'flex ' + (msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={'max-w-[90%] rounded-2xl px-4 py-3 ' + (msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border')}>
              {msg.role === 'assistant' ? <ParsedContent content={msg.content} toolsExecuted={msg.toolsExecuted} /> : <div className="whitespace-pre-wrap">{msg.content}</div>}
              <div className="text-xs mt-2 opacity-50">{msg.timestamp.toLocaleTimeString('pt-BR')}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin text-primary" /><span className="text-sm text-muted-foreground">Pensando...</span></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-4 py-2 border-t border-border flex gap-2 overflow-x-auto bg-card/30">
        {toolButtons.map((btn, i) => (
          <button key={i} onClick={() => sendMessage(btn.action)} disabled={isLoading} className="flex items-center gap-2 px-3 py-1.5 bg-accent hover:bg-accent/80 rounded-lg text-sm whitespace-nowrap disabled:opacity-50">
            <btn.icon className="w-4 h-4" />{btn.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-2 flex gap-2 overflow-x-auto">
        {quickActions.map((btn, i) => (
          <button key={i} onClick={() => sendMessage(btn.action)} disabled={isLoading} className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm whitespace-nowrap disabled:opacity-50">
            <btn.icon className="w-4 h-4" />{btn.label}
          </button>
        ))}
      </div>

      <div className="p-4 border-t border-border bg-card">
        <div className="flex gap-3">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendMessage() } }} placeholder="Pergunte sobre redes, equipamentos..." className="flex-1 px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50" disabled={isLoading} />
          <button onClick={() => sendMessage()} disabled={isLoading || !input.trim()} className="px-4 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  )
}

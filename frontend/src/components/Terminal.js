import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Plus, Maximize2, Minimize2, Settings, Check } from 'lucide-react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

export default function Terminal() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [devices, setDevices] = useState([]);
  const [showDeviceList, setShowDeviceList] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [settings, setSettings] = useState({
    fontSize: 14,
    fontColor: '#00ff00',
    theme: 'dark'
  });

  const terminalRefs = useRef({});
  const xtermInstances = useRef({});
  const fitAddons = useRef({});
  const wsRefs = useRef({});

  useEffect(() => {
    const saved = localStorage.getItem('terminalSettings');
    if (saved) setSettings(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('terminalSettings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    fetch('/devices/api/list/')
      .then(res => res.json())
      .then(data => {
        const list = data.devices || data || [];
        setDevices(list.map(d => ({
          id: d.id,
          name: d.hostname || d.name,
          ip: d.ip_address || d.ip,
          vendor: d.vendor || 'linux',
          username: d.username || 'admin',
          port: d.port || 22
        })));
      })
      .catch(() => setDevices([]));
  }, []);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  // Cores predefinidas
  const colorPresets = [
    { name: 'Verde', color: '#00ff00' },
    { name: 'Azul', color: '#00bfff' },
    { name: 'Amarelo', color: '#ffff00' },
    { name: 'Branco', color: '#ffffff' },
    { name: 'Ciano', color: '#00ffff' },
    { name: 'Laranja', color: '#ffa500' },
    { name: 'Rosa', color: '#ff69b4' },
    { name: 'Vermelho', color: '#ff4444' },
  ];

  // Criar instancia xterm
  const createXterm = useCallback((sessionId) => {
    if (xtermInstances.current[sessionId]) return;

    const terminalContainer = terminalRefs.current[sessionId];
    if (!terminalContainer) return;

    const term = new XTerm({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: settings.fontSize,
      fontFamily: 'Monaco, Menlo, "Courier New", monospace',
      theme: {
        background: '#0a0a0a',
        foreground: settings.fontColor,
        cursor: settings.fontColor,
        cursorAccent: '#000',
        selectionBackground: 'rgba(0, 255, 0, 0.3)',
        black: '#000',
        red: '#e06c75',
        green: '#00ff00',
        yellow: '#d19a66',
        blue: '#61afef',
        magenta: '#c678dd',
        cyan: '#56b6c2',
        white: '#abb2bf',
        brightBlack: '#5c6370',
        brightRed: '#e06c75',
        brightGreen: '#98c379',
        brightYellow: '#d19a66',
        brightBlue: '#61afef',
        brightMagenta: '#c678dd',
        brightCyan: '#56b6c2',
        brightWhite: '#ffffff'
      },
      allowProposedApi: true,
      allowTransparency: true,
      scrollback: 10000
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalContainer);
    
    setTimeout(() => fitAddon.fit(), 100);

    xtermInstances.current[sessionId] = term;
    fitAddons.current[sessionId] = fitAddon;

    // Handler de resize
    const handleResize = () => {
      if (fitAddons.current[sessionId]) {
        fitAddons.current[sessionId].fit();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [settings.fontSize, settings.fontColor]);

  // Conectar ao dispositivo
  const connectToDevice = (device) => {
    const sessionId = 'session-' + Date.now();
    
    const newSession = {
      id: sessionId,
      device: device,
      status: 'connecting'
    };
    
    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(sessionId);
    setShowDeviceList(false);

    // Aguardar DOM atualizar e criar xterm
    setTimeout(() => {
      createXterm(sessionId);
      
      const term = xtermInstances.current[sessionId];
      if (!term) return;

      // Conectar WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = protocol + '//' + window.location.host + '/ws/ssh/';
      const ws = new WebSocket(wsUrl);
      wsRefs.current[sessionId] = ws;

      term.writeln('\x1b[33mConectando a ' + device.name + ' (' + device.ip + ')...\x1b[0m');

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'connect', device_id: device.id }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const message = data.data || data.message || '';
          
          if (data.type === 'connected') {
            setSessions(prev => prev.map(s => s.id === sessionId ? {...s, status: 'connected'} : s));
          }
          
          if (message) {
            term.write(message);
          }
        } catch (e) {
          term.write(event.data);
        }
      };

      ws.onerror = () => {
        term.writeln('\x1b[31m[ERRO] Falha na conexao\x1b[0m');
        setSessions(prev => prev.map(s => s.id === sessionId ? {...s, status: 'error'} : s));
      };

      ws.onclose = () => {
        term.writeln('\x1b[33m[DESCONECTADO]\x1b[0m');
        setSessions(prev => prev.map(s => s.id === sessionId ? {...s, status: 'disconnected'} : s));
      };

      // Enviar input do terminal para o WebSocket
      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          let sendData = data;
          
          // Mapear teclas especiais para codigos que equipamentos de rede entendem
          if (data === '\x1b[3~') {
            // DELETE key - converter para sequencia que Huawei/Mikrotik entende
            // Opcao 1: Ctrl+D (apaga caractere a frente) - funciona na maioria
            // Opcao 2: ESC[3~ original
            // Vamos usar a sequencia que funciona em equipamentos de rede
            sendData = '\x04';  // Ctrl+D - apaga caractere a frente
          }
          
          ws.send(JSON.stringify({ data: sendData }));
        }
      });

    }, 100);
  };

  // Atualizar tamanho quando mudar sessao ativa
  useEffect(() => {
    if (activeSessionId && fitAddons.current[activeSessionId]) {
      setTimeout(() => fitAddons.current[activeSessionId].fit(), 50);
    }
  }, [activeSessionId, isFullscreen]);

  // Fechar sessao
  const closeSession = (sessionId) => {
    if (wsRefs.current[sessionId]) {
      wsRefs.current[sessionId].close();
    }
    if (xtermInstances.current[sessionId]) {
      xtermInstances.current[sessionId].dispose();
    }
    delete xtermInstances.current[sessionId];
    delete fitAddons.current[sessionId];
    delete wsRefs.current[sessionId];
    
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      const remaining = sessions.filter(s => s.id !== sessionId);
      setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  // Atualizar fonte e cor
  useEffect(() => {
    Object.values(xtermInstances.current).forEach(term => {
      if (term) {
        term.options.fontSize = settings.fontSize;
        term.options.theme = {
          ...term.options.theme,
          foreground: settings.fontColor,
          cursor: settings.fontColor
        };
      }
    });
    Object.values(fitAddons.current).forEach(fit => {
      if (fit) fit.fit();
    });
  }, [settings.fontSize, settings.fontColor]);

  // Salvar e fechar configuracoes
  const saveSettings = () => {
    localStorage.setItem('terminalSettings', JSON.stringify(settings));
    setShowSettings(false);
  };

  return (
    <div className={'h-full flex flex-col' + (isFullscreen ? ' fixed inset-0 z-50' : '')}>
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-800 border-b border-gray-700 px-4 py-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-white">Terminal SSH</h1>
          <button onClick={() => setShowDeviceList(!showDeviceList)} className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Nova
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSettings(!showSettings)} className="p-1.5 rounded hover:bg-gray-700 text-gray-300">
            <Settings className="w-4 h-4" />
          </button>
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-1.5 rounded hover:bg-gray-700 text-gray-300">
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Device List */}
      {showDeviceList && (
        <div className="absolute top-12 left-4 z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-3 w-64">
          <h3 className="font-semibold mb-2 text-white text-sm">Dispositivos</h3>
          <div className="space-y-1 max-h-48 overflow-auto">
            {devices.length === 0 ? (
              <p className="text-gray-400 text-xs">Nenhum dispositivo</p>
            ) : (
              devices.map(device => (
                <button key={device.id} onClick={() => connectToDevice(device)} className="w-full flex items-center gap-2 p-2 rounded hover:bg-gray-700 text-left">
                  <div className={'w-2 h-2 rounded-full ' + (device.vendor === 'huawei' ? 'bg-red-500' : device.vendor === 'mikrotik' ? 'bg-green-500' : 'bg-blue-500')} />
                  <div>
                    <div className="text-white text-sm">{device.name}</div>
                    <div className="text-gray-400 text-xs">{device.ip}:{device.port}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Settings */}
      {showSettings && (
        <div className="absolute top-12 right-4 z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-4 w-64">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white text-sm">Configuracoes</h3>
            <button onClick={() => setShowSettings(false)} className="p-1 rounded hover:bg-gray-700 text-gray-400">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-4">
            {/* Tamanho da Fonte */}
            <div>
              <label className="text-gray-300 text-xs">Tamanho: {settings.fontSize}px</label>
              <input 
                type="range" 
                min="10" 
                max="28" 
                value={settings.fontSize} 
                onChange={(e) => setSettings({...settings, fontSize: parseInt(e.target.value)})} 
                className="w-full accent-green-500" 
              />
            </div>
            
            {/* Cor da Fonte */}
            <div>
              <label className="text-gray-300 text-xs block mb-2">Cor da Fonte</label>
              <div className="grid grid-cols-4 gap-2">
                {colorPresets.map((preset) => (
                  <button
                    key={preset.color}
                    onClick={() => setSettings({...settings, fontColor: preset.color})}
                    className={'w-8 h-8 rounded border-2 flex items-center justify-center ' + (settings.fontColor === preset.color ? 'border-white' : 'border-gray-600')}
                    style={{ backgroundColor: preset.color }}
                    title={preset.name}
                  >
                    {settings.fontColor === preset.color && <Check className="w-4 h-4 text-black" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Cor Personalizada */}
            <div>
              <label className="text-gray-300 text-xs block mb-2">Cor Personalizada</label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={settings.fontColor} 
                  onChange={(e) => setSettings({...settings, fontColor: e.target.value})}
                  className="w-10 h-8 rounded cursor-pointer border-0"
                />
                <input
                  type="text"
                  value={settings.fontColor}
                  onChange={(e) => setSettings({...settings, fontColor: e.target.value})}
                  className="flex-1 bg-gray-700 text-white text-xs px-2 py-1 rounded border border-gray-600"
                />
              </div>
            </div>

            {/* Botao Salvar */}
            <button 
              onClick={saveSettings}
              className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium"
            >
              Salvar
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      {sessions.length > 0 && (
        <div className="flex bg-gray-900 border-b border-gray-700 overflow-x-auto flex-shrink-0">
          {sessions.map(session => (
            <div key={session.id} onClick={() => setActiveSessionId(session.id)} className={'flex items-center gap-2 px-3 py-1.5 border-r border-gray-700 cursor-pointer text-sm ' + (activeSessionId === session.id ? 'bg-gray-800' : 'hover:bg-gray-800')}>
              <div className={'w-2 h-2 rounded-full ' + (session.status === 'connected' ? 'bg-green-500' : session.status === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500')} />
              <span className="text-gray-200">{session.device.name}</span>
              <button onClick={(e) => { e.stopPropagation(); closeSession(session.id); }} className="p-0.5 rounded hover:bg-red-500/30 text-gray-400"><X className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      )}

      {/* Terminal Container */}
      <div className="flex-1 bg-black overflow-hidden relative">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p className="text-lg">Nenhuma sessao ativa</p>
            <p className="text-sm">Clique em "Nova" para conectar</p>
          </div>
        ) : (
          sessions.map(session => (
            <div
              key={session.id}
              ref={el => terminalRefs.current[session.id] = el}
              className="absolute inset-0 p-1"
              style={{ display: activeSessionId === session.id ? 'block' : 'none' }}
            />
          ))
        )}
      </div>

      {/* Status */}
      {activeSession && (
        <div className="flex items-center justify-between px-4 py-1 text-xs bg-gray-900 border-t border-gray-700 text-gray-400 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className={'w-2 h-2 rounded-full ' + (activeSession.status === 'connected' ? 'bg-green-500' : 'bg-yellow-500')} />
            <span>{activeSession.device.name} - {activeSession.status === 'connected' ? 'Online' : 'Conectando...'}</span>
          </div>
          <span>TAB: autocomplete | DEL: apagar frente | BS: apagar tras</span>
        </div>
      )}
    </div>
  );
}

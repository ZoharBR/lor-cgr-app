import React, { useState, useEffect } from 'react';

// --- Interfaces ---
interface OltCard {
    slot: number;
    type: 'HSWA' | 'GC8B' | 'GC4B' | 'EMPTY' | 'POWER';
    ports: number; // Number of PON ports
    status: 'online' | 'offline' | 'empty';
}

interface OnuDevice {
    id: string;
    ponId: string; // e.g. "1/1/1"
    name: string;
    serial: string;
    model: string;
    status: 'online' | 'offline' | 'los';
    signalRx: number; // dBm
    temp: number; // Celsius
    vlanService: number;
    ip: string;
}

// --- Mock Data ---
const MOCK_CARDS: OltCard[] = [
    { slot: 0, type: 'HSWA', ports: 0, status: 'online' }, // Switch/Uplink
    { slot: 1, type: 'GC8B', ports: 8, status: 'online' },
    { slot: 2, type: 'GC8B', ports: 8, status: 'online' },
    { slot: 3, type: 'EMPTY', ports: 0, status: 'empty' },
    { slot: 4, type: 'GC4B', ports: 4, status: 'online' },
    { slot: 5, type: 'EMPTY', ports: 0, status: 'empty' },
];

const MOCK_ONUS: OnuDevice[] = [
    { id: '1', ponId: '1/1/1', name: 'Cliente_João_Silva', serial: 'FHTT12345678', model: 'AN5506-01-A', status: 'online', signalRx: -22.5, temp: 45, vlanService: 200, ip: '192.168.100.10' },
    { id: '2', ponId: '1/1/2', name: 'Mercado_Central', serial: 'FHTT87654321', model: 'AN5506-02-B', status: 'online', signalRx: -18.2, temp: 42, vlanService: 300, ip: '192.168.100.11' },
    { id: '3', ponId: '1/1/3', name: 'Padaria_Pão_Bom', serial: 'FHTT99887766', model: 'HG6145D', status: 'online', signalRx: -26.8, temp: 48, vlanService: 200, ip: '192.168.100.12' },
    { id: '4', ponId: '1/2/1', name: 'Residencia_Maria', serial: 'FHTT11223344', model: 'AN5506-01-A', status: 'los', signalRx: -40.0, temp: 0, vlanService: 200, ip: '0.0.0.0' },
    { id: '5', ponId: '1/4/1', name: 'Escola_Municipal', serial: 'FHTT55443322', model: 'AN5506-04-F', status: 'online', signalRx: -23.1, temp: 44, vlanService: 400, ip: '192.168.100.15' },
];

const FiberHomeManager: React.FC = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [activeTab, setActiveTab] = useState<'chassis' | 'onus' | 'config'>('chassis');
    const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Thresholds
    const [signalMin, setSignalMin] = useState(-24.00);
    const [signalMax, setSignalMax] = useState(-19.00);
    const [tempMax, setTempMax] = useState(60);

    const handleConnect = () => {
        setIsConnecting(true);
        // Simulate UNM2000 API Handshake
        setTimeout(() => {
            setIsConnected(true);
            setIsConnecting(false);
        }, 2000);
    };

    // Helper to determine status color based on thresholds
    const getSignalStatus = (rx: number) => {
        if (rx === -40) return 'text-slate-500'; // Offline/LOS typical default
        if (rx < signalMin) return 'text-red-500 font-bold'; // Too low (e.g. -27)
        if (rx > signalMax) return 'text-yellow-500 font-bold'; // Too high (e.g. -15)
        return 'text-emerald-500'; // Normal (-19 to -24)
    };

    const getSignalBadge = (rx: number) => {
        if (rx === -40) return <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-500 text-xs">OFF</span>;
        
        let label = 'OK';
        let color = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        
        if (rx < signalMin) {
            label = 'LOW';
            color = 'bg-red-500/20 text-red-400 border-red-500/30';
        } else if (rx > signalMax) {
            label = 'HIGH';
            color = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        }

        return <span className={`px-2 py-0.5 rounded border text-xs font-bold ${color}`}>{label}</span>;
    };

    if (!isConnected) {
        return (
            <div className="flex items-center justify-center h-full bg-slate-950 p-4">
                <div className="bg-slate-900 p-8 rounded-xl border border-slate-800 shadow-2xl max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-500 border border-blue-500/30">
                        <i className="fas fa-network-wired text-4xl"></i>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Conexão UNM2000</h2>
                    <p className="text-slate-400 mb-6 text-sm">Integração via API com servidor FiberHome</p>
                    
                    <div className="bg-black/50 p-4 rounded text-left space-y-3 mb-6 border border-slate-800 font-mono text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Servidor:</span>
                            <span className="text-emerald-400">192.168.0.217</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Porta API:</span>
                            <span className="text-slate-300">8080/9090</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Usuário:</span>
                            <span className="text-slate-300">admin</span>
                        </div>
                    </div>

                    <button 
                        onClick={handleConnect}
                        disabled={isConnecting}
                        className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                        {isConnecting ? (
                            <><i className="fas fa-spinner fa-spin"></i> Conectando...</>
                        ) : (
                            <><i className="fas fa-plug"></i> Conectar ao Servidor</>
                        )}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-950 text-slate-200 overflow-hidden">
            {/* Header */}
            <div className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-900/50">
                        <i className="fas fa-server"></i>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white leading-tight">OLT-PRINCIPAL-01</h1>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span>Online via UNM2000 (192.168.0.217)</span>
                            <span className="border-l border-slate-700 pl-2">Model: AN5516-06</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                    <button 
                        onClick={() => setActiveTab('chassis')}
                        className={`px-4 py-2 rounded text-sm font-bold transition-all ${activeTab === 'chassis' ? 'bg-primary text-white shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                        <i className="fas fa-microchip mr-2"></i> Chassis
                    </button>
                    <button 
                        onClick={() => setActiveTab('onus')}
                        className={`px-4 py-2 rounded text-sm font-bold transition-all ${activeTab === 'onus' ? 'bg-primary text-white shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                        <i className="fas fa-users mr-2"></i> ONUs/Clientes
                    </button>
                     <button 
                        onClick={() => setActiveTab('config')}
                        className={`px-4 py-2 rounded text-sm font-bold transition-all ${activeTab === 'config' ? 'bg-primary text-white shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                        <i className="fas fa-cog mr-2"></i> Configurações
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6">
                
                {/* --- CHASSIS VIEW --- */}
                {activeTab === 'chassis' && (
                    <div className="space-y-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
                            <h2 className="text-white font-bold mb-4 flex items-center gap-2">
                                <i className="fas fa-server text-slate-500"></i> Visualização Física
                            </h2>
                            {/* Visual Chassis Grid */}
                            <div className="grid grid-cols-6 gap-2 bg-black/40 p-4 rounded-lg border border-slate-800">
                                {MOCK_CARDS.map((card) => (
                                    <div 
                                        key={card.slot} 
                                        onClick={() => card.status !== 'empty' && setSelectedSlot(card.slot)}
                                        className={`
                                            h-48 border rounded flex flex-col items-center justify-between p-2 cursor-pointer transition-all relative overflow-hidden group
                                            ${card.status === 'empty' 
                                                ? 'bg-slate-900/50 border-slate-800 border-dashed opacity-50 cursor-default' 
                                                : selectedSlot === card.slot 
                                                    ? 'bg-slate-800 border-primary shadow-[0_0_15px_rgba(14,165,233,0.3)]' 
                                                    : 'bg-slate-800 border-slate-700 hover:border-slate-500'
                                            }
                                        `}
                                    >
                                        <span className="text-xs font-mono text-slate-500">Slot {card.slot}</span>
                                        
                                        {card.status !== 'empty' && (
                                            <>
                                                <div className="flex-1 flex flex-col justify-center items-center w-full space-y-1">
                                                    {card.type === 'HSWA' && <i className="fas fa-random text-3xl text-purple-500"></i>}
                                                    {(card.type === 'GC8B' || card.type === 'GC4B') && (
                                                        <div className="grid grid-cols-2 gap-1 w-full px-2">
                                                            {Array.from({length: card.ports}).map((_, i) => (
                                                                <div key={i} className="aspect-square bg-slate-900 rounded border border-slate-600 flex items-center justify-center group-hover:border-primary/50">
                                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]"></div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="w-full text-center bg-slate-900/80 py-1 rounded">
                                                    <span className="font-bold text-xs text-white block">{card.type}</span>
                                                    <span className="text-[10px] text-emerald-400 block">Active</span>
                                                </div>
                                            </>
                                        )}
                                        {card.status === 'empty' && <span className="text-xs text-slate-600 mt-10">VAZIO</span>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {selectedSlot !== null && (
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg animate-fadeIn">
                                <h3 className="text-white font-bold mb-4">Detalhes do Slot {selectedSlot}</h3>
                                <p className="text-slate-400 text-sm">Lista de Portas PON e status para o cartão selecionado.</p>
                                {/* Placeholder for PON Port Details */}
                                <div className="grid grid-cols-4 gap-4 mt-4">
                                     {Array.from({length: MOCK_CARDS.find(c => c.slot === selectedSlot)?.ports || 0}).map((_, i) => (
                                         <div key={i} className="bg-slate-800 p-4 rounded border border-slate-700 hover:border-primary cursor-pointer transition-colors">
                                             <div className="flex justify-between items-center mb-2">
                                                 <span className="font-bold text-white">PON {i + 1}</span>
                                                 <span className="text-xs bg-emerald-900 text-emerald-300 px-1.5 py-0.5 rounded">Up</span>
                                             </div>
                                             <div className="text-xs text-slate-400">
                                                 <p>ONUs: 32/64</p>
                                                 <p>Temp: 42°C</p>
                                                 <p>TX: 4.5 dBm</p>
                                             </div>
                                         </div>
                                     ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- ONUS VIEW --- */}
                {activeTab === 'onus' && (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg flex flex-col h-full">
                        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="relative w-full sm:w-96">
                                <input 
                                    type="text" 
                                    placeholder="Buscar por Nome, Serial ou MAC..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-4 pl-10 text-sm text-white focus:outline-none focus:border-primary"
                                />
                                <i className="fas fa-search absolute left-3 top-2.5 text-slate-500"></i>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <button className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded text-sm font-bold flex items-center justify-center gap-2">
                                    <i className="fas fa-plus"></i> Provisionar
                                </button>
                                <button className="flex-1 sm:flex-none bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded text-sm font-bold border border-slate-700 flex items-center justify-center gap-2">
                                    <i className="fas fa-sync-alt"></i> Atualizar
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-bold">
                                    <tr>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">PON ID</th>
                                        <th className="p-4">Nome / Descrição</th>
                                        <th className="p-4">Serial / Modelo</th>
                                        <th className="p-4 text-center">VLAN</th>
                                        <th className="p-4 text-right">Sinal (RX)</th>
                                        <th className="p-4 text-right">Temp</th>
                                        <th className="p-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {MOCK_ONUS.filter(onu => onu.name.toLowerCase().includes(searchTerm.toLowerCase()) || onu.serial.toLowerCase().includes(searchTerm.toLowerCase())).map((onu) => (
                                        <tr key={onu.id} className="hover:bg-slate-800/50 transition-colors">
                                            <td className="p-4">
                                                {onu.status === 'online' && <span className="inline-flex items-center gap-1 text-emerald-500 font-bold text-xs"><i className="fas fa-circle text-[8px]"></i> Online</span>}
                                                {onu.status === 'los' && <span className="inline-flex items-center gap-1 text-red-500 font-bold text-xs animate-pulse"><i className="fas fa-exclamation-circle"></i> LOS</span>}
                                            </td>
                                            <td className="p-4 font-mono text-slate-300">{onu.ponId}</td>
                                            <td className="p-4 font-bold text-white">{onu.name}</td>
                                            <td className="p-4">
                                                <div className="text-slate-300 font-mono text-xs">{onu.serial}</div>
                                                <div className="text-slate-500 text-[10px]">{onu.model}</div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className="bg-blue-900/30 text-blue-400 border border-blue-900 px-2 py-0.5 rounded text-xs">
                                                    {onu.vlanService}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className={`font-mono font-bold ${getSignalStatus(onu.signalRx)}`}>
                                                    {onu.signalRx.toFixed(2)} dBm
                                                </div>
                                                <div className="mt-1">{getSignalBadge(onu.signalRx)}</div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className={`${onu.temp > tempMax ? 'text-red-500' : 'text-slate-300'}`}>
                                                    {onu.temp}°C
                                                </span>
                                            </td>
                                            <td className="p-4 text-right space-x-2">
                                                <button className="text-blue-400 hover:text-white transition-colors" title="Editar"><i className="fas fa-edit"></i></button>
                                                <button className="text-slate-400 hover:text-white transition-colors" title="Reiniciar"><i className="fas fa-power-off"></i></button>
                                                <button className="text-red-500 hover:text-red-400 transition-colors" title="Remover"><i className="fas fa-trash"></i></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- CONFIG VIEW --- */}
                {activeTab === 'config' && (
                     <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg max-w-2xl mx-auto">
                        <h2 className="text-white font-bold mb-6 flex items-center gap-2">
                            <i className="fas fa-sliders-h"></i> Parâmetros de Monitoramento
                        </h2>
                        
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-sm font-bold text-primary mb-2 uppercase">Sinal Óptico (RX) Padrão</h3>
                                <p className="text-xs text-slate-400 mb-4">Defina a faixa operacional aceitável. Valores fora desta faixa gerarão alertas.</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-slate-500 mb-1">Mínimo (dBm)</label>
                                        <input 
                                            type="number" 
                                            value={signalMin}
                                            onChange={(e) => setSignalMin(parseFloat(e.target.value))}
                                            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-primary outline-none"
                                            step="0.5"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-500 mb-1">Máximo (dBm)</label>
                                        <input 
                                            type="number" 
                                            value={signalMax}
                                            onChange={(e) => setSignalMax(parseFloat(e.target.value))}
                                            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-primary outline-none"
                                            step="0.5"
                                        />
                                    </div>
                                </div>
                                <div className="mt-2 text-xs text-slate-500 italic">
                                    Padrão atual: {signalMin} dBm a {signalMax} dBm
                                </div>
                            </div>

                            <div className="border-t border-slate-800 pt-4">
                                <h3 className="text-sm font-bold text-primary mb-2 uppercase">Temperatura Máxima</h3>
                                <div>
                                    <label className="block text-xs text-slate-500 mb-1">Limite Crítico (°C)</label>
                                    <input 
                                        type="number" 
                                        value={tempMax}
                                        onChange={(e) => setTempMax(parseInt(e.target.value))}
                                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-primary outline-none"
                                    />
                                </div>
                            </div>

                            <div className="border-t border-slate-800 pt-4 flex justify-end">
                                <button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-6 rounded transition-colors">
                                    Salvar Alterações
                                </button>
                            </div>
                        </div>
                     </div>
                )}
            </div>
        </div>
    );
};

export default FiberHomeManager;
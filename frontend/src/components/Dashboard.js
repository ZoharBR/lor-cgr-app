import React, { useState, useEffect } from "react";
const Dashboard = () => {
  const [stats, setStats] = useState({ devices_total: 0, bras_count: 0, pppoe_total: 0, pppoe_details: [], server_health: { cpu: 0, ram: 0, disk: 0 } });
  const [devices, setDevices] = useState([]);
  const [gbics, setGbics] = useState([]);
  const [gbicSummary, setGbicSummary] = useState({ critical: 0, warning: 0, down: 0, normal: 0 });
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());
  const [filter, setFilter] = useState("all");
  const [searchDevice, setSearchDevice] = useState("");
  const [selectedGbic, setSelectedGbic] = useState(null);
  const [activeTab, setActiveTab] = useState("gbics");
  const [showAlarmModal, setShowAlarmModal] = useState(false);
  const [alarmConfig, setAlarmConfig] = useState({ temp_warning: 45, temp_critical: 60, rx_warning: -20, rx_critical: -25, tx_warning: 0, tx_critical: -5, enabled: true });
  const [monitoredGbics, setMonitoredGbics] = useState([]);
  const [showMonitoredOnly, setShowMonitoredOnly] = useState(false);
  useEffect(() => { loadData(); const interval = setInterval(loadData, 60000); const clockInterval = setInterval(() => setTime(new Date()), 1000); return () => { clearInterval(interval); clearInterval(clockInterval); }; }, []);
  const loadData = async () => {
    setLoading(true);
    try {
      const devRes = await fetch("/api/devices/list/");
      if (devRes.ok) { const devData = await devRes.json(); setDevices(Array.isArray(devData) ? devData : []); }
      const dashRes = await fetch("/api/devices/dashboard/");
      if (dashRes.ok) setStats(await dashRes.json());
      const gbicRes = await fetch("/api/devices/gbic/list/?hide_no_data=true");
      if (gbicRes.ok) { const data = await gbicRes.json(); if (data.status === "success") { setGbics(data.gbics || []); setGbicSummary(data.summary || { critical: 0, warning: 0, down: 0, normal: 0 }); } }
      const monRes = await fetch("/api/devices/gbic/monitor/");
      if (monRes.ok) { const monData = await monRes.json(); setMonitoredGbics(monData.monitored || []); }
    } catch (e) { console.error("Erro:", e); } finally { setLoading(false); }
  };
  const onlineDevices = devices.filter(d => d.is_online === true).length;
  const offlineDevices = devices.filter(d => d.is_online === false).length;
  const filteredGbics = gbics.filter(g => {
    if (showMonitoredOnly && !monitoredGbics.includes(g.id)) return false;
    if (filter !== "all" && g.status !== filter) return false;
    if (searchDevice) { const s = searchDevice.toLowerCase(); if (!g.device_name.toLowerCase().includes(s) && !g.interface.toLowerCase().includes(s) && !(g.if_alias || "").toLowerCase().includes(s) && !(g.if_descr || "").toLowerCase().includes(s)) return false; }
    return true;
  });
  const getStatusColor = (s) => s === "critical" ? "bg-red-500" : s === "warning" ? "bg-yellow-500" : s === "down" ? "bg-red-700" : s === "normal" ? "bg-green-500" : "bg-gray-500";
  const getStatusLabel = (s) => s === "critical" ? "CRITICO" : s === "warning" ? "ATENCAO" : s === "down" ? "DOWN" : s === "normal" ? "NORMAL" : "?";
  const formatTemp = (v) => v === null || v === undefined ? "--" : v.toFixed(1) + "C";
  const formatPower = (v) => v === null || v === undefined ? "--" : v.toFixed(2) + "dBm";
  const toggleMonitor = async (gbicId) => { let newMonitored = monitoredGbics.includes(gbicId) ? monitoredGbics.filter(id => id !== gbicId) : [...monitoredGbics, gbicId]; setMonitoredGbics(newMonitored); await fetch("/api/devices/gbic/monitor/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ monitored: newMonitored }) }); };
  const openAlarmConfig = (gbic) => { setSelectedGbic(gbic); setAlarmConfig(gbic.alarm_config || { temp_warning: 45, temp_critical: 60, rx_warning: -20, rx_critical: -25, tx_warning: 0, tx_critical: -5, enabled: true }); setShowAlarmModal(true); };
  const saveAlarmConfig = async () => { if (!selectedGbic) return; await fetch("/api/devices/gbic/" + selectedGbic.id + "/alarm/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(alarmConfig) }); setShowAlarmModal(false); loadData(); };
  return (
    <div className="p-4 bg-gray-900 min-h-screen text-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-blue-400">LOR CGR - Monitoramento GBIC</h1>
        <div className="text-right"><div className="text-lg">{time.toLocaleDateString("pt-BR")}</div><div className="text-xl font-mono text-blue-300">{time.toLocaleTimeString("pt-BR")}</div></div>
      </div>
      <div className="flex gap-2 mb-4 border-b border-gray-700 pb-2">
        {["gbics", "devices", "overview"].map(tab => (<button key={tab} onClick={() => setActiveTab(tab)} className={"px-4 py-2 rounded-t " + (activeTab === tab ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600")}>{tab === "overview" ? "Visao Geral" : tab === "gbics" ? "GBICs" : "Dispositivos"}</button>))}
      </div>
      {loading && <div className="text-center text-blue-400 mb-4">Carregando...</div>}
      {activeTab === "gbics" && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 text-center"><div className="text-3xl font-bold text-green-400">{gbicSummary.normal}</div><div className="text-sm text-green-300">Normal</div></div>
            <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 text-center"><div className="text-3xl font-bold text-yellow-400">{gbicSummary.warning}</div><div className="text-sm text-yellow-300">Atencao</div></div>
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-center"><div className="text-3xl font-bold text-red-400">{gbicSummary.critical}</div><div className="text-sm text-red-300">Critico</div></div>
            <div className="bg-red-950/30 border border-red-900 rounded-lg p-4 text-center"><div className="text-3xl font-bold text-red-600">{gbicSummary.down}</div><div className="text-sm text-red-400">Down</div></div>
          </div>
          <div className="flex flex-wrap gap-4 mb-4">
            <input type="text" placeholder="Buscar..." value={searchDevice} onChange={(e) => setSearchDevice(e.target.value)} className="flex-1 min-w-64 px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white" />
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white"><option value="all">Todos</option><option value="normal">Normal</option><option value="warning">Atencao</option><option value="critical">Critico</option><option value="down">Down</option></select>
            <label className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded cursor-pointer"><input type="checkbox" checked={showMonitoredOnly} onChange={(e) => setShowMonitoredOnly(e.target.checked)} /><span>Somente Monitorados</span></label>
          </div>
          <div className="bg-gray-800 rounded-lg overflow-x-auto">
            <table className="w-full text-sm"><thead className="bg-gray-700"><tr><th className="px-2 py-2">Mon</th><th className="px-2 py-2 text-left">Dispositivo</th><th className="px-2 py-2 text-left">Interface</th><th className="px-2 py-2 text-left">Descricao</th><th className="px-2 py-2 text-center">Status</th><th className="px-2 py-2 text-center">Temp</th><th className="px-2 py-2 text-center">TX</th><th className="px-2 py-2 text-center">RX</th><th className="px-2 py-2 text-center">Acoes</th></tr></thead>
              <tbody>
                {filteredGbics.map((g, idx) => (
                  <tr key={g.id} className={"border-t border-gray-700 hover:bg-gray-700/50 " + (idx % 2 === 0 ? "bg-gray-800" : "bg-gray-800/50")}>
                    <td className="px-2 py-2 text-center"><input type="checkbox" checked={monitoredGbics.includes(g.id)} onChange={() => toggleMonitor(g.id)} className="w-4 h-4" /></td>
                    <td className="px-2 py-2 font-medium">{g.device_name}</td>
                    <td className="px-2 py-2">{g.interface}</td>
                    <td className="px-2 py-2 text-gray-400 max-w-xs truncate" title={g.if_alias || g.if_descr}>{g.if_alias || g.if_descr || "--"}</td>
                    <td className="px-2 py-2 text-center"><span className={"px-2 py-1 rounded text-xs font-bold " + getStatusColor(g.status)}>{getStatusLabel(g.status)}</span></td>
                    <td className={"px-2 py-2 text-center font-mono " + (g.temperature > 45 ? "text-red-400" : "text-green-400")}>{formatTemp(g.temperature)}</td>
                    <td className={"px-2 py-2 text-center font-mono " + (g.tx_power < 0 ? "text-yellow-400" : "text-green-400")}>{formatPower(g.tx_power)}</td>
                    <td className={"px-2 py-2 text-center font-mono " + (g.rx_power < -20 ? "text-red-400" : "text-green-400")}>{formatPower(g.rx_power)}</td>
                    <td className="px-2 py-2 text-center"><button onClick={() => openAlarmConfig(g)} className="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs">Config</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredGbics.length === 0 && <div className="text-center text-gray-500 py-8">Nenhum GBIC</div>}
          </div>
        </div>
      )}
      {activeTab === "devices" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((d) => (<div key={d.id} className={"bg-gray-800 rounded-lg p-4 border-l-4 " + (d.is_online ? "border-green-500" : "border-red-500")}><div className="flex justify-between"><div><h4 className="font-bold">{d.name}</h4><p className="text-sm text-gray-400">{d.ip}</p></div><span className={"px-2 py-1 rounded text-xs " + (d.is_online ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300")}>{d.is_online ? "Online" : "Offline"}</span></div></div>))}
          {devices.length === 0 && <div className="col-span-3 text-center text-gray-500 py-8">Nenhum dispositivo</div>}
        </div>
      )}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-4"><h3 className="text-gray-400 text-sm">Dispositivos</h3><div className="text-3xl font-bold">{devices.length}</div><div className="text-sm"><span className="text-green-400">Online: {onlineDevices}</span> <span className="text-red-400">Offline: {offlineDevices}</span></div></div>
          <div className="bg-gray-800 rounded-lg p-4"><h3 className="text-gray-400 text-sm">GBICs</h3><div className="text-3xl font-bold">{gbics.length}</div><div className="text-sm"><span className="text-green-400">OK: {gbicSummary.normal}</span> <span className="text-yellow-400">Alerta: {gbicSummary.warning}</span></div></div>
          <div className="bg-gray-800 rounded-lg p-4"><h3 className="text-gray-400 text-sm">PPPoE</h3><div className="text-3xl font-bold text-blue-400">{stats.pppoe_total}</div><div className="text-sm text-gray-400">{stats.bras_count} BRAS</div></div>
          <div className="bg-gray-800 rounded-lg p-4"><h3 className="text-gray-400 text-sm">Servidor</h3><div className="text-sm">CPU: {stats.server_health.cpu}%</div><div className="text-sm">RAM: {stats.server_health.ram}%</div><div className="text-sm">Disco: {stats.server_health.disk}%</div></div>
        </div>
      )}
      {showAlarmModal && selectedGbic && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowAlarmModal(false)}>
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-blue-400 mb-4">Configurar Alarmes</h2>
            <p className="text-gray-400 mb-4">{selectedGbic.device_name} - {selectedGbic.interface}</p>
            <div className="space-y-3">
              <div className="flex justify-between"><label>Temp Warning (C)</label><input type="number" value={alarmConfig.temp_warning} onChange={e => setAlarmConfig({...alarmConfig, temp_warning: parseFloat(e.target.value)})} className="w-20 px-2 py-1 bg-gray-700 rounded text-right" /></div>
              <div className="flex justify-between"><label>Temp Critica (C)</label><input type="number" value={alarmConfig.temp_critical} onChange={e => setAlarmConfig({...alarmConfig, temp_critical: parseFloat(e.target.value)})} className="w-20 px-2 py-1 bg-gray-700 rounded text-right" /></div>
              <div className="flex justify-between"><label>RX Warning (dBm)</label><input type="number" value={alarmConfig.rx_warning} onChange={e => setAlarmConfig({...alarmConfig, rx_warning: parseFloat(e.target.value)})} className="w-20 px-2 py-1 bg-gray-700 rounded text-right" /></div>
              <div className="flex justify-between"><label>RX Critico (dBm)</label><input type="number" value={alarmConfig.rx_critical} onChange={e => setAlarmConfig({...alarmConfig, rx_critical: parseFloat(e.target.value)})} className="w-20 px-2 py-1 bg-gray-700 rounded text-right" /></div>
              <div className="flex justify-between"><label>TX Warning (dBm)</label><input type="number" value={alarmConfig.tx_warning} onChange={e => setAlarmConfig({...alarmConfig, tx_warning: parseFloat(e.target.value)})} className="w-20 px-2 py-1 bg-gray-700 rounded text-right" /></div>
              <div className="flex justify-between"><label>TX Critico (dBm)</label><input type="number" value={alarmConfig.tx_critical} onChange={e => setAlarmConfig({...alarmConfig, tx_critical: parseFloat(e.target.value)})} className="w-20 px-2 py-1 bg-gray-700 rounded text-right" /></div>
              <div className="flex justify-between"><label>Alarmes Ativos</label><input type="checkbox" checked={alarmConfig.enabled} onChange={e => setAlarmConfig({...alarmConfig, enabled: e.target.checked})} className="w-5 h-5" /></div>
            </div>
            <div className="flex gap-2 mt-6"><button onClick={saveAlarmConfig} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded font-bold">Salvar</button><button onClick={() => setShowAlarmModal(false)} className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded">Cancelar</button></div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Dashboard;
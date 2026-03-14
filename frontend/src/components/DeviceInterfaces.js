import React, { useState, useEffect } from 'react';

const DeviceInterfaces = ({ device, onClose }) => {
  const [interfaces, setInterfaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInterfaces();
  }, [device.id]);

  const loadInterfaces = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/devices/device/${device.id}/interfaces/`);
      const data = await response.json();
      if (data.status === 'success') {
        setInterfaces(data.interfaces || []);
      } else {
        setError(data.message || 'Erro ao carregar interfaces');
      }
    } catch (err) {
      setError('Erro ao carregar interfaces');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch(`/api/devices/librenms/sync-all/${device.id}/`, { method: 'POST' });
      await fetch(`/api/devices/librenms/sync-ddm/${device.id}/`, { method: 'POST' });
      loadInterfaces();
    } catch (err) {
      setError('Erro na sincronizacao');
    } finally {
      setSyncing(false);
    }
  };

  const formatSpeed = (bps) => {
    if (!bps) return '-';
    if (bps >= 1e11) return (bps / 1e9).toFixed(0) + ' Gbps';
    if (bps >= 1e9) return (bps / 1e9).toFixed(1) + ' Gbps';
    if (bps >= 1e6) return (bps / 1e6).toFixed(0) + ' Mbps';
    return (bps / 1e3).toFixed(0) + ' Kbps';
  };

  const formatTraffic = (bps) => {
    if (!bps) return '0';
    if (bps >= 1e9) return (bps / 1e6).toFixed(1) + ' Gbps';
    if (bps >= 1e6) return (bps / 1e6).toFixed(2) + ' Mbps';
    if (bps >= 1e3) return (bps / 1e3).toFixed(1) + ' Kbps';
    return bps + ' bps';
  };

  const formatDbm = (value) => {
    if (value === null || value === undefined) return '-';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '-';
    const color = num > -10 ? 'text-green-400' : num > -20 ? 'text-yellow-400' : 'text-red-400';
    return <span className={color}>{num.toFixed(2)} dBm</span>;
  };

  const formatTemp = (value) => {
    if (value === null || value === undefined) return '-';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '-';
    const color = num < 40 ? 'text-green-400' : num < 55 ? 'text-yellow-400' : 'text-red-400';
    return <span className={color}>{num.toFixed(1)} C</span>;
  };

  const formatBias = (value) => {
    if (value === null || value === undefined) return '-';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '-';
    const ma = num < 1 ? num * 1000 : num;
    return <span>{ma.toFixed(1)} mA</span>;
  };

  const getStatusBadge = (adminStatus, operStatus) => {
    if (adminStatus === 'down') return <span className="px-2 py-1 bg-gray-600/30 text-gray-400 rounded text-xs">admin down</span>;
    if (operStatus === 'up') return <span className="px-2 py-1 bg-green-600/30 text-green-400 rounded text-xs">up</span>;
    return <span className="px-2 py-1 bg-red-600/30 text-red-400 rounded text-xs">down</span>;
  };

  const physicalInterfaces = interfaces.filter(i => !i.if_name.includes('.'));
  const virtualInterfaces = interfaces.filter(i => i.if_name.includes('.'));

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-7xl max-h-[90vh] overflow-hidden border border-gray-700">
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900">
          <div>
            <h3 className="text-lg font-semibold text-white">Interfaces - {device.hostname}</h3>
            <p className="text-sm text-gray-400">{device.ip_address} | {device.vendor} {device.model}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleSync} disabled={syncing} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-sm transition disabled:opacity-50">
              {syncing ? 'Sincronizando...' : 'Sincronizar'}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
          </div>
        </div>

        <div className="overflow-auto p-4" style={{ maxHeight: 'calc(90vh - 80px)' }}>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-red-400 text-center py-8">{error}</div>
          ) : interfaces.length === 0 ? (
            <div className="text-gray-400 text-center py-8">Nenhuma interface encontrada. Clique em Sincronizar.</div>
          ) : (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Interfaces Fisicas ({physicalInterfaces.length})</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-300">Interface</th>
                        <th className="px-3 py-2 text-left text-gray-300">Descricao</th>
                        <th className="px-3 py-2 text-left text-gray-300">Status</th>
                        <th className="px-3 py-2 text-left text-gray-300">Velocidade</th>
                        <th className="px-3 py-2 text-right text-gray-300">In</th>
                        <th className="px-3 py-2 text-right text-gray-300">Out</th>
                        <th className="px-3 py-2 text-left text-gray-300">GBIC/SFP</th>
                        <th className="px-3 py-2 text-center text-gray-300">DDM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {physicalInterfaces.map(iface => (
                        <tr key={iface.id} className="hover:bg-gray-700/50">
                          <td className="px-3 py-2 text-white font-mono">{iface.if_name}</td>
                          <td className="px-3 py-2 text-gray-400">{iface.if_alias || '-'}</td>
                          <td className="px-3 py-2">{getStatusBadge(iface.admin_status, iface.oper_status)}</td>
                          <td className="px-3 py-2 text-gray-300">{formatSpeed(iface.speed)}</td>
                          <td className="px-3 py-2 text-right text-green-400 font-mono">{formatTraffic(iface.traffic_in)}</td>
                          <td className="px-3 py-2 text-right text-blue-400 font-mono">{formatTraffic(iface.traffic_out)}</td>
                          <td className="px-3 py-2">
                            {iface.has_gbic ? (
                              <div className="text-xs">
                                <div className="text-purple-400 font-medium">{iface.gbic_type}</div>
                                <div className="text-gray-500">{iface.gbic_vendor} | {iface.gbic_part_number}</div>
                                <div className="text-gray-600">S/N: {iface.gbic_serial}</div>
                              </div>
                            ) : <span className="text-gray-600">-</span>}
                          </td>
                          <td className="px-3 py-2">
                            {iface.has_gbic ? (
                              <div className="text-xs bg-gray-900 p-2 rounded space-y-0.5">
                                <div><span className="text-gray-500">Temp:</span> {formatTemp(iface.gbic_temperature)}</div>
                                <div><span className="text-gray-500">Rx:</span> {formatDbm(iface.rx_power)}</div>
                                <div><span className="text-gray-500">Tx:</span> {formatDbm(iface.tx_power)}</div>
                                <div><span className="text-gray-500">Bias:</span> {formatBias(iface.gbic_bias_current)}</div>
                              </div>
                            ) : <span className="text-gray-600">-</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {virtualInterfaces.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Interfaces Virtuais/VLAN ({virtualInterfaces.length})</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-700">
                        <tr>
                          <th className="px-3 py-2 text-left text-gray-300">Interface</th>
                          <th className="px-3 py-2 text-left text-gray-300">Descricao</th>
                          <th className="px-3 py-2 text-left text-gray-300">Status</th>
                          <th className="px-3 py-2 text-right text-gray-300">In</th>
                          <th className="px-3 py-2 text-right text-gray-300">Out</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {virtualInterfaces.slice(0, 20).map(iface => (
                          <tr key={iface.id} className="hover:bg-gray-700/50">
                            <td className="px-3 py-2 text-gray-300 font-mono">{iface.if_name}</td>
                            <td className="px-3 py-2 text-gray-500">{iface.if_alias || '-'}</td>
                            <td className="px-3 py-2">{getStatusBadge(iface.admin_status, iface.oper_status)}</td>
                            <td className="px-3 py-2 text-right text-gray-400 font-mono">{formatTraffic(iface.traffic_in)}</td>
                            <td className="px-3 py-2 text-right text-gray-400 font-mono">{formatTraffic(iface.traffic_out)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeviceInterfaces;

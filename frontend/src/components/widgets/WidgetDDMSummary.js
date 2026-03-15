import React, { useState, useEffect } from 'react';

const WidgetDDMSummary = ({ config }) => {
  const [data, setData] = useState({ total: 0, avgTemp: 0, avgRx: 0, avgTx: 0 });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const res = await fetch('/api/devices/interfaces/stats/', { credentials: 'include' });
      const d = await res.json();
      if (d.status === 'success') {
        setData({
          total: d.total_transceivers || 0,
          avgTemp: d.avg_temperature || 0,
          avgRx: d.avg_rx_power || 0,
          avgTx: d.avg_tx_power || 0,
        });
      }
    } catch (e) {
      console.error('Erro:', e);
    }
  };

  return (
    <div className="flex items-center justify-around h-full">
      <div className="text-center">
        <div className="text-lg font-bold text-white">{data.total}</div>
        <div className="text-xs text-gray-400">Transc.</div>
      </div>
      <div className="text-center">
        <div className="text-lg font-bold text-cyan-400">{data.avgTemp.toFixed(1)}C</div>
        <div className="text-xs text-gray-400">Temp</div>
      </div>
      <div className="text-center">
        <div className="text-lg font-bold text-green-400">{data.avgRx.toFixed(1)}</div>
        <div className="text-xs text-gray-400">RX dBm</div>
      </div>
      <div className="text-center">
        <div className="text-lg font-bold text-yellow-400">{data.avgTx.toFixed(1)}</div>
        <div className="text-xs text-gray-400">TX dBm</div>
      </div>
    </div>
  );
};
export default WidgetDDMSummary;

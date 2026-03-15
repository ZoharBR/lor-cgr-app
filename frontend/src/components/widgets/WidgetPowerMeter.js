import React, { useState, useEffect } from 'react';

const WidgetPowerMeter = ({ config, interfaceFilter }) => {
  const [data, setData] = useState({ rxPower: 0, txPower: 0, name: '' });

  useEffect(() => {
    if (interfaceFilter) {
      loadData();
      const interval = setInterval(loadData, 60000);
      return () => clearInterval(interval);
    }
  }, [interfaceFilter]);

  const loadData = async () => {
    try {
      const res = await fetch(`/api/devices/dashboard/widget/data/?type=interface_stats&interface=${interfaceFilter}`, { credentials: 'include' });
      const d = await res.json();
      if (d.status === 'success') {
        setData(d.data);
      }
    } catch (e) {
      console.error('Erro:', e);
    }
  };

  const getRxColor = (val) => val > -10 ? 'text-green-400' : val > -20 ? 'text-yellow-400' : 'text-red-400';
  const getTxColor = (val) => val > 0 ? 'text-green-400' : val > -5 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="flex items-center justify-around h-full">
      <div className="text-center">
        <div className={`text-xl font-bold ${getRxColor(data.rxPower)}`}>{data.rxPower?.toFixed(1) || '--'}</div>
        <div className="text-xs text-gray-400">RX dBm</div>
      </div>
      <div className="text-center">
        <div className={`text-xl font-bold ${getTxColor(data.txPower)}`}>{data.txPower?.toFixed(1) || '--'}</div>
        <div className="text-xs text-gray-400">TX dBm</div>
      </div>
      {data.name && <div className="text-xs text-gray-500">{data.name}</div>}
    </div>
  );
};
export default WidgetPowerMeter;

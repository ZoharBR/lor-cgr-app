import React, { useState, useEffect } from 'react';

const WidgetStatusCard = ({ config, deviceFilter }) => {
  const [device, setDevice] = useState(null);

  useEffect(() => {
    if (deviceFilter) {
      loadData();
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
    }
  }, [deviceFilter]);

  const loadData = async () => {
    try {
      const res = await fetch(`/api/devices/dashboard/widget/data/?type=device_status&device=${deviceFilter}`, { credentials: 'include' });
      const data = await res.json();
      if (data.status === 'success') {
        setDevice(data.data);
      }
    } catch (e) {
      console.error('Erro:', e);
    }
  };

  if (!device) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        {deviceFilter ? 'Carregando...' : 'Selecione um dispositivo'}
      </div>
    );
  }

  const isOnline = device.status === 'active' || device.status === 'online';

  return (
    <div className="flex items-center justify-between h-full px-2">
      <div>
        <div className="text-white font-medium">{device.name}</div>
        <div className="text-gray-400 text-xs">{device.ip}</div>
        <div className="text-gray-500 text-xs">{device.type}</div>
      </div>
      <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
    </div>
  );
};
export default WidgetStatusCard;

import React, { useState, useEffect } from 'react';
import { devicesApi } from '../../lib/api';

const WidgetBigNumber = ({ config }) => {
  const [value, setValue] = useState(0);
  const [label, setLabel] = useState('Total');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [config]);

  const loadData = async () => {
    try {
      const res = await devicesApi.dashboard();
      const metric = config?.metric || 'devices_total';
      if (metric === 'devices_total') {
        setValue(res.devices_total || 0);
        setLabel('Dispositivos');
      } else if (metric === 'pppoe_total') {
        setValue(res.pppoe_total || 0);
        setLabel('PPPoE');
      } else if (metric === 'online') {
        setValue(res.devices_total || 0);
        setLabel('Online');
      }
    } catch (e) {
      console.error('Erro:', e);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <span className="text-3xl font-bold text-blue-400">{value}</span>
      <span className="text-gray-400 text-sm mt-1">{label}</span>
    </div>
  );
};
export default WidgetBigNumber;

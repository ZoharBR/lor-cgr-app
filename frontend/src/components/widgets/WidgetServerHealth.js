import React, { useState, useEffect } from 'react';
import { devicesApi } from '../../lib/api';

const WidgetServerHealth = ({ config }) => {
  const [health, setHealth] = useState({ cpu: 0, ram: 0, disk: 0 });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const res = await devicesApi.dashboard();
      if (res.server_health) {
        setHealth(res.server_health);
      }
    } catch (e) {
      console.error('Erro:', e);
    }
  };

  const getBarColor = (val) => val > 80 ? 'bg-red-500' : val > 50 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="grid grid-cols-3 gap-2 h-full py-1">
      {['cpu', 'ram', 'disk'].map(m => (
        <div key={m} className="flex flex-col justify-center">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400 uppercase">{m}</span>
            <span className="text-white">{health[m]}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div className={`h-2 rounded-full ${getBarColor(health[m])}`} style={{ width: `${health[m]}%` }}></div>
          </div>
        </div>
      ))}
    </div>
  );
};
export default WidgetServerHealth;

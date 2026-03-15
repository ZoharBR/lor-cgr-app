import React, { useState, useEffect } from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

const WidgetGauge = ({ config, deviceFilter, interfaceFilter }) => {
  const [value, setValue] = useState(0);
  const [label, setLabel] = useState('CPU');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [config, deviceFilter]);

  const loadData = async () => {
    try {
      const res = await fetch('/api/devices/dashboard/', { credentials: 'include' });
      const data = await res.json();
      const metric = config?.metric || 'cpu';
      if (data.server_health) {
        setValue(data.server_health[metric] || 0);
        setLabel(metric.toUpperCase());
      }
    } catch (e) {
      console.error('Erro:', e);
    }
  };

  const getColor = () => {
    if (value > 80) return '#EF4444';
    if (value > 50) return '#F59E0B';
    return '#10B981';
  };

  return (
    <div className="h-full p-2">
      <CircularProgressbar
        value={value}
        maxValue={100}
        text={`${value}%`}
        styles={buildStyles({
          textSize: '16px',
          pathColor: getColor(),
          textColor: '#fff',
          trailColor: '#374151'
        })}
      />
      <div className="text-center text-gray-400 text-xs mt-1">{label}</div>
    </div>
  );
};
export default WidgetGauge;

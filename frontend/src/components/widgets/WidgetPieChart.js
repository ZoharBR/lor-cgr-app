import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const WidgetPieChart = ({ config, deviceFilter, editMode, onConfigure }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const res = await fetch('/api/devices/dashboard/widget/data/?type=pie_chart', { credentials: 'include' });
      const result = await res.json();
      if (result.status === 'success') {
        setData(result.data.data || []);
      }
    } catch (e) {
      console.error('Erro ao carregar dados:', e);
    }
  };

  return (
    <div className="h-full">
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={30}
              outerRadius={50}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-full text-gray-400">
          Sem dados
        </div>
      )}
    </div>
  );
};

export default WidgetPieChart;

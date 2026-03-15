import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { devicesApi } from '../../lib/api';

const WidgetBarChart = ({ config }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await devicesApi.dashboard();
      const barData = (res.pppoe_details || []).slice(0, 8).map(item => ({
        name: item.name?.substring(0, 10) || 'N/A',
        total: item.count || 0
      }));
      setData(barData);
    } catch (e) {
      console.error('Erro:', e);
    }
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="name" stroke="#9CA3AF" fontSize={9} />
        <YAxis stroke="#9CA3AF" fontSize={10} />
        <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none' }} />
        <Bar dataKey="total" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};
export default WidgetBarChart;

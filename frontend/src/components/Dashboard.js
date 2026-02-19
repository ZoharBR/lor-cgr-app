import React, { useState, useEffect } from 'react';
import { devicesApi } from '../lib/api';

const Dashboard = () => {
  const [stats, setStats] = useState({
    total_devices: 0,
    active_devices: 0,
    inactive_devices: 0,
    total_backups: 0
  });
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar estatísticas do dashboard
      const dashRes = await devicesApi.dashboard();
      setStats(dashRes.stats || dashRes || {
        total_devices: 0,
        active_devices: 0,
        inactive_devices: 0,
        total_backups: 0
      });

      // Carregar lista de dispositivos
      const devRes = await devicesApi.list();
      setDevices(devRes.devices || devRes || []);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Total de Dispositivos', value: stats.total_devices || devices.length, icon: '🖥️', color: 'bg-blue-600' },
    { label: 'Dispositivos Ativos', value: stats.active_devices || 0, icon: '✅', color: 'bg-green-600' },
    { label: 'Dispositivos Inativos', value: stats.inactive_devices || 0, icon: '⚠️', color: 'bg-yellow-600' },
    { label: 'Backups Realizados', value: stats.total_backups || 0, icon: '💾', color: 'bg-purple-600' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">{stat.label}</p>
                <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
              </div>
              <div className={`w-14 h-14 ${stat.color} rounded-xl flex items-center justify-center`}>
                <span className="text-2xl">{stat.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Devices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Dispositivos Recentes</h2>
          {devices.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl mb-2 block">🖥️</span>
              <p className="text-gray-400">Nenhum dispositivo cadastrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {devices.slice(0, 5).map((device, index) => (
                <div key={device.id || index} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${device.is_active !== false ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <div>
                      <p className="text-white font-medium">{device.name || device.hostname || 'Sem nome'}</p>
                      <p className="text-gray-400 text-sm">{device.ip_address || device.ip || '-'}</p>
                    </div>
                  </div>
                  <span className="text-gray-400 text-sm">{device.device_type || device.type || 'N/A'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-2 gap-4">
            <button className="p-4 bg-blue-600 hover:bg-blue-500 rounded-lg text-center transition">
              <span className="text-2xl block mb-2">➕</span>
              <span className="text-white text-sm font-medium">Novo Dispositivo</span>
            </button>
            <button className="p-4 bg-green-600 hover:bg-green-500 rounded-lg text-center transition">
              <span className="text-2xl block mb-2">🔄</span>
              <span className="text-white text-sm font-medium">Sincronizar</span>
            </button>
            <button className="p-4 bg-purple-600 hover:bg-purple-500 rounded-lg text-center transition">
              <span className="text-2xl block mb-2">💾</span>
              <span className="text-white text-sm font-medium">Backup</span>
            </button>
            <button className="p-4 bg-orange-600 hover:bg-orange-500 rounded-lg text-center transition">
              <span className="text-2xl block mb-2">📊</span>
              <span className="text-white text-sm font-medium">Relatórios</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

import React, { useState, useEffect } from 'react';

const WidgetConfigModal = ({ widget, devices, interfaces, onLoadInterfaces, onClose, onSave }) => {
  const [title, setTitle] = useState(widget?.title || '');
  const [deviceFilter, setDeviceFilter] = useState(widget?.deviceFilter || '');
  const [interfaceFilter, setInterfaceFilter] = useState(widget?.interfaceFilter || '');
  const [config, setConfig] = useState(widget?.config || {});

  useEffect(() => {
    if (deviceFilter) {
      onLoadInterfaces(deviceFilter);
    }
  }, [deviceFilter]);

  const handleSave = () => {
    onSave({ title, deviceFilter, interfaceFilter, config });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-white mb-4">Configurar Widget</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Titulo</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Dispositivo</label>
            <select
              value={deviceFilter || ''}
              onChange={e => setDeviceFilter(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded"
            >
              <option value="">Todos</option>
              {devices.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.ip_address})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Interface</label>
            <select
              value={interfaceFilter || ''}
              onChange={e => setInterfaceFilter(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded"
            >
              <option value="">Todas</option>
              {interfaces.map(i => (
                <option key={i.id} value={i.id}>{i.name} {i.device__name ? `(${i.device__name})` : ''}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500">
            Cancelar
          </button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500">
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};
export default WidgetConfigModal;

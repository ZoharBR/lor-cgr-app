import React, { useState, useEffect } from 'react';
import WidgetPieChart from './widgets/WidgetPieChart';
import WidgetBarChart from './widgets/WidgetBarChart';
import WidgetBigNumber from './widgets/WidgetBigNumber';
import WidgetDDMSummary from './widgets/WidgetDDMSummary';
import WidgetServerHealth from './widgets/WidgetServerHealth';

const DashboardEditable = () => {
  const [widgets, setWidgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await fetch('/api/devices/dashboard/config/', { credentials: 'include' });
      const data = await res.json();
      if (data.status === 'success') {
        setWidgets(data.widgets || []);
      }
    } catch (e) {
      console.error('Erro ao carregar dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  const renderWidget = (widget) => {
    const props = { config: widget.config, deviceFilter: widget.deviceFilter };
    switch (widget.type) {
      case 'pie_chart': return <WidgetPieChart {...props} />;
      case 'bar_chart': return <WidgetBarChart {...props} />;
      case 'big_number': return <WidgetBigNumber {...props} />;
      case 'ddm_summary': return <WidgetDDMSummary {...props} />;
      case 'server_health': return <WidgetServerHealth {...props} />;
      default: return <div className="p-4 text-gray-400">{widget.title}</div>;
    }
  };

  if (loading) {
    return <div className="p-6 text-white">Carregando dashboard...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">Dashboard</h2>
        <button 
          onClick={() => setEditMode(!editMode)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          {editMode ? 'Concluir' : 'Personalizar'}
        </button>
      </div>
      
      <div className="grid grid-cols-12 gap-4">
        {widgets.map(widget => (
          <div 
            key={widget.id}
            className="bg-gray-800 rounded-lg overflow-hidden"
            style={{ gridColumn: `span ${widget.w}`, gridRow: `span ${widget.h}` }}
          >
            <div className="px-3 py-2 bg-gray-700 text-white text-sm font-medium">
              {widget.title}
            </div>
            <div className="p-2" style={{ minHeight: '80px' }}>
              {renderWidget(widget)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardEditable;

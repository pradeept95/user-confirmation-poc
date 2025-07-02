import React, { useState } from 'react';
import App from './App';
import LegendStateExamples from './components/LegendStateExamples';

const DevTabs = () => {
  const [activeTab, setActiveTab] = useState('app');

  const tabStyle = (isActive) => ({
    padding: '12px 24px',
    backgroundColor: isActive ? '#007bff' : '#f8f9fa',
    color: isActive ? 'white' : '#495057',
    border: '1px solid #dee2e6',
    cursor: 'pointer',
    marginRight: '4px',
    borderRadius: '4px 4px 0 0',
    borderBottom: isActive ? '1px solid transparent' : '1px solid #dee2e6'
  });

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ 
        borderBottom: '1px solid #dee2e6', 
        backgroundColor: '#f8f9fa',
        padding: '0 20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'end' }}>
          <button
            style={tabStyle(activeTab === 'app')}
            onClick={() => setActiveTab('app')}
          >
            Main Application
          </button>
          <button
            style={tabStyle(activeTab === 'examples')}
            onClick={() => setActiveTab('examples')}
          >
            Legend-State Examples
          </button>
        </div>
      </div>
      
      <div style={{ padding: '0' }}>
        {activeTab === 'app' && <App />}
        {activeTab === 'examples' && <LegendStateExamples />}
      </div>
    </div>
  );
};

export default DevTabs;

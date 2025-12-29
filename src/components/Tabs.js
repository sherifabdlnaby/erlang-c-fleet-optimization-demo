import React, { useState } from 'react';
import './Tabs.css';

function Tabs({ children, defaultTab = 0 }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  const tabs = React.Children.map(children, child => ({
    label: child.props.label,
    content: child
  }));

  return (
    <div className="tabs-container">
      <div className="tabs-header">
        {tabs.map((tab, index) => (
          <button
            key={index}
            className={`tab-button ${activeTab === index ? 'active' : ''}`}
            onClick={() => setActiveTab(index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="tabs-content">
        {tabs[activeTab].content}
      </div>
    </div>
  );
}

export function Tab({ children }) {
  return <div className="tab-panel">{children}</div>;
}

export default Tabs;

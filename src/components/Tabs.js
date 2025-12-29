import React, { useState, useEffect, useMemo } from 'react';
import './Tabs.css';

function Tabs({ children, defaultTab = 0 }) {
  const tabs = useMemo(() => {
    return React.Children.map(children, child => ({
      label: child.props.label,
      description: child.props.description || '',
      content: child,
      id: child.props.id || child.props.label.toLowerCase().replace(/\s+/g, '-')
    }));
  }, [children]);

  // Create mapping from tab ID to index
  const tabIdToIndex = useMemo(() => {
    return tabs.reduce((acc, tab, index) => {
      acc[tab.id] = index;
      return acc;
    }, {});
  }, [tabs]);

  const [activeTab, setActiveTab] = useState(() => {
    // Read active tab from URL query params
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && tabParam in tabIdToIndex) {
      return tabIdToIndex[tabParam];
    }
    return defaultTab;
  });

  // Update URL when tab changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabId = tabs[activeTab]?.id;
    if (tabId) {
      params.set('tab', tabId);
    } else {
      params.delete('tab');
    }
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState({}, '', newUrl);
  }, [activeTab, tabs, tabIdToIndex]);

  const handleTabChange = (index) => {
    setActiveTab(index);
  };

  return (
    <div className="tabs-container">
      <div className="tabs-header">
        {tabs.map((tab, index) => (
          <div 
            key={index} 
            className={`tab-header-item ${activeTab === index ? 'active' : ''}`}
            onClick={() => handleTabChange(index)}
          >
            <button
              className={`tab-button ${activeTab === index ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                handleTabChange(index);
              }}
            >
              {tab.label}
            </button>
            {tab.description && (() => {
              const parts = tab.description.split('. ');
              const title = parts[0] + (parts.length > 1 ? '.' : '');
              const description = parts.slice(1).join('. ');
              return (
                <div className={`tab-description ${activeTab === index ? 'active' : ''}`}>
                  <div className="tab-description-title">{title}</div>
                  {description && (
                    <>
                      <div className="tab-description-separator"></div>
                      <div className="tab-description-text">{description}</div>
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        ))}
      </div>
      <div className="tabs-content">
        {tabs[activeTab].content}
      </div>
    </div>
  );
}

export function Tab({ children, id, label, description }) {
  return <div className="tab-panel" data-tab-id={id} data-tab-label={label} data-tab-description={description}>{children}</div>;
}

export default Tabs;

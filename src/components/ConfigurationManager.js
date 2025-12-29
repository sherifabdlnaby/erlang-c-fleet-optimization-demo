import React, { useState, useEffect } from 'react';
import {
  calculateTrafficIntensity,
  calculateUtilization,
  averageWaitingTime,
  erlangC
} from '../utils/erlangC';
import './ConfigurationManager.css';

const STORAGE_KEY = 'erlangC_saved_configurations';

function ConfigurationManager({ 
  currentConfig, 
  onLoadConfig,
  onSaveConfig 
}) {
  const [savedConfigs, setSavedConfigs] = useState([]);
  const [selectedConfigs, setSelectedConfigs] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [configName, setConfigName] = useState('');

  // Load saved configurations from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const configs = JSON.parse(stored);
        setSavedConfigs(configs);
      } catch (e) {
        console.error('Failed to load saved configurations:', e);
      }
    }
  }, []);

  // Save configurations to localStorage whenever they change
  useEffect(() => {
    if (savedConfigs.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedConfigs));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [savedConfigs]);

  const handleSave = () => {
    if (!configName.trim()) {
      alert('Please enter a name for this parameter set');
      return;
    }

    const newConfig = {
      id: Date.now().toString(),
      name: configName.trim(),
      timestamp: new Date().toISOString(),
      ...currentConfig
    };

    setSavedConfigs(prev => [...prev, newConfig]);
    setConfigName('');
    if (onSaveConfig) {
      onSaveConfig(newConfig);
    }
  };

  const handleLoad = (config) => {
    if (onLoadConfig) {
      onLoadConfig(config);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this parameter set?')) {
      setSavedConfigs(prev => prev.filter(c => c.id !== id));
      setSelectedConfigs(prev => prev.filter(cid => cid !== id));
    }
  };

  const toggleConfigSelection = (id) => {
    setSelectedConfigs(prev => {
      if (prev.includes(id)) {
        return prev.filter(cid => cid !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleCompare = () => {
    if (selectedConfigs.length < 2) {
      alert('Please select at least 2 parameter sets to compare');
      return;
    }
    setShowComparison(true);
  };

  const getSelectedConfigsData = () => {
    return savedConfigs.filter(c => selectedConfigs.includes(c.id));
  };

  return (
    <div className="configuration-manager">
      <div className="config-manager-header">
        <h3>Saved Parameters</h3>
        <button 
          className="compare-btn"
          onClick={handleCompare}
          disabled={selectedConfigs.length < 2}
        >
          Compare Selected ({selectedConfigs.length})
        </button>
      </div>

      <div className="save-config-section">
        <input
          type="text"
          placeholder="Enter parameter name..."
          value={configName}
          onChange={(e) => setConfigName(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSave();
            }
          }}
          className="config-name-input"
        />
        <button 
          onClick={handleSave}
          className="save-btn"
          disabled={!configName.trim()}
        >
          Save Current Parameters
        </button>
      </div>

      {showComparison && (
        <div className="comparison-view">
          <div className="comparison-header">
            <h4>Parameters Comparison</h4>
            <button 
              className="close-btn"
              onClick={() => {
                setShowComparison(false);
                setSelectedConfigs([]);
              }}
            >
              Close Comparison
            </button>
          </div>
          <ComparisonTable configs={getSelectedConfigsData()} />
        </div>
      )}

      <div className="saved-configs-list">
        {savedConfigs.length === 0 ? (
          <div className="no-configs">No saved parameters yet</div>
        ) : (
          savedConfigs.map(config => (
            <ConfigItem
              key={config.id}
              config={config}
              isSelected={selectedConfigs.includes(config.id)}
              onSelect={() => toggleConfigSelection(config.id)}
              onLoad={() => handleLoad(config)}
              onDelete={() => handleDelete(config.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ConfigItem({ config, isSelected, onSelect, onLoad, onDelete }) {
  const date = new Date(config.timestamp);
  const formattedDate = date.toLocaleString();

  return (
    <div className={`config-item ${isSelected ? 'selected' : ''}`}>
      <div className="config-item-header">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="config-checkbox"
        />
        <div className="config-info">
          <div className="config-name">{config.name}</div>
          <div className="config-date">{formattedDate}</div>
        </div>
      </div>
      <div className="config-actions">
        <button onClick={onLoad} className="load-btn">Load</button>
        <button onClick={onDelete} className="delete-btn">Delete</button>
      </div>
    </div>
  );
}

function ComparisonTable({ configs }) {
  if (configs.length === 0) return null;

  const formatValue = (value, unit = '') => {
    if (typeof value === 'number') {
      if (value < 0.01) return value.toExponential(2);
      if (value < 1) return value.toFixed(3);
      if (value < 100) return value.toFixed(2);
      return Math.round(value).toLocaleString();
    }
    return value;
  };

  const formatPercentage = (value) => {
    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) return '';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getComparisonIndicator = (currentValue, baselineValue, metric, isBetterLower = true, showColor = true) => {
    if (typeof currentValue !== 'number' || typeof baselineValue !== 'number' || 
        isNaN(currentValue) || isNaN(baselineValue) || !isFinite(currentValue) || !isFinite(baselineValue) ||
        baselineValue === 0) {
      return null;
    }

    const percentChange = ((currentValue - baselineValue) / baselineValue) * 100;
    
    if (Math.abs(percentChange) < 0.1) {
      return null; // No significant change
    }

    let isBetter = false;
    if (isBetterLower) {
      isBetter = percentChange < 0; // Lower is better
    } else {
      isBetter = percentChange > 0; // Higher is better
    }

    const arrow = percentChange > 0 ? '↑' : '↓';
    const color = showColor ? (isBetter ? '#48bb78' : '#f56565') : '#666';
    
    return {
      percentChange,
      arrow,
      color,
      display: `${arrow} ${formatPercentage(percentChange)}`
    };
  };

  const getMetricValue = (config, metric) => {
    // Calculate metrics for each config
    if (!config || config.numServers <= 0 || config.workersPerServer <= 0) {
      return metric === 'meetsSLA' || metric === 'meetsWaitTimeSLA' || metric === 'meetsProbabilitySLA' 
        ? false 
        : '-';
    }

    const serviceTime = config.serviceTimeMs / 1000;
    const arrivalRatePerServer = config.totalArrivalRate / config.numServers;
    const trafficIntensityPerServer = calculateTrafficIntensity(arrivalRatePerServer, serviceTime);
    
    // Check if system is stable
    if (trafficIntensityPerServer >= config.workersPerServer) {
      if (metric === 'meetsSLA' || metric === 'meetsWaitTimeSLA' || metric === 'meetsProbabilitySLA') {
        return false;
      }
      if (metric === 'utilization' || metric === 'waitTime' || metric === 'probabilityDelay') {
        return '-';
      }
    }

    const utilization = calculateUtilization(config.workersPerServer, trafficIntensityPerServer);
    const waitTime = averageWaitingTime(config.workersPerServer, trafficIntensityPerServer, serviceTime) * 1000;
    const probabilityDelay = erlangC(config.workersPerServer, trafficIntensityPerServer) * 100;
    const totalCost = (config.costPerWorker * config.numServers * config.workersPerServer) + 
                     (config.perServerOverhead * config.numServers);
    const meetsWaitTimeSLA = waitTime <= config.maxWaitTimeMs;
    const meetsProbabilitySLA = probabilityDelay <= config.maxProbabilityDelay;
    const meetsSLA = meetsWaitTimeSLA && meetsProbabilitySLA;

    switch (metric) {
      case 'servers': return config.numServers;
      case 'workersPerServer': return config.workersPerServer;
      case 'totalWorkers': return config.numServers * config.workersPerServer;
      case 'arrivalRate': return config.totalArrivalRate;
      case 'serviceTime': return config.serviceTimeMs;
      case 'utilization': return utilization;
      case 'waitTime': return waitTime;
      case 'probabilityDelay': return probabilityDelay;
      case 'totalCost': return totalCost;
      case 'costPerWorker': return config.costPerWorker;
      case 'perServerOverhead': return config.perServerOverhead;
      case 'meetsSLA': return meetsSLA;
      case 'meetsWaitTimeSLA': return meetsWaitTimeSLA;
      case 'meetsProbabilitySLA': return meetsProbabilitySLA;
      default: return '-';
    }
  };

  const metrics = [
    { key: 'servers', label: 'Servers', unit: '', isBetterLower: true, showColor: true }, // Lower is better (green when down)
    { key: 'workersPerServer', label: 'Workers/Server', unit: '', isBetterLower: false, showColor: false }, // No color, just arrow
    { key: 'totalWorkers', label: 'Total Workers', unit: '', isBetterLower: true, showColor: true }, // Lower is better (green when down)
    { key: 'arrivalRate', label: 'Arrival Rate', unit: ' req/sec', isBetterLower: false, showColor: false }, // No color, just arrow
    { key: 'serviceTime', label: 'Service Time', unit: ' ms', isBetterLower: true, showColor: true }, // Lower is better
    { key: 'utilization', label: 'Utilization', unit: ' %', isBetterLower: false, showColor: true }, // Higher utilization is better (up to stability limit)
    { key: 'waitTime', label: 'Avg Wait Time', unit: ' ms', isBetterLower: true, showColor: true }, // Lower is better
    { key: 'probabilityDelay', label: 'Prob. of Queueing', unit: ' %', isBetterLower: true, showColor: true }, // Lower is better
    { key: 'totalCost', label: 'Total Cost', unit: ' $', isBetterLower: true, showColor: true }, // Lower is better
    { key: 'costPerWorker', label: 'Cost/Worker', unit: ' $', isBetterLower: true, showColor: true }, // Lower is better
    { key: 'perServerOverhead', label: 'Server Overhead', unit: ' $', isBetterLower: true, showColor: true }, // Lower is better
    { key: 'meetsSLA', label: 'Meets SLA', unit: '', isBetterLower: false, showColor: true }, // True is better
  ];

  return (
    <div className="comparison-table-container">
      <table className="comparison-table">
        <thead>
          <tr>
            <th>Metric</th>
            {configs.map((config, index) => (
              <th key={config.id}>
                {config.name}
                {index === 0 && <span className="baseline-indicator"> (baseline)</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map(metric => {
            // Get baseline value (first config)
            const baselineValue = getMetricValue(configs[0], metric.key);
            
            return (
              <tr key={metric.key}>
                <td className="metric-label">{metric.label}</td>
                {configs.map((config, index) => {
                  const value = getMetricValue(config, metric.key);
                  const displayValue = typeof value === 'boolean' 
                    ? (value ? '✓' : '✗')
                    : formatValue(value, metric.unit);
                  const className = typeof value === 'boolean'
                    ? (value ? 'metric-success' : 'metric-fail')
                    : '';
                  
                  // Calculate comparison indicator (skip for first config and boolean values)
                  let indicator = null;
                  if (index > 0 && typeof value === 'number' && typeof baselineValue === 'number') {
                    indicator = getComparisonIndicator(value, baselineValue, metric.key, metric.isBetterLower, metric.showColor);
                  }
                  
                  return (
                    <td key={config.id} className={className}>
                      <div className="comparison-cell">
                        <span className="comparison-value">{displayValue}</span>
                        {indicator && (
                          <span 
                            className="comparison-indicator"
                            style={{ color: indicator.color }}
                            title={`${indicator.percentChange >= 0 ? 'Increase' : 'Decrease'} of ${Math.abs(indicator.percentChange).toFixed(1)}% compared to baseline`}
                          >
                            {indicator.display}
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default ConfigurationManager;

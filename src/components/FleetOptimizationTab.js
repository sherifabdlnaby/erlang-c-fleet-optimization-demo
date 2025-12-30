import React, { useState, useMemo, useEffect } from 'react';
import {
  calculateTrafficIntensity,
  calculateUtilization,
  averageWaitingTime,
  erlangC
} from '../utils/erlangC';
import ConfigurationManager from './ConfigurationManager';
import ExplanationPanel from './ExplanationPanel';
import FleetVisualizations from './FleetVisualizations';
import './FleetOptimizationTab.css';

function FleetOptimizationTab() {
  // Helper function to parse query params
  const getQueryParam = (name, defaultValue) => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get(name);
    if (value === null) return defaultValue;
    const numValue = Number(value);
    return isNaN(numValue) ? defaultValue : numValue;
  };

  const getQueryParamBool = (name, defaultValue) => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get(name);
    if (value === null) return defaultValue;
    return value === 'true' || value === '1';
  };

  const [totalArrivalRate, setTotalArrivalRate] = useState(() => getQueryParam('arrivalRate', 100)); // requests per second
  const [serviceTimeMs, setServiceTimeMs] = useState(() => getQueryParam('serviceTime', 50)); // milliseconds
  const [numServers, setNumServers] = useState(() => getQueryParam('servers', 3));
  const [workersPerServer, setWorkersPerServer] = useState(() => getQueryParam('workers', 5));
  const [targetUtilization, setTargetUtilization] = useState(() => getQueryParam('utilization', 75)); // percentage
  const [useTargetUtilization, setUseTargetUtilization] = useState(() => getQueryParamBool('autoUtil', false));
  const [maxWaitTimeMs, setMaxWaitTimeMs] = useState(() => getQueryParam('maxWait', 200));
  const [maxProbabilityDelay, setMaxProbabilityDelay] = useState(() => getQueryParam('maxProb', 10)); // percentage
  const [perServerOverhead, setPerServerOverhead] = useState(() => getQueryParam('overhead', 10));
  const [costPerWorker, setCostPerWorker] = useState(() => getQueryParam('costWorker', 10));

  // Dynamic min/max values for sliders (can be overridden by direct input)
  const [minArrivalRate, setMinArrivalRate] = useState(10);
  const [maxArrivalRate, setMaxArrivalRate] = useState(500);
  const [minServiceTimeMs, setMinServiceTimeMs] = useState(1);
  const [maxServiceTimeMs, setMaxServiceTimeMs] = useState(500);
  const [minServers, setMinServers] = useState(1);
  const [maxServers, setMaxServers] = useState(20);
  const [minWorkers, setMinWorkers] = useState(1);
  const [maxWorkers, setMaxWorkers] = useState(50);
  const [minWaitTime, setMinWaitTime] = useState(50);
  const [maxWaitTime, setMaxWaitTime] = useState(1000);
  const [minProbabilityDelay, setMinProbabilityDelay] = useState(0);
  const [maxProbabilityDelaySlider, setMaxProbabilityDelaySlider] = useState(100);
  const [minTargetUtilization, setMinTargetUtilization] = useState(10);
  const [maxTargetUtilization, setMaxTargetUtilization] = useState(95);
  
  // Optimization analysis range
  const [optMinWorkers, setOptMinWorkers] = useState(() => getQueryParam('optMinWorkers', null));
  const [optMaxWorkers, setOptMaxWorkers] = useState(() => getQueryParam('optMaxWorkers', null));
  const [minOptWorkers, setMinOptWorkers] = useState(1);
  const [maxOptWorkers, setMaxOptWorkers] = useState(100);

  // Convert service time from ms to seconds for calculations
  const serviceTime = serviceTimeMs / 1000;

  // Calculate current utilization
  const currentUtilization = useMemo(() => {
    if (numServers <= 0 || workersPerServer <= 0) return 0;
    const arrivalRatePerServer = totalArrivalRate / numServers;
    const trafficIntensityPerServer = calculateTrafficIntensity(arrivalRatePerServer, serviceTime);
    return calculateUtilization(workersPerServer, trafficIntensityPerServer);
  }, [totalArrivalRate, serviceTime, numServers, workersPerServer]);

  // Calculate required servers for target utilization
  const calculateServersForUtilization = useMemo(() => {
    if (!useTargetUtilization || workersPerServer <= 0 || targetUtilization <= 0) {
      return numServers;
    }
    // Utilization = (A_per_server / N_workers) * 100
    // A_per_server = (total_arrival_rate / num_servers) * service_time
    // target_utilization = ((total_arrival_rate / num_servers) * service_time / workers_per_server) * 100
    // Solving for num_servers:
    // num_servers = (total_arrival_rate * service_time * 100) / (target_utilization * workers_per_server)
    const totalTrafficIntensity = calculateTrafficIntensity(totalArrivalRate, serviceTime);
    const requiredServers = Math.ceil((totalTrafficIntensity * 100) / (targetUtilization * workersPerServer));
    return Math.max(1, requiredServers);
  }, [useTargetUtilization, targetUtilization, totalArrivalRate, serviceTime, workersPerServer, numServers]);

  // Update servers when target utilization changes (only if auto-adjust is enabled)
  useEffect(() => {
    if (useTargetUtilization) {
      const newServers = calculateServersForUtilization;
      if (newServers !== numServers && newServers > 0) {
        setNumServers(newServers);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useTargetUtilization, targetUtilization, totalArrivalRate, serviceTimeMs, workersPerServer]);

  // Update target utilization display when servers change (if not manually controlling utilization)
  useEffect(() => {
    if (!useTargetUtilization && currentUtilization > 0 && currentUtilization <= 100) {
      const roundedUtil = Math.round(currentUtilization);
      if (Math.abs(roundedUtil - targetUtilization) > 0.5) {
        setTargetUtilization(roundedUtil);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numServers, workersPerServer, totalArrivalRate, serviceTimeMs]);

  // Function to calculate new min/max: max = 2×value, min = value/2
  const calculateNewRange = (value) => {
    const newMin = Math.max(0, value / 2);
    const newMax = value * 2;
    return { newMin, newMax };
  };

  // Calculate metrics per server
  const serverMetrics = useMemo(() => {
    if (numServers <= 0 || workersPerServer <= 0) {
      return null;
    }

    const arrivalRatePerServer = totalArrivalRate / numServers;
    const trafficIntensityPerServer = calculateTrafficIntensity(
      arrivalRatePerServer,
      serviceTime
    );

    // Check if system is stable
    if (trafficIntensityPerServer >= workersPerServer) {
      return {
        isStable: false,
        error: 'System unstable: Traffic intensity exceeds workers per server'
      };
    }

    const utilization = calculateUtilization(workersPerServer, trafficIntensityPerServer);
    const waitTime = averageWaitingTime(workersPerServer, trafficIntensityPerServer, serviceTime);
    const probabilityDelay = erlangC(workersPerServer, trafficIntensityPerServer);

    // Check if meets SLA
    const meetsWaitTimeSLA = waitTime * 1000 <= maxWaitTimeMs;
    const meetsProbabilitySLA = probabilityDelay * 100 <= maxProbabilityDelay;
    const meetsSLA = meetsWaitTimeSLA && meetsProbabilitySLA;

    return {
      isStable: true,
      arrivalRatePerServer,
      trafficIntensityPerServer,
      utilization,
      waitTime: waitTime * 1000, // Convert to milliseconds
      probabilityDelay: probabilityDelay * 100, // Convert to percentage
      meetsSLA,
      meetsWaitTimeSLA,
      meetsProbabilitySLA
    };
  }, [totalArrivalRate, serviceTime, numServers, workersPerServer, maxWaitTimeMs, maxProbabilityDelay]);

  // Calculate total cost (workers + server overhead)
  const totalCost = useMemo(() => {
    if (numServers <= 0 || workersPerServer <= 0) {
      return 0;
    }
    return (costPerWorker * numServers * workersPerServer) + (perServerOverhead * numServers);
  }, [numServers, workersPerServer, costPerWorker, perServerOverhead]);

  // Helper function to update URL query params
  const updateQueryParams = (updates) => {
    const params = new URLSearchParams(window.location.search);
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        params.set(key, value.toString());
      } else {
        params.delete(key);
      }
    });
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState({}, '', newUrl);
  };

  // Update URL when parameters change
  useEffect(() => {
    const params = {
      arrivalRate: totalArrivalRate,
      serviceTime: serviceTimeMs,
      servers: numServers,
      workers: workersPerServer,
      utilization: targetUtilization,
      autoUtil: useTargetUtilization,
      maxWait: maxWaitTimeMs,
      maxProb: maxProbabilityDelay,
      overhead: perServerOverhead,
      costWorker: costPerWorker
    };
    
    if (optMinWorkers !== null) params.optMinWorkers = optMinWorkers;
    if (optMaxWorkers !== null) params.optMaxWorkers = optMaxWorkers;
    
    updateQueryParams(params);
  }, [totalArrivalRate, serviceTimeMs, numServers, workersPerServer, targetUtilization, useTargetUtilization, maxWaitTimeMs, maxProbabilityDelay, perServerOverhead, costPerWorker, optMinWorkers, optMaxWorkers]);

  // Get current configuration for saving
  const getCurrentConfig = () => {
    return {
      totalArrivalRate,
      serviceTimeMs,
      numServers,
      workersPerServer,
      targetUtilization,
      useTargetUtilization,
      maxWaitTimeMs,
      maxProbabilityDelay,
      perServerOverhead,
      costPerWorker,
      optMinWorkers,
      optMaxWorkers
    };
  };

  // Load a saved configuration
  const handleLoadConfig = (config) => {
    setTotalArrivalRate(config.totalArrivalRate);
    setServiceTimeMs(config.serviceTimeMs);
    setNumServers(config.numServers);
    setWorkersPerServer(config.workersPerServer);
    setTargetUtilization(config.targetUtilization);
    setUseTargetUtilization(config.useTargetUtilization || false);
    setMaxWaitTimeMs(config.maxWaitTimeMs);
    setMaxProbabilityDelay(config.maxProbabilityDelay);
    setPerServerOverhead(config.perServerOverhead);
    setCostPerWorker(config.costPerWorker);
    if (config.optMinWorkers !== undefined) setOptMinWorkers(config.optMinWorkers);
    if (config.optMaxWorkers !== undefined) setOptMaxWorkers(config.optMaxWorkers);
  };

  return (
    <div className="fleet-optimization-tab">
      <div className="fleet-header">
        <h2>Fleet Optimization Simulation</h2>
        <p className="fleet-subtitle">
          Simulate different server fleet configurations using Erlang C formula
        </p>
      </div>

      <div className="fleet-layout">
        <div className="fleet-left-column">
          <div className="fleet-inputs-panel">
            <h3>Simulation Parameters</h3>
            
            <div className="panel-tooltip">
              💡 Tip: You can enter values outside the slider range by typing directly in the number field
            </div>

          <div className="input-section">
            <h4 className="input-section-title">Traffic Parameters</h4>
            <div className="input-group">
              <label>
                <span className="label-text">Total Arrival Rate</span>
                <span className="label-unit">(req/sec)</span>
              </label>
            <div className="slider-input-container">
              <input
                type="range"
                min={minArrivalRate}
                max={maxArrivalRate}
                step="10"
                value={totalArrivalRate}
                onChange={(e) => setTotalArrivalRate(Number(e.target.value))}
                className="slider-input"
              />
              <input
                type="number"
                step="1"
                value={totalArrivalRate}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (!isNaN(val) && val > 0) {
                      setTotalArrivalRate(val);
                      if (val < minArrivalRate || val > maxArrivalRate) {
                        const { newMin, newMax } = calculateNewRange(val);
                        setMinArrivalRate(Math.floor(newMin / 10) * 10); // Round down to nearest 10
                        setMaxArrivalRate(Math.ceil(newMax / 10) * 10); // Round up to nearest 10
                      }
                    } else if (e.target.value === '' || e.target.value === '-') {
                      setTotalArrivalRate(0);
                    }
                  }}
                className="number-input"
              />
            </div>
          </div>

          <div className="input-group">
            <label>
              <span className="label-text">Average Service Time</span>
              <span className="label-unit">(ms)</span>
            </label>
            <div className="slider-input-container">
              <input
                type="range"
                min={minServiceTimeMs}
                max={maxServiceTimeMs}
                step="1"
                value={serviceTimeMs}
                onChange={(e) => setServiceTimeMs(Number(e.target.value))}
                className="slider-input"
              />
              <input
                type="number"
                step="1"
                value={serviceTimeMs}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (!isNaN(val) && val > 0) {
                      const intVal = Math.floor(val);
                      setServiceTimeMs(intVal);
                      if (intVal < minServiceTimeMs || intVal > maxServiceTimeMs) {
                        const { newMin, newMax } = calculateNewRange(intVal);
                        setMinServiceTimeMs(Math.max(1, Math.floor(newMin)));
                        setMaxServiceTimeMs(Math.ceil(newMax));
                      }
                    } else if (e.target.value === '' || e.target.value === '-') {
                      setServiceTimeMs(0);
                    }
                  }}
                className="number-input"
              />
            </div>
          </div>
          </div>

          <div className="input-section">
            <h4 className="input-section-title">Server Configuration</h4>
            
            <div className="input-group">
              <label>
                <span className="label-text">Target Utilization</span>
                <span className="label-unit">(%)</span>
                <input
                  type="checkbox"
                  checked={useTargetUtilization}
                  onChange={(e) => setUseTargetUtilization(e.target.checked)}
                  className="utilization-toggle"
                />
                <span className="toggle-label">Auto-adjust servers</span>
              </label>
              <div className="slider-input-container">
                <input
                  type="range"
                  min={minTargetUtilization}
                  max={maxTargetUtilization}
                  step="1"
                  value={targetUtilization}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setTargetUtilization(val);
                    if (val < minTargetUtilization || val > maxTargetUtilization) {
                      const { newMin, newMax } = calculateNewRange(val);
                      setMinTargetUtilization(Math.max(10, Math.floor(newMin)));
                      setMaxTargetUtilization(Math.min(95, Math.ceil(newMax)));
                    }
                  }}
                  className="slider-input"
                />
                <input
                  type="number"
                  step="0.1"
                  value={targetUtilization}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (!isNaN(val) && val >= 0 && val <= 100) {
                      setTargetUtilization(val);
                      if (val < minTargetUtilization || val > maxTargetUtilization) {
                        const { newMin, newMax } = calculateNewRange(val);
                        setMinTargetUtilization(Math.max(10, Math.floor(newMin)));
                        setMaxTargetUtilization(Math.min(95, Math.ceil(newMax)));
                      }
                    } else if (e.target.value === '' || e.target.value === '-') {
                      setTargetUtilization(0);
                    }
                  }}
                  className="number-input"
                />
              </div>
              <div className="utilization-info">
                {useTargetUtilization ? (
                  <span className="info-text">
                    Current: {currentUtilization.toFixed(1)}% | 
                    Required Servers: {calculateServersForUtilization}
                  </span>
                ) : (
                  <span className="info-text">
                    Current Utilization: {currentUtilization.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
            <div className="input-group">
              <label>
                <span className="label-text">Number of Servers</span>
                {useTargetUtilization && (
                  <span className="label-unit" style={{ color: '#999', fontStyle: 'italic', marginLeft: '0.5rem' }}>
                    (auto-adjusted)
                  </span>
                )}
              </label>
            <div className="slider-input-container">
              <input
                type="range"
                min={minServers}
                max={maxServers}
                step="1"
                value={numServers}
                onChange={(e) => setNumServers(Number(e.target.value))}
                className="slider-input"
                disabled={useTargetUtilization}
                style={{ opacity: useTargetUtilization ? 0.5 : 1, cursor: useTargetUtilization ? 'not-allowed' : 'pointer' }}
              />
              <input
                type="number"
                step="1"
                value={numServers}
                  onChange={(e) => {
                    if (useTargetUtilization) return;
                    const val = Number(e.target.value);
                    if (!isNaN(val) && val > 0) {
                      const intVal = Math.floor(val);
                      setNumServers(intVal);
                      if (intVal < minServers || intVal > maxServers) {
                        const { newMin, newMax } = calculateNewRange(intVal);
                        setMinServers(Math.max(1, Math.floor(newMin)));
                        setMaxServers(Math.ceil(newMax));
                      }
                    } else if (e.target.value === '' || e.target.value === '-') {
                      setNumServers(0);
                    }
                  }}
                className="number-input"
                disabled={useTargetUtilization}
                style={{ opacity: useTargetUtilization ? 0.5 : 1, cursor: useTargetUtilization ? 'not-allowed' : 'text' }}
              />
            </div>
          </div>

          <div className="input-group">
            <label>
              <span className="label-text">Workers per Server</span>
            </label>
            <div className="slider-input-container">
              <input
                type="range"
                min={minWorkers}
                max={maxWorkers}
                step="1"
                value={workersPerServer}
                onChange={(e) => setWorkersPerServer(Number(e.target.value))}
                className="slider-input"
              />
              <input
                type="number"
                step="1"
                value={workersPerServer}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (!isNaN(val) && val > 0) {
                      const intVal = Math.floor(val);
                      setWorkersPerServer(intVal);
                      if (intVal < minWorkers || intVal > maxWorkers) {
                        const { newMin, newMax } = calculateNewRange(intVal);
                        setMinWorkers(Math.max(1, Math.floor(newMin)));
                        setMaxWorkers(Math.ceil(newMax));
                      }
                    } else if (e.target.value === '' || e.target.value === '-') {
                      setWorkersPerServer(0);
                    }
                  }}
                className="number-input"
              />
            </div>
          </div>
          </div>

          <div className="input-section">
            <h4 className="input-section-title">SLAs</h4>
            <div className="input-group">
              <label>
                <span className="label-text">Max Wait Time Tolerance</span>
                <span className="label-unit">(ms)</span>
              </label>
              <div className="slider-input-container">
                <input
                  type="range"
                  min={minWaitTime}
                  max={maxWaitTime}
                  step="50"
                  value={maxWaitTimeMs}
                  onChange={(e) => setMaxWaitTimeMs(Number(e.target.value))}
                  className="slider-input"
                />
                <input
                  type="number"
                  step="1"
                  value={maxWaitTimeMs}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (!isNaN(val) && val > 0) {
                      setMaxWaitTimeMs(val);
                      if (val < minWaitTime || val > maxWaitTime) {
                        const { newMin, newMax } = calculateNewRange(val);
                        setMinWaitTime(Math.max(50, Math.floor(newMin / 50) * 50)); // Round down to nearest 50
                        setMaxWaitTime(Math.ceil(newMax / 50) * 50); // Round up to nearest 50
                      }
                    } else if (e.target.value === '' || e.target.value === '-') {
                      setMaxWaitTimeMs(0);
                    }
                  }}
                  className="number-input"
                />
              </div>
            </div>

            <div className="input-group">
              <label>
                <span className="label-text">Max Probability of Queueing</span>
                <span className="label-unit">(%)</span>
              </label>
              <div className="slider-input-container">
                <input
                  type="range"
                  min={minProbabilityDelay}
                  max={maxProbabilityDelaySlider}
                  step="1"
                  value={maxProbabilityDelay}
                  onChange={(e) => setMaxProbabilityDelay(Number(e.target.value))}
                  className="slider-input"
                />
                <input
                  type="number"
                  step="0.1"
                  value={maxProbabilityDelay}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (!isNaN(val) && val >= 0) {
                      setMaxProbabilityDelay(val);
                      if (val < minProbabilityDelay || val > maxProbabilityDelaySlider) {
                        const { newMin, newMax } = calculateNewRange(val);
                        setMinProbabilityDelay(Math.max(0, Math.floor(newMin)));
                        setMaxProbabilityDelaySlider(Math.min(100, Math.ceil(newMax))); // Cap at 100%
                      }
                    } else if (e.target.value === '' || e.target.value === '-') {
                      setMaxProbabilityDelay(0);
                    }
                  }}
                  className="number-input"
                />
              </div>
            </div>
          </div>

          <div className="cost-inputs-section">
            <h4>Cost Parameters</h4>
            <div className="cost-input-group">
              <label>
                <span className="label-text">Cost per Worker</span>
                <span className="label-unit">($)</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={costPerWorker}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!isNaN(val) && val >= 0) {
                    setCostPerWorker(val);
                  } else if (e.target.value === '' || e.target.value === '-') {
                    setCostPerWorker(0);
                  }
                }}
                className="cost-input"
                placeholder="Enter cost per worker"
              />
            </div>
            <div className="cost-input-group">
              <label>
                <span className="label-text">Per Server Overhead</span>
                <span className="label-unit">($)</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={perServerOverhead}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!isNaN(val) && val >= 0) {
                    setPerServerOverhead(val);
                  } else if (e.target.value === '' || e.target.value === '-') {
                    setPerServerOverhead(0);
                  }
                }}
                className="cost-input"
                placeholder="Enter overhead per server"
              />
            </div>
          </div>

          <div className="input-section">
            <h4 className="input-section-title">Optimization Analysis Range</h4>
            <p className="section-description">
              Set the range of workers per server to explore in the optimization analysis.
              Leave empty to auto-calculate based on current configuration.
            </p>
            
            <div className="input-group">
              <label>
                <span className="label-text">Min Workers to Analyze</span>
                <span className="label-unit">(optional)</span>
              </label>
              <div className="slider-input-container">
                <input
                  type="range"
                  min={minOptWorkers}
                  max={maxOptWorkers}
                  step="1"
                  value={optMinWorkers || Math.max(1, workersPerServer - 10)}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val > 0) {
                      setOptMinWorkers(val);
                      if (val < minOptWorkers || val > maxOptWorkers) {
                        const { newMin, newMax } = calculateNewRange(val);
                        setMinOptWorkers(Math.max(1, Math.floor(newMin)));
                        setMaxOptWorkers(Math.ceil(newMax));
                      }
                    }
                  }}
                  className="slider-input"
                />
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={optMinWorkers || ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : Number(e.target.value);
                    if (val === null) {
                      setOptMinWorkers(null);
                    } else if (!isNaN(val) && val > 0) {
                      const intVal = Math.floor(val);
                      setOptMinWorkers(intVal);
                      if (intVal < minOptWorkers || intVal > maxOptWorkers) {
                        const { newMin, newMax } = calculateNewRange(intVal);
                        setMinOptWorkers(Math.max(1, Math.floor(newMin)));
                        setMaxOptWorkers(Math.ceil(newMax));
                      }
                    }
                  }}
                  className="number-input"
                  placeholder="Auto"
                />
              </div>
            </div>
            
            <div className="input-group">
              <label>
                <span className="label-text">Max Workers to Analyze</span>
                <span className="label-unit">(optional)</span>
              </label>
              <div className="slider-input-container">
                <input
                  type="range"
                  min={minOptWorkers}
                  max={maxOptWorkers}
                  step="1"
                  value={optMaxWorkers || Math.min(100, workersPerServer + 20)}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val > 0) {
                      setOptMaxWorkers(val);
                      if (val < minOptWorkers || val > maxOptWorkers) {
                        const { newMin, newMax } = calculateNewRange(val);
                        setMinOptWorkers(Math.max(1, Math.floor(newMin)));
                        setMaxOptWorkers(Math.ceil(newMax));
                      }
                    }
                  }}
                  className="slider-input"
                />
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={optMaxWorkers || ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : Number(e.target.value);
                    if (val === null) {
                      setOptMaxWorkers(null);
                    } else if (!isNaN(val) && val > 0) {
                      const intVal = Math.floor(val);
                      setOptMaxWorkers(intVal);
                      if (intVal < minOptWorkers || intVal > maxOptWorkers) {
                        const { newMin, newMax } = calculateNewRange(intVal);
                        setMinOptWorkers(Math.max(1, Math.floor(newMin)));
                        setMaxOptWorkers(Math.ceil(newMax));
                      }
                    }
                  }}
                  className="number-input"
                  placeholder="Auto"
                />
              </div>
            </div>
          </div>
          </div>

          <ConfigurationManager
            currentConfig={getCurrentConfig()}
            onLoadConfig={handleLoadConfig}
          />
        </div>

        <div className="fleet-right-column">
          <div className="fleet-results-panel">
            <h3>Simulation Results</h3>

            {serverMetrics && serverMetrics.isStable ? (
              <>
                <div className="results-grid">
                  <div className="result-card">
                    <div className="result-label">Total Cost</div>
                    <div className="result-value cost-value">
                      ${totalCost.toFixed(2)}
                    </div>
                    <div className="result-breakdown">
                      {numServers * workersPerServer} workers × ${costPerWorker} = ${(costPerWorker * numServers * workersPerServer).toFixed(2)}
                      {perServerOverhead > 0 && (
                        <>
                          <br />
                          {numServers} servers × ${perServerOverhead} overhead = ${(perServerOverhead * numServers).toFixed(2)}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="result-card">
                    <div className="result-label">Average Wait Time per Server</div>
                    <div className={`result-value ${serverMetrics.meetsWaitTimeSLA ? 'success' : 'warning'}`}>
                      {serverMetrics.waitTime.toFixed(2)} ms
                    </div>
                    <div className="result-status">
                      {serverMetrics.meetsWaitTimeSLA ? (
                        <span className="status-success">✓ Meets SLA ({maxWaitTimeMs}ms)</span>
                      ) : (
                        <span className="status-warning">⚠ Exceeds SLA ({maxWaitTimeMs}ms)</span>
                      )}
                    </div>
                  </div>

                  <div className="result-card">
                    <div className="result-label">Server Utilization</div>
                    <div className={`result-value ${serverMetrics.utilization > 85 ? 'warning' : serverMetrics.utilization < 50 ? 'low' : 'success'}`}>
                      {serverMetrics.utilization.toFixed(2)}%
                    </div>
                    <div className="result-status">
                      {serverMetrics.utilization > 85 ? (
                        <span className="status-warning">High - Risk of overload</span>
                      ) : serverMetrics.utilization < 50 ? (
                        <span className="status-info">Low - Underutilized</span>
                      ) : (
                        <span className="status-success">Optimal range (70-85%)</span>
                      )}
                    </div>
                  </div>

                  <div className="result-card">
                    <div className="result-label">Probability of Queueing per Server</div>
                    <div className={`result-value ${serverMetrics.meetsProbabilitySLA ? 'success' : 'warning'}`}>
                      {serverMetrics.probabilityDelay.toFixed(2)}%
                    </div>
                    <div className="result-status">
                      {serverMetrics.meetsProbabilitySLA ? (
                        <span className="status-success">✓ Meets SLA ({maxProbabilityDelay}%)</span>
                      ) : (
                        <span className="status-warning">⚠ Exceeds SLA ({maxProbabilityDelay}%)</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="detailed-metrics">
                  <h4>Detailed Metrics</h4>
                  <div className="metrics-table">
                    <div className="metric-row">
                      <span className="metric-name">Arrival Rate per Server:</span>
                      <span className="metric-value">{serverMetrics.arrivalRatePerServer.toFixed(2)} req/sec</span>
                    </div>
                    <div className="metric-row">
                      <span className="metric-name">Traffic Intensity per Server:</span>
                      <span className="metric-value">{serverMetrics.trafficIntensityPerServer.toFixed(2)} Erlangs</span>
                    </div>
                    <div className="metric-row">
                      <span className="metric-name">Total Workers:</span>
                      <span className="metric-value">{numServers * workersPerServer}</span>
                    </div>
                    <div className="metric-row">
                      <span className="metric-name">System Stability:</span>
                      <span className="metric-value stability-stable">✓ Stable (A &lt; N)</span>
                    </div>
                  </div>

                  <h4 className="cost-details-header">Cost Breakdown</h4>
                  <div className="metrics-table">
                    <div className="metric-row">
                      <span className="metric-name">Total Cost per Worker:</span>
                      <span className="metric-value">${(costPerWorker * numServers * workersPerServer).toFixed(2)}</span>
                    </div>
                    <div className="metric-row">
                      <span className="metric-name">Total Cost of Per Server Overhead:</span>
                      <span className="metric-value">${(perServerOverhead * numServers).toFixed(2)}</span>
                    </div>
                    <div className="metric-row">
                      <span className="metric-name">Total Cost per Server:</span>
                      <span className="metric-value">${((costPerWorker * workersPerServer) + perServerOverhead).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="error-message">
                <div className="error-icon">⚠</div>
                <div className="error-text">
                  {serverMetrics?.error || 'Invalid configuration. Please check your inputs.'}
                </div>
                <div className="error-hint">
                  Ensure: Traffic Intensity per Server &lt; Workers per Server
                </div>
              </div>
            )}
          </div>

          <FleetVisualizations
            totalArrivalRate={totalArrivalRate}
            serviceTime={serviceTime}
            numServers={numServers}
            workersPerServer={workersPerServer}
            targetUtilization={targetUtilization}
            maxWaitTimeMs={maxWaitTimeMs}
            maxProbabilityDelay={maxProbabilityDelay}
            costPerWorker={costPerWorker}
            perServerOverhead={perServerOverhead}
            optMinWorkers={optMinWorkers}
            optMaxWorkers={optMaxWorkers}
          />
        </div>
      </div>

      <div className="explanation-section">
        <ExplanationPanel />
      </div>
    </div>
  );
}

export default FleetOptimizationTab;

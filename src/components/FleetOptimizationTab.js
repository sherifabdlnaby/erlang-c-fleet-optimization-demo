import React, { useState, useMemo } from 'react';
import {
  calculateTrafficIntensity,
  calculateUtilization,
  averageWaitingTime,
  erlangC
} from '../utils/erlangC';
import './FleetOptimizationTab.css';

function FleetOptimizationTab() {
  const [totalArrivalRate, setTotalArrivalRate] = useState(100); // requests per second
  const [serviceTimeMs, setServiceTimeMs] = useState(50); // milliseconds
  const [numServers, setNumServers] = useState(3);
  const [workersPerServer, setWorkersPerServer] = useState(5);
  const [maxWaitTimeMs, setMaxWaitTimeMs] = useState(200);
  const [perServerOverhead, setPerServerOverhead] = useState(0);
  const [costPerWorker, setCostPerWorker] = useState(10);

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

  // Convert service time from ms to seconds for calculations
  const serviceTime = serviceTimeMs / 1000;

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
    const meetsSLA = waitTime * 1000 <= maxWaitTimeMs;

    return {
      isStable: true,
      arrivalRatePerServer,
      trafficIntensityPerServer,
      utilization,
      waitTime: waitTime * 1000, // Convert to milliseconds
      probabilityDelay: probabilityDelay * 100, // Convert to percentage
      meetsSLA
    };
  }, [totalArrivalRate, serviceTime, numServers, workersPerServer, maxWaitTimeMs]);

  // Calculate total cost (workers + server overhead)
  const totalCost = useMemo(() => {
    if (numServers <= 0 || workersPerServer <= 0) {
      return 0;
    }
    return (costPerWorker * numServers * workersPerServer) + (perServerOverhead * numServers);
  }, [numServers, workersPerServer, costPerWorker, perServerOverhead]);

  return (
    <div className="fleet-optimization-tab">
      <div className="fleet-header">
        <h2>Fleet Optimization Simulation</h2>
        <p className="fleet-subtitle">
          Simulate different server fleet configurations using Erlang C formula
        </p>
      </div>

      <div className="fleet-layout">
        <div className="fleet-inputs-panel">
          <h3>Simulation Parameters</h3>
          
          <div className="panel-tooltip">
            💡 Tip: You can enter values outside the slider range by typing directly in the number field
          </div>

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
            <div className="value-display-small">{serviceTimeMs} ms</div>
          </div>

          <div className="input-group">
            <label>
              <span className="label-text">Number of Servers</span>
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
              />
              <input
                type="number"
                step="1"
                value={numServers}
                  onChange={(e) => {
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
        </div>

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
                  <div className={`result-value ${serverMetrics.meetsSLA ? 'success' : 'warning'}`}>
                    {serverMetrics.waitTime.toFixed(2)} ms
                  </div>
                  <div className="result-status">
                    {serverMetrics.meetsSLA ? (
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
                  <div className={`result-value ${serverMetrics.probabilityDelay > 10 ? 'warning' : 'success'}`}>
                    {serverMetrics.probabilityDelay.toFixed(2)}%
                  </div>
                  <div className="result-status">
                    {serverMetrics.probabilityDelay > 10 ? (
                      <span className="status-warning">High queue probability</span>
                    ) : (
                      <span className="status-success">Low queue probability</span>
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
      </div>
    </div>
  );
}

export default FleetOptimizationTab;

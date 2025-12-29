import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  generateDataPoints,
  calculateTrafficIntensity,
  findMinWorkers
} from '../utils/erlangC';
import ExplanationPanel from './ExplanationPanel';
import './IndividualServerTab.css';

function IndividualServerTab() {
  const [arrivalRate, setArrivalRate] = useState(100);
  const [serviceTime, setServiceTime] = useState(0.05);
  const [workers, setWorkers] = useState(10);
  const [maxWaitTimeMs, setMaxWaitTimeMs] = useState(200);

  const trafficIntensity = useMemo(() => {
    return calculateTrafficIntensity(arrivalRate, serviceTime);
  }, [arrivalRate, serviceTime]);

  const dataPoints = useMemo(() => {
    const minWorkers = Math.max(1, Math.ceil(trafficIntensity));
    const maxWorkers = Math.max(workers + 5, Math.ceil(trafficIntensity * 2));
    return generateDataPoints(arrivalRate, serviceTime, minWorkers, maxWorkers);
  }, [arrivalRate, serviceTime, workers, trafficIntensity]);

  const currentMetrics = useMemo(() => {
    const point = dataPoints.find(d => d.workers === workers) || dataPoints[0];
    return point;
  }, [dataPoints, workers]);

  const optimalWorkers = useMemo(() => {
    return findMinWorkers(arrivalRate, serviceTime, maxWaitTimeMs / 1000);
  }, [arrivalRate, serviceTime, maxWaitTimeMs]);


  const handleOptimize = () => {
    setWorkers(optimalWorkers);
  };

  return (
    <div className="individual-server-tab">
      <div className="main-config-layout">
        <div className="config-left-panel">
          <div className="controls-panel">
            <h2>Server Configuration</h2>
            
            <div className="control-group">
              <label>
                <span className="label-text">Request Arrival Rate</span>
                <span className="label-unit">(req/sec)</span>
              </label>
              <div className="slider-input-container">
                <input
                  type="range"
                  min="10"
                  max="500"
                  step="10"
                  value={arrivalRate}
                  onChange={(e) => setArrivalRate(Number(e.target.value))}
                  className="slider-input"
                />
                <input
                  type="number"
                  min="10"
                  max="500"
                  step="10"
                  value={arrivalRate}
                  onChange={(e) => {
                    const val = Math.max(10, Math.min(500, Number(e.target.value) || 10));
                    setArrivalRate(val);
                  }}
                  className="number-input"
                />
              </div>
              <div className="value-display">{arrivalRate} req/sec</div>
            </div>

            <div className="control-group">
              <label>
                <span className="label-text">Average Service Time</span>
                <span className="label-unit">(seconds)</span>
              </label>
              <div className="slider-input-container">
                <input
                  type="range"
                  min="0.01"
                  max="0.5"
                  step="0.01"
                  value={serviceTime}
                  onChange={(e) => setServiceTime(Number(e.target.value))}
                  className="slider-input"
                />
                <input
                  type="number"
                  min="0.01"
                  max="0.5"
                  step="0.01"
                  value={serviceTime}
                  onChange={(e) => {
                    const val = Math.max(0.01, Math.min(0.5, Number(e.target.value) || 0.01));
                    setServiceTime(val);
                  }}
                  className="number-input"
                />
              </div>
              <div className="value-display">{(serviceTime * 1000).toFixed(0)} ms</div>
            </div>

            <div className="control-group">
              <label>
                <span className="label-text">Number of Workers</span>
                <span className="label-unit">(servers)</span>
              </label>
              <div className="slider-input-container">
                <input
                  type="range"
                  min={Math.max(1, Math.ceil(trafficIntensity))}
                  max={Math.ceil(trafficIntensity * 2.5)}
                  step="1"
                  value={workers}
                  onChange={(e) => setWorkers(Number(e.target.value))}
                  className="slider-input"
                />
                <input
                  type="number"
                  min={Math.max(1, Math.ceil(trafficIntensity))}
                  max={Math.ceil(trafficIntensity * 2.5)}
                  step="1"
                  value={workers}
                  onChange={(e) => {
                    const min = Math.max(1, Math.ceil(trafficIntensity));
                    const max = Math.ceil(trafficIntensity * 2.5);
                    const val = Math.max(min, Math.min(max, Number(e.target.value) || min));
                    setWorkers(val);
                  }}
                  className="number-input"
                />
              </div>
              <div className="value-display">{workers} workers</div>
            </div>

            <div className="control-group">
              <label>
                <span className="label-text">Target Max Wait Time</span>
                <span className="label-unit">(ms)</span>
              </label>
              <div className="slider-input-container">
                <input
                  type="range"
                  min="50"
                  max="1000"
                  step="50"
                  value={maxWaitTimeMs}
                  onChange={(e) => setMaxWaitTimeMs(Number(e.target.value))}
                  className="slider-input"
                />
                <input
                  type="number"
                  min="50"
                  max="1000"
                  step="50"
                  value={maxWaitTimeMs}
                  onChange={(e) => {
                    const val = Math.max(50, Math.min(1000, Number(e.target.value) || 50));
                    setMaxWaitTimeMs(val);
                  }}
                  className="number-input"
                />
              </div>
              <div className="value-display">{maxWaitTimeMs} ms</div>
            </div>

            <div className="metrics-summary">
              <div className="metric">
                <div className="metric-label">Traffic Intensity</div>
                <div className="metric-value">{trafficIntensity.toFixed(2)} Erlangs</div>
              </div>
              <div className="metric">
                <div className="metric-label">Server Utilization</div>
                <div className="metric-value">{currentMetrics?.utilization.toFixed(1)}%</div>
              </div>
              <div className="metric">
                <div className="metric-label">Optimal Workers</div>
                <div className="metric-value highlight">{optimalWorkers}</div>
              </div>
            </div>

            <button className="optimize-button" onClick={handleOptimize}>
              Optimize Workers ({optimalWorkers})
            </button>
          </div>
        </div>

        <div className="config-right-panel">
          <div className="current-metrics">
            <h3>Current Configuration Metrics</h3>
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-card-label">Probability of Queueing</div>
                <div className="metric-card-value">
                  {currentMetrics?.probabilityDelay.toFixed(2)}%
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-card-label">Average Wait Time</div>
                <div className="metric-card-value">
                  {currentMetrics?.waitTime.toFixed(0)} ms
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-card-label">Average Queue Length</div>
                <div className="metric-card-value">
                  {currentMetrics?.queueLength.toFixed(2)} requests
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-card-label">Server Utilization</div>
                <div className="metric-card-value">
                  {currentMetrics?.utilization.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          <div className="right-panel-charts">
            <div className="chart-container">
              <h3>Probability of Queueing vs Number of Workers</h3>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dataPoints} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="workers" 
                      label={{ value: 'Number of Workers', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      label={{ value: 'Probability (%)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      formatter={(value) => `${value.toFixed(2)}%`}
                      labelFormatter={(label) => `Workers: ${label}`}
                    />
                    <Legend wrapperStyle={{ paddingTop: '5px' }} />
                    <Line 
                      type="monotone" 
                      dataKey="probabilityDelay" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      name="Probability of Queueing"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-container">
              <h3>Server Utilization vs Number of Workers</h3>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dataPoints} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="workers" 
                      label={{ value: 'Number of Workers', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      label={{ value: 'Utilization (%)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      formatter={(value) => `${value.toFixed(1)}%`}
                      labelFormatter={(label) => `Workers: ${label}`}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                    <Line 
                      type="monotone" 
                      dataKey="utilization" 
                      stroke="#ff7300" 
                      strokeWidth={2}
                      name="Server Utilization"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="explanation-section">
        <ExplanationPanel />
      </div>

    </div>
  );
}

export default IndividualServerTab;

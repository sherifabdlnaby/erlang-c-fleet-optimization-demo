import React, { useState, useMemo } from 'react';
import {
  calculateTrafficIntensity,
  calculateUtilization,
  averageWaitingTime,
  erlangC
} from '../utils/erlangC';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Cell
} from 'recharts';
import './ServerOptimizer.css';

function ServerOptimizer({ arrivalRate, serviceTime, maxWaitTimeMs }) {
  const [optimizationGoal, setOptimizationGoal] = useState('balanced');
  const [costPerWorker, setCostPerWorker] = useState(10);
  const [costPerServer, setCostPerServer] = useState(50);
  const [maxServers, setMaxServers] = useState(10);
  const [maxWorkersPerServer, setMaxWorkersPerServer] = useState(20);

  const trafficIntensity = calculateTrafficIntensity(arrivalRate, serviceTime);
  const maxWaitTimeSeconds = maxWaitTimeMs / 1000;

  // Generate all possible configurations
  const configurations = useMemo(() => {
    const configs = [];
    
    for (let numServers = 1; numServers <= maxServers; numServers++) {
      const requestsPerServer = arrivalRate / numServers;
      const serverTrafficIntensity = calculateTrafficIntensity(requestsPerServer, serviceTime);
      
      // Find minimum workers needed per server to meet SLA
      const minWorkersPerServer = Math.max(1, Math.ceil(serverTrafficIntensity) + 1);
      
      for (let workersPerServer = minWorkersPerServer; workersPerServer <= maxWorkersPerServer; workersPerServer++) {
        const utilization = calculateUtilization(workersPerServer, serverTrafficIntensity);
        const waitTime = averageWaitingTime(workersPerServer, serverTrafficIntensity, serviceTime);
        const probabilityDelay = erlangC(workersPerServer, serverTrafficIntensity);
        
        // Skip if doesn't meet SLA
        if (waitTime > maxWaitTimeSeconds) continue;
        
        const totalWorkers = numServers * workersPerServer;
        const totalCost = (costPerServer * numServers) + (costPerWorker * totalWorkers);
        const avgUtilization = utilization;
        
        configs.push({
          numServers,
          workersPerServer,
          totalWorkers,
          totalCost,
          avgUtilization,
          waitTime: waitTime * 1000, // Convert to ms
          probabilityDelay: probabilityDelay * 100,
          serverTrafficIntensity,
          efficiency: utilization / (totalCost / 100), // Utilization per unit cost
          score: 0 // Will be calculated based on optimization goal
        });
      }
    }
    
    return configs;
  }, [
    arrivalRate,
    serviceTime,
    maxServers,
    maxWorkersPerServer,
    costPerWorker,
    costPerServer,
    maxWaitTimeSeconds
  ]);

  // Score configurations based on optimization goal
  const scoredConfigurations = useMemo(() => {
    if (configurations.length === 0) return [];
    
    const maxCost = Math.max(...configurations.map(c => c.totalCost));
    const maxEfficiency = Math.max(...configurations.map(c => c.efficiency));
    
    return configurations.map(config => {
      let score = 0;
      
      if (optimizationGoal === 'cost') {
        // Minimize cost (lower is better)
        const costScore = 1 - (config.totalCost / maxCost);
        const utilizationScore = config.avgUtilization / 100; // Still want reasonable utilization
        score = costScore * 0.7 + utilizationScore * 0.3;
      } else if (optimizationGoal === 'performance') {
        // Maximize performance (lower wait time, higher utilization)
        const waitTimeScore = 1 - (config.waitTime / maxWaitTimeMs);
        const utilizationScore = config.avgUtilization / 100;
        score = waitTimeScore * 0.6 + utilizationScore * 0.4;
      } else if (optimizationGoal === 'balanced') {
        // Balance cost and performance
        const costScore = 1 - (config.totalCost / maxCost);
                const waitTimeScore = 1 - (config.waitTime / maxWaitTimeMs);
        const utilizationScore = config.avgUtilization / 100;
        score = costScore * 0.4 + waitTimeScore * 0.3 + utilizationScore * 0.3;
      } else if (optimizationGoal === 'efficiency') {
        // Maximize efficiency (utilization per cost)
        score = config.efficiency / maxEfficiency;
      }
      
      return { ...config, score };
    }).sort((a, b) => b.score - a.score);
  }, [configurations, optimizationGoal, maxWaitTimeMs]);

  const topConfigurations = scoredConfigurations.slice(0, 10);
  const optimalConfig = scoredConfigurations[0];

  // Prepare data for visualization
  const costPerformanceData = useMemo(() => {
    return scoredConfigurations.map(config => ({
      cost: config.totalCost,
      waitTime: config.waitTime,
      utilization: config.avgUtilization,
      numServers: config.numServers,
      workersPerServer: config.workersPerServer,
      score: config.score
    }));
  }, [scoredConfigurations]);

  return (
    <div className="server-optimizer-container">
      <div className="optimizer-header">
        <h3>Erlang C Server Optimization</h3>
        <p className="optimizer-subtitle">
          Find optimal number of servers and workers per server using Erlang C formula
        </p>
      </div>

      <div className="optimization-controls">
        <div className="control-section">
          <h4>Optimization Goal</h4>
          <div className="goal-buttons">
            <button
              className={optimizationGoal === 'cost' ? 'active' : ''}
              onClick={() => setOptimizationGoal('cost')}
            >
              Minimize Cost
            </button>
            <button
              className={optimizationGoal === 'balanced' ? 'active' : ''}
              onClick={() => setOptimizationGoal('balanced')}
            >
              Balanced
            </button>
            <button
              className={optimizationGoal === 'performance' ? 'active' : ''}
              onClick={() => setOptimizationGoal('performance')}
            >
              Maximize Performance
            </button>
            <button
              className={optimizationGoal === 'efficiency' ? 'active' : ''}
              onClick={() => setOptimizationGoal('efficiency')}
            >
              Maximize Efficiency
            </button>
          </div>
        </div>

        <div className="control-section">
          <h4>Cost Parameters</h4>
          <div className="cost-inputs">
            <div className="cost-input">
              <label>Cost per Server</label>
              <input
                type="number"
                min="1"
                max="1000"
                value={costPerServer}
                onChange={(e) => {
                  const val = Math.max(1, Math.min(1000, Number(e.target.value) || 1));
                  setCostPerServer(val);
                }}
                className="number-input-full"
              />
            </div>
            <div className="cost-input">
              <label>Cost per Worker</label>
              <input
                type="number"
                min="1"
                max="100"
                value={costPerWorker}
                onChange={(e) => {
                  const val = Math.max(1, Math.min(100, Number(e.target.value) || 1));
                  setCostPerWorker(val);
                }}
                className="number-input-full"
              />
            </div>
          </div>
        </div>

        <div className="control-section">
          <h4>Search Constraints</h4>
          <div className="constraint-inputs">
            <div className="constraint-input">
              <label>Max Servers</label>
              <input
                type="number"
                min="1"
                max="20"
                value={maxServers}
                onChange={(e) => {
                  const val = Math.max(1, Math.min(20, Number(e.target.value) || 1));
                  setMaxServers(val);
                }}
                className="number-input-full"
              />
            </div>
            <div className="constraint-input">
              <label>Max Workers/Server</label>
              <input
                type="number"
                min="1"
                max="50"
                value={maxWorkersPerServer}
                onChange={(e) => {
                  const val = Math.max(1, Math.min(50, Number(e.target.value) || 1));
                  setMaxWorkersPerServer(val);
                }}
                className="number-input-full"
              />
            </div>
          </div>
        </div>
      </div>

      {optimalConfig && (
        <div className="optimal-configuration">
          <h4>Optimal Configuration</h4>
          <div className="optimal-details">
            <div className="optimal-metric">
              <div className="optimal-label">Servers</div>
              <div className="optimal-value">{optimalConfig.numServers}</div>
            </div>
            <div className="optimal-metric">
              <div className="optimal-label">Workers per Server</div>
              <div className="optimal-value">{optimalConfig.workersPerServer}</div>
            </div>
            <div className="optimal-metric">
              <div className="optimal-label">Total Workers</div>
              <div className="optimal-value">{optimalConfig.totalWorkers}</div>
            </div>
            <div className="optimal-metric">
              <div className="optimal-label">Total Cost</div>
              <div className="optimal-value">${optimalConfig.totalCost.toFixed(2)}</div>
            </div>
            <div className="optimal-metric">
              <div className="optimal-label">Avg Utilization</div>
              <div className="optimal-value">{optimalConfig.avgUtilization.toFixed(1)}%</div>
            </div>
            <div className="optimal-metric">
              <div className="optimal-label">Avg Wait Time</div>
              <div className="optimal-value">{optimalConfig.waitTime.toFixed(0)} ms</div>
            </div>
          </div>
        </div>
      )}

      <div className="optimization-visualizations">
        <div className="chart-container">
          <h4>Cost vs Performance Trade-off</h4>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="cost" 
                name="Total Cost"
                label={{ value: 'Total Cost ($)', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                dataKey="waitTime" 
                name="Wait Time"
                label={{ value: 'Wait Time (ms)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'cost') {
                    const num = Number(value);
                    const rounded = Math.round(num * 100) / 100;
                    return `$${rounded.toFixed(2)}`;
                  }
                  if (name === 'waitTime') {
                    const num = Number(value);
                    const rounded = Math.round(num * 100) / 100;
                    return `${rounded.toFixed(2)} ms`;
                  }
                  return value;
                }}
                labelFormatter={(label) => ''}
                content={({ active, payload }) => {
                  if (active && payload && payload[0]) {
                    const data = payload[0].payload;
                    const utilizationNum = Number(data.utilization);
                    const utilizationRounded = Math.round(utilizationNum * 100) / 100;
                    const waitTimeNum = Number(data.waitTime);
                    const waitTimeRounded = Math.round(waitTimeNum * 100) / 100;
                    return (
                      <div className="custom-tooltip">
                        <p><strong>{data.numServers} servers × {data.workersPerServer} workers</strong></p>
                        <p>Cost: ${data.cost.toFixed(2)}</p>
                        <p>Wait Time: {waitTimeRounded.toFixed(2)} ms</p>
                        <p>Utilization: {utilizationRounded.toFixed(2)}%</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Scatter name="Configurations" data={costPerformanceData} fill="#8884d8">
                {costPerformanceData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.score > 0.8 ? '#4caf50' : entry.score > 0.6 ? '#ff9800' : '#8884d8'} 
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h4>Top 10 Configurations</h4>
          <div className="configurations-table">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Servers</th>
                  <th>Workers/Server</th>
                  <th>Total Cost</th>
                  <th>Utilization</th>
                  <th>Wait Time</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {topConfigurations.map((config, index) => (
                  <tr 
                    key={`${config.numServers}-${config.workersPerServer}`}
                    className={index === 0 ? 'optimal-row' : ''}
                  >
                    <td>{index + 1}</td>
                    <td>{config.numServers}</td>
                    <td>{config.workersPerServer}</td>
                    <td>${config.totalCost.toFixed(2)}</td>
                    <td>{config.avgUtilization.toFixed(1)}%</td>
                    <td>{config.waitTime.toFixed(0)} ms</td>
                    <td>{(config.score * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="optimization-guide">
        <h4>How Erlang C Optimizes Server Configuration</h4>
        <div className="guide-content">
          <div className="guide-section">
            <h5>1. Traffic Intensity Calculation</h5>
            <p>
              For each server configuration, we calculate the traffic intensity per server:
              <code>A = (λ/n) × μ</code> where n is the number of servers.
            </p>
          </div>
          <div className="guide-section">
            <h5>2. Minimum Workers Calculation</h5>
            <p>
              Using Erlang C, we find the minimum workers per server needed to meet your SLA
              (wait time ≤ {maxWaitTimeMs}ms). This ensures A &lt; N (traffic intensity &lt; workers).
            </p>
          </div>
          <div className="guide-section">
            <h5>3. Utilization Optimization</h5>
            <p>
              We calculate utilization for each configuration: <code>U = A/N × 100%</code>.
              Optimal utilization is typically 70-85% - high enough for efficiency but low enough
              to handle traffic spikes.
            </p>
          </div>
          <div className="guide-section">
            <h5>4. Cost-Performance Trade-off</h5>
            <p>
              Different optimization goals prioritize different metrics:
            </p>
            <ul>
              <li><strong>Minimize Cost:</strong> Fewest servers and workers while meeting SLA</li>
              <li><strong>Maximize Performance:</strong> Lowest wait times and highest utilization</li>
              <li><strong>Balanced:</strong> Good performance at reasonable cost</li>
              <li><strong>Maximize Efficiency:</strong> Highest utilization per dollar spent</li>
            </ul>
          </div>
          <div className="guide-section">
            <h5>5. Load Balancing Considerations</h5>
            <p>
              With multiple servers, requests are distributed evenly. More servers mean:
              - Lower traffic intensity per server (better performance)
              - Higher infrastructure costs
              - Better fault tolerance
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ServerOptimizer;

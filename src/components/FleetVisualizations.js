import React, { useMemo } from 'react';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  ReferenceLine
} from 'recharts';
import {
  calculateTrafficIntensity,
  calculateUtilization,
  averageWaitingTime,
  erlangC
} from '../utils/erlangC';
import './FleetVisualizations.css';

function FleetVisualizations({
  totalArrivalRate,
  serviceTime,
  numServers,
  workersPerServer,
  targetUtilization,
  maxWaitTimeMs,
  maxProbabilityDelay,
  costPerWorker,
  perServerOverhead,
  optMinWorkers = null,
  optMaxWorkers = null
}) {
  // Validate inputs
  const isValid = useMemo(() => {
    return (
      totalArrivalRate > 0 &&
      serviceTime > 0 &&
      numServers > 0 &&
      workersPerServer > 0 &&
      maxWaitTimeMs > 0 &&
      maxProbabilityDelay >= 0 &&
      isFinite(totalArrivalRate) &&
      isFinite(serviceTime) &&
      isFinite(numServers) &&
      isFinite(workersPerServer)
    );
  }, [totalArrivalRate, serviceTime, numServers, workersPerServer, maxWaitTimeMs, maxProbabilityDelay]);

  const totalTrafficIntensity = calculateTrafficIntensity(totalArrivalRate, serviceTime);

  // Core insight chain: Workers ↑ → Wait Time ↓ → Utilization ↑ → Servers ↓
  // Create a comprehensive analysis showing this optimization landscape

  // 1. For each worker count, calculate the optimization chain
  const optimizationChainData = useMemo(() => {
    if (!isValid) return [];
    
    const data = [];
    // Worker range: use provided range or calculate based on current workersPerServer
    const minWorkers = optMinWorkers !== null 
      ? Math.max(1, optMinWorkers)
      : Math.max(1, workersPerServer - 10);
    const maxWorkers = optMaxWorkers !== null
      ? Math.min(1000, Math.max(minWorkers, optMaxWorkers))
      : Math.min(200, Math.max(workersPerServer + 20, Math.ceil(totalTrafficIntensity / 2)));
    // Use step size to avoid too many iterations for high traffic, but ensure we include current
    const range = maxWorkers - minWorkers;
    const stepSize = range > 50 ? Math.max(1, Math.floor(range / 50)) : 1;
    const workersToTest = new Set();
    
    // Always include current workersPerServer
    workersToTest.add(workersPerServer);
    
    // Add sampled workers
    for (let workers = minWorkers; workers <= maxWorkers; workers += stepSize) {
      workersToTest.add(workers);
    }
    
    // Add boundary values
    workersToTest.add(minWorkers);
    workersToTest.add(maxWorkers);
    
    const sortedWorkers = Array.from(workersToTest).sort((a, b) => a - b);
    
    for (const workers of sortedWorkers) {
      // Find the maximum utilization we can achieve while meeting SLA
      let maxFeasibleUtilization = 0;
      let minServersAtMaxUtil = Infinity;
      let waitTimeAtMaxUtil = Infinity;
      
      // Try different utilization targets from high to low
      for (let targetUtil = 95; targetUtil >= 30; targetUtil -= 2) {
        const requiredServers = Math.ceil((totalTrafficIntensity * 100) / (targetUtil * workers));
        
        if (requiredServers < 1 || requiredServers > 10000) continue;
        
        const arrivalRatePerServer = totalArrivalRate / requiredServers;
        const trafficIntensityPerServer = calculateTrafficIntensity(arrivalRatePerServer, serviceTime);
        
        if (trafficIntensityPerServer >= workers) continue; // Unstable
        
        try {
          const actualUtilization = calculateUtilization(workers, trafficIntensityPerServer);
          const waitTime = averageWaitingTime(workers, trafficIntensityPerServer, serviceTime) * 1000;
          const probabilityDelay = erlangC(workers, trafficIntensityPerServer) * 100;
          
          if (!isFinite(waitTime) || !isFinite(probabilityDelay) || !isFinite(actualUtilization)) {
            continue;
          }
          
          // Check SLA
          if (waitTime <= maxWaitTimeMs && probabilityDelay <= maxProbabilityDelay) {
            if (actualUtilization > maxFeasibleUtilization) {
              maxFeasibleUtilization = actualUtilization;
              minServersAtMaxUtil = requiredServers;
              waitTimeAtMaxUtil = waitTime;
            }
            break; // Found highest feasible utilization
          }
        } catch (e) {
          continue;
        }
      }
      
      if (maxFeasibleUtilization > 0 && minServersAtMaxUtil < Infinity) {
        data.push({
          workersPerServer: workers,
          maxFeasibleUtilization,
          minServersRequired: minServersAtMaxUtil,
          waitTimeAtOptimal: waitTimeAtMaxUtil,
          totalWorkers: workers * minServersAtMaxUtil,
          totalCost: (costPerWorker * minServersAtMaxUtil * workers) + (perServerOverhead * minServersAtMaxUtil)
        });
      }
    }
    
    return data;
  }, [isValid, totalArrivalRate, serviceTime, maxWaitTimeMs, maxProbabilityDelay, costPerWorker, perServerOverhead, totalTrafficIntensity, optMinWorkers, optMaxWorkers, workersPerServer]);


  // Current configuration analysis
  const currentAnalysis = useMemo(() => {
    if (!isValid) return null;
    
    const arrivalRatePerServer = totalArrivalRate / numServers;
    const trafficIntensityPerServer = calculateTrafficIntensity(arrivalRatePerServer, serviceTime);
    
    if (trafficIntensityPerServer >= workersPerServer) return null;
    
    try {
      const utilization = calculateUtilization(workersPerServer, trafficIntensityPerServer);
      const waitTime = averageWaitingTime(workersPerServer, trafficIntensityPerServer, serviceTime) * 1000;
      const probabilityDelay = erlangC(workersPerServer, trafficIntensityPerServer) * 100;
      
      if (!isFinite(waitTime) || !isFinite(probabilityDelay) || !isFinite(utilization)) {
        return null;
      }
      
      const meetsSLA = waitTime <= maxWaitTimeMs && probabilityDelay <= maxProbabilityDelay;
      
      // Find optimal for this worker count
      const optimalForWorkers = optimizationChainData.find(d => d.workersPerServer === workersPerServer);
      
      return {
        workersPerServer,
        numServers,
        utilization,
        waitTime,
        probabilityDelay,
        meetsSLA,
        optimalForWorkers,
        totalCost: (costPerWorker * numServers * workersPerServer) + (perServerOverhead * numServers)
      };
    } catch (e) {
      return null;
    }
  }, [isValid, totalArrivalRate, serviceTime, numServers, workersPerServer, maxWaitTimeMs, maxProbabilityDelay, costPerWorker, perServerOverhead, optimizationChainData]);

  if (!isValid) {
    return (
      <div className="fleet-visualizations">
        <h3>Server Optimization Analysis</h3>
        <div className="visualization-error">
          <p>Invalid parameters for visualization.</p>
        </div>
      </div>
    );
  }

  // If no optimization data but current config is valid, calculate optimal for current workers
  const hasOptimizationData = optimizationChainData && optimizationChainData.length > 0;
  if (!hasOptimizationData && currentAnalysis && currentAnalysis.meetsSLA) {
    // Try to calculate optimal for current workers only
    const workers = currentAnalysis.workersPerServer;
    let maxFeasibleUtilization = 0;
    let minServersAtMaxUtil = Infinity;
    let waitTimeAtMaxUtil = Infinity;
    
    for (let targetUtil = 95; targetUtil >= 30; targetUtil -= 2) {
      const requiredServers = Math.ceil((totalTrafficIntensity * 100) / (targetUtil * workers));
      
      if (requiredServers < 1 || requiredServers > 10000) continue;
      
      const arrivalRatePerServer = totalArrivalRate / requiredServers;
      const trafficIntensityPerServer = calculateTrafficIntensity(arrivalRatePerServer, serviceTime);
      
      if (trafficIntensityPerServer >= workers) continue;
      
      try {
        const actualUtilization = calculateUtilization(workers, trafficIntensityPerServer);
        const waitTime = averageWaitingTime(workers, trafficIntensityPerServer, serviceTime) * 1000;
        const probabilityDelay = erlangC(workers, trafficIntensityPerServer) * 100;
        
        if (!isFinite(waitTime) || !isFinite(probabilityDelay) || !isFinite(actualUtilization)) {
          continue;
        }
        
        if (waitTime <= maxWaitTimeMs && probabilityDelay <= maxProbabilityDelay) {
          if (actualUtilization > maxFeasibleUtilization) {
            maxFeasibleUtilization = actualUtilization;
            minServersAtMaxUtil = requiredServers;
            waitTimeAtMaxUtil = waitTime;
          }
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (maxFeasibleUtilization > 0 && minServersAtMaxUtil < Infinity) {
      currentAnalysis.optimalForWorkers = {
        workersPerServer: workers,
        maxFeasibleUtilization,
        minServersRequired: minServersAtMaxUtil,
        waitTimeAtOptimal: waitTimeAtMaxUtil,
        totalCost: (costPerWorker * minServersAtMaxUtil * workers) + (perServerOverhead * minServersAtMaxUtil)
      };
    }
  }

  if (!hasOptimizationData && (!currentAnalysis || !currentAnalysis.meetsSLA)) {
    return (
      <div className="fleet-visualizations">
        <h3>Server Optimization Analysis</h3>
        <div className="visualization-error">
          <p>Unable to generate visualizations with current parameters.</p>
          <p className="error-hint">
            {currentAnalysis && !currentAnalysis.meetsSLA 
              ? `Current configuration does not meet SLA requirements (Wait: ${currentAnalysis.waitTime.toFixed(0)}ms, Prob: ${currentAnalysis.probabilityDelay.toFixed(1)}%)`
              : 'Please adjust parameters to find valid configurations that meet SLA requirements.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fleet-visualizations">
      <h3>Potential Optimizations</h3>
      <p className="visualization-description">
        <strong>Optimization Strategy:</strong> Increase workers per server → Lower wait time → Enable higher utilization 
        (to get back to similar wait-time before the change) → Require fewer servers total.
        <br />
        This analysis explores optimal configurations that maximize utilization while meeting SLA requirements. 
        All configurations shown meet your wait time and probability of delay constraints.
      </p>
      
      <div className="visualizations-grid">
        {/* Chart 1: The Optimization Chain - Workers → Wait Time → Utilization → Servers */}
        {hasOptimizationData && (
        <div className="chart-container main-chart">
          <h4>The Optimization Chain: Workers → Lower Wait Time → Higher Utilization → Fewer Servers</h4>
          <p className="chart-subtitle">
            <strong>Thought Process:</strong> By increasing workers per server, we reduce wait time. 
            This lower wait time allows us to increase utilization (handling more traffic per server) 
            while still meeting SLA requirements. Higher utilization means we need fewer servers total. 
            <strong> All configurations shown here are optimal and meet SLA constraints.</strong>
          </p>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={optimizationChainData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="workersPerServer" 
                label={{ value: 'Workers per Server', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                yAxisId="left"
                label={{ value: 'Wait Time (ms)', angle: -90, position: 'insideLeft' }}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right"
                label={{ value: 'Utilization (%) / Servers', angle: 90, position: 'insideRight' }}
              />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'waitTimeAtOptimal') return `${value.toFixed(0)} ms`;
                  if (name === 'maxFeasibleUtilization') return `${value.toFixed(1)}%`;
                  if (name === 'minServersRequired') return `${value} servers`;
                  return value;
                }}
                labelFormatter={(label) => `${label} workers/server`}
              />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              <ReferenceLine 
                yAxisId="left"
                y={maxWaitTimeMs} 
                stroke="#f56565" 
                strokeDasharray="3 3" 
                label="SLA Threshold" 
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="waitTimeAtOptimal" 
                stroke="#f56565" 
                strokeWidth={2}
                name="Wait Time at Optimal Config (ms)"
                dot={{ r: 3 }}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="maxFeasibleUtilization" 
                stroke="#8884d8" 
                strokeWidth={3}
                name="Max Feasible Utilization (%)"
                dot={{ r: 4 }}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="minServersRequired" 
                stroke="#82ca9d" 
                strokeWidth={3}
                name="Min Servers Required"
                strokeDasharray="5 5"
                dot={{ r: 4 }}
              />
              {currentAnalysis && currentAnalysis.meetsSLA && (
                <ReferenceLine 
                  yAxisId="left"
                  x={currentAnalysis.workersPerServer} 
                  stroke="#000" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  label="Current"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        )}



      </div>
    </div>
  );
}

export default FleetVisualizations;

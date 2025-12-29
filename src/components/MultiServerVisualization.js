import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  calculateTrafficIntensity,
  calculateUtilization,
  averageWaitingTime,
  erlangC
} from '../utils/erlangC';
import './MultiServerVisualization.css';

function MultiServerVisualization({ arrivalRate, serviceTime }) {
  const [servers, setServers] = useState([
    { id: 1, workers: 5, color: '#667eea' },
    { id: 2, workers: 5, color: '#764ba2' },
    { id: 3, workers: 5, color: '#f093fb' }
  ]);
  const [requests, setRequests] = useState([]);
  const [loadBalanceMethod, setLoadBalanceMethod] = useState('round-robin');
  const [currentServerIndex, setCurrentServerIndex] = useState(0);
  
  const requestIdRef = useRef(0);
  const animationFrameRef = useRef(null);
  const lastRequestTimeRef = useRef(Date.now());
  const serverStatesRef = useRef([]);

  const totalWorkers = useMemo(() => {
    return servers.reduce((sum, server) => sum + server.workers, 0);
  }, [servers]);

  const requestsPerServer = useMemo(() => {
    return arrivalRate / servers.length; // Even distribution
  }, [arrivalRate, servers.length]);

  // Calculate metrics for each server
  const serverMetrics = useMemo(() => {
    return servers.map(server => {
      const serverTrafficIntensity = calculateTrafficIntensity(
        requestsPerServer,
        serviceTime
      );
      const utilization = calculateUtilization(server.workers, serverTrafficIntensity);
      const waitTime = averageWaitingTime(server.workers, serverTrafficIntensity, serviceTime);
      const probabilityDelay = erlangC(server.workers, serverTrafficIntensity);
      
      return {
        ...server,
        trafficIntensity: serverTrafficIntensity,
        utilization,
        waitTime: waitTime * 1000, // Convert to ms
        probabilityDelay: probabilityDelay * 100
      };
    });
  }, [servers, requestsPerServer, serviceTime]);

  const overallMetrics = useMemo(() => {
    const avgUtilization = serverMetrics.reduce((sum, m) => sum + m.utilization, 0) / servers.length;
    const avgWaitTime = serverMetrics.reduce((sum, m) => sum + m.waitTime, 0) / servers.length;
    const avgProbabilityDelay = serverMetrics.reduce((sum, m) => sum + m.probabilityDelay, 0) / servers.length;
    
    return {
      avgUtilization,
      avgWaitTime,
      avgProbabilityDelay,
      totalWorkers
    };
  }, [serverMetrics, servers.length, totalWorkers]);

  const interArrivalTime = arrivalRate > 0 ? 1000 / arrivalRate : Infinity;
  const processingTimeMs = serviceTime * 1000;

  // Initialize server states
  useEffect(() => {
    serverStatesRef.current = servers.map(server => ({
      id: server.id,
      workerSlots: Array(Math.max(1, server.workers)).fill(null),
      queue: []
    }));
  }, [servers]);

  // Reset when parameters change
  useEffect(() => {
    setRequests([]);
    requestIdRef.current = 0;
    lastRequestTimeRef.current = Date.now();
    serverStatesRef.current = servers.map(server => ({
      id: server.id,
      workerSlots: Array(Math.max(1, server.workers)).fill(null),
      queue: []
    }));
  }, [arrivalRate, serviceTime, servers.length]);

  // Update server states when worker counts change
  useEffect(() => {
    serverStatesRef.current = serverStatesRef.current.map((state, index) => {
      const server = servers[index];
      const currentWorkers = state.workerSlots.length;
      const newWorkers = server.workers;
      
      if (newWorkers > currentWorkers) {
        // Add more worker slots
        const newSlots = Array(newWorkers - currentWorkers).fill(null);
        return {
          ...state,
          workerSlots: [...state.workerSlots, ...newSlots]
        };
      } else if (newWorkers < currentWorkers) {
        // Remove worker slots (remove from end, but keep processing requests)
        const slotsToKeep = state.workerSlots.slice(0, newWorkers);
        return {
          ...state,
          workerSlots: slotsToKeep
        };
      }
      return state;
    });
  }, [servers]);

  // Select target server based on load balancing method
  const selectTargetServer = useMemo(() => {
    if (loadBalanceMethod === 'round-robin') {
      return () => {
        const index = currentServerIndex % servers.length;
        setCurrentServerIndex((prev) => (prev + 1) % servers.length);
        return index;
      };
    } else if (loadBalanceMethod === 'least-connections') {
      return () => {
        // Find server with least active connections (processing + queued)
        let minConnections = Infinity;
        let targetIndex = 0;
        
        serverStatesRef.current.forEach((state, index) => {
          const activeConnections = 
            state.workerSlots.filter(slot => slot !== null).length + state.queue.length;
          if (activeConnections < minConnections) {
            minConnections = activeConnections;
            targetIndex = index;
          }
        });
        return targetIndex;
      };
    } else {
      // Random
      return () => Math.floor(Math.random() * servers.length);
    }
  }, [loadBalanceMethod, servers.length, currentServerIndex]);

  useEffect(() => {
    let lastTime = Date.now();
    
    const animate = () => {
      const now = Date.now();
      const deltaTime = Math.min(now - lastTime, 50);
      lastTime = now;

      setRequests(prevRequests => {
        const updated = [...prevRequests];
        
        // Generate new requests
        if (arrivalRate > 0 && now - lastRequestTimeRef.current >= interArrivalTime) {
          const targetServerIndex = selectTargetServer();
          const targetServer = servers[targetServerIndex];
          
          const newRequest = {
            id: requestIdRef.current++,
            createdAt: now,
            x: 10 + Math.random() * 80,
            y: -5,
            status: 'arriving',
            targetServerId: targetServer.id,
            targetServerIndex: targetServerIndex
          };
          updated.push(newRequest);
          lastRequestTimeRef.current = now;
        }

        // Update request positions
        updated.forEach(req => {
          if (req.status === 'arriving') {
            req.y = req.y + (deltaTime * 0.15);
            const serverY = 30 + (req.targetServerIndex * 25);
            if (req.y >= serverY) {
              req.y = serverY;
              req.status = 'atServer';
            }
          }
        });

        // Process requests at each server
        servers.forEach((server, serverIndex) => {
          const state = serverStatesRef.current[serverIndex];
          const serverRequests = updated.filter(
            r => r.targetServerId === server.id
          );

          // Assign requests to workers
          const atServer = serverRequests.filter(r => r.status === 'atServer');
          atServer.forEach(req => {
            const availableWorkerIndex = state.workerSlots.findIndex(slot => slot === null);
            if (availableWorkerIndex !== -1 && availableWorkerIndex < server.workers) {
              state.workerSlots[availableWorkerIndex] = req.id;
              req.status = 'processing';
              req.workerIndex = availableWorkerIndex;
              req.processingStartTime = now;
            } else {
              req.status = 'queued';
              if (!state.queue.includes(req.id)) {
                state.queue.push(req.id);
              }
            }
          });

          // Check if processing requests are done
          const processing = serverRequests.filter(r => r.status === 'processing');
          processing.forEach(req => {
            const processingDuration = now - req.processingStartTime;
            if (processingDuration >= processingTimeMs) {
              const workerIndex = state.workerSlots.findIndex(id => id === req.id);
              if (workerIndex !== -1) {
                state.workerSlots[workerIndex] = null;
              }
              req.status = 'completed';
              req.completedTime = now;
            }
          });

          // Move queued requests to processing
          const queued = serverRequests.filter(r => r.status === 'queued');
          queued.forEach(req => {
            const availableWorkerIndex = state.workerSlots.findIndex(slot => slot === null);
            if (availableWorkerIndex !== -1 && availableWorkerIndex < server.workers) {
              const queueIndex = state.queue.indexOf(req.id);
              if (queueIndex !== -1) {
                state.queue.splice(queueIndex, 1);
              }
              state.workerSlots[availableWorkerIndex] = req.id;
              req.status = 'processing';
              req.workerIndex = availableWorkerIndex;
              req.processingStartTime = now;
            }
          });
        });

        // Remove completed requests
        return updated.filter(req => {
          if (req.status === 'completed') {
            const completedDuration = now - req.completedTime;
            return completedDuration < 300;
          }
          return true;
        });
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [arrivalRate, serviceTime, servers, interArrivalTime, processingTimeMs, selectTargetServer]);

  const handleWorkerChange = (serverId, delta) => {
    setServers(prev => prev.map(server => {
      if (server.id === serverId) {
        const newWorkers = Math.max(1, Math.min(20, server.workers + delta));
        return { ...server, workers: newWorkers };
      }
      return server;
    }));
  };

  const handleAddServer = () => {
    if (servers.length < 6) {
      const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe', '#43e97b'];
      const newServer = {
        id: Math.max(...servers.map(s => s.id)) + 1,
        workers: 5,
        color: colors[servers.length % colors.length]
      };
      setServers([...servers, newServer]);
    }
  };

  const handleRemoveServer = (serverId) => {
    if (servers.length > 1) {
      setServers(prev => prev.filter(s => s.id !== serverId));
    }
  };

  return (
    <div className="multi-server-container">
      <div className="multi-server-header">
        <h3>Multi-Server Load Balancing</h3>
        <div className="load-balance-selector">
          <label>Load Balancing:</label>
          <select 
            value={loadBalanceMethod} 
            onChange={(e) => setLoadBalanceMethod(e.target.value)}
          >
            <option value="round-robin">Round Robin</option>
            <option value="least-connections">Least Connections</option>
            <option value="random">Random</option>
          </select>
        </div>
      </div>

      <div className="overall-metrics-panel">
        <div className="metric-card-large">
          <div className="metric-label">Overall Average Utilization</div>
          <div className="metric-value-large">{overallMetrics.avgUtilization.toFixed(1)}%</div>
        </div>
        <div className="metric-card-large">
          <div className="metric-label">Average Wait Time</div>
          <div className="metric-value-large">{overallMetrics.avgWaitTime.toFixed(0)} ms</div>
        </div>
        <div className="metric-card-large">
          <div className="metric-label">Total Workers</div>
          <div className="metric-value-large">{totalWorkers}</div>
        </div>
        <div className="metric-card-large">
          <div className="metric-label">Average Queue Probability</div>
          <div className="metric-value-large">{overallMetrics.avgProbabilityDelay.toFixed(1)}%</div>
        </div>
      </div>

      <div className="servers-control-panel">
        <div className="servers-list">
          {servers.map((server, index) => {
            const metrics = serverMetrics[index];
            return (
              <div key={server.id} className="server-control-card">
                <div className="server-control-header">
                  <div className="server-title">
                    <div 
                      className="server-color-indicator" 
                      style={{ backgroundColor: server.color }}
                    />
                    <span>Server {server.id}</span>
                  </div>
                  {servers.length > 1 && (
                    <button 
                      className="remove-server-btn"
                      onClick={() => handleRemoveServer(server.id)}
                    >
                      ×
                    </button>
                  )}
                </div>
                <div className="worker-controls">
                  <button 
                    className="worker-btn"
                    onClick={() => handleWorkerChange(server.id, -1)}
                    disabled={server.workers <= 1}
                  >
                    −
                  </button>
                  <div className="worker-count">
                    <span className="worker-number">{server.workers}</span>
                    <span className="worker-label">workers</span>
                  </div>
                  <button 
                    className="worker-btn"
                    onClick={() => handleWorkerChange(server.id, 1)}
                    disabled={server.workers >= 20}
                  >
                    +
                  </button>
                </div>
                <div className="server-metrics-mini">
                  <div className="mini-metric">
                    <span>Utilization:</span>
                    <span className={metrics.utilization > 85 ? 'warning' : ''}>
                      {metrics.utilization.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mini-metric">
                    <span>Wait Time:</span>
                    <span>{metrics.waitTime.toFixed(0)} ms</span>
                  </div>
                </div>
                <div className="utilization-bar-container">
                  <div 
                    className="utilization-bar"
                    style={{ 
                      width: `${metrics.utilization}%`,
                      backgroundColor: server.color
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {servers.length < 6 && (
          <button className="add-server-btn" onClick={handleAddServer}>
            + Add Server
          </button>
        )}
      </div>

      <div className="multi-server-animation-area">
        <div className="animation-area-content">
          {/* Incoming requests */}
          <div className="incoming-requests-area">
            {requests
              .filter(r => r.status === 'arriving')
              .map(req => (
                <div
                  key={req.id}
                  className="request-dot-multi arriving"
                  style={{
                    left: `${req.x}%`,
                    top: `${req.y}%`,
                    borderColor: servers[req.targetServerIndex]?.color || '#667eea'
                  }}
                />
              ))}
          </div>

          {/* Server boxes */}
          {servers.map((server, serverIndex) => {
            const state = serverStatesRef.current[serverIndex] || { 
              id: server.id,
              workerSlots: Array(Math.max(1, server.workers)).fill(null), 
              queue: [] 
            };
            const serverRequests = requests.filter(r => r.targetServerId === server.id);
            const processingCount = serverRequests.filter(r => r.status === 'processing').length;
            const queueCount = serverRequests.filter(r => r.status === 'queued').length;
            const metrics = serverMetrics[serverIndex] || {
              utilization: 0,
              waitTime: 0,
              probabilityDelay: 0
            };

            return (
              <div
                key={server.id}
                className="server-box-multi"
                style={{
                  top: `${30 + serverIndex * 25}%`,
                  borderColor: server.color,
                  backgroundColor: `${server.color}15`
                }}
              >
                <div className="server-box-header">
                  <div className="server-box-title">
                    <div 
                      className="server-dot" 
                      style={{ backgroundColor: server.color }}
                    />
                    <span>Server {server.id}</span>
                  </div>
                  <div className="server-box-stats">
                    <span className="stat-badge">{processingCount}/{server.workers}</span>
                    {queueCount > 0 && (
                      <span className="queue-badge">{queueCount} queued</span>
                    )}
                  </div>
                </div>

                <div className="workers-grid">
                  {Array(Math.max(1, server.workers)).fill(0).map((_, workerIndex) => {
                    const processingReq = serverRequests.find(
                      r => r.status === 'processing' && r.workerIndex === workerIndex
                    );
                    return (
                      <div
                        key={workerIndex}
                        className={`worker-slot-multi ${processingReq ? 'busy' : 'idle'}`}
                        style={{
                          borderColor: server.color
                        }}
                      >
                        {processingReq ? (
                          <div className="processing-dot-multi" style={{ backgroundColor: server.color }} />
                        ) : (
                          <div className="idle-text-multi">W{workerIndex + 1}</div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {queueCount > 0 && (
                  <div className="queue-indicator-multi">
                    <span>Queue: {queueCount}</span>
                    <div className="queue-dots-multi">
                      {Array(Math.min(queueCount, 5)).fill(0).map((_, i) => (
                        <div 
                          key={i} 
                          className="queue-dot-multi"
                          style={{ backgroundColor: server.color }}
                        />
                      ))}
                      {queueCount > 5 && <span>+{queueCount - 5}</span>}
                    </div>
                  </div>
                )}

                <div className="server-metrics-bar">
                  <div className="metrics-bar-label">Utilization</div>
                  <div className="metrics-bar-container">
                    <div 
                      className="metrics-bar-fill"
                      style={{ 
                        width: `${metrics.utilization}%`,
                        backgroundColor: server.color
                      }}
                    />
                    <span className="metrics-bar-text">{metrics.utilization.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="optimization-insights">
        <h4>Optimization Insights</h4>
        <ul>
          <li>
            <strong>Current Distribution:</strong> {servers.length} servers with{' '}
            {servers.map(s => s.workers).join(', ')} workers each
          </li>
          <li>
            <strong>Utilization Variance:</strong>{' '}
            {(Math.max(...serverMetrics.map(m => m.utilization)) - 
             Math.min(...serverMetrics.map(m => m.utilization))).toFixed(1)}%
            {' '}(Lower is better for load balancing)
          </li>
          <li>
            <strong>Recommendation:</strong>{' '}
            {serverMetrics.some(m => m.utilization > 85) 
              ? 'Some servers are overloaded. Consider adding workers or redistributing load.'
              : serverMetrics.some(m => m.utilization < 50)
              ? 'Some servers are underutilized. Consider reducing workers or increasing load.'
              : 'Server utilization is well balanced.'}
          </li>
        </ul>
      </div>
    </div>
  );
}

export default MultiServerVisualization;

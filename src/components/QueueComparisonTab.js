import React, { useState, useEffect, useRef, useCallback } from 'react';
import './QueueComparisonTab.css';

/**
 * QueueComparisonTab - Visualizes why shared queues (Erlang C model)
 * are more efficient than separate queues
 *
 * Left: N separate queues (one per worker) - inefficient
 * Right: 1 shared queue with N workers - efficient (Erlang C)
 */
// Box-Muller transform for generating normally distributed random numbers
function randomGaussian(mean, stdDev) {
  let u1 = Math.random();
  let u2 = Math.random();
  // Avoid log(0)
  while (u1 === 0) u1 = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z * stdDev;
}

function QueueComparisonTab() {
  // Helper to get param with default from URL
  const getParam = (key, defaultValue) => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get(key);
    return value !== null ? Number(value) : defaultValue;
  };

  // Configuration - initialize from URL params
  const [numQueues, setNumQueues] = useState(() => getParam('queues', 4));
  const [workersPerQueue, setWorkersPerQueue] = useState(() => getParam('workers', 1));
  const [arrivalRate, setArrivalRate] = useState(() => getParam('arrival', 2));
  const [serviceTime, setServiceTime] = useState(() => getParam('service', 1));
  const [serviceTimeStdDev, setServiceTimeStdDev] = useState(() => getParam('variance', 0.5));
  const [isRunning, setIsRunning] = useState(true);

  // Static min/max values for sliders
  const minQueues = 2;
  const maxQueues = 6;
  const minWorkersPerQueue = 1;
  const maxWorkersPerQueue = 4;
  const [minArrivalRate, setMinArrivalRate] = useState(0.5);
  const [maxArrivalRate, setMaxArrivalRate] = useState(6);
  const [minServiceTime, setMinServiceTime] = useState(0.5);
  const [maxServiceTime, setMaxServiceTime] = useState(3);
  const [minStdDev, setMinStdDev] = useState(0);
  const [maxStdDev, setMaxStdDev] = useState(1);

  // Total workers (same for both systems for fair comparison)
  const totalWorkers = numQueues * workersPerQueue;

  // Function to calculate new min/max: max = 2×value, min = value/2
  const calculateNewRange = (value) => {
    const newMin = Math.max(0, value / 2);
    const newMax = value * 2;
    return { newMin, newMax };
  };

  // Animation state
  const [separateRequests, setSeparateRequests] = useState([]);
  const [sharedRequests, setSharedRequests] = useState([]);
  const [separateWorkers, setSeparateWorkers] = useState([]);
  const [sharedWorkers, setSharedWorkers] = useState([]);

  // Metrics
  const [metrics, setMetrics] = useState({
    separate: { processed: 0, totalWait: 0, totalBusySamples: 0, sampleCount: 0, totalWaited: 0, requestsWaited: 0 },
    shared: { processed: 0, totalWait: 0, totalBusySamples: 0, sampleCount: 0, totalWaited: 0, requestsWaited: 0 }
  });

  // Refs
  const requestIdRef = useRef(0);
  const animationRef = useRef(null);
  const lastTimeRef = useRef(Date.now());
  const lastSpawnRef = useRef(Date.now());
  const separateWorkersRef = useRef([]);
  const sharedWorkersRef = useRef([]);
  const metricsRef = useRef({
    separate: { processed: 0, totalWait: 0, totalBusySamples: 0, sampleCount: 0, totalWaited: 0, requestsWaited: 0 },
    shared: { processed: 0, totalWait: 0, totalBusySamples: 0, sampleCount: 0, totalWaited: 0, requestsWaited: 0 }
  });

  // Sync params to URL
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('queues', numQueues);
    params.set('workers', workersPerQueue);
    params.set('arrival', arrivalRate);
    params.set('service', serviceTime);
    params.set('variance', serviceTimeStdDev);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [numQueues, workersPerQueue, arrivalRate, serviceTime, serviceTimeStdDev]);

  // Initialize workers
  useEffect(() => {
    // Separate queues: each queue has workersPerQueue workers
    // Worker id encodes which queue it belongs to
    const sepWorkers = [];
    for (let q = 0; q < numQueues; q++) {
      for (let w = 0; w < workersPerQueue; w++) {
        sepWorkers.push({
          id: q * workersPerQueue + w,
          queueId: q, // Which queue this worker belongs to
          busy: false,
          requestId: null,
          startTime: null
        });
      }
    }

    // Shared queue: all workers in one pool
    const sharedWorkersList = Array(totalWorkers).fill(null).map((_, i) => ({
      id: i,
      busy: false,
      requestId: null,
      startTime: null
    }));

    setSeparateWorkers(sepWorkers.map(w => ({ ...w })));
    setSharedWorkers(sharedWorkersList.map(w => ({ ...w })));
    separateWorkersRef.current = sepWorkers.map(w => ({ ...w }));
    sharedWorkersRef.current = sharedWorkersList.map(w => ({ ...w }));
    setSeparateRequests([]);
    setSharedRequests([]);
    metricsRef.current = {
      separate: { processed: 0, totalWait: 0, totalBusySamples: 0, sampleCount: 0, totalWaited: 0, requestsWaited: 0 },
      shared: { processed: 0, totalWait: 0, totalBusySamples: 0, sampleCount: 0, totalWaited: 0, requestsWaited: 0 }
    };
    setMetrics({
      separate: { processed: 0, totalWait: 0, totalBusySamples: 0, sampleCount: 0, totalWaited: 0, requestsWaited: 0 },
      shared: { processed: 0, totalWait: 0, totalBusySamples: 0, sampleCount: 0, totalWaited: 0, requestsWaited: 0 }
    });
  }, [numQueues, workersPerQueue, totalWorkers]);

  const resetSimulation = useCallback(() => {
    requestIdRef.current = 0;
    lastTimeRef.current = Date.now();
    lastSpawnRef.current = Date.now();

    const sepWorkers = [];
    for (let q = 0; q < numQueues; q++) {
      for (let w = 0; w < workersPerQueue; w++) {
        sepWorkers.push({
          id: q * workersPerQueue + w,
          queueId: q,
          busy: false,
          requestId: null,
          startTime: null
        });
      }
    }

    const sharedWorkersList = Array(totalWorkers).fill(null).map((_, i) => ({
      id: i,
      busy: false,
      requestId: null,
      startTime: null
    }));

    setSeparateWorkers(sepWorkers.map(w => ({ ...w })));
    setSharedWorkers(sharedWorkersList.map(w => ({ ...w })));
    separateWorkersRef.current = sepWorkers.map(w => ({ ...w }));
    sharedWorkersRef.current = sharedWorkersList.map(w => ({ ...w }));
    setSeparateRequests([]);
    setSharedRequests([]);
    metricsRef.current = {
      separate: { processed: 0, totalWait: 0, totalBusySamples: 0, sampleCount: 0, totalWaited: 0, requestsWaited: 0 },
      shared: { processed: 0, totalWait: 0, totalBusySamples: 0, sampleCount: 0, totalWaited: 0, requestsWaited: 0 }
    };
    setMetrics({
      separate: { processed: 0, totalWait: 0, totalBusySamples: 0, sampleCount: 0, totalWaited: 0, requestsWaited: 0 },
      shared: { processed: 0, totalWait: 0, totalBusySamples: 0, sampleCount: 0, totalWaited: 0, requestsWaited: 0 }
    });
  }, [numQueues, workersPerQueue, totalWorkers]);

  // Main animation loop
  useEffect(() => {
    if (!isRunning) return;

    const serviceMs = serviceTime * 1000;
    const spawnInterval = arrivalRate > 0 ? 1000 / arrivalRate : Infinity;

    const animate = () => {
      const now = Date.now();
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      // Spawn new requests
      if (arrivalRate > 0 && now - lastSpawnRef.current >= spawnInterval) {
        const id = requestIdRef.current++;

        // Generate service time with variance (ensure minimum of 0.1s)
        const actualServiceTime = Math.max(0.1, randomGaussian(serviceTime, serviceTimeStdDev));
        const serviceTimeMs = actualServiceTime * 1000;

        // LEAST-QUEUED algorithm: find queue with fewest requests
        // Count requests in each queue (in-queue + falling toward that queue + processing)
        const queueCounts = Array(numQueues).fill(0);
        separateWorkersRef.current.forEach((worker) => {
          if (worker.busy) queueCounts[worker.queueId]++; // Count processing as "in queue"
        });

        setSeparateRequests(prev => {
          // Count existing requests per queue
          prev.forEach(req => {
            if ((req.phase === 'falling' || req.phase === 'in-queue') && req.targetQueue !== undefined) {
              queueCounts[req.targetQueue]++;
            }
          });

          // Find queue with minimum count (least-queued)
          let minCount = Infinity;
          let targetQueue = 0;
          for (let i = 0; i < numQueues; i++) {
            if (queueCounts[i] < minCount) {
              minCount = queueCounts[i];
              targetQueue = i;
            }
          }

          return [...prev, {
            id: `sep-${id}`,
            phase: 'falling',
            progress: 0,
            targetQueue,
            queuePosition: null,
            createdAt: now,
            serviceTimeMs // Each request has its own service time
          }];
        });

        // Shared queue - request goes to single queue
        setSharedRequests(prev => [...prev, {
          id: `shared-${id}`,
          phase: 'falling',
          progress: 0,
          queuePosition: null,
          createdAt: now,
          serviceTimeMs // Same service time for fair comparison
        }]);

        lastSpawnRef.current = now;
      }

      // Update SEPARATE requests
      setSeparateRequests(prev => {
        let updated = prev.map(req => {
          if (req.phase === 'falling') {
            const newProgress = req.progress + delta * 0.003;
            if (newProgress >= 1) {
              return { ...req, phase: 'in-queue', progress: 1, queuedAt: now };
            }
            return { ...req, progress: newProgress };
          }
          return req;
        });

        // Process queue -> worker assignments for separate queues
        const workers = separateWorkersRef.current;

        // For each queue, assign queued requests to available workers in that queue
        for (let queueId = 0; queueId < numQueues; queueId++) {
          const queueWorkers = workers.filter(w => w.queueId === queueId);
          const queuedForThisQueue = updated
            .filter(r => r.phase === 'in-queue' && r.targetQueue === queueId && !r.workerId)
            .sort((a, b) => a.queuedAt - b.queuedAt);

          for (const req of queuedForThisQueue) {
            // Check if this request is already being processed by any worker
            // (handles React Strict Mode calling updater twice)
            const assignedWorker = workers.find(w => w.requestId === req.id);
            if (assignedWorker) {
              // Worker already has this request - just sync the request state
              updated = updated.map(r =>
                r.id === req.id ? { ...r, phase: 'processing', workerId: assignedWorker.id } : r
              );
              continue;
            }

            const freeWorker = queueWorkers.find(w => !w.busy);
            if (!freeWorker) break; // No more free workers in this queue

            freeWorker.busy = true;
            freeWorker.requestId = req.id;
            freeWorker.startTime = now;
            const waitTime = now - req.queuedAt;
            metricsRef.current.separate.totalWait += waitTime;
            if (waitTime > 0) {
              metricsRef.current.separate.requestsWaited++;
            }
            updated = updated.map(r =>
              r.id === req.id ? { ...r, phase: 'processing', workerId: freeWorker.id } : r
            );
          }
        }

        // Check for completed processing (use per-request service time)
        workers.forEach((worker) => {
          if (worker.busy && worker.startTime) {
            const req = updated.find(r => r.id === worker.requestId);
            const reqServiceTime = req?.serviceTimeMs || serviceMs;
            if (now - worker.startTime >= reqServiceTime) {
              updated = updated.map(r =>
                r.id === worker.requestId ? { ...r, phase: 'done', doneAt: now } : r
              );
              metricsRef.current.separate.processed++;
              worker.busy = false;
              worker.requestId = null;
              worker.startTime = null;
            }
          }
        });

        setSeparateWorkers([...workers]);

        // Remove old done requests
        return updated.filter(r => !(r.phase === 'done' && now - r.doneAt > 400));
      });

      // Update SHARED requests
      setSharedRequests(prev => {
        let updated = prev.map(req => {
          if (req.phase === 'falling') {
            const newProgress = req.progress + delta * 0.003;
            if (newProgress >= 1) {
              return { ...req, phase: 'in-queue', progress: 1, queuedAt: now };
            }
            return { ...req, progress: newProgress };
          }
          return req;
        });

        // Shared queue - ANY available worker takes next request
        const workers = sharedWorkersRef.current;
        const queuedRequests = updated
          .filter(r => r.phase === 'in-queue' && !r.workerId)
          .sort((a, b) => a.queuedAt - b.queuedAt);

        for (const req of queuedRequests) {
          // Check if this request is already being processed by any worker
          // (handles React Strict Mode calling updater twice)
          const assignedWorker = workers.find(w => w.requestId === req.id);
          if (assignedWorker) {
            // Worker already has this request - just sync the request state
            updated = updated.map(r =>
              r.id === req.id ? { ...r, phase: 'processing', workerId: assignedWorker.id } : r
            );
            continue;
          }

          const freeWorker = workers.find(w => !w.busy);
          if (!freeWorker) break;

          freeWorker.busy = true;
          freeWorker.requestId = req.id;
          freeWorker.startTime = now;
          const waitTime = now - req.queuedAt;
          metricsRef.current.shared.totalWait += waitTime;
          if (waitTime > 0) {
            metricsRef.current.shared.requestsWaited++;
          }
          updated = updated.map(r =>
            r.id === req.id ? { ...r, phase: 'processing', workerId: freeWorker.id } : r
          );
        }

        // Check for completed processing (use per-request service time)
        workers.forEach((worker) => {
          if (worker.busy && worker.startTime) {
            const req = updated.find(r => r.id === worker.requestId);
            const reqServiceTime = req?.serviceTimeMs || serviceMs;
            if (now - worker.startTime >= reqServiceTime) {
              updated = updated.map(r =>
                r.id === worker.requestId ? { ...r, phase: 'done', doneAt: now } : r
              );
              metricsRef.current.shared.processed++;
              worker.busy = false;
              worker.requestId = null;
              worker.startTime = null;
            }
          }
        });

        setSharedWorkers([...workers]);

        return updated.filter(r => !(r.phase === 'done' && now - r.doneAt > 400));
      });

      // Sample utilization for aggregate calculation
      const sepBusy = separateWorkersRef.current.filter(w => w.busy).length;
      const sharedBusy = sharedWorkersRef.current.filter(w => w.busy).length;
      metricsRef.current.separate.totalBusySamples += sepBusy;
      metricsRef.current.separate.sampleCount++;
      metricsRef.current.shared.totalBusySamples += sharedBusy;
      metricsRef.current.shared.sampleCount++;

      // Count current waiting requests
      metricsRef.current.separate.totalWaited = separateWorkersRef.current.reduce((sum, w) => sum, 0);
      metricsRef.current.shared.totalWaited = sharedWorkersRef.current.reduce((sum, w) => sum, 0);

      // Update metrics display
      setMetrics({ ...metricsRef.current });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [isRunning, arrivalRate, serviceTime, serviceTimeStdDev, numQueues, workersPerQueue, totalWorkers]);

  // Calculate stats
  const avgWaitSep = metrics.separate.processed > 0
    ? metrics.separate.totalWait / metrics.separate.processed : 0;
  const avgWaitShared = metrics.shared.processed > 0
    ? metrics.shared.totalWait / metrics.shared.processed : 0;

  // Calculate probability of waiting (% of requests that had to wait)
  const probWaitSep = metrics.separate.processed > 0
    ? (metrics.separate.requestsWaited / metrics.separate.processed) * 100 : 0;
  const probWaitShared = metrics.shared.processed > 0
    ? (metrics.shared.requestsWaited / metrics.shared.processed) * 100 : 0;

  // Calculate wait time difference percentage
  const waitTimeDiff = avgWaitSep > 0
    ? ((avgWaitSep - avgWaitShared) / avgWaitSep * 100) : 0;
  const isSharedBetter = waitTimeDiff > 0;

  // Current queue lengths (only count requests truly waiting, not being processed)
  const sharedQueueLength = sharedRequests.filter(r => r.phase === 'in-queue' && !r.workerId).length;

  // Calculate AGGREGATE utilization (average over time)
  const sepAvgUtilization = metrics.separate.sampleCount > 0
    ? (metrics.separate.totalBusySamples / metrics.separate.sampleCount / totalWorkers) * 100 : 0;
  const sharedAvgUtilization = metrics.shared.sampleCount > 0
    ? (metrics.shared.totalBusySamples / metrics.shared.sampleCount / totalWorkers) * 100 : 0;


  return (
    <div className="queue-comparison-container">
      {/* Header */}
      <div className="comparison-header">
        <div className="header-content">
          <h2>Why Shared Queues Win: The Erlang C Insight</h2>
          <p className="header-subtitle">
            Watch how a single shared queue with N workers outperforms N separate queues
          </p>
        </div>
        <div className="simulation-controls">
          <button
            className={`control-btn ${isRunning ? 'pause' : 'play'}`}
            onClick={() => setIsRunning(!isRunning)}
          >
            {isRunning ? 'Pause' : 'Play'}
          </button>
          <button className="control-btn reset" onClick={resetSimulation}>
            Reset
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="parameters-panel">
        <h3>Simulation Parameters</h3>


        <div className="input-section">
          <h4 className="input-section-title">Queue Configuration</h4>

          <div className="input-group">
            <label>
              <span className="label-text">Number of Queues</span>
              <span className="label-unit">{numQueues}</span>
            </label>
            <div className="slider-input-container">
              <input
                type="range"
                min={minQueues}
                max={maxQueues}
                step="1"
                value={numQueues}
                onChange={(e) => setNumQueues(Number(e.target.value))}
                className="slider-input"
              />
            </div>
          </div>

          <div className="input-group">
            <label>
              <span className="label-text">Workers per Queue</span>
              <span className="label-unit">{workersPerQueue}</span>
            </label>
            <div className="slider-input-container">
              <input
                type="range"
                min={minWorkersPerQueue}
                max={maxWorkersPerQueue}
                step="1"
                value={workersPerQueue}
                onChange={(e) => setWorkersPerQueue(Number(e.target.value))}
                className="slider-input"
              />
            </div>
          </div>
        </div>

        <div className="input-section">
          <h4 className="input-section-title">Traffic Parameters</h4>

          <div className="input-group">
            <label>
              <span className="label-text">Arrival Rate</span>
              <span className="label-unit">{arrivalRate} req/s</span>
            </label>
            <div className="slider-input-container">
              <input
                type="range"
                min={minArrivalRate}
                max={maxArrivalRate}
                step="0.5"
                value={arrivalRate}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setArrivalRate(val);
                  if (val < minArrivalRate || val > maxArrivalRate) {
                    const { newMin, newMax } = calculateNewRange(val);
                    setMinArrivalRate(Math.max(0.5, newMin));
                    setMaxArrivalRate(newMax);
                  }
                }}
                className="slider-input"
              />
            </div>
          </div>

          <div className="input-group">
            <label>
              <span className="label-text">Average Service Time</span>
              <span className="label-unit">{serviceTime}s</span>
            </label>
            <div className="slider-input-container">
              <input
                type="range"
                min={minServiceTime}
                max={maxServiceTime}
                step="0.25"
                value={serviceTime}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setServiceTime(val);
                  if (val < minServiceTime || val > maxServiceTime) {
                    const { newMin, newMax } = calculateNewRange(val);
                    setMinServiceTime(Math.max(0.1, newMin));
                    setMaxServiceTime(newMax);
                  }
                }}
                className="slider-input"
              />
            </div>
          </div>

          <div className="input-group">
            <label>
              <span className="label-text">Service Time Variance</span>
              <span className="label-unit">σ = {serviceTimeStdDev}s</span>
            </label>
            <div className="slider-input-container">
              <input
                type="range"
                min={minStdDev}
                max={maxStdDev}
                step="0.1"
                value={serviceTimeStdDev}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setServiceTimeStdDev(val);
                  if (val < minStdDev || val > maxStdDev) {
                    const { newMin, newMax } = calculateNewRange(val);
                    setMinStdDev(Math.max(0, newMin));
                    setMaxStdDev(newMax);
                  }
                }}
                className="slider-input"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="metrics-comparison">
        <div className="metric-card separate">
          <div className="metric-header">❌ {numQueues} Queues × {workersPerQueue} Workers</div>
          <div className="metric-values">
            <div className="metric-item has-tooltip" data-tooltip="Average time requests spend waiting in queue before being processed. Calculated as: Total Wait Time / Number of Processed Requests">
              <span className="metric-label">Avg Wait</span>
              <span className="metric-value">{avgWaitSep.toFixed(0)}ms</span>
            </div>
            <div className="metric-item has-tooltip" data-tooltip="Average worker utilization over time. Calculated as: (Sum of Busy Workers per Frame) / (Total Frames × Total Workers) × 100%">
              <span className="metric-label">Avg Util</span>
              <span className="metric-value">{sepAvgUtilization.toFixed(0)}%</span>
            </div>
            <div className="metric-item has-tooltip" data-tooltip="Probability that a request will have to wait in queue. Calculated as: (Number of Requests That Waited / Total Processed) × 100%">
              <span className="metric-label">P(wait)</span>
              <span className="metric-value">{probWaitSep.toFixed(0)}%</span>
            </div>
          </div>
        </div>

        <div className="savings-indicator">
          {metrics.separate.processed > 10 && metrics.shared.processed > 10 ? (
            <div className={`savings-badge ${isSharedBetter ? 'better' : 'worse'}`}>
              <span className="savings-number">{Math.abs(waitTimeDiff).toFixed(0)}%</span>
              <span className="savings-label">{isSharedBetter ? 'less avg wait' : 'more wait'}</span>
            </div>
          ) : (
            <div className="savings-badge neutral">
              <span className="savings-label">Comparing...</span>
            </div>
          )}
        </div>

        <div className="metric-card shared">
          <div className="metric-header">1 Queue × {totalWorkers} Workers</div>
          <div className="metric-values">
            <div className="metric-item has-tooltip" data-tooltip="Average time requests spend waiting in queue before being processed. Calculated as: Total Wait Time / Number of Processed Requests">
              <span className="metric-label">Avg Wait</span>
              <span className="metric-value">{avgWaitShared.toFixed(0)}ms</span>
            </div>
            <div className="metric-item has-tooltip" data-tooltip="Average worker utilization over time. Calculated as: (Sum of Busy Workers per Frame) / (Total Frames × Total Workers) × 100%">
              <span className="metric-label">Avg Util</span>
              <span className="metric-value">{sharedAvgUtilization.toFixed(0)}%</span>
            </div>
            <div className="metric-item has-tooltip" data-tooltip="Probability that a request will have to wait in queue. Calculated as: (Number of Requests That Waited / Total Processed) × 100%">
              <span className="metric-label">P(wait)</span>
              <span className="metric-value">{probWaitShared.toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Comparison */}
      <div className="visual-comparison">
        {/* LEFT: Separate Queues */}
        <div className="queue-panel separate">
          <div className="panel-header">
            <h3>{numQueues} Separate Queues</h3>
            <p>{workersPerQueue} worker{workersPerQueue > 1 ? 's' : ''} per queue • Least-queued routing • {totalWorkers} total workers</p>
          </div>

          <div className="animation-area">
            {/* Spawn point */}
            <div className="spawn-zone">
              <div className="spawn-label">Incoming</div>
            </div>

            {/* Falling requests */}
            <div className="fall-zone">
              {separateRequests
                .filter(r => r.phase === 'falling')
                .map(req => {
                  // Calculate x position based on target queue
                  const availableWidth = 100; // percentage
                  const queueWidth = availableWidth / numQueues;
                  const xPos = queueWidth * req.targetQueue + queueWidth / 2;

                  return (
                    <div
                      key={req.id}
                      className="falling-request"
                      style={{
                        left: `${xPos}%`,
                        top: `${req.progress * 100}%`,
                        opacity: Math.min(1, req.progress * 3)
                      }}
                    />
                  );
                })}
            </div>

            {/* Queue columns */}
            <div className="queues-zone">
              {Array(numQueues).fill(0).map((_, queueIdx) => {
                const queuedHere = separateRequests.filter(
                  r => r.phase === 'in-queue' && r.targetQueue === queueIdx && !r.workerId
                );
                // Get workers for this queue
                const queueWorkers = separateWorkers.filter(w => w.queueId === queueIdx);

                // Check if there are requests waiting in OTHER queues
                const requestsInOtherQueues = separateRequests.some(
                  r => r.phase === 'in-queue' && r.targetQueue !== queueIdx && !r.workerId
                );
                // Check if there are ANY requests waiting anywhere (truly queued, not processing)
                const anyRequestsWaiting = separateRequests.some(r => r.phase === 'in-queue' && !r.workerId);

                return (
                  <div key={queueIdx} className="queue-column">
                    {/* Queue pipe */}
                    <div className="queue-pipe">
                      <div className="pipe-label">Q{queueIdx + 1}</div>
                      <div className="pipe-content">
                        {queuedHere.slice(0, 6).map((r, i) => (
                          <div
                            key={r.id}
                            className="queue-ball"
                            style={{ animationDelay: `${i * 0.05}s` }}
                          />
                        ))}
                        {queuedHere.length > 6 && (
                          <div className="queue-more">+{queuedHere.length - 6}</div>
                        )}
                      </div>
                    </div>

                    {/* Workers for this queue */}
                    <div className="queue-workers">
                      {queueWorkers.map((worker, wIdx) => {
                        // Determine idle worker color
                        const isIdleInefficient = !worker.busy && requestsInOtherQueues;
                        const isIdleEfficient = !worker.busy && !anyRequestsWaiting;

                        return (
                          <div
                            key={`${worker.id}-${worker.requestId || 'idle'}`}
                            className={`worker mini ${worker.busy ? 'busy' : 'idle'} ${isIdleInefficient ? 'idle-inefficient' : ''} ${isIdleEfficient ? 'idle-efficient' : ''}`}
                          >
                            {worker.busy && <div className="worker-spinner mini" />}
                            {!worker.busy && <span className="worker-idle-mini">💤</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Done zone */}
            <div className="done-zone">
              {separateRequests
                .filter(r => r.phase === 'done')
                .map(r => (
                  <div key={r.id} className="done-ball" />
                ))}
            </div>
          </div>

          <div className="panel-callout warning">
            ⚠️ Even with smart routing, variance causes uneven queues!
          </div>
        </div>

        {/* Divider */}
        <div className="comparison-divider">
          <div className="divider-line"></div>
          <div className="divider-vs">VS</div>
          <div className="divider-line"></div>
        </div>

        {/* RIGHT: Shared Queue */}
        <div className="queue-panel shared">
          <div className="panel-header">
            <h3>Single Shared Queue</h3>
            <p>{totalWorkers} workers sharing one queue</p>
          </div>

          <div className="animation-area">
            {/* Spawn point */}
            <div className="spawn-zone">
              <div className="spawn-label">Incoming</div>
            </div>

            {/* Falling requests - all to center */}
            <div className="fall-zone">
              {sharedRequests
                .filter(r => r.phase === 'falling')
                .map(req => (
                  <div
                    key={req.id}
                    className="falling-request shared"
                    style={{
                      left: '50%',
                      top: `${req.progress * 100}%`,
                      opacity: Math.min(1, req.progress * 3)
                    }}
                  />
                ))}
            </div>

            {/* Shared queue - single wide pipe */}
            <div className="shared-queue-zone">
              <div className="shared-pipe">
                <div className="pipe-label">Shared Queue</div>
                <div className="shared-pipe-content">
                  {sharedRequests
                    .filter(r => r.phase === 'in-queue' && !r.workerId)
                    .slice(0, 10)
                    .map((r, i) => (
                      <div
                        key={r.id}
                        className="queue-ball shared"
                        style={{ animationDelay: `${i * 0.03}s` }}
                      />
                    ))}
                  {sharedQueueLength > 10 && (
                    <div className="queue-more">+{sharedQueueLength - 10}</div>
                  )}
                </div>
              </div>

              {/* Fan-out arrows - show fewer lines to avoid clutter */}
              <div className="fanout-arrows">
                {Array(Math.min(totalWorkers, 6)).fill(0).map((_, i) => (
                  <div
                    key={i}
                    className="fanout-line"
                    style={{
                      '--index': i,
                      '--total': Math.min(totalWorkers, 6)
                    }}
                  />
                ))}
              </div>

              {/* Workers row */}
              <div className="workers-row shared-workers">
                {sharedWorkers.map((worker, idx) => {
                  // Determine idle worker color
                  const isIdleInefficient = !worker?.busy && sharedQueueLength > 0;
                  const isIdleEfficient = !worker?.busy && sharedQueueLength === 0;

                  return (
                    <div key={`${idx}-${worker?.requestId || 'idle'}`} className={`worker mini shared ${worker?.busy ? 'busy' : 'idle'} ${isIdleInefficient ? 'idle-inefficient' : ''} ${isIdleEfficient ? 'idle-efficient' : ''}`}>
                      {worker?.busy && <div className="worker-spinner mini" />}
                      {!worker?.busy && <span className="worker-idle-mini">💤</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Done zone */}
            <div className="done-zone">
              {sharedRequests
                .filter(r => r.phase === 'done')
                .map(r => (
                  <div key={r.id} className="done-ball shared" />
                ))}
            </div>
          </div>

          <div className="panel-callout success">
            ✨ Any free worker takes the next request!
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="legend-panel">
        <h4>Legend</h4>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-shape request-ball" />
            <span>Incoming Request</span>
          </div>
          <div className="legend-item">
            <div className="legend-shape queue-ball-legend" />
            <span>Waiting in Queue</span>
          </div>
          <div className="legend-item">
            <div className="legend-shape worker-busy-legend">
              <div className="spinner-legend" />
            </div>
            <span>Worker Processing</span>
          </div>
          <div className="legend-item">
            <div className="legend-shape worker-idle-efficient-legend">
              <span className="legend-idle-icon">💤</span>
            </div>
            <span>Worker Idle (No Waiting Requests)</span>
          </div>
          <div className="legend-item">
            <div className="legend-shape worker-idle-inefficient-legend">
              <span className="legend-idle-icon">💤</span>
            </div>
            <span>Worker Idle (Requests Waiting Elsewhere)</span>
          </div>
        </div>
      </div>

      {/* Insight */}
      <div className="insight-panel">
        <h3>💡 The Erlang C Insight</h3>
        <div className="insight-grid">
          <div className="insight-item">
            <span className="insight-icon">🎯</span>
            <div>
              <strong>Pooling Principle</strong>
              <p>Combining queues always reduces average wait time. With separate queues, one worker might be idle while another has a long queue.</p>
            </div>
          </div>
          <div className="insight-item">
            <span className="insight-icon">📐</span>
            <div>
              <strong>The Math</strong>
              <p>For N workers with utilization ρ, shared queue wait ∝ 1/(N-Nρ), separate queues wait ∝ 1/(1-ρ). Shared is N times better!</p>
            </div>
          </div>
          <div className="insight-item">
            <span className="insight-icon">💰</span>
            <div>
              <strong>Real Savings</strong>
              <p>This is why call centers use single queues, databases use connection pools, and web servers use worker pools.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QueueComparisonTab;

/**
 * Erlang C Formula Implementation
 * 
 * The Erlang C formula calculates the probability that a call (request) 
 * will be delayed (queued) when there are N agents (workers) and 
 * traffic intensity A (in Erlangs).
 * 
 * Key formulas:
 * - Traffic intensity A = λ * μ (arrival rate * average service time)
 * - Probability of delay P(N,A) = (A^N / N!) / (A^N / N! + (1 - A/N) * Σ(A^k / k!))
 * - Average waiting time = P(N,A) * (μ / (N - A))
 * - Average queue length = A * P(N,A) / (N - A)
 */

/**
 * Calculate factorial
 */
function factorial(n) {
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

/**
 * Calculate the probability of delay (Erlang C formula)
 * @param {number} N - Number of agents/workers
 * @param {number} A - Traffic intensity in Erlangs
 * @returns {number} Probability that a request will be queued
 */
export function erlangC(N, A) {
  if (N <= 0 || A < 0) return 0;
  if (A >= N) return 1; // System is overloaded
  
  // Calculate the sum: Σ(A^k / k!) for k=0 to N-1
  let sum = 0;
  for (let k = 0; k < N; k++) {
    sum += Math.pow(A, k) / factorial(k);
  }
  
  // Calculate A^N / N!
  const numerator = Math.pow(A, N) / factorial(N);
  
  // Calculate denominator: A^N/N! + (1 - A/N) * Σ(A^k/k!)
  const denominator = numerator + (1 - A / N) * sum;
  
  // Erlang C formula
  return numerator / denominator;
}

/**
 * Calculate average waiting time in queue
 * @param {number} N - Number of agents/workers
 * @param {number} A - Traffic intensity in Erlangs
 * @param {number} serviceTime - Average service time (in seconds)
 * @returns {number} Average waiting time in seconds
 */
export function averageWaitingTime(N, A, serviceTime) {
  if (N <= A) return Infinity; // System overloaded
  const P = erlangC(N, A);
  return (P * serviceTime) / (N - A);
}

/**
 * Calculate average queue length
 * @param {number} N - Number of agents/workers
 * @param {number} A - Traffic intensity in Erlangs
 * @returns {number} Average number of requests in queue
 */
export function averageQueueLength(N, A) {
  if (N <= A) return Infinity; // System overloaded
  const P = erlangC(N, A);
  return (A * P) / (N - A);
}

/**
 * Calculate traffic intensity (A) from arrival rate and service time
 * @param {number} arrivalRate - Requests per second
 * @param {number} serviceTime - Average service time per request (seconds)
 * @returns {number} Traffic intensity in Erlangs
 */
export function calculateTrafficIntensity(arrivalRate, serviceTime) {
  return arrivalRate * serviceTime;
}

/**
 * Calculate server utilization
 * @param {number} N - Number of agents/workers
 * @param {number} A - Traffic intensity in Erlangs
 * @returns {number} Utilization percentage (0-100)
 */
export function calculateUtilization(N, A) {
  if (N === 0) return 0;
  return Math.min(100, (A / N) * 100);
}

/**
 * Find minimum number of workers needed to meet SLA
 * @param {number} arrivalRate - Requests per second
 * @param {number} serviceTime - Average service time per request (seconds)
 * @param {number} maxWaitTime - Maximum acceptable wait time (seconds)
 * @returns {number} Minimum number of workers needed
 */
export function findMinWorkers(arrivalRate, serviceTime, maxWaitTime) {
  const A = calculateTrafficIntensity(arrivalRate, serviceTime);
  let N = Math.ceil(A) + 1; // Start with minimum viable
  
  // Binary search for optimal N
  let minN = Math.ceil(A);
  let maxN = Math.ceil(A * 3); // Reasonable upper bound
  
  while (minN <= maxN) {
    const midN = Math.floor((minN + maxN) / 2);
    const waitTime = averageWaitingTime(midN, A, serviceTime);
    
    if (waitTime <= maxWaitTime) {
      N = midN;
      maxN = midN - 1;
    } else {
      minN = midN + 1;
    }
  }
  
  return Math.max(Math.ceil(A) + 1, N);
}

/**
 * Generate data points for visualization
 * @param {number} arrivalRate - Requests per second
 * @param {number} serviceTime - Average service time per request (seconds)
 * @param {number} minWorkers - Minimum workers to analyze
 * @param {number} maxWorkers - Maximum workers to analyze
 * @returns {Array} Array of data points with metrics
 */
export function generateDataPoints(arrivalRate, serviceTime, minWorkers, maxWorkers) {
  const A = calculateTrafficIntensity(arrivalRate, serviceTime);
  const dataPoints = [];
  
  for (let N = minWorkers; N <= maxWorkers; N++) {
    const P = erlangC(N, A);
    const waitTime = averageWaitingTime(N, A, serviceTime);
    const queueLength = averageQueueLength(N, A);
    const utilization = calculateUtilization(N, A);
    
    dataPoints.push({
      workers: N,
      probabilityDelay: P * 100,
      waitTime: waitTime * 1000, // Convert to milliseconds
      queueLength: queueLength,
      utilization: utilization,
      trafficIntensity: A
    });
  }
  
  return dataPoints;
}

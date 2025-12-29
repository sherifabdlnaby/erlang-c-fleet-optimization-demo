import React, { useState } from 'react';
import './ExplanationPanel.css';

function ExplanationPanel() {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="explanation-panel">
      <div className="explanation-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h2>About Erlang C Formula</h2>
        <span className="toggle-icon">{isExpanded ? '−' : '+'}</span>
      </div>
      
      {isExpanded && (
        <div className="explanation-content">
          <section>
            <h3>What is Erlang C?</h3>
            <p>
              The Erlang C formula, developed by Danish mathematician A.K. Erlang in 1917,
              is a queueing theory model used to predict the probability that a call will
              be delayed (queued) in a call center system. It's particularly useful for
              capacity planning and resource allocation.
            </p>
          </section>

          <section>
            <h3>Application to Web Servers</h3>
            <p>
              While originally designed for telephone systems, Erlang C applies perfectly
              to web servers:
            </p>
            <ul>
              <li><strong>Agents</strong> → <strong>Workers/Threads</strong>: The number of concurrent request handlers</li>
              <li><strong>Calls</strong> → <strong>HTTP Requests</strong>: Incoming requests to your server</li>
              <li><strong>Call Duration</strong> → <strong>Service Time</strong>: Time to process a request</li>
              <li><strong>Wait Time</strong> → <strong>Queue Time</strong>: Time requests wait before being processed</li>
            </ul>
          </section>

          <section>
            <h3>Key Formulas</h3>
            <div className="formula-box">
              <div className="formula-item">
                <strong>Traffic Intensity (A):</strong>
                <code>A = λ × μ</code>
                <p>Where λ = arrival rate (req/sec), μ = service time (seconds)</p>
              </div>
              <div className="formula-item">
                <strong>Probability of Delay:</strong>
                <code>P(N,A) = (A^N / N!) / (A^N / N! + (1 - A/N) × Σ(A^k / k!))</code>
                <p>Probability that a request will be queued</p>
              </div>
              <div className="formula-item">
                <strong>Average Wait Time:</strong>
                <code>W = P(N,A) × (μ / (N - A))</code>
                <p>Average time a request waits in queue</p>
              </div>
              <div className="formula-item">
                <strong>Average Queue Length:</strong>
                <code>L = (A × P(N,A)) / (N - A)</code>
                <p>Average number of requests waiting</p>
              </div>
            </div>
          </section>

          <section>
            <h3>Optimization Insights</h3>
            <ul>
              <li><strong>Traffic Intensity (A)</strong>: Should be less than N (number of workers) for stability</li>
              <li><strong>Server Utilization</strong>: A/N ratio - typically aim for 70-85% for good balance</li>
              <li><strong>Wait Time</strong>: Decreases exponentially as you add more workers</li>
              <li><strong>Cost vs Performance</strong>: More workers = lower wait times but higher costs</li>
            </ul>
          </section>

          <section>
            <h3>References</h3>
            <ul className="references">
              <li>
                <strong>Erlang, A.K.</strong> (1917). "Solution of some problems in the theory of probabilities 
                of significance in automatic telephone exchanges". <em>Post Office Electrical Engineers' Journal</em>, 10, 189-197.
              </li>
              <li>
                <strong>Gross, D., & Harris, C.M.</strong> (1998). <em>Fundamentals of Queueing Theory</em> (3rd ed.). 
                Wiley-Interscience.
              </li>
              <li>
                <strong>Kleinrock, L.</strong> (1975). <em>Queueing Systems, Volume 1: Theory</em>. Wiley-Interscience.
              </li>
              <li>
                <strong>Harchol-Balter, M.</strong> (2013). <em>Performance Modeling and Design of Computer Systems: 
                Queueing Theory in Action</em>. Cambridge University Press.
              </li>
              <li>
                <strong>Online Resources:</strong>
                <ul>
                  <li><a href="https://en.wikipedia.org/wiki/Erlang_(unit)" target="_blank" rel="noopener noreferrer">Wikipedia: Erlang (unit)</a></li>
                  <li><a href="https://www.callcentrehelper.com/erlang-c-formula-explained-121281.htm" target="_blank" rel="noopener noreferrer">Call Centre Helper: Erlang C Explained</a></li>
                  <li><a href="https://www.erlang.com/calculator/erlangc/" target="_blank" rel="noopener noreferrer">Erlang Calculator</a></li>
                </ul>
              </li>
            </ul>
          </section>

          <section>
            <h3>How to Use This Tool</h3>
            <ol>
              <li>Set your expected <strong>request arrival rate</strong> (requests per second)</li>
              <li>Set your average <strong>service time</strong> (how long each request takes to process)</li>
              <li>Adjust the number of <strong>workers</strong> to see how it affects metrics</li>
              <li>Set your <strong>target max wait time</strong> (SLA requirement)</li>
              <li>Click <strong>Optimize Workers</strong> to find the minimum workers needed</li>
              <li>Analyze the charts to understand the trade-offs between cost and performance</li>
            </ol>
          </section>
        </div>
      )}
    </div>
  );
}

export default ExplanationPanel;

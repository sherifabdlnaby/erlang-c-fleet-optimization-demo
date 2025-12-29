import React from 'react';
import './App.css';
import Tabs, { Tab } from './components/Tabs';
import IndividualServerTab from './components/IndividualServerTab';
import FleetOptimizationTab from './components/FleetOptimizationTab';

function App() {
  return (
    <div className="App">
      <div className="author-section">
        <div className="author-content">
          <div className="author-info">
            <h3 className="author-name">Sherif Abdel-Naby</h3>
          </div>
          <div className="author-links">
            <a 
              href="https://sherif.dev" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="author-link"
              title="Website"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
              <span>Website</span>
            </a>
            <a 
              href="https://twitter.com/sherifabdlnaby" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="author-link"
              title="Twitter"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" fillRule="evenodd"/>
              </svg>
              <span>Twitter</span>
            </a>
            <a 
              href="https://www.linkedin.com/in/sherifabdlnaby" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="author-link"
              title="LinkedIn"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
              <span>LinkedIn</span>
            </a>
          </div>
        </div>
      </div>
      <header className="App-header">
        <div className="header-content">
          <div className="header-title-section">
            <h1>Erlang C Formula - Web Server Capacity Planner</h1>
            <p className="subtitle">
              Optimize your web server capacity using queueing theory
            </p>
          </div>
          <a 
            href="https://github.com/sherifabdlnaby/erlang-c-fleet-optimization-demo" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="github-link"
            title="View on GitHub"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482 3.97-1.32 6.833-5.08 6.833-9.503C22 6.484 17.522 2 12 2z"/>
            </svg>
            <span>GitHub</span>
          </a>
        </div>
      </header>
      <div className="App-content">
        <Tabs defaultTab={0}>
          <Tab 
            label="Individual Server Optimization" 
            id="individual"
            description="Optimize a Single Server. Perfect for understanding how worker count affects wait times, utilization, and queueing probability for one server instance."
          >
            <IndividualServerTab />
          </Tab>
          <Tab 
            label="Fleet Optimization" 
            id="fleet"
            description="Use this when planning multiple servers. Compare different fleet configurations, and understand the tradeoffs."
          >
            <FleetOptimizationTab />
          </Tab>
        </Tabs>
      </div>
      <footer className="App-footer">
        <p>
          <small>
            ⚠️ Vibe coded, human validated & tested. 
            <a href="https://github.com/sherifabdlnaby/erlang-c-fleet-optimization-demo/blob/main/DISCLAIMER.md" target="_blank" rel="noopener noreferrer" style={{ marginLeft: '0.5rem', color: 'inherit', textDecoration: 'underline' }}>
              See disclaimer
            </a>
          </small>
        </p>
      </footer>
    </div>
  );
}

export default App;

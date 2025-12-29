import React from 'react';
import './App.css';
import Tabs, { Tab } from './components/Tabs';
import IndividualServerTab from './components/IndividualServerTab';
import FleetOptimizationTab from './components/FleetOptimizationTab';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Erlang C Formula - Web Server Capacity Planner</h1>
        <p className="subtitle">
          Optimize your web server capacity using queueing theory
        </p>
      </header>
      <div className="App-content">
        <Tabs defaultTab={0}>
          <Tab label="Individual Server Optimization" id="individual">
            <IndividualServerTab />
          </Tab>
          <Tab label="Fleet Optimization" id="fleet">
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

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
          <Tab label="Individual Server Optimization">
            <IndividualServerTab />
          </Tab>
          <Tab label="Fleet Optimization">
            <FleetOptimizationTab />
          </Tab>
        </Tabs>
      </div>
    </div>
  );
}

export default App;

import React from 'react';
import './App.css';
import CheckWebAuthn from './components/CheckWebAuthn';
import { AppConfigContext, knownNetworks } from './AppContext';

function App() {
  return (
    <div className="App">
      <AppConfigContext.Provider value={knownNetworks.get('local')!}>
        <CheckWebAuthn />
      </AppConfigContext.Provider>
    </div>
  );
}

export default App;

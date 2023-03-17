import React from 'react';
import './App.css';
import { Alert } from 'react-bootstrap';
import CheckWebAuthn from './components/CheckWebAuthn';

function App() {
  const [show, setShow] = React.useState(true);
  return (
    <div>
        <Alert show={show} variant='secondary' onClose={ _ => setShow(false)} dismissible>
          <Alert.Heading>AA Wallet with PassKeys</Alert.Heading>
          <p>
            This is a demo of an <a className='alert-link' target="_blank" href="https://github.com/eth-infinitism/account-abstraction">ERC4337</a> 
            wallet implemented with PassKeys <a className='alert-link' target="_blank" href="https://developer.apple.com/passkeys/">Apple</a> / 
            <a className='alert-link' target="_blank" href="https://developers.google.com/identity/passkeys">Google</a>. This should work on any modern browser
            that supports <a className='alert-link' target="_blank" href="https://www.w3.org/TR/webauthn-2/">WebAuthn</a>.
          </p>
          <p>
            To get started 
            <ul>
              <li>Pick a <i>Username</i> and click Add a PassKey.</li>
              <li>You will be prompted to add a PassKey to your Apple Wallet / Android / Chrome.</li>
              <li>Once you have added a PassKey pick the PassKey from the dropdown.</li>
              <li>Currently contracts are deployed on Polygon - Mumbai and Base - Goerli. Select one of these networks.</li>
              <li>Your conterfactual address is displayed (same on all chains).</li>
              <li>Transfer some testnet MATIC/ETH to this address.</li>
              <li>Send some native token to another address of yours using the <i>Send</i> button to deploy the contracts.</li>
              <li>Once the contracts are deployed you can add additional passkeys to control this wallet.</li>
              <li>To use the wallet on a different device, open this site on that device, enter the wallet <i>Address</i> and click Authenticate.</li>
              <li>Authenticate with any of the passkeys added on the wallet to operate the wallet.</li>
            </ul>            
          </p>
          <p>
            Gory internal details and the codebase powering this coming soon in a blog 
            post <a className='alert-link' target="_blank" href="https://www.obvious.technology/blogs">from Obvious</a>. 
            I'm available <a className='alert-link' target="_blank" href="https://twitter.com/jebui">@jebui</a> on Twitter.
          </p>
        </Alert>
      <div className="App">
        <CheckWebAuthn />
      </div>
    </div>
  );
}

export default App;

import React from 'react';
import './App.css';
import { CloseButton, Alert, Image } from 'react-bootstrap';
import CheckWebAuthn from './components/CheckWebAuthn';

function App() {
  const [show, setShow] = React.useState(true);
  return (
    <div>
        <Alert show={show} variant='secondary'>
          <CloseButton onClick={ _ => setShow(false)}/>
          <Alert.Heading>Account Abstracted wallet with PassKeys</Alert.Heading>
          <p>
            This is a demo of an <Alert.Link href="https://github.com/eth-infinitism/account-abstraction">ERC4337</Alert.Link> wallet implemented 
            with PassKeys <Alert.Link href="https://developer.apple.com/passkeys/">Apple</Alert.Link> / 
            <Alert.Link href="https://developers.google.com/identity/passkeys">Google</Alert.Link>. This should work on any modern browser
            that supports <Alert.Link href="https://www.w3.org/TR/webauthn-2/">WebAuthn</Alert.Link>.
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
            post <Alert.Link href="https://www.obvious.technology/blogs">from Obvious</Alert.Link>. 
            I'm available <Alert.Link href="https://twitter.com/jebui">@jebui</Alert.Link> on Twitter.
          </p>
        </Alert>
      <div className="App">
        <CheckWebAuthn />
      </div>
    </div>
  );
}

export default App;

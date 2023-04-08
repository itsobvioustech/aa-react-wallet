import { client, utils } from '@passwordless-id/webauthn'
import { useContext, useEffect, useState } from 'react'
import { PassKeysAccountApi, PassKeysAccountApiParams, PassKeyKeyPair, PassKeysProvider } from "@itsobvioustech/aa-passkeys-client"
import { ethers, BigNumber } from 'ethers'
import { ClientConfig, HttpRpcClient } from '@account-abstraction/sdk'
import { EntryPoint__factory } from '@account-abstraction/contracts'
import { ERC4337Account } from './ERC4337Account'
import { AppContext, AppConfigContext, knownNetworks, AppConfig, KnownUsers } from '../AppContext'
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Dropdown from 'react-bootstrap/Dropdown';
import LoadingOverlay from 'react-loading-overlay-ts';
import { FaSeedling } from 'react-icons/fa'
import { HiOutlineSwitchVertical } from 'react-icons/hi'
import { MdKey } from 'react-icons/md'
import { PassKeysAccount__factory } from '@itsobvioustech/aa-passkeys-wallet'

export const CheckWebAuthn = () => {
  const waw = useContext(AppContext)
  const defaultNetwork = useContext(AppConfigContext)
  const [currentNetwork, setCurrentNetwork] = useState<AppConfig>(defaultNetwork)
  const clientConfig: ClientConfig = {
    entryPointAddress: currentNetwork.entryPointAddress,
    bundlerUrl: currentNetwork.bundlerUrl,
  }
  const revivePassKeyPair = (x: any):PassKeyKeyPair => {
    return new PassKeyKeyPair(x.keyId, BigNumber.from(x.pubKeyX), BigNumber.from(x.pubKeyY), waw, 
                              x.name, x.aaguid, x.manufacturer, x.regTime)
  }

  const [available, setAvailable] = useState(false)
  const [loading, setLoading] = useState(0)
  const [userName, setUserName] = useState("")
  const [users, setUsers] = useState<PassKeyKeyPair[]>(localStorage.getItem("users") ? 
    JSON.parse(localStorage.getItem("users") || "").filter((x:any) => x != null && x.pubKeyX && x.pubKeyY).map( revivePassKeyPair ) : [])
  const [activeUser, setActiveUser] = useState<PassKeyKeyPair | undefined>(undefined)
  const [provider, setProvider] = useState<ethers.providers.JsonRpcProvider>()
  const [bundlerRPC, setBundlerRPC] = useState<HttpRpcClient>()
  const [passKeyAPI, setPassKeyAPI] = useState<PassKeysAccountApi>()
  const [passKeysProvider, setPassKeysProvider] = useState<PassKeysProvider>()
  const [erc4337Account, setErc4337Account] = useState<string>()
  const [queryAddress, setQueryAddress] = useState<string>("")
  const [togglePassKey, setTogglePassKey] = useState<boolean>(false)

  useEffect(() => {
    incrementLoader()
    const initialiseProvider = async () => {
      const provider = new ethers.providers.JsonRpcProvider(currentNetwork.rpcUrl)
      await provider._ready()
      const bundlerRPC = new HttpRpcClient(clientConfig.bundlerUrl, clientConfig.entryPointAddress, provider?._network?.chainId)
      setProvider(provider)
      setBundlerRPC(bundlerRPC)
      decrementLoader()
    }
    initialiseProvider()
    setAvailable(client.isAvailable())
  }, [currentNetwork])

  useEffect(() => {
    if (provider && bundlerRPC && activeUser) {
      incrementLoader()
      const params: PassKeysAccountApiParams = {
        passKeyPair: activeUser,
        index: BigNumber.from(0),
        factoryAddress: currentNetwork.factoryAddress,
        provider: provider,
        entryPointAddress: clientConfig.entryPointAddress,
      }
      const passKeyAPI = new PassKeysAccountApi(params)
      setPassKeyAPI(passKeyAPI)
      passKeyAPI.getAccountAddress().then(x => setErc4337Account(x))
      decrementLoader()
    }
  }, [activeUser, provider, bundlerRPC])

  useEffect(() => {
    if (passKeyAPI && bundlerRPC && provider) {
      incrementLoader()
      const passKeysProvider = new PassKeysProvider(
        provider._network.chainId,
        clientConfig,
        provider.getSigner(),
        provider,
        bundlerRPC,
        EntryPoint__factory.connect(clientConfig.entryPointAddress, provider),
        passKeyAPI,
        erc4337Account
      )
      setPassKeysProvider(passKeysProvider)
      decrementLoader()
    }
  }, [passKeyAPI])

  useEffect(() => {
    localStorage.setItem("users", JSON.stringify(users))
  }, [users])

  const incrementLoader = () => {
    setLoading(loading + 1)
  }
  const decrementLoader = () => {
    setLoading(loading - 1 > 0 ? loading - 1 : 0)
  }

  async function registerUser() {
    console.log("Registering user", userName)
    const user = await waw.registerPassKey(utils.randomChallenge(), userName)
    if (user.keyId) {
      setUsers([...users, user])
    }
  }

  async function authenticatePassKey() {
    // we should query the chain for all the known passkeys on this account
    // ask for user to authenticate with one known pass key on this account
    // add this passkey to the users list
    if (provider) {
      const passkeyAccount = PassKeysAccount__factory.connect(queryAddress, provider)
      const knownKeys = await passkeyAccount.getAuthorisedKeys()
      if (knownKeys.length > 0) {
        const knownKeyIds = knownKeys.map(x => x.keyId)
        const authorizedPassKey = await PassKeyKeyPair.getValidPassKeyPair(waw, knownKeyIds)
        if (authorizedPassKey && knownKeyIds.includes(authorizedPassKey.keyId)) {
          const matchedKey = knownKeys.find(x => x.keyId === authorizedPassKey.keyId)!
          const passKey = new PassKeyKeyPair(matchedKey.keyId, matchedKey.pubKeyX, matchedKey.pubKeyY, waw)
          if (users.findIndex(x => x.keyId === passKey.keyId) === -1) setUsers([...users, passKey])
          setErc4337Account(queryAddress)
          const params: PassKeysAccountApiParams = {
            passKeyPair: passKey,
            index: BigNumber.from(0),
            factoryAddress: currentNetwork.factoryAddress,
            provider: provider,
            entryPointAddress: clientConfig.entryPointAddress,
            accountAddress: queryAddress
          }
          const passKeyAPI = new PassKeysAccountApi(params)
          setPassKeyAPI(passKeyAPI)
          setQueryAddress("")
        }
      }
    }
  }

  const handleUserChange = (user: string) => {
    setActiveUser(users[parseInt(user)])
  }

  return(
    <Container>
      <h2> Seedless Wallet <FaSeedling/> </h2> <br/>
      <AppConfigContext.Provider value={currentNetwork}>
        <KnownUsers.Provider value={users}>
      { available && 
        <Container>
          <Row className='header status'>
            <Col xs={4}>
              WebAuthn ✅
            </Col>
            <Col xs={3}>
              Chain - {provider?._network?.chainId}
            </Col>
            <Col xs={4}>
              <Dropdown onSelect={e => setCurrentNetwork(knownNetworks.get(e!)!)}>
                <Dropdown.Toggle variant="secondary" id="dropdown-basic">
                  { currentNetwork.networkName }
                </Dropdown.Toggle>

                <Dropdown.Menu>
                  { Array.from(knownNetworks.values()).map(network => 
                    <Dropdown.Item active={network.networkName === currentNetwork.networkName} key={network.networkName} eventKey={network.networkName}>
                      {network.networkName}
                    </Dropdown.Item>)}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
          </Row>
          <br/>
          <Row className='new-user-regn'>
            <fieldset>
              <Row xs={12}>
                <Col xs={8}>
                <Form.Control type="text" placeholder="Username" onChange={ e => setUserName(e.target.value)} />
                </Col>
                <Col xs={4}>
                <Button onClick={registerUser} type='button'>Add a PassKey</Button>
                </Col>
              </Row>
            </fieldset>
            { users.length > 0 && 
              <fieldset disabled={togglePassKey}>
                <Row xs={12}>
                  <Col xs={8}>
                    <Form.Select onChange={e => handleUserChange(e.target.value)}>
                      <option> Pick a PassKey </option>
                      { users.map((user, i) => <option key={user.keyId} value={i}>{user.name || user.keyId} , { user.manufacturer }, { user.regTime } </option>) }
                    </Form.Select>
                  </Col>
                </Row>
                <Row>
                  <Col xs={12}>
                    <HiOutlineSwitchVertical onClick={ _ => setTogglePassKey(!togglePassKey)}/>
                  </Col>
                </Row>
              </fieldset>
            }
            {/* !togglePassKey || !(passKeyAPI?true:false) */}
            <fieldset disabled={!(togglePassKey ? togglePassKey : users.length === 0 )}>
              <Row xs={12}>
                <Col xs={8}>
                  <Form.Control type="text" placeholder="Address" onChange={ e => setQueryAddress(e.target.value)} value={queryAddress} />
                </Col>
                <Col xs={4}>
                  {/* <Button onClick={ e => switchAddress(queryAddress)} type='button'>Query Address</Button> */}
                  <Button onClick={authenticatePassKey} type='button' disabled={!ethers.utils.isAddress(queryAddress)}>Authenticate <MdKey /></Button>
                </Col>
              </Row>
            </fieldset>
          </Row>
          <br/>
          { users.length > 0 && 
            <LoadingOverlay active={loading > 0} spinner text='Loading your wallet'>
              <Row className='wallet'>
                {passKeysProvider && erc4337Account && provider && passKeyAPI &&
                  <ERC4337Account passKeysProvider={passKeysProvider} jsonRPCProvider={provider} 
                    address={erc4337Account} passKeyAPI={passKeyAPI} 
                    incrementLoader={incrementLoader} decrementLoader={decrementLoader} />
                }
              </Row>
            </LoadingOverlay>
          }
        </Container>
      }
      </KnownUsers.Provider>
      </AppConfigContext.Provider>
    </Container>
  )
}

export default CheckWebAuthn
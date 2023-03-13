import { client, utils } from '@passwordless-id/webauthn'
import { useContext, useEffect, useState } from 'react'
import { PassKeysAccountApi, PassKeysAccountApiParams, PassKeyKeyPair } from "@itsobvioustech/aa-passkeys-client"
import { ethers, BigNumber } from 'ethers'
import { ERC4337EthersProvider, ClientConfig, HttpRpcClient } from '@account-abstraction/sdk'
import { EntryPoint__factory } from '@account-abstraction/contracts'
import { ERC4337Account } from './ERC4337Account'
import { AppContext, AppConfigContext, knownNetworks, AppConfig } from '../AppContext'
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Dropdown from 'react-bootstrap/Dropdown';
import LoadingOverlay from 'react-loading-overlay-ts';
import { FaSeedling } from 'react-icons/fa'

export const CheckWebAuthn = () => {
  const waw = useContext(AppContext)
  const defaultNetwork = useContext(AppConfigContext)
  const [currentNetwork, setCurrentNetwork] = useState<AppConfig>(defaultNetwork)
  const clientConfig: ClientConfig = {
    entryPointAddress: currentNetwork.entryPointAddress,
    bundlerUrl: currentNetwork.bundlerUrl,
  }
  const revivePassKeyPair = (x: any):PassKeyKeyPair => {
    return new PassKeyKeyPair(x.keyId, BigNumber.from(x.pubKeyX), BigNumber.from(x.pubKeyY), waw.webAuthnClient, 
                              x.name, x.aaguid, x.manufacturer, x.regTime)
  }

  const [available, setAvailable] = useState(false)
  const [loading, setLoading] = useState(false)
  const [userName, setUserName] = useState("")
  const [users, setUsers] = useState<PassKeyKeyPair[]>(localStorage.getItem("users") ? 
    JSON.parse(localStorage.getItem("users") || "").filter((x:any) => x != null && x.pubKeyX && x.pubKeyY).map( revivePassKeyPair ) : [])
  const [activeUser, setActiveUser] = useState<PassKeyKeyPair | undefined>(undefined)
  const [provider, setProvider] = useState<ethers.providers.JsonRpcProvider>()
  const [bundlerRPC, setBundlerRPC] = useState<HttpRpcClient>()
  const [passKeyAPI, setPassKeyAPI] = useState<PassKeysAccountApi>()
  const [erc4337Provider, setErc4337Provider] = useState<ERC4337EthersProvider>()
  const [erc4337Account, setErc4337Account] = useState<string>()

  useEffect(() => {
    setLoading(true)
    const initialiseProvider = async () => {
      const provider = new ethers.providers.JsonRpcProvider(currentNetwork.rpcUrl)
      await provider._ready()
      const bundlerRPC = new HttpRpcClient(clientConfig.bundlerUrl, clientConfig.entryPointAddress, provider?._network?.chainId)
      setProvider(provider)
      setBundlerRPC(bundlerRPC)
      setLoading(false)
    }
    initialiseProvider()
    setAvailable(client.isAvailable())
  }, [currentNetwork])

  useEffect(() => {
    if (provider && bundlerRPC && activeUser) {
      setLoading(true)
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
      setLoading(false)
    }
  }, [activeUser, provider, bundlerRPC])

  useEffect(() => {
    if (passKeyAPI && bundlerRPC && provider) {
      setLoading(true)
      const erc4337Provider = new ERC4337EthersProvider(
        provider._network.chainId,
        clientConfig,
        provider.getSigner(),
        provider,
        bundlerRPC,
        EntryPoint__factory.connect(clientConfig.entryPointAddress, provider),
        passKeyAPI
      )
      setErc4337Provider(erc4337Provider)
      setLoading(false)
    }
  }, [passKeyAPI])

  useEffect(() => {
    localStorage.setItem("users", JSON.stringify(users))
  }, [users])

  async function registerUser() {
    console.log("Registering user", userName)
    const user = await waw.registerPassKey(utils.randomChallenge(), userName)
    if (user.keyId) {
      setUsers([...users, user])
    }
  }

  const handleUserChange = (user: string) => {
    setActiveUser(users[parseInt(user)])
  }

  return(
    <Container>
      <h2> Seedless Wallet <FaSeedling/> </h2> <br/>
      <AppConfigContext.Provider value={currentNetwork}>
      { available && 
        <Container>
          <Row className='header status'>
            <Col>
              WebAuthn is available
            </Col>
            <Col xs={3}>
              Chain - {provider?._network?.chainId}
            </Col>
            <Col xs={3}>
              <Dropdown onSelect={e => setCurrentNetwork(knownNetworks.get(e!)!)}>
                <Dropdown.Toggle variant="secondary" id="dropdown-basic">
                  Network { currentNetwork.networkName }
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
            <Col xs={6}>
              <Form.Control type="text" placeholder="Username" onChange={ e => setUserName(e.target.value)} />
              <Button onClick={registerUser} type='button'>Add a PassKey</Button>
            </Col>
            { users.length > 0 && 
              <Col xs={6}>
                <Col lg={true}>
                  <Form.Select onChange={e => handleUserChange(e.target.value)}>
                    <option> Pick a PassKey </option>
                    { users.map((user, i) => <option key={user.keyId} value={i}>{user.name || user.keyId} , { user.manufacturer }, { user.regTime } </option>) }
                  </Form.Select>
                </Col>
              </Col>
            }
          </Row>
          <br/>
          { users.length > 0 && 
            <LoadingOverlay active={loading} spinner text='Loading your wallet'>
              <Row className='wallet'>
                {erc4337Provider && erc4337Account && provider && passKeyAPI &&
                  <ERC4337Account erc4337Provider={erc4337Provider} jsonRPCProvider={provider} address={erc4337Account} passKeyAPI={passKeyAPI} setLoading={setLoading} />
                }
              </Row>
            </LoadingOverlay>
          }
        </Container>
      }
      </AppConfigContext.Provider>
    </Container>
  )
}

export default CheckWebAuthn
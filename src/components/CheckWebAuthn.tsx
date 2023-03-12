import { client, utils } from '@passwordless-id/webauthn'
import { useContext, useEffect, useState } from 'react'
import { PassKeysAccountApi, PassKeysAccountApiParams, PassKeyKeyPair } from "@itsobvioustech/aa-passkeys-client"
import { ethers, BigNumber } from 'ethers'
import { ERC4337EthersProvider, ClientConfig, HttpRpcClient } from '@account-abstraction/sdk'
import { EntryPoint__factory, EntryPoint } from '@account-abstraction/contracts'
import { ERC4337Account, ERC4337AccountProps } from './ERC4337Account'
import { AppContext } from '../AppContext'
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';

export const CheckWebAuthn = () => {
  const waw = useContext(AppContext)
  const clientConfig: ClientConfig = {
    entryPointAddress: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    bundlerUrl: "http://localhost:9000/rpc",
  }
  const revivePassKeyPair = (x: any):PassKeyKeyPair => {
    return new PassKeyKeyPair(x.keyId, BigNumber.from(x.pubKeyX), BigNumber.from(x.pubKeyY), waw.webAuthnClient, 
                              x.name, x.aaguid, x.manufacturer, x.regTime)
  }
  let entryPoint: EntryPoint;

  const [available, setAvailable] = useState(false)
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
    const initialiseProvider = async () => {
      const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545")
      await provider._ready()
      setProvider(provider)
      const bundlerRPC = new HttpRpcClient(clientConfig.bundlerUrl, clientConfig.entryPointAddress, provider?._network?.chainId)
      setBundlerRPC(bundlerRPC)
    }
    initialiseProvider()
    setAvailable(client.isAvailable())
  }, [])

  useEffect(() => {
    if (provider && bundlerRPC && activeUser) {
      const params: PassKeysAccountApiParams = {
        passKeyPair: activeUser,
        index: BigNumber.from(0),
        factoryAddress: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
        provider: provider,
        entryPointAddress: clientConfig.entryPointAddress,
      }
      const passKeyAPI = new PassKeysAccountApi(params)
      setPassKeyAPI(passKeyAPI)
      passKeyAPI.getAccountAddress().then(x => setErc4337Account(x))
    }
  }, [activeUser])

  useEffect(() => {
    if (passKeyAPI && bundlerRPC && provider) {
      entryPoint = EntryPoint__factory.connect(clientConfig.entryPointAddress, provider)
      const erc4337Provider = new ERC4337EthersProvider(
        provider._network.chainId,
        clientConfig,
        provider.getSigner(),
        provider,
        bundlerRPC,
        entryPoint,
        passKeyAPI
      )
      setErc4337Provider(erc4337Provider)
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
      <h2> Seedless Wallet </h2>
      { available && 
        <Container>
          <Row className='header status'>
            <Col>
              WebAuthn is available
            </Col>
            <Col xs={6}>
              Chain - {provider?._network?.chainId}
            </Col>
          </Row>
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
          { users.length > 0 && 
            <Row className='wallet'>
              {erc4337Provider && erc4337Account && provider && passKeyAPI &&
                <ERC4337Account erc4337Provider={erc4337Provider} jsonRPCProvider={provider} address={erc4337Account} passKeyAPI={passKeyAPI} />
              }
            </Row>
          }
        </Container>
      }
    </Container>
  )
}

export default CheckWebAuthn
import { useEffect, useState, useContext } from 'react'
import { utils } from '@passwordless-id/webauthn'
import { ethers, BigNumber } from 'ethers'
import { ERC4337EthersProvider } from '@account-abstraction/sdk'
import { PassKeysAccount, PassKeysAccount__factory } from '@itsobvioustech/aa-passkeys-wallet'
import { PassKeysAccountApi, PassKeyKeyPair } from '@itsobvioustech/aa-passkeys-client'
import { AppContext } from '../AppContext'
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import ListGroup from 'react-bootstrap/ListGroup';
import Form from 'react-bootstrap/Form';

export type ERC4337AccountProps = {
    erc4337Provider: ERC4337EthersProvider,
    jsonRPCProvider: ethers.providers.JsonRpcProvider,
    passKeyAPI: PassKeysAccountApi,
    address: string,
}
export const ERC4337Account = ( { erc4337Provider, jsonRPCProvider, address, passKeyAPI} : ERC4337AccountProps) => {
    const waw = useContext(AppContext)
    const [balance, setBalance] = useState<BigNumber>(BigNumber.from(0))
    const [stakeBalance, setStakeBalance] = useState<BigNumber>(BigNumber.from(0))
    const [sendAmount, setSendAmount] = useState<string>('')
    const [receiver, setReceiver] = useState<string>('')
    const [passKeysAccount, setPassKeysAccount] = useState<PassKeysAccount>()
    const [authorisedKeys, setAuthorisedKeys] = useState<string[]>([])
    const [passKeyName, setPassKeyName] = useState<string>('')
    const [newPassKey, setNewPassKey] = useState<PassKeyKeyPair>()
    const [txnProgress, setTxnProgress] = useState<boolean>(false)
    const [activeSigner, setActiveSigner] = useState<string>('')
    const [removePassKey, setRemovePassKey] = useState<string>('')

    useEffect(() => {
        const getAccount = async () => {
            const account = PassKeysAccount__factory.connect(address, jsonRPCProvider)
            setPassKeysAccount(account)
        }
        getAccount()
    }, [address])

    useEffect(() => {
        const getSigners = async () => {
            setActiveSigner(passKeyAPI.passKeyPair.keyId)
            const balance = await erc4337Provider.getBalance(address)
            const stakeBalance = await erc4337Provider.entryPoint.balanceOf(address)
            setBalance(balance)
            setStakeBalance(stakeBalance)
            if (passKeysAccount) {
                try{
                    const keys = await passKeysAccount.getAuthorisedKeys()
                    setAuthorisedKeys(keys)
                } catch (e: any) {
                    setAuthorisedKeys([])
                    console.log("Error fetching signers - account not deployed?", e.message)
                }
            }
        }
        getSigners()
    }, [passKeysAccount, txnProgress])

    const send = () => {
        if (sendAmount && receiver) {
            const execute = async () => {
                setTxnProgress(true)
                let eth = ethers.utils.parseEther(sendAmount)
                let signer = erc4337Provider.getSigner()
                let txn = await signer.sendTransaction({
                    to: receiver,
                    value: eth,
                    data: "0x",
                })
                console.log("Transaction : ", txn)
                console.log("Transaction hash : ", txn.hash)
                let receipt = await txn.wait()
                console.log("Transaction receipt : ", receipt)
                setBalance(await erc4337Provider.getBalance(address))
                setStakeBalance(await erc4337Provider.entryPoint.balanceOf(address))
                setTxnProgress(false)
            }
            execute()
        }
    }

    const createPassKey = async () => {
        const passKey = await waw.registerPassKey(utils.randomChallenge(), passKeyName)
        setNewPassKey(passKey)
    }

    const addPassKey = async () => {
        if (newPassKey && passKeysAccount) {
            const execute = async () => {
                setTxnProgress(true)
                let signer = erc4337Provider.getSigner()
                let txn = await signer.sendTransaction({
                    to: address,
                    data: passKeysAccount.interface.encodeFunctionData("addPassKey", [newPassKey.keyId, newPassKey.pubKeyX, newPassKey.pubKeyY]),
                })
                console.log("Transaction : ", txn)
                console.log("Transaction hash : ", txn.hash)
                let receipt = await txn.wait()
                console.log("Transaction receipt : ", receipt)
                setBalance(await erc4337Provider.getBalance(address))
                setStakeBalance(await erc4337Provider.entryPoint.balanceOf(address))
                setTxnProgress(false)
                setNewPassKey(undefined)
            }
            execute()
        }
    }

    const executeRemovePassKey = async () => {
        if (removePassKey && passKeysAccount && authorisedKeys.includes(removePassKey) && removePassKey !== activeSigner) {
            const execute = async () => {
                setTxnProgress(true)
                let signer = erc4337Provider.getSigner()
                let txn = await signer.sendTransaction({
                    to: address,
                    data: passKeysAccount.interface.encodeFunctionData("removePassKey", [removePassKey]),
                })
                console.log("Transaction : ", txn)
                console.log("Transaction hash : ", txn.hash)
                let receipt = await txn.wait()
                console.log("Transaction receipt : ", receipt)
                setBalance(await erc4337Provider.getBalance(address))
                setStakeBalance(await erc4337Provider.entryPoint.balanceOf(address))
                setTxnProgress(false)
                setNewPassKey(undefined)
            }
            execute()
        }
    }

    const changePassKeyPair = async (keyId: string) => {
        passKeyAPI.changePassKeyPair(new PassKeyKeyPair(keyId, BigNumber.from(0), BigNumber.from(0), waw.webAuthnClient))
        setActiveSigner(passKeyAPI.passKeyPair.keyId)
    }

    return(
        <Container className='account'>
            <Row>
                <p>Address: {address}</p>
            </Row>
            <Row>
                <Col>
                    <div className='balances'>
                        <p>Balance: { ethers.utils.formatEther(balance) }Ξ</p>
                        <p>Stake Balance: { ethers.utils.formatEther(stakeBalance) }Ξ</p>
                        <Row>
                            <Col>
                                <Form.Control type="text" placeholder="Amount" value={ sendAmount } onChange={ e => setSendAmount(e.target.value) } />
                            </Col>
                            <Col>
                                <Form.Control type="text" placeholder="Receiver" value={ receiver } onChange={ e=> setReceiver(e.target.value) } />
                            </Col>
                        </Row>
                        <Row>
                            <Col>
                                <Button onClick={ send } disabled={ txnProgress || !authorisedKeys.includes(activeSigner) 
                                    || sendAmount.length == 0 || receiver.length == 0 || !ethers.utils.isAddress(receiver) }> Send </Button>
                            </Col>
                        </Row>
                    </div>
                </Col>
                <Col>
                    <Container className='management'>
                        <Row>
                            Active Signer - {activeSigner}
                        </Row>
                        <Row>
                        { authorisedKeys.length > 0 && 
                            <Container className='signers'>
                                <Row>
                                    <Col xs={3}>Other Signers</Col>
                                    <Col className='passkey-id'>
                                        <ListGroup>
                                            { authorisedKeys.map( (key, index) => <ListGroup.Item key={index}>{key}</ListGroup.Item>) }
                                        </ListGroup>
                                    </Col>
                                </Row>
                                { authorisedKeys.length > 1 &&
                                    <Row className='section change-signer'>
                                        <Col xs={3}>Change Signer</Col>
                                        <Col className='passkey-id'>
                                            <Form.Select onChange={ e => changePassKeyPair(e.target.value) } defaultValue={passKeyAPI.passKeyPair.keyId} size="sm">
                                                { authorisedKeys.map( (key, index) => <option key={index}>{key}</option>) }
                                            </Form.Select>
                                        </Col>
                                    </Row>
                                }
                                <Row>
                                    <Col xs={3}>Add Signer</Col>
                                    <Col className='section add-signer'>
                                        <Form.Control size="sm" type="text" placeholder="PassKey Name" onChange={ e => setPassKeyName(e.target.value)} value={ passKeyName } />
                                        <Button onClick={ createPassKey } disabled={(passKeyName?.length == 0 || newPassKey) ? true : false }>Create PassKey 🔐 </Button>
                                        { newPassKey && !newPassKey.pubKeyX.isZero() && !newPassKey.pubKeyY.isZero() &&
                                            <div>
                                                <br/>
                                                <Button onClick={ addPassKey } disabled={ txnProgress }>Add 🔏 - { newPassKey.name }</Button>
                                            </div>
                                        }
                                    </Col>
                                </Row>
                                { authorisedKeys.length > 1 &&
                                    <Row className='section remove-signer'>
                                        <Col xs={3}>Remove Signer</Col>
                                        <Col>
                                            <Col>
                                                <Form.Select onChange={ e => setRemovePassKey(e.target.value) } size="sm">
                                                    { authorisedKeys
                                                        .filter(x => x != activeSigner)
                                                        .map( (key, index) => <option key={index}>{key}</option>) }
                                                </Form.Select>
                                            </Col>
                                            <Col>
                                                <Button onClick={ executeRemovePassKey } disabled={ txnProgress }> Remove 🔐 </Button>
                                            </Col>
                                        </Col>
                                    </Row>
                                }
                            </Container>
                        }
                        </Row>
                    </Container>
                </Col>
            </Row>
        </Container>
    )
}

export default ERC4337Account
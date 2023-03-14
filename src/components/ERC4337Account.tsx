import React, { useEffect, useState, useContext } from 'react'
import { utils } from '@passwordless-id/webauthn'
import { ethers, BigNumber } from 'ethers'
import { UserOperationStruct } from '@account-abstraction/contracts'
import { ERC4337EthersProvider } from '@account-abstraction/sdk'
import { PassKeysAccount, PassKeysAccount__factory } from '@itsobvioustech/aa-passkeys-wallet'
import { PassKeysAccountApi, PassKeyKeyPair } from '@itsobvioustech/aa-passkeys-client'
import { AppContext, KnownUsers } from '../AppContext'
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import ListGroup from 'react-bootstrap/ListGroup';
import Form from 'react-bootstrap/Form';
import Spinner from 'react-bootstrap/Spinner';
import Toast from 'react-bootstrap/Toast';
import { FaAddressCard } from 'react-icons/fa'
import { MdSend, MdKey, MdKeyOff } from 'react-icons/md'

export type ERC4337AccountProps = {
    erc4337Provider: ERC4337EthersProvider,
    jsonRPCProvider: ethers.providers.JsonRpcProvider,
    passKeyAPI: PassKeysAccountApi,
    address: string,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
}
export const ERC4337Account = ( { erc4337Provider, jsonRPCProvider, address, passKeyAPI, setLoading} : ERC4337AccountProps) => {
    const waw = useContext(AppContext)
    const knownUsers = useContext(KnownUsers)
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
    const [showToast, setShowToast] = useState(false)
    const [toastMessage, setToastMessage] = useState("")
    const [toastStyle, setToastStyle] = useState("success")

    const txnProgressCallback = (userop: UserOperationStruct, state: string) => {
        setShowToast(true)
        switch (state) {
            case "pre_sign":
                setToastMessage("Please sign transaction with your passkey")
                break
            default:
                console.log("Transaction state : ", state, userop)
        }
    }

    const displayToast = (message: string):void => {
        setToastStyle("success")
        setShowToast(true)
        setToastMessage(message)
    }

    const displayErrorToast = (message: string):void => {
        setToastStyle("danger")
        setShowToast(true)
        setToastMessage(message)
    }

    const displayTxnReceipt = (message: ethers.providers.TransactionReceipt):void => {
        displayToast("Transaction succeded  Block - " + 
        message.blockHash + 
        " Block Number - " +
        message.blockNumber +
        " Transaction - " + 
        message.transactionHash)
    }
  
    useEffect(() => {
        const getAccount = async () => {
            const account = PassKeysAccount__factory.connect(address, jsonRPCProvider)
            setPassKeysAccount(account)
        }
        getAccount()
    }, [address])

    useEffect(() => {
        passKeyAPI.setTxnProgressCallback(txnProgressCallback)
        const getSigners = async () => {
            setLoading(true)
            setActiveSigner(passKeyAPI.passKeyPair.keyId)
            const balance = await erc4337Provider.getBalance(address)
            const stakeBalance = await erc4337Provider.entryPoint.balanceOf(address)
            setBalance(balance)
            setStakeBalance(stakeBalance)
            if (passKeysAccount) {
                setRemovePassKey('')
                try{
                    const keys = await passKeysAccount.getAuthorisedKeys()
                    if (!(activeSigner in keys)){
                        const knownPassKey = knownUsers.find((user) => user.keyId in keys)
                        if (knownPassKey) {
                            changePassKeyPair(knownPassKey)
                        } else {
                            changePassKeyPair(keys[0])
                        }
                    }
                    setAuthorisedKeys(keys)
                } catch (e: any) {
                    setAuthorisedKeys([])
                }
            }
            setLoading(false)
        }
        getSigners()
    }, [passKeysAccount, txnProgress])

    const send = () => {
        if (sendAmount && receiver) {
            const execute = async () => {
                setTxnProgress(true)
                try{
                    let eth = ethers.utils.parseEther(sendAmount)
                    let signer = erc4337Provider.getSigner()
                    let txn = await signer.sendTransaction({
                        to: receiver,
                        value: eth,
                        data: "0x",
                        gasLimit: 40000,
                    })
                    console.log("Transaction : ", txn)
                    displayToast("Signed transaction hash - " + txn.hash)
                    console.log("Transaction hash : ", txn.hash)
                    let receipt = await erc4337Provider.waitForTransaction(txn.hash, 1, 60000)
                    console.log("Transaction receipt : ", receipt)
                    displayTxnReceipt(receipt)
                    setBalance(await erc4337Provider.getBalance(address))
                    setStakeBalance(await erc4337Provider.entryPoint.balanceOf(address))
                    setSendAmount('')
                    setReceiver('')    
                } catch (e: any) {
                    console.log("Error waiting for transaction : ", e.message)
                    displayErrorToast("Transaction failed  - " + e.message)
                }
                setTxnProgress(false)
            }
            execute()
        }
    }

    const createPassKey = async () => {
        const passKey = await waw.registerPassKey(utils.randomChallenge(), passKeyName)
        setNewPassKey(passKey)
        setPassKeyName('')
    }

    const addPassKey = async () => {
        if (newPassKey && passKeysAccount) {
            const execute = async () => {
                setTxnProgress(true)
                try{
                    let signer = erc4337Provider.getSigner()
                    let txn = await signer.sendTransaction({
                        to: address,
                        data: passKeysAccount.interface.encodeFunctionData("addPassKey", [newPassKey.keyId, newPassKey.pubKeyX, newPassKey.pubKeyY]),
                    })
                    console.log("Transaction : ", txn)
                    displayToast("Signed transaction hash - " + txn.hash)
                    console.log("Transaction hash : ", txn.hash)
                    let receipt = await erc4337Provider.waitForTransaction(txn.hash, 1, 60000)
                    console.log("Transaction receipt : ", receipt)
                    displayTxnReceipt(receipt)
                    setBalance(await erc4337Provider.getBalance(address))
                    setStakeBalance(await erc4337Provider.entryPoint.balanceOf(address))
                    setNewPassKey(undefined)    
                } catch (e: any) {
                    console.log("Error waiting for transaction : ", e.message)
                    displayErrorToast("Transaction failed  - " + e.message)
                }
                setTxnProgress(false)
            }
            execute()
        }
    }

    const executeRemovePassKey = async () => {
        if (removePassKey && passKeysAccount && authorisedKeys.includes(removePassKey) && removePassKey !== activeSigner) {
            const execute = async () => {
                setTxnProgress(true)
                try{
                    let signer = erc4337Provider.getSigner()
                    let txn = await signer.sendTransaction({
                        to: address,
                        data: passKeysAccount.interface.encodeFunctionData("removePassKey", [removePassKey]),
                    })
                    console.log("Transaction : ", txn)
                    displayToast("Signed transaction hash - " + txn.hash)
                    console.log("Transaction hash : ", txn.hash)
                    let receipt = await erc4337Provider.waitForTransaction(txn.hash, 1, 60000)
                    console.log("Transaction receipt : ", receipt)
                    displayTxnReceipt(receipt)
                    setBalance(await erc4337Provider.getBalance(address))
                    setStakeBalance(await erc4337Provider.entryPoint.balanceOf(address))
                    setNewPassKey(undefined)    
                } catch (e: any) {
                    console.log("Error waiting for transaction : ", e.message)
                    displayErrorToast("Transaction failed  - " + e.message)
                }
                setTxnProgress(false)
            }
            execute()
        }
    }

    const changePassKeyPair = async (keyId: string | PassKeyKeyPair) => {
        if (keyId instanceof PassKeyKeyPair) {
            passKeyAPI.changePassKeyPair(keyId)
            setActiveSigner(keyId.keyId)
        } else {
            passKeyAPI.changePassKeyPair(new PassKeyKeyPair(keyId, BigNumber.from(0), BigNumber.from(0), waw.webAuthnClient))
            setActiveSigner(passKeyAPI.passKeyPair.keyId)
        }
    }

    return(
        <Container className='account'>
            <Row xs={12}>
                <p className='address'><FaAddressCard /> {address}</p>
            </Row>
            <Row>
                <Col>
                    <div className='balances'>
                        <p>Balance: { ethers.utils.formatEther(balance) }Ξ</p>
                        <p>Stake Balance: { ethers.utils.formatEther(stakeBalance) }Ξ</p>
                        <Row>
                            <Col xs={4}>
                                <Form.Control type="text" placeholder="Amount" value={ sendAmount } onChange={ e => setSendAmount(e.target.value) } />
                            </Col>
                            <Col xs={4}>
                                <Form.Control type="text" placeholder="Receiver" value={ receiver } onChange={ e=> setReceiver(e.target.value) } />
                            </Col>
                            <Col xs={4}>
                                <Button onClick={ send } disabled={ txnProgress || (authorisedKeys.length>0 && !authorisedKeys.includes(activeSigner) )
                                    || sendAmount.length == 0 || receiver.length == 0 || !ethers.utils.isAddress(receiver) }> 
                                    <Spinner
                                        as="span"
                                        animation="grow"
                                        size="sm"
                                        role="status"
                                        aria-hidden="true"
                                        hidden={!txnProgress}
                                    /> Send <MdSend />
                                </Button>
                            </Col>
                        </Row>
                    </div>
                </Col>
                <Col>
                    <Container className='management'>
                        <Row>
                            <Col xs={3}>Active Signer</Col>
                            <Col> {activeSigner} </Col>
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
                                        <Row>
                                        <Col xs={8}>
                                        <Form.Control size="sm" type="text" placeholder="PassKey Name" onChange={ e => setPassKeyName(e.target.value)} value={ passKeyName } />
                                        </Col>
                                        <Col xs={4}>
                                        <Button onClick={ createPassKey } disabled={(passKeyName?.length == 0 || newPassKey) ? true : false }>Create <MdKey /> </Button>
                                        </Col>
                                        </Row>
                                        { newPassKey && !newPassKey.pubKeyX.isZero() && !newPassKey.pubKeyY.isZero() &&
                                            <Row>
                                                <Col xs={{ span:8, offset:4}}>
                                                <Button onClick={ addPassKey } disabled={ txnProgress }>
                                                    Add <MdKey /> - { newPassKey.name }
                                                </Button>
                                                </Col>
                                            </Row>
                                        }
                                    </Col>
                                </Row>
                                { authorisedKeys.length > 1 &&
                                    <Row className='section remove-signer'>
                                        <Col xs={3}>Remove Signer</Col>
                                        <Col>
                                        <Row>
                                            <Col xs={8}>
                                            <Form.Select onChange={ e => setRemovePassKey(e.target.value) } size="sm">
                                                    <option key=''>Pick a key to remove</option>
                                                    { authorisedKeys
                                                        .filter(x => x != activeSigner)
                                                        .map( (key, index) => <option key={index}>{key}</option>) }
                                            </Form.Select>
                                            </Col>
                                            <Col xs={4}>
                                            <Button onClick={ executeRemovePassKey } disabled={ txnProgress || removePassKey?.length == 0 }> Remove <MdKeyOff /> </Button>
                                            </Col>
                                        </Row>
                                        </Col>
                                    </Row>
                                }
                            </Container>
                        }
                        </Row>
                    </Container>
                </Col>
            </Row>
            <br/>
            <Row>
                <Col xs={8}>
                <Toast onClose={() => setShowToast(false)} show={showToast} delay={15000} bg={toastStyle} autohide>
                    <Toast.Header>
                    <strong className="me-auto">Txn Update</strong>
                    </Toast.Header>
                    <Toast.Body>{toastMessage}</Toast.Body>
                </Toast>
                </Col>
            </Row>
        </Container>
    )
}

export default ERC4337Account
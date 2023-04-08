import React, { useEffect, useState, useContext } from 'react'
import { utils } from '@passwordless-id/webauthn'
import { ethers, BigNumber, Contract } from 'ethers'
import { UserOperationStruct } from '@account-abstraction/contracts'
import { PassKeysAccount, PassKeysAccount__factory } from '@itsobvioustech/aa-passkeys-wallet'
import { PassKeysAccountApi, PassKeyKeyPair, PassKeysProvider, BundlerRPClient } from '@itsobvioustech/aa-passkeys-client'
import { AppContext, KnownUsers, AppConfigContext } from '../AppContext'
import { TxnUpdate } from './TxnUpdate'
import { Button, Container, Row, Col, ListGroup, Form, Spinner, Toast, Modal, Accordion } from 'react-bootstrap';
import { HiOutlineExternalLink } from 'react-icons/hi'
import { FaAddressCard } from 'react-icons/fa'
import { MdSend, MdKey, MdKeyOff, MdRefresh } from 'react-icons/md'
import { PassKeyIdStructOutput } from '@itsobvioustech/aa-passkeys-wallet/build/typechain-types/IPassKeysAccount'
import { ERC20Tokens } from './ERC20Tokens'
import ERC20TokenABI from "@openzeppelin/contracts/build/contracts/ERC20.json"

export type ERC4337AccountProps = {
    passKeysProvider: PassKeysProvider,
    jsonRPCProvider: ethers.providers.JsonRpcProvider,
    passKeyAPI: PassKeysAccountApi,
    address: string,
    incrementLoader: () => void,
    decrementLoader: () => void,
}
export const ERC4337Account = ( { passKeysProvider, jsonRPCProvider, address, passKeyAPI, incrementLoader, decrementLoader} : ERC4337AccountProps) => {
    const waw = useContext(AppContext)
    const knownUsers = useContext(KnownUsers)
    const currentNetwork = useContext(AppConfigContext)
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
    const [reloadPassKeyAccount, setReloadPassKeyAccount] = useState<string>("")
    const [bundlerRPCClient, setBundlerRPCClient] = useState<BundlerRPClient>(new BundlerRPClient(currentNetwork.bundlerUrl, currentNetwork.chainId))
    const [currentTransaction, setCurrentTransaction] = useState<Promise<ethers.providers.TransactionResponse>>()
    const [show, setShow] = useState(false)

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

    useEffect(() => {
        setBundlerRPCClient(new BundlerRPClient(currentNetwork.bundlerUrl, currentNetwork.chainId))
    }, [currentNetwork])
  
    useEffect(() => {
        const getAccount = async () => {
            const account = PassKeysAccount__factory.connect(address, jsonRPCProvider)
            setPassKeysAccount(account)
        }
        getAccount()
    }, [address, jsonRPCProvider])

    useEffect(() => {
        passKeyAPI.setTxnProgressCallback(txnProgressCallback)
        const getSigners = async () => {
            incrementLoader()
            setActiveSigner(passKeyAPI.passKeyPair.keyId)
            if (passKeysAccount) {
                setRemovePassKey('')
                try{
                    const keys = await passKeysAccount.getAuthorisedKeys()
                    const passKeyIds = keys.map(x => x.keyId)
                    if (!(passKeyIds.includes(activeSigner))){
                        const knownPassKey = knownUsers.find((user) => passKeyIds.includes(user.keyId))
                        if (knownPassKey) {
                            changePassKeyPair(knownPassKey)
                        } else {
                            changePassKeyPairFromContract(keys[0])
                        }
                    }
                    setAuthorisedKeys(passKeyIds)
                } catch (e: any) {
                    setAuthorisedKeys([])
                }
            }
            decrementLoader()
        }
        getSigners()
    }, [passKeysAccount, reloadPassKeyAccount])

    useEffect(() => {
        refreshBalances()
    }, [passKeysProvider, address])

    useEffect(() => {
        passKeyAPI.setTxnProgressCallback(txnProgressCallback)
        if (txnProgress === false) refreshBalances()
    }, [txnProgress])

    const refreshBalances = async () => {
        incrementLoader()
        const balance = await passKeysProvider.getBalance(address)
        const stakeBalance = await passKeysProvider.entryPoint.balanceOf(address)
        setBalance(balance)
        setStakeBalance(stakeBalance)
        setReloadPassKeyAccount(Date.now().toString())
        decrementLoader()
    }

    const trackTransaction = async (transaction: Promise<ethers.providers.TransactionResponse>): Promise<string> => {
        setCurrentTransaction(transaction)
        const txn = await transaction
        let receipt = await passKeysProvider.waitForTransaction(txn.hash, 1, 60000)
        let chainHash = await bundlerRPCClient.getUserOpReceipt(receipt.transactionHash)
        displayToast("Transaction complete")
        return chainHash?.receipt?.transactionHash
    }

    const send = () => {
        if (sendAmount && receiver) {
            const execute = async () => {
                try{
                    setTxnProgress(true)
                    let eth = ethers.utils.parseEther(sendAmount)
                    let signer = passKeysProvider.getSigner()
                    let txn = signer.sendTransaction({
                        to: receiver,
                        value: eth,
                        data: "0x",
                        gasLimit: 40000,
                    })
                    const txnHash = await trackTransaction(txn)
                    setSendAmount('')
                    setReceiver('')
                } catch (e: any) {
                    console.log("Error waiting for transaction : ", e.message)
                    displayErrorToast("Transaction failed  - " + e.message)
                }
                setTxnProgress(false)
                setShow(false)
            }
            execute()
        }
    }

    const sendERC20 = (token: string, to: string, amount: BigNumber) => {
        const execute = async () => {
            try{
                setTxnProgress(true)
                let signer = passKeysProvider.getSigner()
                const contract = new Contract(token, ERC20TokenABI.abi, jsonRPCProvider)
                let txn = signer.sendTransaction({
                    to: token,
                    data: contract.interface.encodeFunctionData("transfer", [to, amount]),
                    gasLimit: 90000,
                })
                const txnHash = await trackTransaction(txn)
            } catch (e: any) {
                console.log("Error waiting for transaction : ", e.message)
                displayErrorToast("Transaction failed  - " + e.message)
            }
            setTxnProgress(false)
        }
        execute()
    }

    const createPassKey = async () => {
        const passKey = await waw.registerPassKey(utils.randomChallenge(), passKeyName)
        setNewPassKey(passKey)
        setPassKeyName('')
    }

    const addPassKey = async () => {
        if (newPassKey && passKeysAccount) {
            const execute = async () => {
                try{
                    setTxnProgress(true)
                    let signer = passKeysProvider.getSigner()
                    let txn = signer.sendTransaction({
                        to: address,
                        data: passKeysAccount.interface.encodeFunctionData("addPassKey", [newPassKey.keyId, newPassKey.pubKeyX, newPassKey.pubKeyY]),
                    })
                    const txnHash = await trackTransaction(txn)
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
                try{
                    setTxnProgress(true)
                    let signer = passKeysProvider.getSigner()
                    let txn = signer.sendTransaction({
                        to: address,
                        data: passKeysAccount.interface.encodeFunctionData("removePassKey", [removePassKey]),
                    })
                    const txnHash = await trackTransaction(txn)
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

    const changePassKeyPairFromContract = async (keyId: PassKeyIdStructOutput) => {
        passKeyAPI.changePassKeyPair(new PassKeyKeyPair(keyId.keyId, keyId.pubKeyX, keyId.pubKeyY, waw))
        setActiveSigner(keyId.keyId)
    }

    const changePassKeyPair = async (keyId: string | PassKeyKeyPair) => {
        if (keyId instanceof PassKeyKeyPair) {
            passKeyAPI.changePassKeyPair(keyId)
            setActiveSigner(keyId.keyId)
        } else {
            passKeyAPI.changePassKeyPair(new PassKeyKeyPair(keyId, BigNumber.from(0), BigNumber.from(0), waw))
            setActiveSigner(passKeyAPI.passKeyPair.keyId)
        }
    }
    const handleClose = () => setShow(false);

    return(
        <Container className='account'>
            <Row className="justify-content-md-center">
                <Col xs={12} className='address'>
                    <MdRefresh onClick={ refreshBalances } className='refresh' />
                    {currentNetwork.explorerUrl &&
                        <a href={currentNetwork.explorerUrl + 'address/' + address} target='_blank'><HiOutlineExternalLink /></a>
                    }
                    <FaAddressCard /> {address}
                </Col>
            </Row>
            <Row className='balances'>
                <Col xs={12} md={6}>
                    <Modal show={show} onHide={handleClose}>
                        <Modal.Header closeButton>
                            <Modal.Title>Send Native Token </Modal.Title>
                        </Modal.Header>
                        <Modal.Body className="native-token-send">
                            <Form.Control type="text" placeholder="To Address" value={ receiver } onChange={ e => setReceiver(e.target.value) } />
                            <Form.Control type="text" placeholder={"Amount (max " + ethers.utils.formatEther(balance) + ")"} value={ sendAmount } onChange={ e => setSendAmount(e.target.value) } />
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={handleClose}>
                                Cancel
                            </Button>
                            <Button variant="primary" onClick={ send } disabled={ txnProgress || (authorisedKeys.length>0 && !authorisedKeys.includes(activeSigner) )
                                    || sendAmount.length === 0 || receiver.length === 0 || !ethers.utils.isAddress(receiver) }>
                                <Spinner
                                    as="span"
                                    animation="grow"
                                    size="sm"
                                    role="status"
                                    aria-hidden="true"
                                    hidden={!txnProgress}
                                />
                                Send <MdSend />
                            </Button>
                        </Modal.Footer>
                    </Modal>
                    <Row>
                        <Col xs={12} className="balance-header">Native Token Balance</Col> 
                        <Col xs={11}>Balance: { ethers.utils.formatEther(balance) }Ξ</Col>
                        <Col xs={11}>Stake Balance: { ethers.utils.formatEther(stakeBalance) }Ξ</Col>
                        <Col xs={1}> <MdSend onClick={() => setShow(true)} /></Col>
                    </Row>
                </Col>
                <Col xs={12} md={6}>
                    <Row>
                        <ERC20Tokens jsonRPCProvider={jsonRPCProvider} address={address} tokenSender={sendERC20} reloadPassKeyAccount={reloadPassKeyAccount} />
                    </Row>
                </Col>
            </Row>
            <br/>
            <Row>
                <Col xs={12} md={12}>
                    <Accordion>
                        <Accordion.Item eventKey="0">
                            <Accordion.Header>PassKey Signer Management</Accordion.Header>
                            <Accordion.Body>
                                <Container className='management'>
                                    <Row>
                                        <Col xs={3}>Active Signer</Col>
                                        <Col xs={9} className='signer-hash'> {activeSigner} </Col>
                                    </Row>
                                    <Row>
                                    { authorisedKeys.length > 0 && 
                                        <Container className='signers'>
                                            <Row>
                                                <Col xs={3}>Other Signers</Col>
                                                <Col className='passkey-id signer-hash'>
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
                                                    <Button onClick={ createPassKey } disabled={(passKeyName?.length === 0 || newPassKey) ? true : false }>Create <MdKey /> </Button>
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
                                                                    .filter(x => x !== activeSigner)
                                                                    .map( (key, index) => <option key={index}>{key}</option>) }
                                                        </Form.Select>
                                                        </Col>
                                                        <Col xs={4}>
                                                        <Button onClick={ executeRemovePassKey } disabled={ txnProgress || removePassKey?.length === 0 }> Remove <MdKeyOff /> </Button>
                                                        </Col>
                                                    </Row>
                                                    </Col>
                                                </Row>
                                            }
                                        </Container>
                                    }
                                    </Row>
                                </Container>
                            </Accordion.Body>
                        </Accordion.Item>
                    </Accordion>
                </Col>
            </Row>
            <br/>
            <Row className='TxnUpdate'>
                <Col xs={12} md={8}>
                    <Accordion defaultActiveKey="0">
                        <Accordion.Item eventKey="0">
                            <Accordion.Header>Transaction Status</Accordion.Header>
                            <Accordion.Body>
                                <TxnUpdate tx={currentTransaction} passKeyProvider={passKeysProvider} bundlerRPCClient={bundlerRPCClient} />
                            </Accordion.Body>
                        </Accordion.Item>
                    </Accordion>
                </Col>
                <Col xs={12} md={4} className="justify-content-md-center">
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
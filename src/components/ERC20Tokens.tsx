import { Col, Container, Row, Modal, Button, Form } from "react-bootstrap"
import { AppConfigContext } from "../AppContext"
import { useContext, useEffect, useState } from "react"
import { ethers, Contract, BigNumber, utils } from "ethers"
import ERC20TokenABI from "@openzeppelin/contracts/build/contracts/ERC20.json"
import { MdSend } from 'react-icons/md'
export type ERC20TokensProps = {
    // TODO
    jsonRPCProvider: ethers.providers.JsonRpcProvider,
    address: string,
    reloadPassKeyAccount: string,
    tokenSender: (tokenAddress: string, to: string, amount: BigNumber) => void,
}
export const ERC20Tokens = ( {jsonRPCProvider, address, tokenSender, reloadPassKeyAccount} : ERC20TokensProps) => {
    const currentNetwork = useContext(AppConfigContext)
    const [show, setShow] = useState(false)
    const [tokenAddress, setTokenAddress] = useState<string>('')
    const [tokenName, setTokenName] = useState<string>('')
    const [tokenDecimals, setTokenDecimals] = useState<number>(0)
    const [tokenBalance, setTokenBalance] = useState<BigNumber>(BigNumber.from(0))
    const [sendAmount, setSendAmount] = useState<string>('')
    const [receiver, setReceiver] = useState<string>('')

    const handleClose = () => setShow(false);
    const handleShow = (tokenAddress: string, tokenBalance: BigNumber, tokenName?: string, decimals?: number) => {
        setTokenAddress(tokenAddress)
        setTokenBalance(tokenBalance)
        setTokenName(tokenName? tokenName : '')
        setTokenDecimals(decimals? decimals : 18)
        setSendAmount('')
        setReceiver('')
        setShow(true)
    };
  
    return (
        <Container>
            <Modal show={show} onHide={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>Send - {tokenName} </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Control type="text" placeholder="To Address" value={ receiver } onChange={ e => setReceiver(e.target.value) } />
                    <Form.Control type="text" placeholder="Amount" value={ sendAmount } onChange={ e => setSendAmount(e.target.value) } />
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={() => {
                            if (!tokenAddress || !receiver || !sendAmount) {
                                return
                            }
                            if (utils.isAddress(receiver) && utils.parseUnits(sendAmount, tokenDecimals).lte(tokenBalance)) {
                                tokenSender(tokenAddress, receiver, utils.parseUnits(sendAmount, tokenDecimals));
                                handleClose()
                            }
                        }}>
                        Send <MdSend />
                    </Button>
                </Modal.Footer>
            </Modal>
            {currentNetwork.erc20Tokens &&
                <Row>
                    <Row> Token Balances </Row>
                    {currentNetwork.erc20Tokens.map(tokenAddress => 
                        <ERC20Token key={tokenAddress} tokenAddress={tokenAddress} jsonRPCProvider={jsonRPCProvider} reloadPassKeyAccount={reloadPassKeyAccount}
                        address={address} tokenSender={tokenSender} handleShow={handleShow}/>
                    )}
                </Row>
            }
        </Container>
    )
}
const getBalance = async (tokenAddress: string, jsonRPCProvider: ethers.providers.JsonRpcProvider, address: string) => {
    const contract = new Contract(tokenAddress, ERC20TokenABI.abi, jsonRPCProvider)
    const balance = await contract.balanceOf(address)
    return balance
}
const getDecimals = async (tokenAddress: string, jsonRPCProvider: ethers.providers.JsonRpcProvider) => {
    const contract = new Contract(tokenAddress, ERC20TokenABI.abi, jsonRPCProvider)
    const decimals = await contract.decimals()
    return decimals
}
const getTokenName = async (tokenAddress: string, jsonRPCProvider: ethers.providers.JsonRpcProvider) => {
    const contract = new Contract(tokenAddress, ERC20TokenABI.abi, jsonRPCProvider)
    const name = await contract.name()
    return name
}
const getTokenSymbol = async (tokenAddress: string, jsonRPCProvider: ethers.providers.JsonRpcProvider) => {
    const contract = new Contract(tokenAddress, ERC20TokenABI.abi, jsonRPCProvider)
    const symbol = await contract.symbol()
    return symbol
}

export type ERC20TokenProps = {
    tokenAddress: string,
    jsonRPCProvider: ethers.providers.JsonRpcProvider,
    address: string,
    reloadPassKeyAccount: string,
    tokenSender: (tokenAddress: string, to: string, amount: BigNumber) => void,
    handleShow: (tokenAddress: string, tokenBalance: BigNumber, tokenName?: string, decimals?: number) => void,
}
export const ERC20Token = ( {tokenAddress, jsonRPCProvider, address, tokenSender, handleShow, reloadPassKeyAccount} : ERC20TokenProps) => {
    const [balance, setBalance] = useState<BigNumber>(BigNumber.from(0))
    const [decimals, setDecimals] = useState<number>(18)
    const [tokenName, setTokenName] = useState<string | undefined>(undefined)
    const [tokenSymbol, setTokenSymbol] = useState<string | undefined>(undefined)

    useEffect(() => {
        const fetchMetadata = async () => {
            const decimals = await getDecimals(tokenAddress, jsonRPCProvider)
            setDecimals(decimals)
            const name = await getTokenName(tokenAddress, jsonRPCProvider)
            setTokenName(name)
            const symbol = await getTokenSymbol(tokenAddress, jsonRPCProvider)
            setTokenSymbol(symbol)
        }
        fetchMetadata()
    }, [tokenAddress, jsonRPCProvider])

    useEffect(() => {
        const fetchBalance = async () => {
            const balance = await getBalance(tokenAddress, jsonRPCProvider, address)
            setBalance(balance)
        }
        fetchBalance()
    }, [tokenAddress, jsonRPCProvider, address, reloadPassKeyAccount])

    return (
        <Row>
            <Col>{tokenName}</Col>
            <Col>{tokenSymbol}</Col>
            <Col>{utils.formatUnits(balance, decimals)}</Col>
            <Col>{balance.gt(0) && <MdSend onClick={ () => handleShow(tokenAddress, balance, tokenName, decimals) }/>}</Col>
        </Row>
    )
}

export default ERC20Tokens
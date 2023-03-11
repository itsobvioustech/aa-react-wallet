import { useEffect, useState } from 'react'
import { ethers, BigNumber } from 'ethers'
import { ERC4337EthersProvider, ClientConfig, HttpRpcClient } from '@account-abstraction/sdk'

export type ERC4337AccountProps = {
    erc4337Provider: ERC4337EthersProvider,
    jsonRPCProvider: ethers.providers.JsonRpcProvider,
    address: string,
}
export const ERC4337Account = ( { erc4337Provider, jsonRPCProvider, address} : ERC4337AccountProps) => {
    const [balance, setBalance] = useState<BigNumber>(BigNumber.from(0))
    const [stakeBalance, setStakeBalance] = useState<BigNumber>(BigNumber.from(0))
    const [sendAmount, setSendAmount] = useState<string>('')
    const [receiver, setReceiver] = useState<string>('')

    useEffect(() => {
        const getBalance = async () => {
            const balance = await erc4337Provider.getBalance(address)
            const stakeBalance = await erc4337Provider.entryPoint.balanceOf(address)
            setBalance(balance)
            setStakeBalance(stakeBalance)
        }
        getBalance()
    }, [address])

    const send = () => {
        if (sendAmount && receiver) {
            const execute = async () => {
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
            }
            execute()
        }
    }

    return(
        <div>
            <h3>ERC4337 Account</h3>
            <p>Address: {address}</p>
            <p>Balance: { ethers.utils.formatEther(balance) }Ξ</p>
            <p>Stake Balance: { ethers.utils.formatEther(stakeBalance) }Ξ</p>
            <div>
                <input type="text" placeholder="Amount" value={ sendAmount } onChange={ e => setSendAmount(e.target.value) } />
                <input type="text" placeholder="Receiver" value={ receiver } onChange={ e=> setReceiver(e.target.value) } />
                <button onClick={ send }> Send </button>
            </div>
        </div>
    )
}

export default ERC4337Account
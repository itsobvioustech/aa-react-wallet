import React, { useEffect, useState, useContext } from 'react'

import { ethers } from 'ethers'
import { BundlerRPClient, PassKeysProvider } from '@itsobvioustech/aa-passkeys-client'
import { Row, Col } from 'react-bootstrap'
import { AppConfigContext } from '../AppContext'
export type TxnUpdateProps = {
    tx?: Promise<ethers.providers.TransactionResponse>
    passKeyProvider: PassKeysProvider
    bundlerRPCClient: BundlerRPClient
}

export const TxnUpdate = ( {tx, passKeyProvider, bundlerRPCClient} : TxnUpdateProps) => {
    const currentNetwork = useContext(AppConfigContext)
    const [txStatus, setTxStatus] = useState<string>()
    const [txHash, setTxHash] = useState<string>()
    const [blockHash, setBlockHash] = useState<string>()

    useEffect(() => {
        const getTxStatus = async () => {
            if (tx) {
                setTxHash('')
                setBlockHash('')
                setTxStatus('Pending')
                const txnResponse = await tx
                const receipt = await passKeyProvider.waitForTransaction(txnResponse.hash,1, 60000)
                const chainReceipt = await bundlerRPCClient.getUserOpReceipt(receipt.transactionHash)
                setTxHash(chainReceipt.receipt?.transactionHash)
                setBlockHash(chainReceipt.receipt.blockHash)
                setTxStatus(receipt.status === 1 ? 'Success' : 'Failed')
            }
        }
        getTxStatus()
    }, [tx, passKeyProvider, bundlerRPCClient])

    return (
        <Row>
            <Row>
                <Col xs={2}>
                    Txn Hash
                </Col> 
                <Col xs={10} className='data'>
                    {currentNetwork.explorerUrl && txHash ? 
                        <a href={`${currentNetwork.explorerUrl}tx/${txHash}`} target='_blank' rel='noreferrer'>{txHash}</a> : 
                        txHash
                    }
                </Col>
            </Row>
            <Row>
                <Col xs={2}>
                    Txn Status
                </Col> 
                <Col xs={10} className='data'>
                    {txStatus}
                </Col>
            </Row>
            <Row>
                <Col xs={2}>
                    Block Hash
                </Col> 
                <Col xs={10} className='data'>
                    {blockHash}
                </Col>
            </Row>
        </Row>
    )
}

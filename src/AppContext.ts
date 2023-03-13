import { createContext } from 'react';
import { WebAuthnWrapper, WebAuthnPlugin } from '@itsobvioustech/aa-passkeys-client'

const wap = new WebAuthnPlugin()
const waw = new WebAuthnWrapper(wap)

export interface AppConfig {
    networkName: string;
    entryPointAddress: string;
    factoryAddress: string;
    bundlerUrl: string;
    rpcUrl: string;
}

export const knownNetworks = new Map<string, AppConfig>([
    ["local", {
        networkName: 'local',
        entryPointAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        factoryAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        bundlerUrl: 'http://localhost:9000/rpc',
        rpcUrl: 'http://localhost:8545',
    }],
    ["Mumbai Matic", {
        networkName: 'Mumbai Matic',
        entryPointAddress: '0xaD7cE219eC112bE17D8AFE46C4716B5A646e13dF',
        factoryAddress: '0xb4989B5d8C44A2b24C61089261022a22dF096087',
        bundlerUrl: 'http://localhost:9001/rpc',
        rpcUrl: 'https://rpc.ankr.com/polygon_mumbai',
    }],
    ["Goerli Base", {
        networkName: 'Goerli Base',
        entryPointAddress: '0xB0effB5353D2522E55381e3342bCecb9887b836a',
        factoryAddress: '0x693cAa7d0230E7b2395F91D2D261216CC482F6eE',
        bundlerUrl: 'http://localhost:9002/rpc',
        rpcUrl: 'https://goerli.base.org',
    }],
])

export const AppContext = createContext<WebAuthnWrapper>(waw);
export const AppConfigContext = createContext<AppConfig>(knownNetworks.get('local')!);
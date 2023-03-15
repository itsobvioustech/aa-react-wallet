import { createContext } from 'react';
import { WebAuthnWrapper, PassKeyKeyPair } from '@itsobvioustech/aa-passkeys-client'

const waw = new WebAuthnWrapper()

export interface AppConfig {
    networkName: string;
    entryPointAddress: string;
    factoryAddress: string;
    bundlerUrl: string;
    rpcUrl: string;
    enabled: boolean;
}

export const knownNetworks = new Map<string, AppConfig>([
    ["local", {
        networkName: 'local',
        entryPointAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
        factoryAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        bundlerUrl: process.env.ANVIL_BUNDLER_URL || 'http://local.tools.obvious.technology:9000/rpc',
        rpcUrl: process.env.ANVIL_RPC_URL || 'http://local.tools.obvious.technology:8545',
        enabled: true,
    }],
    ["Mumbai Matic", {
        networkName: 'Mumbai Matic',
        entryPointAddress: '0xC825202DB01A9A4A8d95d2aaB7220E95376cacf4',
        factoryAddress: '0x0474029776d103AB96f8C023040218Bce69846BD',
        bundlerUrl: process.env.MUMBAI_BUNDLER_URL || 'http://local.tools.obvious.technology:9001/rpc',
        rpcUrl: process.env.MUMBAI_RPC_URL || 'https://rpc.ankr.com/polygon_mumbai',
        enabled: true,
    }],
    ["Goerli Base", {
        networkName: 'Goerli Base',
        entryPointAddress: '0xD7683b1dA1d05A3Fb6A8f919652b99bc52494aDC',
        factoryAddress: '0xB8ad44bEEf984Ed7Bb48f599318429b3B0196339',
        bundlerUrl: process.env.BASE_BUNDLER_URL || 'http://local.tools.obvious.technology:9002/rpc',
        rpcUrl: process.env.BASE_RPC_URL || 'https://goerli.base.org',
        enabled: true,
    }],
]);

export const AppContext = createContext<WebAuthnWrapper>(waw);
export const AppConfigContext = createContext<AppConfig>(knownNetworks.get('local')!);
export const KnownUsers = createContext<PassKeyKeyPair[]>([]);
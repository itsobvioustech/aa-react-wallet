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
const localConfig: AppConfig = {
    networkName: 'local',
    entryPointAddress: process.env.ANVIL_ENTRYPOINT_ADDRESS || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    factoryAddress: process.env.ANVIL_FACTORY_ADDRESS || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    bundlerUrl: process.env.ANVIL_BUNDLER_URL || 'http://localhost:9000/rpc',
    rpcUrl: process.env.ANVIL_RPC_URL || 'http://localhost:8545',
    enabled: process.env.ENABLE_LOCAL_NETWORK === 'true' || true,
};

const mumbaiConfig: AppConfig = {
    networkName: 'Mumbai Matic',
    entryPointAddress: process.env.MUMBAI_ENTRYPOINT_ADDRESS || '0xC825202DB01A9A4A8d95d2aaB7220E95376cacf4',
    factoryAddress: process.env.MUMBAI_FACTORY_ADDRESS || '0x0474029776d103AB96f8C023040218Bce69846BD',
    bundlerUrl: process.env.MUMBAI_BUNDLER_URL || 'https://mumbai-bundler.wallet.obvious.technology/rpc',
    rpcUrl: process.env.MUMBAI_RPC_URL || 'https://rpc.ankr.com/polygon_mumbai',
    enabled: process.env.ENABLE_MUMBAI_NETWORK ==='true' || true,
};
const baseConfig: AppConfig = {
    networkName: 'Goerli Base',
    entryPointAddress: process.env.BASE_ENTRYPOINT_ADDRESS || '0xD7683b1dA1d05A3Fb6A8f919652b99bc52494aDC',
    factoryAddress: process.env.BASE_FACTORY_ADDRESS || '0xB8ad44bEEf984Ed7Bb48f599318429b3B0196339',
    bundlerUrl: process.env.BASE_BUNDLER_URL || 'https://base-bundler.wallet.obvious.technology/rpc',
    rpcUrl: process.env.BASE_RPC_URL || 'https://goerli.base.org',
    enabled: process.env.ENABLE_BASE_NETWORK === 'true' || true,
};

export const networkConfig = [localConfig, mumbaiConfig, baseConfig].filter((c) => c.enabled);
export const knownNetworks = new Map<string, AppConfig>();
networkConfig.map((c) => knownNetworks.set(c.networkName, c));

export const AppContext = createContext<WebAuthnWrapper>(waw);
export const AppConfigContext = createContext<AppConfig>(networkConfig[0]!);
export const KnownUsers = createContext<PassKeyKeyPair[]>([]);

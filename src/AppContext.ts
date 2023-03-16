import { createContext } from 'react';
import { WebAuthnWrapper, PassKeyKeyPair } from '@itsobvioustech/aa-passkeys-client'

const waw = new WebAuthnWrapper()

export interface AppConfig {
    networkName: string;
    chainId: number,
    entryPointAddress: string;
    factoryAddress: string;
    bundlerUrl: string;
    rpcUrl: string;
    enabled: boolean;
    explorerUrl?: string;
}
const localConfig: AppConfig = {
    networkName: 'local',
    chainId: 31337,
    entryPointAddress: process.env.ANVIL_ENTRYPOINT_ADDRESS || '0xCAe2338678caBc60A49B30678b25eA7aB02b4e6F',
    factoryAddress: process.env.ANVIL_FACTORY_ADDRESS || '0xD54D986f9eb837Bc05190135859329F8Df210B60',
    bundlerUrl: process.env.ANVIL_BUNDLER_URL || 'http://localhost:9000/rpc',
    rpcUrl: process.env.ANVIL_RPC_URL || 'http://localhost:8545',
    enabled: process.env.ENABLE_LOCAL_NETWORK === 'true' || true,
};

const mumbaiConfig: AppConfig = {
    networkName: 'Mumbai Matic',
    chainId: 80001,
    entryPointAddress: process.env.MUMBAI_ENTRYPOINT_ADDRESS || '0xCAe2338678caBc60A49B30678b25eA7aB02b4e6F',
    factoryAddress: process.env.MUMBAI_FACTORY_ADDRESS || '0xD54D986f9eb837Bc05190135859329F8Df210B60',
    bundlerUrl: process.env.MUMBAI_BUNDLER_URL || 'https://mumbai-bundler.wallet.obvious.technology/rpc',
    rpcUrl: process.env.MUMBAI_RPC_URL || 'https://rpc.ankr.com/polygon_mumbai',
    enabled: process.env.ENABLE_MUMBAI_NETWORK ==='true' || true,
    explorerUrl: 'https://mumbai.polygonscan.com/',
};
const baseConfig: AppConfig = {
    networkName: 'Goerli Base',
    chainId: 84531,
    entryPointAddress: process.env.BASE_ENTRYPOINT_ADDRESS || '0xCAe2338678caBc60A49B30678b25eA7aB02b4e6F',
    factoryAddress: process.env.BASE_FACTORY_ADDRESS || '0xD54D986f9eb837Bc05190135859329F8Df210B60',
    bundlerUrl: process.env.BASE_BUNDLER_URL || 'https://base-bundler.wallet.obvious.technology/rpc',
    rpcUrl: process.env.BASE_RPC_URL || 'https://goerli.base.org',
    enabled: process.env.ENABLE_BASE_NETWORK === 'true' || true,
    explorerUrl: 'https://goerli.basescan.org/',
};

export const networkConfig = [localConfig, mumbaiConfig, baseConfig].filter((c) => c.enabled);
export const knownNetworks = new Map<string, AppConfig>();
networkConfig.map((c) => knownNetworks.set(c.networkName, c));

export const AppContext = createContext<WebAuthnWrapper>(waw);
export const AppConfigContext = createContext<AppConfig>(networkConfig[0]!);
export const KnownUsers = createContext<PassKeyKeyPair[]>([]);

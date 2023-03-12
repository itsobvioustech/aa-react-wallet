import { createContext } from 'react';
import { WebAuthnPlugin } from '@aa-passkeys-wallet/packages/wallet/client/WebAuthnPlugin'
import { WebAuthnWrapper } from "@aa-passkeys-wallet/packages/wallet/WebAuthnWrapper"

const wap = new WebAuthnPlugin()
const waw = new WebAuthnWrapper(wap)

export const AppContext = createContext<WebAuthnWrapper>(waw);
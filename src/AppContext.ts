import { createContext } from 'react';
import { WebAuthnWrapper, WebAuthnPlugin } from '@itsobvioustech/aa-passkeys-client'

const wap = new WebAuthnPlugin()
const waw = new WebAuthnWrapper(wap)

export const AppContext = createContext<WebAuthnWrapper>(waw);
import { RegistrationEncoded, AuthenticationEncoded } from "@passwordless-id/webauthn/dist/esm/types";
import { IWebAuthnClient} from "@aa-passkeys-wallet/packages/wallet/WebAuthnWrapper";
import {client, utils} from "@passwordless-id/webauthn"

export class WebAuthnPlugin implements IWebAuthnClient {
    async register(challenge: string, name?:string): Promise<RegistrationEncoded> {
        return client.register(name? name : utils.randomChallenge(), challenge);
    }
    async authenticate(challenge: string, keyid?: string | undefined): Promise<AuthenticationEncoded> {
        return client.authenticate(keyid ? [keyid] : [], challenge);
    }
}
import { client, utils } from '@passwordless-id/webauthn'
import { useEffect, useState } from 'react'
import { WebAuthnPlugin } from '../plugins/WebAuthnPlugin'
import { PassKeyKeyPair, WebAuthnWrapper } from "@aa-passkeys-wallet/WebAuthnWrapper"

const CheckWebAuthn = () => {
  const wap = new WebAuthnPlugin()
  const waw = new WebAuthnWrapper(wap)

  const [available, setAvailable] = useState(false)
  const [userName, setUserName] = useState("")
  const [users, setUsers] = useState<PassKeyKeyPair[]>([])

  useEffect(() => {
    const localUsers = localStorage.getItem("users")
    if (localUsers) {
      setUsers(JSON.parse(localUsers))
    }
  }, [])
  useEffect(() => {
    localStorage.setItem("users", JSON.stringify(users))
  }, [users])

  async function registerUser() {
    console.log("Registering user", userName)
    const user = await waw.registerPassKey(utils.randomChallenge(), userName)
    if (user.keyId) {
      setUsers([...users, user])
    }
  }
  return(
    <div>
      <button onClick={() => setAvailable(client.isAvailable())}>Check</button>
      { available && 
        <div>
          WebAuthn is available <br/>
          <input type="text" placeholder="Username" onChange={ e => setUserName(e.target.value)} />
          <button onClick={registerUser}>Register</button>
        </div>
      }
    </div>
  )
}

export default CheckWebAuthn
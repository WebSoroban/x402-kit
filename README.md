# x402 kit

Charge for any HTTP endpoint in USDC on Stellar, using the
[x402](https://www.x402.org) protocol. A client calls your route, gets
`402 Payment Required`, signs one USDC authorization in a Stellar wallet, and
retries. The payment settles on Stellar and your handler runs.

Settlement goes through WebSoroban's managed facilitator (OpenZeppelin
Channels), which also pays the network fee. Testnet and mainnet are both live.

| Path | What it is |
| --- | --- |
| [`sdk/`](sdk) | [`@web-soroban/pay`](https://www.npmjs.com/package/@web-soroban/pay): Express middleware, preflight checks, webhook verification |
| [`examples/paid-api/`](examples/paid-api) | A runnable Express + TypeScript API priced at $0.01 per request |

## Quick start

1. In [WebSoroban Pay](https://pay.websoroban.in), create an endpoint. Pick the
   network, a price, and a payout address that holds a USDC trustline. Copy the
   endpoint id and the endpoint key, which is shown once.
2. Protect a route:

```bash
npm install @web-soroban/pay @x402/core @x402/express @x402/stellar express
```

```ts
import express from 'express'
import { createWebSorobanPay } from '@web-soroban/pay'

const app = express()
const pay = createWebSorobanPay({
  apiUrl: 'https://backend-ide-production-003a.up.railway.app/api',
  apiKey: process.env.WEBSOROBAN_PAY_KEY,      // wsp_test_… or wsp_live_…
  endpointId: process.env.WEBSOROBAN_ENDPOINT_ID!,
  payTo: process.env.STELLAR_PAY_TO!,
})

app.use(pay.protect('GET /brief', '$0.01'))
app.get('/brief', (_req, res) => res.json({ brief: 'Paid content.' }))
app.listen(8787)
```

3. Request it. `curl -i localhost:8787/brief` returns `402` with a
   `PAYMENT-REQUIRED` header. Pay from the hosted checkout, any x402 client, or
   `pnpm pay` in the example.

The key's prefix sets the network: `wsp_test_` for testnet, `wsp_live_` for
mainnet. A testnet key can never guard a mainnet route.

## Networks

| | Testnet | Mainnet |
| --- | --- | --- |
| CAIP-2 | `stellar:testnet` | `stellar:pubnet` |
| USDC issuer | `GBBD47IF…LFLA5` | `GA5ZSEJY…KZVN` (Circle) |
| Endpoint key | `wsp_test_…` | `wsp_live_…` |

Wallets that can sign the authorization: Freighter (extension), Hana, HOT,
Klever, Albedo, and OneKey. Freighter Mobile cannot.

## Develop

```bash
cd sdk
npm install
npm test
npm run build
```

## Learn more

- [x402 payments guide](https://websoroban.in/docs/payments)
- [API reference](https://websoroban.in/docs/reference/api)
- Recurring payments: [WebSoroban/payloop](https://github.com/WebSoroban/payloop)

## License

MIT

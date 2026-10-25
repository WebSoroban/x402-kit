// Make one real paid request from the terminal (testnet only).
// The payer signs a single USDC authorization; WebSoroban's facilitator
// submits it and sponsors the network fee.
import { x402Client, x402HTTPClient, wrapFetchWithPayment } from '@x402/fetch';
import { createEd25519Signer } from '@x402/stellar';
import { ExactStellarScheme } from '@x402/stellar/exact/client';

const secret = process.env.PAYER_SECRET?.trim();
const port = Number(process.env.PORT || 8787);
const url = process.argv[2] || `http://localhost:${port}/api/research-brief`;

if (!secret) {
  console.error('Set PAYER_SECRET in .env to a testnet account that holds testnet USDC.');
  process.exit(1);
}
if (process.env.WEBSOROBAN_PAY_KEY?.startsWith('wsp_live_')) {
  console.error('pnpm pay is testnet only. Pay mainnet endpoints from a wallet.');
  process.exit(1);
}

const signer = createEd25519Signer(secret, 'stellar:testnet');
const client = new x402Client().register('stellar:*', new ExactStellarScheme(signer, { url: 'https://soroban-testnet.stellar.org' }));
const paidFetch = wrapFetchWithPayment(fetch, client);

const httpClient = new x402HTTPClient(client);
const rejection = (res: Response) => {
  try { return String(httpClient.getPaymentRequiredResponse((name) => res.headers.get(name)).error || ''); } catch { return ''; }
};
let response = await paidFetch(url, { headers: { Accept: 'application/json' } });
// The facilitator re-simulates at verification. If network fees moved in the
// seconds since signing it rejects with fee_below_minimum and charges nothing,
// so sign once more (never more than once).
if (response.status === 402 && /fee[ _]below[ _]minimum/i.test(rejection(response))) {
  console.log('Network fees moved while signing; nothing was charged. Retrying once…');
  response = await paidFetch(url, { headers: { Accept: 'application/json' } });
}
const body = await response.json().catch(() => ({}));
if (!response.ok) {
  console.error(`Payment failed with HTTP ${response.status}:`, body);
  process.exit(1);
}
const settlement = httpClient.getPaymentSettleResponse((name) => response.headers.get(name));
console.log('Paid response:', body);
if (settlement?.transaction) {
  console.log(`Receipt: https://stellar.expert/explorer/testnet/tx/${settlement.transaction}`);
}

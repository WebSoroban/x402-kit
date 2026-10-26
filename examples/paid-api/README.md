# Paid API endpoint

A runnable Express + TypeScript endpoint protected by **$0.01 USDC on Stellar** through WebSoroban's managed x402 facilitator. Testnet by default; a `wsp_live_` key switches it to mainnet.

## 1. Create the payment endpoint

Open [WebSoroban Pay](https://pay.websoroban.in) and create a testnet endpoint:

- Price: `0.01`
- Payout address: a funded Stellar testnet G-address **with a USDC trustline** (the studio checks this for you)

Copy the endpoint id and the scoped key when they are shown. The key is displayed once.

## 2. Configure and run

```bash
cp .env.example .env
# Fill WEBSOROBAN_ENDPOINT_ID, WEBSOROBAN_PAY_KEY, and STELLAR_PAY_TO
pnpm install
pnpm dev
```

On start the server runs a preflight: it confirms the key reaches WebSoroban and that the payout account can receive USDC, and prints exactly what to fix if not. Node 22 or newer is required by `@x402/stellar`.

## 3. Confirm the paywall

```bash
curl -i http://localhost:8787/api/research-brief
```

The first request returns **HTTP 402** with payment requirements.

## 4. Make a paid request

Put a testnet account secret with testnet USDC in `PAYER_SECRET` (get USDC from https://faucet.circle.com, Stellar Testnet), then:

```bash
pnpm pay
```

The script signs one USDC authorization, the facilitator settles it, and you get the protected JSON plus a Stellar Expert receipt link. The payment appears in Payment Studio's activity feed. Browser users can pay the same endpoint from the hosted checkout.

## 5. Go live on mainnet

1. In [WebSoroban Pay](https://pay.websoroban.in), create a new endpoint with **Mainnet** selected. Its payout address must exist on mainnet and hold a trustline to Circle USDC (issuer `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`).
2. Replace `WEBSOROBAN_ENDPOINT_ID`, `WEBSOROBAN_PAY_KEY` (now `wsp_live_…`), and `STELLAR_PAY_TO`. Nothing else changes: the network comes from the key.
3. Restart. The preflight checks the key and the mainnet trustline.
4. Pay once from a mainnet wallet through the hosted checkout and check the receipt. `pnpm pay` stays testnet-only so a terminal secret never spends real USDC.

The scoped key stays on this server; never expose it in browser code or commit your `.env` file.

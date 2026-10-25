import type { RequestHandler } from 'express';
import { paymentMiddleware, x402ResourceServer } from '@x402/express';
import { HTTPFacilitatorClient } from '@x402/core/server';
import { ExactStellarScheme } from '@x402/stellar/exact/server';

export type StellarNetwork = 'stellar:testnet' | 'stellar:pubnet';

const HORIZON: Record<StellarNetwork, string> = {
  'stellar:testnet': 'https://horizon-testnet.stellar.org',
  'stellar:pubnet': 'https://horizon.stellar.org',
};
const USDC_ISSUER: Record<StellarNetwork, string> = {
  'stellar:testnet': 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
  'stellar:pubnet': 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
};

export interface WebSorobanPayOptions {
  apiUrl: string;
  apiKey: string;
  endpointId: string;
  payTo: string;
}

export interface ProtectOptions {
  description?: string;
  maxTimeoutSeconds?: number;
}

/** The key prefix decides the network, so a testnet key never guards a mainnet route. */
export function networkFromKey(apiKey: string): StellarNetwork {
  if (apiKey.startsWith('wsp_live_')) return 'stellar:pubnet';
  if (apiKey.startsWith('wsp_test_')) return 'stellar:testnet';
  throw new Error('WEBSOROBAN_PAY_KEY must start with wsp_test_ or wsp_live_.');
}

export function createWebSorobanPay(options: WebSorobanPayOptions) {
  if (!options.apiKey) throw new Error('WEBSOROBAN_PAY_KEY is required.');
  if (!options.endpointId) throw new Error('WEBSOROBAN_ENDPOINT_ID is required.');
  if (!/^[GC][A-Z2-7]{55}$/.test(options.payTo)) {
    throw new Error('STELLAR_PAY_TO must be the endpoint payout address (G… or C…).');
  }
  const network = networkFromKey(options.apiKey);
  const facilitatorUrl = options.apiUrl.replace(/\/$/, '') + '/pay/facilitator';
  const auth = { Authorization: 'Bearer ' + options.apiKey };

  const facilitator = new HTTPFacilitatorClient({
    url: facilitatorUrl,
    createAuthHeaders: async () => ({ verify: auth, settle: auth, supported: auth }),
  });
  const resourceServer = new x402ResourceServer(facilitator).register(network, new ExactStellarScheme());

  return {
    network,

    protect(
      route: `${'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'} /${string}`,
      price: string,
      settings: ProtectOptions = {},
    ): RequestHandler {
      return paymentMiddleware({
        [route]: {
          accepts: {
            scheme: 'exact',
            network,
            price,
            payTo: options.payTo,
            maxTimeoutSeconds: settings.maxTimeoutSeconds ?? 60,
          },
          serviceName: 'WebSoroban Pay',
          description: settings.description || 'A Stellar endpoint protected by x402.',
          mimeType: 'application/json',
        },
      }, resourceServer, undefined, undefined, true);
    },

    /** Startup check: the key reaches WebSoroban and the payout account can receive USDC. */
    async preflight(): Promise<string[]> {
      const problems: string[] = [];
      try {
        const response = await fetch(facilitatorUrl + '/supported', { headers: auth, signal: AbortSignal.timeout(10_000) });
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { message?: string };
          problems.push('Endpoint key rejected: ' + (body.message || 'HTTP ' + response.status) + '. Copy the key again from Payment Studio.');
        }
      } catch {
        problems.push('Could not reach ' + facilitatorUrl + '. Check WEBSOROBAN_API_URL.');
      }
      if (options.payTo.startsWith('G')) {
        try {
          const response = await fetch(HORIZON[network] + '/accounts/' + options.payTo, { signal: AbortSignal.timeout(5_000) });
          if (response.status === 404) {
            problems.push('STELLAR_PAY_TO does not exist on ' + network + '. Fund it with XLM first.');
          } else if (response.ok) {
            const account = (await response.json()) as { balances?: Array<{ asset_code?: string; asset_issuer?: string }> };
            const hasUsdc = (account.balances || []).some((line) => line.asset_code === 'USDC' && line.asset_issuer === USDC_ISSUER[network]);
            if (!hasUsdc) problems.push('STELLAR_PAY_TO has no USDC trustline, so settlements to it will fail. Add USDC in its wallet.');
          }
        } catch {
          // Horizon being unreachable is not a configuration problem.
        }
      }
      return problems;
    },
  };
}

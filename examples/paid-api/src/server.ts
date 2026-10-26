import 'dotenv/config';
import express from 'express';
import { config } from './config.js';
import { createWebSorobanPay } from './websoroban-pay.js';
 
const app = express();
app.use(express.json());

const pay = createWebSorobanPay({
  apiUrl: config.apiUrl,
  apiKey: config.apiKey,
  endpointId: config.endpointId,
  payTo: config.payTo,
});

app.get('/health', (_request, response) => {
  response.json({ ok: true, network: pay.network });
});

// This is the one-line paywall. The handler below runs only after settlement.
app.use(pay.protect('GET /api/research-brief', '$0.01', {
  description: 'Unlock the WebSoroban research brief.',
}));

app.get('/api/research-brief', (_request, response) => {
  response.json({
    title: 'Agentic payments on Stellar',
    summary: 'The request paid 0.01 USDC and reached the protected handler.',
    paid: true,
    network: pay.network,
  });
});

app.listen(config.port, async () => {
  console.log(`Paid API listening on http://localhost:${config.port} (${pay.network})`);
  console.log(`Protected route: http://localhost:${config.port}/api/research-brief`);
  const problems = await pay.preflight();
  if (problems.length) {
    console.warn('\nSetup needs attention before payments can settle:');
    for (const problem of problems) console.warn('  • ' + problem);
  } else {
    console.log('Preflight passed: key accepted and payout account can receive USDC.');
  }
});

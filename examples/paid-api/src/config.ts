function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}. Copy .env.example to .env and fill it in.`);
  return value;
}

export const config = {
  port: Number(process.env.PORT || 8787),
  apiUrl: process.env.WEBSOROBAN_API_URL || 'https://backend-ide-production-003a.up.railway.app/api',
  endpointId: required('WEBSOROBAN_ENDPOINT_ID'),
  apiKey: required('WEBSOROBAN_PAY_KEY'),
  payTo: required('STELLAR_PAY_TO'),
};

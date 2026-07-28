export const AGENT_ID = 'sin-shop-logistic'
export const ALLOWED_FLOWS = [
  'supplier-registration',
  'product-integration',
  'tiktok-draft-sync',
]

export const HUMAN_GATES = [
  'login',
  'captcha',
  'payment',
  'publication',
  'legal-confirmation',
]

export function agentCard(baseUrl = 'http://127.0.0.1:4647') {
  return {
    name: 'SIN-Shop-Logistic',
    description: 'Dry-run-first logistics planning for ShopSIN supplier and marketplace workflows.',
    url: baseUrl,
    version: '1.0.0',
    protocolVersion: '0.3.0',
    capabilities: { streaming: false, pushNotifications: false },
    defaultInputModes: ['application/json', 'text/plain'],
    defaultOutputModes: ['application/json'],
    skills: ALLOWED_FLOWS.map((id) => ({ id, name: id, tags: ['shop', 'logistics', 'dry-run'] })),
  }
}

export function oauthClient(baseUrl = 'http://127.0.0.1:4647') {
  return {
    client_name: AGENT_ID,
    redirect_uris: [`${baseUrl}/oauth/callback`],
    grant_types: ['authorization_code'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
  }
}

export function buildPlan(input = {}) {
  const flow = String(input.flow || '')
  if (!ALLOWED_FLOWS.includes(flow)) {
    throw new Error(`Unsupported flow: ${flow || '(missing)'}`)
  }
  if (input.dryRun === false) {
    throw new Error('External execution requires an explicit human-approved operator workflow')
  }

  return {
    agentId: AGENT_ID,
    flow,
    mode: 'dry-run',
    reversible: true,
    inputs: input.inputs && typeof input.inputs === 'object' ? input.inputs : {},
    humanGates: HUMAN_GATES,
    steps: [
      { id: 'validate-inputs', action: 'validate', external: false },
      { id: 'open-provider', action: 'browser-navigation', external: true },
      { id: 'collect-evidence', action: 'capture-screenshot', external: false },
      { id: 'prepare-draft', action: 'draft-only', external: false },
      { id: 'human-approval', action: 'halt', external: false },
    ],
  }
}

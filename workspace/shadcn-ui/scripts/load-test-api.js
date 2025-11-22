const API_BASE = process.env.LOAD_API_BASE ?? 'http://localhost:4000/api/v1'
const ORG_ID = process.env.LOAD_ORG_ID ?? 'org-demo'
const TOKEN = process.env.LOAD_API_TOKEN

const paths = [
  { label: 'MLS sync', path: `organizations/${ORG_ID}/mls/sync`, options: { method: 'POST' } },
  { label: 'AI persona', path: `organizations/${ORG_ID}/ai-employees/brokerAssistant/run`, options: { method: 'POST', body: JSON.stringify({}) } },
  { label: 'Financials', path: `organizations/${ORG_ID}/financials`, options: {} },
  { label: 'Transactions', path: `organizations/${ORG_ID}/transactions`, options: {} },
  { label: 'Notifications', path: `organizations/${ORG_ID}/notifications`, options: {} }
]

const headers = TOKEN
  ? {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    }
  : { 'Content-Type': 'application/json' }

const hit = async ({ label, path, options }) => {
  const start = Date.now()
  const res = await fetch(`${API_BASE.replace(/\/$/, '')}/${path}`, {
    ...options,
    headers
  })
  const duration = Date.now() - start
  return { label, ok: res.ok, status: res.status, duration }
}

const run = async () => {
  console.log(`Running API load against ${API_BASE} (org ${ORG_ID})`)
  const results = await Promise.all(paths.map(hit))
  results.forEach((result) => {
    console.log(`${result.label.padEnd(15)} ${result.status} ${result.ok ? 'OK ' : 'ERR'} ${result.duration}ms`)
  })
}

run().catch((error) => {
  console.error('Load test failed', error)
  process.exit(1)
})

const API_BASE = process.env.LOAD_API_BASE ?? 'http://localhost:4000'

const post = async (path, body = {}) => {
  const res = await fetch(`${API_BASE.replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const payload = await res.text()
    throw new Error(`Request to ${path} failed: ${res.status} ${payload}`)
  }
  return res.json()
}

const run = async () => {
  console.log('Enabling chaos modes via dev endpoints')
  await post('/dev/chaos/sql', { min: 10, max: 200, failureProbability: 0.05 })
  await post('/dev/chaos/latency', { min: 200, max: 1000 })
  console.log('Chaos enabled — run load tests now!')
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})

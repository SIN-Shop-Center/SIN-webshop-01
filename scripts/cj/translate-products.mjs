// Purpose: Translate English CJ product titles/descriptions to German via AI Gateway
// Usage: node scripts/cj/translate-products.mjs
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, AI_GATEWAY_API_KEY

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

async function translate(text) {
  const res = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.AI_GATEWAY_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'openai/gpt-5-mini',
      messages: [
        {
          role: 'system',
          content:
            'Du bist Übersetzer für einen deutschen Online-Shop. Übersetze den Produkttext natürlich und verkaufsstark ins Deutsche. Antworte NUR mit der Übersetzung, ohne Anführungszeichen.',
        },
        { role: 'user', content: text },
      ],
    }),
  })
  if (!res.ok) throw new Error(`Gateway error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.choices[0].message.content.trim()
}

async function main() {
  const { data: products, error } = await supabase
    .from('products')
    .select('id, title, description, title_de')
    .is('title_de', null)

  if (error) throw error
  console.log(`${products.length} Produkte zu übersetzen…`)

  for (const p of products) {
    try {
      const titleDe = await translate(p.title)
      const descDe = p.description ? await translate(p.description) : null
      const { error: upErr } = await supabase
        .from('products')
        .update({ title_de: titleDe, description_de: descDe })
        .eq('id', p.id)
      if (upErr) throw upErr
      console.log(`OK  ${p.title} -> ${titleDe}`)
    } catch (err) {
      console.error(`FEHLER ${p.id}: ${err.message}`)
    }
  }
  console.log('Fertig.')
}

main()

import { neon } from '@neondatabase/serverless';

async function getDb() {
  return neon(process.env.DATABASE_URL);
}

async function ensureTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS avisos (
      id         BIGSERIAL PRIMARY KEY,
      titulo     TEXT NOT NULL,
      severidade TEXT NOT NULL,
      criado_em  TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

export default async function handler(req, res) {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'DATABASE_URL nao configurada' });
  }

  try {
    const sql = await getDb();
    await ensureTable(sql);

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT id, titulo, severidade, criado_em AS timestamp
        FROM avisos ORDER BY id DESC LIMIT 1
      `;
      return res.status(200).json({ aviso: rows[0] || null });
    }

    if (req.method === 'POST') {
      const { titulo, severidade } = req.body || {};
      if (!titulo || !severidade) {
        return res.status(400).json({ error: 'titulo e severidade obrigatorios' });
      }
      const rows = await sql`
        INSERT INTO avisos (titulo, severidade) VALUES (${titulo}, ${severidade})
        RETURNING id, titulo, severidade, criado_em AS timestamp
      `;
      return res.status(200).json({ ok: true, aviso: rows[0] });
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM avisos`;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('Erro:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

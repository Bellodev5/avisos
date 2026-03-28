import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }  // Neon exige SSL
});

async function ensureTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS avisos (
      id         BIGSERIAL PRIMARY KEY,
      titulo     TEXT NOT NULL,
      severidade TEXT NOT NULL,
      criado_em  TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export default async function handler(req, res) {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'DATABASE_URL nao configurada' });
  }

  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    console.error('Erro conexao:', err.message);
    return res.status(500).json({ error: `Falha na conexao: ${err.message}` });
  }

  try {
    await ensureTable(client);

    if (req.method === 'GET') {
      const { rows } = await client.query(
        `SELECT id, titulo, severidade, criado_em AS timestamp
         FROM avisos ORDER BY id DESC LIMIT 1`
      );
      return res.status(200).json({ aviso: rows[0] || null });
    }

    if (req.method === 'POST') {
      const { titulo, severidade } = req.body || {};
      if (!titulo || !severidade) {
        return res.status(400).json({ error: 'titulo e severidade obrigatorios' });
      }
      const { rows } = await client.query(
        `INSERT INTO avisos (titulo, severidade) VALUES ($1, $2)
         RETURNING id, titulo, severidade, criado_em AS timestamp`,
        [titulo, severidade]
      );
      return res.status(200).json({ ok: true, aviso: rows[0] });
    }

    if (req.method === 'DELETE') {
      await client.query(`DELETE FROM avisos`);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('Erro query:', err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

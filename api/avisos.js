import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Garante que a tabela existe
async function ensureTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS avisos (
      id        BIGSERIAL PRIMARY KEY,
      titulo    TEXT NOT NULL,
      severidade TEXT NOT NULL,
      criado_em TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export default async function handler(req, res) {
  const client = await pool.connect();
  try {
    await ensureTable(client);

    // GET — retorna o último aviso
    if (req.method === 'GET') {
      const { rows } = await client.query(
        `SELECT id, titulo, severidade, criado_em AS timestamp
         FROM avisos ORDER BY id DESC LIMIT 1`
      );
      return res.status(200).json({ aviso: rows[0] || null });
    }

    // POST — insere novo aviso
    if (req.method === 'POST') {
      const { titulo, severidade } = req.body;
      if (!titulo || !severidade) {
        return res.status(400).json({ error: 'titulo e severidade obrigatórios' });
      }
      const { rows } = await client.query(
        `INSERT INTO avisos (titulo, severidade) VALUES ($1, $2)
         RETURNING id, titulo, severidade, criado_em AS timestamp`,
        [titulo, severidade]
      );
      return res.status(200).json({ ok: true, aviso: rows[0] });
    }

    // DELETE — limpa todos os avisos
    if (req.method === 'DELETE') {
      await client.query(`DELETE FROM avisos`);
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}
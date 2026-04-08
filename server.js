const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database
const db = new Database('./produtos.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    descricao TEXT,
    preco REAL NOT NULL,
    quantidade INTEGER NOT NULL DEFAULT 0,
    categoria TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Seed inicial
const count = db.prepare('SELECT COUNT(*) as c FROM produtos').get();
if (count.c === 0) {
  const insert = db.prepare('INSERT INTO produtos (nome, descricao, preco, quantidade, categoria) VALUES (?, ?, ?, ?, ?)');
  insert.run('Notebook Pro 15"', 'Processador Intel i7, 16GB RAM, SSD 512GB', 4599.99, 12, 'Eletrônicos');
  insert.run('Mouse Gamer RGB', 'DPI ajustável até 12000, 6 botões programáveis', 189.90, 45, 'Periféricos');
  insert.run('Cadeira Ergonômica', 'Suporte lombar ajustável, apoio de braços 4D', 1299.00, 8, 'Móveis');
  insert.run('Headset Bluetooth', 'Cancelamento de ruído ativo, 30h bateria', 349.90, 23, 'Áudio');
  insert.run('Monitor 27" 4K', 'IPS, 144Hz, HDR400, USB-C', 2799.00, 5, 'Eletrônicos');
}

// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// GET all produtos (with search & category filter)
app.get('/api/produtos', (req, res) => {
  const { search, categoria } = req.query;
  let query = 'SELECT * FROM produtos WHERE 1=1';
  const params = [];
  if (search) { query += ' AND (nome LIKE ? OR descricao LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (categoria) { query += ' AND categoria = ?'; params.push(categoria); }
  query += ' ORDER BY id DESC';
  res.json(db.prepare(query).all(...params));
});

// GET single produto
app.get('/api/produtos/:id', (req, res) => {
  const p = db.prepare('SELECT * FROM produtos WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Produto não encontrado' });
  res.json(p);
});

// POST create
app.post('/api/produtos', (req, res) => {
  const { nome, descricao, preco, quantidade, categoria } = req.body;
  if (!nome || preco == null || quantidade == null)
    return res.status(400).json({ error: 'nome, preco e quantidade são obrigatórios' });
  const result = db.prepare(
    'INSERT INTO produtos (nome, descricao, preco, quantidade, categoria) VALUES (?, ?, ?, ?, ?)'
  ).run(nome, descricao || '', parseFloat(preco), parseInt(quantidade), categoria || 'Geral');
  res.status(201).json(db.prepare('SELECT * FROM produtos WHERE id = ?').get(result.lastInsertRowid));
});

// PUT update
app.put('/api/produtos/:id', (req, res) => {
  const { nome, descricao, preco, quantidade, categoria } = req.body;
  const existing = db.prepare('SELECT * FROM produtos WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Produto não encontrado' });
  db.prepare(
    'UPDATE produtos SET nome=?, descricao=?, preco=?, quantidade=?, categoria=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
  ).run(
    nome ?? existing.nome,
    descricao ?? existing.descricao,
    preco != null ? parseFloat(preco) : existing.preco,
    quantidade != null ? parseInt(quantidade) : existing.quantidade,
    categoria ?? existing.categoria,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM produtos WHERE id = ?').get(req.params.id));
});

// DELETE
app.delete('/api/produtos/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM produtos WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Produto não encontrado' });
  db.prepare('DELETE FROM produtos WHERE id = ?').run(req.params.id);
  res.json({ message: 'Produto removido com sucesso' });
});

// Stats
app.get('/api/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as c FROM produtos').get().c;
  const valor = db.prepare('SELECT SUM(preco * quantidade) as v FROM produtos').get().v || 0;
  const categorias = db.prepare('SELECT COUNT(DISTINCT categoria) as c FROM produtos').get().c;
  const estoque = db.prepare('SELECT SUM(quantidade) as q FROM produtos').get().q || 0;
  res.json({ total, valor, categorias, estoque });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.listen(PORT, () => console.log(`Gestão de Produtos rodando na porta ${PORT}`));

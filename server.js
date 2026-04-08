const express = require('express');
const sqlite3 = require('sqlite3').verbose(); // Usando sqlite3 em vez de better-sqlite3
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(__dirname)); // Serve arquivos da RAIZ

// Banco de Dados
const db = new sqlite3.Database('./produtos.db');

// Inicializa a tabela
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT,
    preco REAL
  )`);
});

// Rota principal (front-end)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ===== API =====

// Listar todos os produtos
app.get('/api/produtos', (req, res) => {
  db.all('SELECT * FROM produtos ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Criar produto
app.post('/api/produtos', (req, res) => {
  const { nome, preco } = req.body;
  if (!nome || preco === undefined) return res.status(400).json({ error: 'Nome e preço são obrigatórios' });

  db.run(
    'INSERT INTO produtos (nome, preco) VALUES (?, ?)',
    [nome, parseFloat(preco)],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: 'Produto criado!' });
    }
  );
});

// Deletar produto
app.delete('/api/produtos/:id', (req, res) => {
  db.run('DELETE FROM produtos WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json({ ok: true, message: 'Produto deletado!' });
  });
});

// Editar produto
app.put('/api/produtos/:id', (req, res) => {
  const { nome, preco } = req.body;
  if (!nome || preco === undefined) return res.status(400).json({ error: 'Nome e preço são obrigatórios' });

  db.run(
    'UPDATE produtos SET nome=?, preco=? WHERE id=?',
    [nome, parseFloat(preco), req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Produto não encontrado' });
      res.json({ ok: true, message: 'Produto atualizado!' });
    }
  );
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

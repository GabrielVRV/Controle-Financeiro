require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const autenticarToken = require('./middleware/auth');
const app = express();
const port = 3000;

// Habilita o servidor a usar JSON
app.use(express.json());

// Configuração do CORS para permitir requisições de outras origens
const corsOptions = {
    origin: ['http://localhost:5173', 'http://192.168.0.118:5173'],
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Configurações do banco de dados
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'fluxo_dinheiro_db',
    password: 'gabriel1',
    port: 5432,
});

app.get('/', (req, res) => {
    res.send('API de Controle Financeiro');
});

// Endpoint para testar a conexão com o banco de dados
app.get('/teste-db', async (req, res) => {
    try {
        const client = await pool.connect();
        res.send('Conexão com o banco de dados bem-sucedida!');
        client.release();
    } catch (err) {
        console.error('Erro ao conectar-se ao banco de dados:', err);
        res.status(500).send('Erro ao conectar-se ao banco de dados.');
    }
});

// Rota para cadastrar um usuário (com criptografia)
app.post('/cadastrar-usuario', async (req, res) => {
    const { nome, email, senha } = req.body;
    try {
        const saltRounds = 10;
        const hashSenha = await bcrypt.hash(senha, saltRounds);

        const query = 'INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3) RETURNING id';
        const result = await pool.query(query, [nome, email, hashSenha]);

        res.status(201).json({
            mensagem: 'Usuário cadastrado com sucesso!',
            usuarioId: result.rows[0].id
        });
    } catch (err) {
        console.error('Erro ao cadastrar usuário:', err);
        res.status(500).json({ mensagem: 'Erro ao cadastrar usuário.' });
    }
});

// Rota para login de usuário (com JWT)
app.post('/login', async (req, res) => {
    const { email, senha } = req.body;
    try {
        const query = 'SELECT * FROM usuarios WHERE email = $1';
        const result = await pool.query(query, [email]);

        if (result.rows.length === 0) {
            return res.status(400).json({ mensagem: 'Credenciais inválidas.' });
        }

        const usuario = result.rows[0];
        const match = await bcrypt.compare(senha, usuario.senha);

        if (!match) {
            return res.status(400).json({ mensagem: 'Credenciais inválidas.' });
        }

        const token = jwt.sign(
            { id: usuario.id, email: usuario.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({
            mensagem: 'Login bem-sucedido!',
            token: token
        });

    } catch (err) {
        console.error('Erro no processo de login:', err);
        res.status(500).json({ mensagem: 'Erro interno do servidor.' });
    }
});

// Rota protegida para buscar os dados do usuário
app.get('/meu-perfil', autenticarToken, async (req, res) => {
    try {
        const userId = req.usuario.id;
        const query = 'SELECT nome, email FROM usuarios WHERE id = $1';
        const result = await pool.query(query, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
        }

        res.status(200).json({
            mensagem: 'Dados do perfil obtidos com sucesso!',
            usuario: result.rows[0]
        });
    } catch (err) {
        console.error('Erro ao buscar dados do perfil:', err);
        res.status(500).json({ mensagem: 'Erro interno do servidor.' });
    }
});

// --- NOVAS ROTAS PARA CATEGORIAS E TRANSAÇÕES ATUALIZADAS ---

// Nova Rota para obter todas as categorias
app.get('/categorias', async (req, res) => {
    try {
        const query = 'SELECT * FROM categorias ORDER BY nome ASC';
        const result = await pool.query(query);
        res.status(200).json({
            mensagem: 'Categorias obtidas com sucesso!',
            categorias: result.rows
        });
    } catch (err) {
        console.error('Erro ao buscar categorias:', err);
        res.status(500).json({ mensagem: 'Erro interno do servidor.' });
    }
});

// Rota para registrar uma nova transação (agora usando categoria_id)
app.post('/transacoes', autenticarToken, async (req, res) => {
    try {
        const { descricao, valor, tipo, data, categoria_id } = req.body;
        const usuarioId = req.usuario.id;

        if (!descricao || !valor || !tipo || !data) {
            return res.status(400).json({ mensagem: 'Campos obrigatórios faltando.' });
        }

        const query = 'INSERT INTO transacoes (usuario_id, descricao, valor, tipo, data, categoria_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
        const result = await pool.query(query, [usuarioId, descricao, valor, tipo, data, categoria_id]);

        res.status(201).json({
            mensagem: 'Transação registrada com sucesso!',
            transacao: result.rows[0]
        });

    } catch (err) {
        console.error('Erro ao registrar transação:', err);
        res.status(500).json({ mensagem: 'Erro interno do servidor.' });
    }
});

// Rota para listar transações (agora com JOIN para obter o nome da categoria E FILTRO)
app.get('/transacoes', autenticarToken, async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        // CORREÇÃO: Adicionando 'categoria_id' aos parâmetros de busca
        const { mes, ano, descricao, categoria_id } = req.query;

        let query = `
            SELECT t.*, c.nome AS categoria
            FROM transacoes t
            LEFT JOIN categorias c ON t.categoria_id = c.id
            WHERE t.usuario_id = $1
        `;
        let params = [usuarioId];
        let paramIndex = 2;

        if (mes) {
            const meses = mes.split(',');
            query += ` AND EXTRACT(MONTH FROM t.data) IN (${meses.map((_, i) => `$${paramIndex++}`).join(', ')})`;
            params.push(...meses.map(m => parseInt(m)));
        }

        if (ano) {
            const anos = ano.split(',');
            query += ` AND EXTRACT(YEAR FROM t.data) IN (${anos.map((_, i) => `$${paramIndex++}`).join(', ')})`;
            params.push(...anos.map(a => parseInt(a)));
        }
        
        // CORREÇÃO: Adicionando a condição para o filtro de categoria
        if (categoria_id) {
            query += ` AND t.categoria_id = $${paramIndex}`;
            params.push(categoria_id);
            paramIndex++;
        }

        if (descricao) {
            query += ` AND t.descricao ILIKE $${paramIndex}`;
            params.push(`%${descricao}%`);
            paramIndex++;
        }

        query += ' ORDER BY t.data DESC';

        const result = await pool.query(query, params);

        res.status(200).json({
            mensagem: 'Transações obtidas com sucesso!',
            transacoes: result.rows
        });

    } catch (err) {
        console.error('Erro ao listar transações:', err);
        res.status(500).json({ mensagem: 'Erro interno do servidor.' });
    }
});

// Rota para editar uma transação existente (agora usando categoria_id)
app.put('/transacoes/:id', autenticarToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { descricao, valor, tipo, data, categoria_id } = req.body;
        const usuarioId = req.usuario.id;

        if (!descricao || !valor || !tipo || !data || !categoria_id) {
            return res.status(400).json({ mensagem: 'Campos obrigatórios faltando.' });
        }

        const query = 'UPDATE transacoes SET descricao = $1, valor = $2, tipo = $3, data = $4, categoria_id = $5 WHERE id = $6 AND usuario_id = $7 RETURNING *';
        const result = await pool.query(query, [descricao, valor, tipo, data, categoria_id, id, usuarioId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ mensagem: 'Transação não encontrada ou não pertence ao usuário.' });
        }

        res.status(200).json({
            mensagem: 'Transação atualizada com sucesso!',
            transacao: result.rows[0]
        });

    } catch (err) {
        console.error('Erro ao atualizar transação:', err);
        res.status(500).json({ mensagem: 'Erro interno do servidor.' });
    }
});

// Rota para excluir uma transação (protegida)
app.delete('/transacoes/:id', autenticarToken, async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioId = req.usuario.id;

        const query = 'DELETE FROM transacoes WHERE id = $1 AND usuario_id = $2 RETURNING *';
        const result = await pool.query(query, [id, usuarioId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ mensagem: 'Transação não encontrada ou não pertence ao usuário.' });
        }

        res.status(200).json({
            mensagem: 'Transação excluída com sucesso!',
            transacaoExcluida: result.rows[0]
        });

    } catch (err) {
        console.error('Erro ao excluir transação:', err);
        res.status(500).json({ mensagem: 'Erro interno do servidor.' });
    }
});

// Rota para calcular balanço (com JOIN para obter o nome da categoria e FILTRO)
app.get('/balanco', autenticarToken, async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        // CORREÇÃO: Adicionando 'categoria_id' aos parâmetros de busca
        const { mes, ano, descricao, categoria_id } = req.query;

        let params = [usuarioId];
        let paramIndex = 2;

        let query = `
            SELECT 
                SUM(CASE WHEN t.tipo = 'receita' THEN t.valor ELSE 0 END) AS total_receitas,
                SUM(CASE WHEN t.tipo = 'despesa' THEN t.valor ELSE 0 END) AS total_despesas
            FROM transacoes t
            WHERE t.usuario_id = $1
        `;

        if (mes) {
            const meses = mes.split(',');
            query += ` AND EXTRACT(MONTH FROM t.data) IN (${meses.map((_, i) => `$${paramIndex++}`).join(', ')})`;
            params.push(...meses.map(m => parseInt(m)));
        }

        if (ano) {
            const anos = ano.split(',');
            query += ` AND EXTRACT(YEAR FROM t.data) IN (${anos.map((_, i) => `$${paramIndex++}`).join(', ')})`;
            params.push(...anos.map(a => parseInt(a)));
        }
        
        // CORREÇÃO: Adicionando a condição para o filtro de categoria
        if (categoria_id) {
            query += ` AND t.categoria_id = $${paramIndex}`;
            params.push(categoria_id);
            paramIndex++;
        }
        
        if (descricao) {
            query += ` AND t.descricao ILIKE $${paramIndex}`;
            params.push(`%${descricao}%`);
            paramIndex++;
        }

        const result = await pool.query(query, params);
        const { total_receitas, total_despesas } = result.rows[0];

        const receitas = parseFloat(total_receitas) || 0;
        const despesas = parseFloat(total_despesas) || 0;
        const saldo = receitas - despesas;

        res.status(200).json({
            receitas,
            despesas,
            saldo
        });

    } catch (err) {
        console.log('Erro ao calcular balanço:', err);
        res.status(500).json({ mensagem: 'Erro interno do servidor.' });
    }
});

// Rota para obter meses e anos com transações
app.get('/filtro-opcoes', autenticarToken, async (req, res) => {
    try {
        const usuarioId = req.usuario.id;

        // Obter anos e meses únicos
        const query = `
            SELECT 
                EXTRACT(YEAR FROM data) AS ano,
                EXTRACT(MONTH FROM data) AS mes
            FROM transacoes
            WHERE usuario_id = $1
            GROUP BY ano, mes
            ORDER BY ano DESC, mes ASC;
        `;
        const { rows: options } = await pool.query(query, [usuarioId]);

        res.status(200).json({ options });
    } catch (err) {
        console.error('Erro ao buscar opções de filtro:', err);
        res.status(500).json({ mensagem: 'Erro interno do servidor.' });
    }
});

// Iniciar o servidor
app.listen(port, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://localhost:${port} e acessível via http://192.168.0.118:${port}`);
});

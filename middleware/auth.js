const jwt = require('jsonwebtoken');

const autenticarToken = (req, res, next) => {
    // 1. Pega o token do cabeçalho da requisição
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Extrai o token do "Bearer TOKEN"

    // 2. Se não houver token, retorna erro
    if (token == null) {
        return res.status(401).json({ mensagem: 'Token de autenticação não fornecido.' });
    }

    // 3. Verifica se o token é válido
    jwt.verify(token, process.env.JWT_SECRET, (err, usuario) => {
        if (err) {
            return res.status(403).json({ mensagem: 'Token inválido.' });
        }
        // Se for válido, armazena as informações do usuário na requisição
        req.usuario = usuario;
        next(); // Chama a próxima função/rota
    });
};

module.exports = autenticarToken;
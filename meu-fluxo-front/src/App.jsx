import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './Dashboard';
import './index.css';
import Filtros from './Filtros';
import Transactions from './Transactions'; // Importando o componente Transactions

function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [erro, setErro] = useState('');

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    const endpoint = isLogin ? '/login' : '/cadastrar-usuario';
    const url = `http://192.168.0.118:3000${endpoint}`;

    const data = isLogin
      ? { email, senha }
      : { nome, email, senha };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        if (isLogin) {
          localStorage.setItem('token', result.token);
          setToken(result.token);
        } else {
          setIsLogin(true);
        }
      } else {
        setErro(result.mensagem);
      }
    } catch (error) {
      console.error('Erro de conexão:', error);
      setErro('Erro de conexão. Verifique sua rede ou o servidor.');
    }
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            token ? (
              <Dashboard onLogout={handleLogout} />
            ) : (
              <div className="center-container">
                <div className="auth-container">
                  <h1>{isLogin ? 'Login' : 'Cadastro'}</h1>
                  <form onSubmit={handleSubmit} className="form-container">
                    {!isLogin && (
                      <input
                        type="text"
                        placeholder="Nome"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        required
                      />
                    )}
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <input
                      type="password"
                      placeholder="Senha"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      required
                    />
                    {erro && <p style={{ color: 'red', textAlign: 'center' }}>{erro}</p>}
                    <button type="submit" className="btn-action">
                      {isLogin ? 'Entrar' : 'Cadastrar'}
                    </button>
                  </form>
                  <p className="link-text">
                    {isLogin ? (
                      <>Não tem uma conta? <Link to="#" onClick={() => setIsLogin(false)}>Cadastre-se</Link></>
                    ) : (
                      <>Já tem uma conta? <Link to="#" onClick={() => setIsLogin(true)}>Faça login</Link></>
                    )}
                  </p>
                </div>
              </div>
            )
          }
        />
        <Route path="/dashboard" element={<Dashboard onLogout={handleLogout} />} />
        <Route path="/filtros" element={<Filtros />} />
        <Route path="/transacoes" element={<Transactions onLogout={handleLogout} />} /> {/* Adicionando a nova rota */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;

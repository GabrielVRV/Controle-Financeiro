import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './index.css';

function Filtros({ onLogout }) {
    const [transacoes, setTransacoes] = useState([]);
    const [balanco, setBalanco] = useState(null);
    const [categorias, setCategorias] = useState([]);
    const [despesasPorCategoria, setDespesasPorCategoria] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [selectedAno, setSelectedAno] = useState('');
    const [selectedMes, setSelectedMes] = useState('');
    const [selectedCategoria, setSelectedCategoria] = useState('');
    const [descricao, setDescricao] = useState('');

    const API_URL = 'http://192.168.0.118:3000';
    const token = localStorage.getItem('token');

    const mesesMap = {
        '1': 'Janeiro', '2': 'Fevereiro', '3': 'Março', '4': 'Abril', '5': 'Maio', '6': 'Junho',
        '7': 'Julho', '8': 'Agosto', '9': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
    };

    const processDespesasPorCategoria = (transacoesFiltradas) => {
        const despesas = transacoesFiltradas.filter(t => t.tipo === 'despesa');
        const categoriaTotais = despesas.reduce((acc, transacao) => {
            const categoriaNome = transacao.categoria || 'Não Categorizado';
            acc[categoriaNome] = (acc[categoriaNome] || 0) + transacao.valor;
            return acc;
        }, {});

        const dataArray = Object.keys(categoriaTotais).map(categoria => ({
            name: categoria,
            valor: categoriaTotais[categoria]
        })).sort((a, b) => b.valor - a.valor);

        setDespesasPorCategoria(dataArray);
    };

    const fetchFilteredData = async (mes, ano, categoriaId, desc) => {
        setLoading(true);
        setError('');

        if (!token) {
            setError('Token de autenticação não encontrado.');
            onLogout();
            setLoading(false);
            return;
        }

        try {
            const params = new URLSearchParams();
            if (mes) params.append('mes', mes);
            if (ano) params.append('ano', ano);
            if (categoriaId) params.append('categoria_id', categoriaId);
            if (desc) params.append('descricao', desc);

            const queryString = params.toString();

            const transacoesResponse = await fetch(`${API_URL}/transacoes?${queryString}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const transacoesResult = await transacoesResponse.json();

            const balancoResponse = await fetch(`${API_URL}/balanco?${queryString}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const balancoResult = await balancoResponse.json();

            if (transacoesResponse.ok && balancoResponse.ok) {
                setTransacoes(transacoesResult.transacoes);
                setBalanco(balancoResult);
                processDespesasPorCategoria(transacoesResult.transacoes);
            } else {
                setError(transacoesResult.mensagem || balancoResult.mensagem || 'Erro ao carregar dados filtrados.');
            }
        } catch (err) {
            console.error(err);
            setError('Erro de conexão com o servidor.');
        } finally {
            setLoading(false);
        }
    };

    const fetchCategorias = async () => {
        try {
            const response = await fetch(`${API_URL}/categorias`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (response.ok) {
                setCategorias(result.categorias);
            } else {
                setError(result.mensagem || 'Erro ao carregar categorias.');
            }
        } catch (err) {
            setError('Erro ao carregar categorias.');
        }
    };

    const anosDisponiveis = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(String);

    useEffect(() => {
        fetchCategorias();
        fetchFilteredData('', '', '', '');
    }, []);

    const handleApplyFilters = () => {
        // Corrigido: Aqui, garantimos que o ID da categoria, e não o nome, seja passado.
        fetchFilteredData(selectedMes, selectedAno, selectedCategoria, descricao);
    };

    const handleClearFilters = () => {
        setSelectedAno('');
        setSelectedMes('');
        setSelectedCategoria('');
        setDescricao('');
        fetchFilteredData('', '', '', '');
    };

    const saldoClass = balanco?.saldo >= 0 ? 'saldo-positivo' : 'saldo-negativo';

    return (
        <div className="dashboard-container">
            <div className="header-container">
                <h1>Controle Financeiro</h1>
                <div className="header-actions">
                    <Link to="/" className="btn-action">
                        Voltar
                    </Link>
                    <button className="btn-action btn-logout-red" onClick={onLogout}>Sair</button>
                </div>
            </div>

            <div className="filters-container">
                <div className="filter-group">
                    <label>Selecione o ano:</label>
                    <select value={selectedAno} onChange={(e) => setSelectedAno(e.target.value)}>
                        <option value="">Todos</option>
                        {anosDisponiveis.map(ano => (
                            <option key={ano} value={ano}>{ano}</option>
                        ))}
                    </select>
                </div>
                <div className="filter-group">
                    <label>Selecione o mês:</label>
                    <select value={selectedMes} onChange={(e) => setSelectedMes(e.target.value)}>
                        <option value="">Todos</option>
                        {Object.entries(mesesMap).map(([key, value]) => (
                            <option key={key} value={key}>{value}</option>
                        ))}
                    </select>
                </div>
                <div className="filter-group">
                    <label>Selecione a categoria:</label>
                    <select value={selectedCategoria} onChange={(e) => setSelectedCategoria(e.target.value)}>
                        <option value="">Todas</option>
                        {categorias.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.nome}</option>
                        ))}
                    </select>
                </div>
                <div className="filter-group">
                    <label>Descrição:</label>
                    <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Buscar por descrição..." />
                </div>
                <div className="filter-buttons">
                    <button className="btn-action" onClick={handleApplyFilters}>Aplicar Filtros</button>
                    <button className="btn-clear" onClick={handleClearFilters}>Limpar Filtros</button>
                </div>
            </div>

            {loading && <p style={{ textAlign: 'center' }}>Carregando...</p>}
            {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

            <div className="balance-cards-container">
                <div className="balance-card">
                    <span className="card-title">BALANÇO TOTAL</span>
                    <span className={`card-value ${saldoClass}`}>R$ {parseFloat(balanco?.saldo || 0).toFixed(2)}</span>
                </div>
                <div className="balance-card receita">
                    <span className="card-title">RECEITA TOTAL</span>
                    <span className="card-value receita">R$ {parseFloat(balanco?.receitas || 0).toFixed(2)}</span>
                </div>
                <div className="balance-card despesa">
                    <span className="card-title">GASTO TOTAL</span>
                    <span className="card-value despesa">R$ {parseFloat(balanco?.despesas || 0).toFixed(2)}</span>
                </div>
            </div>

            <div className="chart-and-transactions-container">
                <div className="chart-container despesa-categoria">
                    <h3>DESPESA POR CATEGORIA</h3>
                    {despesasPorCategoria.length > 0 ? (
                        <ul className="category-list">
                            {despesasPorCategoria.map((item, index) => (
                                <li key={index} className="category-item">
                                    <span className="category-name">{item.name.toUpperCase()}:</span>
                                    <span className="category-value">R$ {parseFloat(item.valor).toFixed(2)}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>Nenhuma despesa para exibir.</p>
                    )}
                </div>

                <div className="transactions-container">
                    <h2>Transações no Período</h2>
                    <ul className="transactions-list">
                        {transacoes.length > 0 ? (
                            transacoes.map(t => (
                                <li key={t.id} className={`transaction-item ${t.tipo}`}>
                                    <div className="transaction-details">
                                        <span className="transaction-description">{t.descricao}</span>
                                        {t.categoria && <span className="transaction-category">Categoria: {t.categoria}</span>}
                                        <span className={`transaction-value ${t.tipo}`}>{t.tipo === 'despesa' ? '-' : '+'} R$ {parseFloat(t.valor).toFixed(2)}</span>
                                        <span className="transaction-date">{new Date(t.data).toLocaleDateString()}</span>
                                    </div>
                                </li>
                            ))
                        ) : (
                            <p>Nenhuma transação encontrada para este período.</p>
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default Filtros;
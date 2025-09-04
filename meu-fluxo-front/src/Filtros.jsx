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

    /**
     * Processa os dados das transações para gerar o total de despesas por categoria.
     * @param {Array} transacoesFiltradas - A lista de transações filtradas.
     * @param {Array} categoriasData - A lista de categorias.
     */
    const processDespesasPorCategoria = (transacoesFiltradas, categoriasData) => {
        const despesas = transacoesFiltradas.filter(t => t.tipo === 'despesa');
        
        // Objeto para armazenar o total de despesas por categoria
        const categoriaTotais = despesas.reduce((acc, transacao) => {
            const categoriaObj = categoriasData.find(cat => cat.id === transacao.categoria_id);
            const categoriaNome = categoriaObj ? categoriaObj.nome : 'Não Categorizado';
            
            // Soma o valor da transação ao total da categoria existente
            acc[categoriaNome] = (acc[categoriaNome] || 0) + parseFloat(transacao.valor);
            return acc;
        }, {});

        // Transforma o objeto em um array para exibição
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
            // CORREÇÃO: Adiciona o parâmetro de categoria APENAS se um valor válido for selecionado.
            if (categoriaId) {
                params.append('categoria_id', categoriaId);
            }
            if (desc) params.append('descricao', desc);
            const queryString = params.toString();

            // Busca todas as transações, balanço e categorias em paralelo
            const [transacoesResponse, balancoResponse, categoriasResponse] = await Promise.all([
                fetch(`${API_URL}/transacoes?${queryString}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/balanco?${queryString}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/categorias`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            const transacoesResult = await transacoesResponse.json();
            const balancoResult = await balancoResponse.json();
            const categoriasResult = await categoriasResponse.json();

            if (transacoesResponse.ok && balancoResponse.ok && categoriasResponse.ok) {
                setTransacoes(transacoesResult.transacoes);
                setBalanco(balancoResult);
                setCategorias(categoriasResult.categorias);
                // Chama a função de processamento com os dados mais recentes
                processDespesasPorCategoria(transacoesResult.transacoes, categoriasResult.categorias);
            } else {
                setError('Erro ao carregar dados filtrados.');
                if (transacoesResponse.status === 401 || transacoesResponse.status === 403) {
                    onLogout();
                }
            }
        } catch (err) {
            console.error(err);
            setError('Erro de conexão com o servidor.');
        } finally {
            setLoading(false);
        }
    };

    const anosDisponiveis = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(String);

    useEffect(() => {
        // Chamada inicial para carregar todos os dados ao iniciar a página
        fetchFilteredData('', '', '', '');
    }, []);

    const handleApplyFilters = () => {
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
                                        {t.categoria_id && <span className="transaction-category">Categoria: {categorias.find(cat => cat.id === t.categoria_id)?.nome || 'Não Categorizado'}</span>}
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
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function Dashboard({ onLogout }) {
    const [perfil, setPerfil] = useState(null);
    const [balanco, setBalanco] = useState(null);
    const [transacoes, setTransacoes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [transacaoToDelete, setTransacaoToDelete] = useState(null);

    const [novaDescricao, setNovaDescricao] = useState('');
    const [novoValor, setNovoValor] = useState('');
    const [novoTipo, setNovoTipo] = useState('despesa');
    const [novaData, setNovaData] = useState('');
    const [novaCategoriaId, setNovaCategoriaId] = useState('');
    const [categorias, setCategorias] = useState([]);

    const [editingId, setEditingId] = useState(null);

    const [balancoMensalData, setBalancoMensalData] = useState([]);
    const [despesasPorCategoria, setDespesasPorCategoria] = useState([]);

    const API_URL = 'http://192.168.0.118:3000';
    const token = localStorage.getItem('token');

    const mesesMap = {
        1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril', 5: 'Maio', 6: 'Junho',
        7: 'Julho', 8: 'Agosto', 9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro'
    };

    /**
     * Processa os dados das transações para gerar o gráfico de balanço mensal.
     * @param {Array} transacoes - A lista de transações.
     */
    const processBalancoMensalData = (transacoes) => {
        const dataPorMes = transacoes.reduce((acc, transacao) => {
            const data = new Date(transacao.data);
            const mes = data.getMonth() + 1;
            const ano = data.getFullYear();
            const chave = `${mes}-${ano}`;

            if (!acc[chave]) {
                acc[chave] = { mes: mesesMap[mes], ano, receitas: 0, despesas: 0 };
            }

            if (transacao.tipo === 'receita') {
                acc[chave].receitas += parseFloat(transacao.valor);
            } else if (transacao.tipo === 'despesa') {
                acc[chave].despesas += parseFloat(transacao.valor);
            }

            return acc;
        }, {});

        const dataArray = Object.values(dataPorMes).sort((a, b) => {
            if (a.ano !== b.ano) return a.ano - b.ano;
            return Object.keys(mesesMap).find(key => mesesMap[key] === a.mes) - Object.keys(mesesMap).find(key => mesesMap[key] === b.mes);
        });

        setBalancoMensalData(dataArray);
    };

    /**
     * Processa os dados das transações para gerar o total de despesas por categoria.
     * @param {Array} transacoes - A lista de transações.
     */
    const processDespesasPorCategoria = (transacoes) => {
        const despesas = transacoes.filter(t => t.tipo === 'despesa');
        const categoriaTotais = despesas.reduce((acc, transacao) => {
            const categoriaNome = transacao.categoria || 'Não Categorizado';
            acc[categoriaNome] = (acc[categoriaNome] || 0) + parseFloat(transacao.valor);
            return acc;
        }, {});

        const dataArray = Object.keys(categoriaTotais).map(categoria => ({
            name: categoria,
            valor: categoriaTotais[categoria]
        })).sort((a, b) => b.valor - a.valor);

        setDespesasPorCategoria(dataArray);
    };

    const fetchAllData = async () => {
        try {
            const [perfilResponse, balancoResponse, transacoesResponse, categoriasResponse] = await Promise.all([
                fetch(`${API_URL}/meu-perfil`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/balanco`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/transacoes`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/categorias`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            const perfilResult = await perfilResponse.json();
            const balancoResult = await balancoResponse.json();
            const transacoesResult = await transacoesResponse.json();
            const categoriasResult = await categoriasResponse.json();

            if (perfilResponse.ok && balancoResponse.ok && transacoesResponse.ok && categoriasResponse.ok) {
                setPerfil(perfilResult.usuario);
                setBalanco(balancoResult);
                setTransacoes(transacoesResult.transacoes);
                setCategorias(categoriasResult.categorias);
                processBalancoMensalData(transacoesResult.transacoes);
                processDespesasPorCategoria(transacoesResult.transacoes);
            } else {
                setError('Erro ao carregar os dados.');
                if (perfilResponse.status === 401 || perfilResponse.status === 403) {
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

    useEffect(() => {
        if (!token) {
            onLogout();
            return;
        }
        fetchAllData();
    }, [token, onLogout]);

    const handleOpenAddEditModal = (transacao = null) => {
        if (transacao) {
            setEditingId(transacao.id);
            setNovaDescricao(transacao.descricao);
            setNovoValor(transacao.valor);
            setNovoTipo(transacao.tipo);
            setNovaData(transacao.data.split('T')[0]);
            setNovaCategoriaId(transacao.categoria_id);
        } else {
            setEditingId(null);
            setNovaDescricao('');
            setNovoValor('');
            setNovoTipo('despesa');
            setNovaData('');
            setNovaCategoriaId('');
        }
        setIsAddEditModalOpen(true);
    };

    const handleCloseAddEditModal = () => {
        setIsAddEditModalOpen(false);
        setEditingId(null);
    };

    const handleAddOrUpdateTransaction = async (e) => {
        e.preventDefault();
        try {
            const method = editingId ? 'PUT' : 'POST';
            const url = editingId ? `${API_URL}/transacoes/${editingId}` : `${API_URL}/transacoes`;

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    descricao: novaDescricao,
                    valor: parseFloat(novoValor),
                    tipo: novoTipo,
                    data: novaData,
                    categoria_id: novoTipo === 'despesa' ? novaCategoriaId : null,
                }),
            });

            if (response.ok) {
                handleCloseAddEditModal();
                await fetchAllData();
            } else {
                const result = await response.json();
                setError(result.mensagem || 'Erro ao salvar transação.');
            }
        } catch (err) {
            console.error(err);
            setError('Erro de conexão ao salvar transação.');
        }
    };
    
    const handleOpenConfirmModal = (transacaoId) => {
        setTransacaoToDelete(transacaoId);
        setIsConfirmModalOpen(true);
    };

    const handleCloseConfirmModal = () => {
        setTransacaoToDelete(null);
        setIsConfirmModalOpen(false);
    };

    const handleConfirmDelete = async () => {
        try {
            const response = await fetch(`${API_URL}/transacoes/${transacaoToDelete}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                await fetchAllData();
            } else {
                const result = await response.json();
                setError(result.mensagem || 'Erro ao excluir transação.');
            }
        } catch (err) {
            console.error(err);
            setError('Erro de conexão ao excluir transação.');
        } finally {
            handleCloseConfirmModal();
        }
    };
    
    if (loading) {
        return <div style={{ textAlign: 'center' }}>Carregando...</div>;
    }

    if (error) {
        return <div style={{ textAlign: 'center', color: 'red' }}>{error}</div>;
    }

    const saldoClass = balanco?.saldo >= 0 ? 'saldo-positivo' : 'saldo-negativo';
    const transacoesLimitadas = transacoes.slice(0, 5);

    return (
        <div className="dashboard-container">
            <div className="header-container">
                <h1>Bem-vindo, {perfil?.nome}!</h1>
                <div className="header-actions">
                    <button className="btn-action" onClick={() => handleOpenAddEditModal()}>Adicionar Transação</button>
                    <Link to="/transacoes" className="btn-action">
                        Ver Transações
                    </Link>
                    <Link to="/filtros" className="btn-action">
                        Relatórios
                    </Link>
                    <button className="btn-logout-red" onClick={onLogout}>Sair</button>
                </div>
            </div>
            
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

            <div className="charts-and-list-container">
                <div className="chart-container balanco-mensal">
                    <h3>BALANÇO POR MÊS</h3>
                    {balancoMensalData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={balancoMensalData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <XAxis dataKey="mes" />
                                <YAxis />
                                <Tooltip formatter={(value) => `R$ ${parseFloat(value).toFixed(2)}`} />
                                <Legend />
                                <Bar dataKey="receitas" fill="#28a745" name="Receitas" />
                                <Bar dataKey="despesas" fill="#dc3545" name="Despesas" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p>Nenhum dado de balanço mensal disponível.</p>
                    )}
                </div>

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
            </div>

            <div className="transactions-container">
                <div className="transactions-header">
                    <h2>ÚLTIMAS TRANSAÇÕES</h2>
                    <Link to="/transacoes" className="view-all-link">VER TODAS</Link>
                </div>
                <ul className="transactions-list">
                    {transacoesLimitadas.length > 0 ? (
                        transacoesLimitadas.map(t => (
                            <li key={t.id} className={`transaction-item ${t.tipo}`}>
                                <div className="transaction-details">
                                    <span className="transaction-description">{t.descricao}</span>
                                    {t.categoria && <span className="transaction-category">Categoria: {t.categoria}</span>}
                                    <span className={`transaction-value ${t.tipo}`}>{t.tipo === 'despesa' ? '-' : '+'} R$ {parseFloat(t.valor).toFixed(2)}</span>
                                    <span className="transaction-date">{new Date(t.data).toLocaleDateString()}</span>
                                </div>
                                <div className="transaction-actions">
                                    <button className="btn-edit" onClick={() => handleOpenAddEditModal(t)}>Editar</button>
                                    <button className="btn-delete" onClick={() => handleOpenConfirmModal(t.id)}>Excluir</button>
                                </div>
                            </li>
                        ))
                    ) : (
                        <p>Nenhuma transação encontrada.</p>
                    )}
                </ul>
            </div>

            {isAddEditModalOpen && (
                <div className="modal-overlay show">
                    <div className="modal-content">
                        <button className="modal-close-btn" onClick={handleCloseAddEditModal}>&times;</button>
                        <h2>{editingId ? 'Editar Transação' : 'Adicionar Nova Transação'}</h2>
                        <form onSubmit={handleAddOrUpdateTransaction} className="form-add-transaction">
                            <input type="text" placeholder="Descrição" value={novaDescricao} onChange={(e) => setNovaDescricao(e.target.value)} required />
                            <input type="number" step="0.01" placeholder="Valor" value={novoValor} onChange={(e) => setNovoValor(e.target.value)} required />
                            <select value={novoTipo} onChange={(e) => setNovoTipo(e.target.value)} required>
                                <option value="despesa">Despesa</option>
                                <option value="receita">Receita</option>
                            </select>
                            <input type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} required />
                            {novoTipo === 'despesa' && (
                                <select value={novaCategoriaId} onChange={(e) => setNovaCategoriaId(e.target.value)} required>
                                    <option value="" disabled>Selecione uma Categoria</option>
                                    {categorias.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.nome}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <button type="submit" className="btn-action">{editingId ? 'Salvar Edição' : 'Adicionar'}</button>
                        </form>
                    </div>
                </div>
            )}

            {isConfirmModalOpen && (
                <div className="modal-overlay show">
                    <div className="modal-content">
                        <h2>Confirmar Exclusão</h2>
                        <p>Você tem certeza que deseja excluir esta transação?</p>
                        <div className="modal-actions">
                            <button className="btn-action" onClick={handleCloseConfirmModal}>Cancelar</button>
                            <button className="btn-action btn-delete" onClick={handleConfirmDelete}>Confirmar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Dashboard;

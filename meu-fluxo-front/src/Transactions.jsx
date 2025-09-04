import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Importando useNavigate
import './index.css';

function Transactions({ onLogout }) {
    const [transacoes, setTransacoes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filterType, setFilterType] = useState('todas');
    
    const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [transacaoToDelete, setTransacaoToDelete] = useState(null);

    const [novaDescricao, setNovaDescricao] = useState('');
    const [novoValor, setNovoValor] = useState('');
    const [novoTipo, setNovoTipo] = useState('despesa');
    const [novaData, setNovaData] = useState('');
    const [editingId, setEditingId] = useState(null);

    const API_URL = 'http://192.168.0.118:3000';
    const token = localStorage.getItem('token');
    
    // Inicializando a função de navegação
    const navigate = useNavigate();

    const fetchTransactions = async () => {
        try {
            const transacoesResponse = await fetch(`${API_URL}/transacoes`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const transacoesResult = await transacoesResponse.json();

            if (transacoesResponse.ok) {
                setTransacoes(transacoesResult.transacoes);
            } else {
                setError('Erro ao carregar as transações.');
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

    useEffect(() => {
        if (!token) {
            onLogout();
            return;
        }
        fetchTransactions();
    }, [token, onLogout]);

    // Funções para o modal de Adicionar/Editar
    const handleOpenAddEditModal = (transacao = null) => {
        if (transacao) {
            setEditingId(transacao.id);
            setNovaDescricao(transacao.descricao);
            setNovoValor(transacao.valor);
            setNovoTipo(transacao.tipo);
            setNovaData(transacao.data.split('T')[0]);
        } else {
            setEditingId(null);
            setNovaDescricao('');
            setNovoValor('');
            setNovoTipo('despesa');
            setNovaData('');
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
                }),
            });

            if (response.ok) {
                handleCloseAddEditModal();
                await fetchTransactions();
            } else {
                const result = await response.json();
                setError(result.mensagem || 'Erro ao salvar transação.');
            }
        } catch (err) {
            console.error(err);
            setError('Erro de conexão ao salvar transação.');
        }
    };
    
    // Funções para o novo modal de confirmação de exclusão
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
                await fetchTransactions();
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

    // Filtra as transações com base no estado `filterType`
    const transacoesFiltradas = transacoes.filter(t => {
        if (filterType === 'todas') return true;
        return t.tipo === filterType;
    });

    if (loading) {
        return <div style={{ textAlign: 'center' }}>Carregando...</div>;
    }

    if (error) {
        return <div style={{ textAlign: 'center', color: 'red' }}>{error}</div>;
    }

    return (
        <div className="dashboard-container">
            <div className="header-container">
                <h1>Todas as Transações</h1>
                <div className="header-actions">
                    {/* Substituindo o <Link> por um botão com a função de navegação */}
                    <button className="btn-action" onClick={() => navigate('/dashboard')}>
                        Voltar para o Dashboard
                    </button>
                    <button className="btn-action" onClick={onLogout}>Sair</button>
                </div>
            </div>
            
            <div className="transactions-container">
                <div className="transactions-header">
                    <h2>Filtro por Tipo</h2>
                    <div className="filter-buttons">
                        <button 
                            className={`btn-filter-option ${filterType === 'todas' ? 'selected' : ''}`}
                            onClick={() => setFilterType('todas')}
                        >
                            Todas
                        </button>
                        <button 
                            className={`btn-filter-option ${filterType === 'receita' ? 'selected' : ''}`}
                            onClick={() => setFilterType('receita')}
                        >
                            Receitas
                        </button>
                        <button 
                            className={`btn-filter-option ${filterType === 'despesa' ? 'selected' : ''}`}
                            onClick={() => setFilterType('despesa')}
                        >
                            Despesas
                        </button>
                    </div>
                </div>

                <ul className="transactions-list">
                    {transacoesFiltradas.length > 0 ? (
                        transacoesFiltradas.map(t => (
                            <li key={t.id} className={`transaction-item ${t.tipo}`}>
                                <div className="transaction-details">
                                    <span className="transaction-description">{t.descricao}</span>
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
                        <p>Nenhuma transação encontrada para este filtro.</p>
                    )}
                </ul>
            </div>

            {/* Modal de Adicionar/Editar Transação */}
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
                            <button type="submit" className="btn-action">{editingId ? 'Salvar Edição' : 'Adicionar'}</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Exclusão */}
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

export default Transactions;

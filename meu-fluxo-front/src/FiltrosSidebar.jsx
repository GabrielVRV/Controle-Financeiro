import React, { useState, useEffect } from 'react';
import './index.css';

function FiltrosSidebar({ isOpen, onClose, onApply, initialMeses, initialAnos, initialDescricao }) {
  const [availableOptions, setAvailableOptions] = useState([]);
  const [selectedMeses, setSelectedMeses] = useState(initialMeses);
  const [selectedAnos, setSelectedAnos] = useState(initialAnos);
  const [descricao, setDescricao] = useState(initialDescricao);
  const [uniqueDescricoes, setUniqueDescricoes] = useState([]);

  const API_URL = 'http://192.168.0.118:3000';
  const token = localStorage.getItem('token');

  const mesesMap = {
    '1': 'Jan', '2': 'Fev', '3': 'Mar', '4': 'Abr', '5': 'Mai', '6': 'Jun',
    '7': 'Jul', '8': 'Ago', '9': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez'
  };

  const fetchFiltrosOptions = async () => {
    try {
      const response = await fetch(`${API_URL}/filtro-opcoes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (response.ok) {
        setAvailableOptions(result.options);
      }
    } catch (err) {
      console.error("Erro ao carregar opções de filtro", err);
    }
  };

  const fetchDescricoes = async () => {
    try {
      const response = await fetch(`${API_URL}/transacoes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (response.ok) {
        const descricoes = new Set(result.transacoes.map(t => t.descricao));
        setUniqueDescricoes(Array.from(descricoes));
      }
    } catch (err) {
      console.error("Erro ao carregar descrições", err);
    }
  };

  useEffect(() => {
    fetchFiltrosOptions();
    fetchDescricoes();
  }, []);

  useEffect(() => {
    setSelectedMeses(initialMeses);
    setSelectedAnos(initialAnos);
    setDescricao(initialDescricao);
  }, [initialMeses, initialAnos, initialDescricao]);

  const toggleSelect = (selectedSet, value, setFunc) => {
    const newSet = new Set(selectedSet);
    if (newSet.has(value)) {
      newSet.delete(value);
    } else {
      newSet.add(value);
    }
    setFunc(newSet);
  };

  const handleToggleAll = (type) => {
    if (type === 'meses') {
      const allMonths = new Set(availableOptions.map(o => o.mes.toString()));
      setSelectedMeses(allMonths.size === selectedMeses.size ? new Set() : allMonths);
    } else if (type === 'anos') {
      const allYears = new Set(availableOptions.map(o => o.ano.toString()));
      setSelectedAnos(allYears.size === selectedAnos.size ? new Set() : allYears);
    }
  };

  const handleApplyClick = () => {
    onApply(Array.from(selectedMeses), Array.from(selectedAnos), descricao);
  };
  
  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'show' : ''}`} onClick={onClose}></div>
      <div className={`sidebar-container ${isOpen ? 'open' : ''}`}>
        <button onClick={onClose} className="btn-close-sidebar">&times;</button>
        <div className="filter-content">
          <h2>Filtros</h2>

          <div className="filter-section">
            <h3>Anos</h3>
            <div className="filter-buttons">
              <button 
                className={`btn-filter-option ${selectedAnos.size > 0 && selectedAnos.size === [...new Set(availableOptions.map(o => o.ano))].length ? 'selected' : ''}`}
                onClick={() => handleToggleAll('anos')}
              >
                Todos
              </button>
              {[...new Set(availableOptions.map(o => o.ano))].sort((a, b) => b - a).map(ano => (
                <button
                  key={ano}
                  onClick={() => toggleSelect(selectedAnos, ano.toString(), setSelectedAnos)}
                  className={`btn-filter-option ${selectedAnos.has(ano.toString()) ? 'selected' : ''}`}
                >
                  {ano}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <h3>Meses</h3>
            <div className="filter-buttons">
              <button 
                className={`btn-filter-option ${selectedMeses.size > 0 && selectedMeses.size === [...new Set(availableOptions.map(o => o.mes))].length ? 'selected' : ''}`}
                onClick={() => handleToggleAll('meses')}
              >
                Todos
              </button>
              {[...new Set(availableOptions.map(o => o.mes))].sort((a, b) => a - b).map(mes => (
                <button
                  key={mes}
                  onClick={() => toggleSelect(selectedMeses, mes.toString(), setSelectedMeses)}
                  className={`btn-filter-option ${selectedMeses.has(mes.toString()) ? 'selected' : ''}`}
                >
                  {mesesMap[mes]}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <h3>Descrição</h3>
            <input
              list="descricoes-list"
              id="descricao"
              placeholder="Ex: Cartão, Mercado"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="description-input"
            />
            <datalist id="descricoes-list">
              {uniqueDescricoes.map((d, index) => (
                <option key={index} value={d} />
              ))}
            </datalist>
          </div>
          
          <button onClick={handleApplyClick} className="btn-action btn-filter">Aplicar Filtros</button>
        </div>
      </div>
    </>
  );
}

export default FiltrosSidebar;

import React, { useState } from 'react';
import Graph2D from './Graph2D';
import InfoPanel from './InfoPanel';
import { companiesData, personList, personToCompanies } from '../data.js';

const PanelCard = ({ title, children, className = '' }) => (
  <section className={`panel-card ${className}`}>
    <div className="panel-title">{title}</div>
    {children}
  </section>
);

const NameListPanel = ({ onSelectNode }) => (
  <PanelCard title="Names" className="name-list-panel">
    <div className="name-list-group">
      <div className="name-group-title">Directors</div>
      {personList.map((person) => (
        <button key={person} className="name-button" onClick={() => onSelectNode({ type: 'person', name: person, companies: personToCompanies.get(person) || [] })}>
          <span className="name-bullet">👤</span>
          {person}
        </button>
      ))}
    </div>
    <div className="divider" />
    <div className="name-list-group">
      <div className="name-group-title">Companies</div>
      {companiesData.map((company) => (
        <button key={company.id} className="name-button" onClick={() => onSelectNode({ type: 'company', name: company.name, directors: company.directors, compType: company.type })}>
          <span className="name-bullet">🏢</span>
          {company.name}
        </button>
      ))}
    </div>
  </PanelCard>
);

const MainPage = () => {
  const [selectedNode, setSelectedNode] = useState(null);

  return (
    <main className="page-shell">
      <aside className="sidebar sidebar-left">
        <NameListPanel onSelectNode={setSelectedNode} />
      </aside>

      <section className="main-content">
        <PanelCard title="Network Map" className="graph-card">
          <div className="graph-card-description">
          </div>
          <Graph2D onNodeClick={setSelectedNode} />
        </PanelCard>
      </section>

      <aside className="sidebar sidebar-right">
        <PanelCard title="Entity Details" className="details-card">
          <InfoPanel selectedNode={selectedNode} />
        </PanelCard>
      </aside>
    </main>
  );
};

export default MainPage;

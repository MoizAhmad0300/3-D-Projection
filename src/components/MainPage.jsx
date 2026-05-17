import React, { useMemo, useState } from 'react';
import Graph2D from './Graph2D';
import InfoPanel from './InfoPanel';
import { companiesData, personList, personToCompanies } from '../data.js';

const MainPage = ({ onBackHome }) => {
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [graphCommand, setGraphCommand] = useState(null);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredPeople = useMemo(
    () => personList.filter((person) => person.toLowerCase().includes(normalizedSearch)),
    [normalizedSearch]
  );

  const filteredCompanies = useMemo(
    () =>
      companiesData.filter((company) => {
        const haystack = [
          company.name,
          company.type,
          ...company.directors,
        ].join(' ').toLowerCase();

        return haystack.includes(normalizedSearch);
      }),
    [normalizedSearch]
  );

  const selectedNodeId = selectedNode
    ? selectedNode.type === 'person'
      ? `p_${selectedNode.name.replace(/\s/g, '')}`
      : selectedNode.id
    : null;

  const exportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      companies: companiesData,
      people: personList.map((person) => ({
        name: person,
        companies: personToCompanies.get(person) || [],
      })),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = 'corporate-network-data.json';
    link.click();
    URL.revokeObjectURL(href);
  };

  const issueGraphCommand = (type) => {
    setGraphCommand({ type, stamp: Date.now() });
  };

  return (
    <main className="network-shell">
      <header className="network-topbar">
        <div className="brand-lockup">
          <button type="button" className="brand-mark" onClick={onBackHome} aria-label="Back to home">
            N
          </button>
          <div>
            <div className="brand-title">NAAR</div>
            <div className="brand-subtitle">Network Analysis Platform</div>
          </div>
        </div>

        <div className="topbar-actions">
          <label className="search-field">
            <span className="search-field-label">Search</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="People, companies, or type"
            />
          </label>

          <button type="button" className="ghost-action" onClick={exportData}>
            Export Data
          </button>
          <button type="button" className="ghost-action" onClick={() => issueGraphCommand('reset')}>
            Reset View
          </button>
          <button type="button" className="ghost-action" onClick={onBackHome}>
            Home
          </button>
        </div>
      </header>

      <section className="network-layout">
        <aside className="panel sidebar-panel">
          <div className="panel-header">
            <div>
              <h2>Directors</h2>
              <p>Connected individuals in the directory</p>
            </div>
            <span className="panel-count">{filteredPeople.length}</span>
          </div>

          <div className="scroll-list">
            {filteredPeople.map((person) => {
              const companies = personToCompanies.get(person) || [];
              const isActive = selectedNode?.type === 'person' && selectedNode.name === person;

              return (
                <button
                  key={person}
                  type="button"
                  className={`list-card ${isActive ? 'is-active' : ''}`}
                  onClick={() => setSelectedNode({ type: 'person', name: person, companies })}
                >
                  <div className="list-card-row">
                    <div>
                      <div className="list-card-title">{person}</div>
                      <div className="list-card-meta">Director / Partner</div>
                    </div>
                    <span className="list-card-tag">{companies.length}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="panel graph-panel-shell">
          <div className="panel-header">
            <div>
              <h2>Network Map</h2>
              <p>Interactive relationship view with working search and selection</p>
            </div>
            <div className="graph-toolbar">
              <button type="button" className="mini-action" onClick={() => issueGraphCommand('zoomIn')}>
                +
              </button>
              <button type="button" className="mini-action" onClick={() => issueGraphCommand('zoomOut')}>
                -
              </button>
              <button type="button" className="mini-action" onClick={() => issueGraphCommand('reset')}>
                Reset
              </button>
            </div>
          </div>

          <Graph2D
            onNodeClick={setSelectedNode}
            command={graphCommand}
            selectedNodeId={selectedNodeId}
            filterTerm={normalizedSearch}
          />
        </section>

        <aside className="panel details-panel">
          <div className="panel-header">
            <div>
              <h2>Companies</h2>
              <p>Organizations connected to the selected network</p>
            </div>
            <span className="panel-count">{filteredCompanies.length}</span>
          </div>

          <div className="scroll-list company-list">
            {filteredCompanies.map((company) => {
              const isActive = selectedNode?.type === 'company' && selectedNode.id === company.id;

              return (
                <button
                  key={company.id}
                  type="button"
                  className={`company-card ${isActive ? 'is-active' : ''}`}
                  onClick={() =>
                    setSelectedNode({
                      type: 'company',
                      id: company.id,
                      name: company.name,
                      directors: company.directors,
                      compType: company.type,
                    })
                  }
                >
                  <div className="company-card-head">
                    <div className="company-card-title">{company.name}</div>
                    <span className="company-type">{company.type}</span>
                  </div>
                  <div className="company-card-meta">
                    {company.directors.length > 0
                      ? `${company.directors.length} connected directors / partners`
                      : 'No directors or partners listed'}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="entity-panel">
            <InfoPanel selectedNode={selectedNode} />
          </div>
        </aside>
      </section>
    </main>
  );
};

export default MainPage;

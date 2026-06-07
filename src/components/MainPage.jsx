import React, { useEffect, useMemo, useRef, useState } from 'react';
import Graph2D from './Graph2D';
import InfoPanel from './InfoPanel';
import { paragonProcessed, safariProcessed } from '../data.js';

const MainPage = ({ onBackHome, onToggleLightMode, lightMode }) => {
  useEffect(() => {
    const handler = () => {
      if (typeof onToggleLightMode === 'function') onToggleLightMode();
    };

    window.addEventListener('naar:toggle-light-mode', handler);
    return () => window.removeEventListener('naar:toggle-light-mode', handler);
  }, [onToggleLightMode]);

  const [selectedGroup, setSelectedGroup] = useState('paragon-group');
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [graphCommand, setGraphCommand] = useState(null);
  const [dashboardTab, setDashboardTab] = useState(null);
  const [graphFullscreen, setGraphFullscreen] = useState(false);

  const workspacePanelRef = useRef(null);
  const entityRelationshipRef = useRef(null);

  // Switch datasets based on active selectedGroup
  const activeDataset = useMemo(() => {
    return selectedGroup === 'safari-group' ? safariProcessed : paragonProcessed;
  }, [selectedGroup]);

  const activeCompaniesData = activeDataset.companiesData;
  const activePersonList = activeDataset.personList;
  const activePersonToCompanies = activeDataset.personToCompanies;
  const activeGraphNodes = activeDataset.graphNodes;
  const activeLinks = activeDataset.links;

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const groupedCompanies = useMemo(() => {
    return [
      {
        id: 'paragon-group',
        label: 'PARAGON GROUP',
        companies: paragonProcessed.companiesData,
        directors: paragonProcessed.personList,
      },
      {
        id: 'safari-group',
        label: 'SAFARI GROUP',
        companies: safariProcessed.companiesData,
        directors: safariProcessed.personList,
      },
    ];
  }, []);

  const filteredCompanies = useMemo(
    () =>
      activeCompaniesData.filter((company) => {
        const haystack = [company.name, company.type, ...company.directors].join(' ').toLowerCase();
        return haystack.includes(normalizedSearch);
      }),
    [normalizedSearch, activeCompaniesData]
  );

  const filteredPeople = useMemo(
    () => activePersonList.filter((person) => person.toLowerCase().includes(normalizedSearch)),
    [normalizedSearch, activePersonList]
  );

  const filteredGroups = useMemo(
    () =>
      groupedCompanies.filter((group) => {
        if (!normalizedSearch) return true;
        const haystack = [group.label, ...group.companies.map((company) => company.name), ...group.directors].join(' ').toLowerCase();
        return haystack.includes(normalizedSearch);
      }),
    [groupedCompanies, normalizedSearch]
  );

  const activeGroup = useMemo(() => {
    if (!selectedGroup) return null;
    return groupedCompanies.find((group) => group.id === selectedGroup) || null;
  }, [groupedCompanies, selectedGroup]);

  const selectedNodeId = selectedNode
    ? selectedNode.type === 'person'
      ? `p_${selectedNode.name.replace(/\s/g, '')}`
      : selectedNode.id
    : null;

  const issueGraphCommand = (type) => {
    setGraphCommand({ type, stamp: Date.now() });
  };

  const handleEntitySelect = (node) => {
    setSelectedNode(node);
    requestAnimationFrame(() => {
      entityRelationshipRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const createPersonNode = (person) => ({
    id: `p_${person.replace(/\s/g, '')}`,
    name: person,
    type: 'person',
    companies: activePersonToCompanies.get(person) || [],
  });

  const findPersonNode = (person) => createPersonNode(person);

  const findCompanyNode = (companyId) => {
    const company = activeCompaniesData.find((item) => item.id === companyId);
    return company
      ? {
        ...company,
        type: 'company',
        compType: company.type,
      }
      : null;
  };

  const handleTabChange = (tab) => {
    if (tab === 'home') {
      onBackHome();
      return;
    }

    if (dashboardTab === tab) {
      setDashboardTab(null);
      setSelectedNode(null);
      issueGraphCommand('reset');
      return;
    }

    setDashboardTab(tab);

    if (tab === 'network') {
      setSelectedNode(null);
      issueGraphCommand('reset');
    }
  };

  const clearSelection = () => {
    setSelectedNode(null);
    issueGraphCommand('reset');
  };

  const toggleGraphFullscreen = () => {
    setGraphFullscreen((current) => !current);
  };

  const renderEntityButton = (item, type) => {
    const isCompany = type === 'company';
    const node = isCompany ? findCompanyNode(item.id) : findPersonNode(item);
    if (!node) return null;

    const isActive = selectedNodeId === node.id;

    return (
      <button
        key={node.id}
        type="button"
        className={`entity-action-card${isActive ? ' is-active' : ''}`}
        onClick={() => handleEntitySelect(node)}
      >
        <span className="entity-action-name">{isCompany ? item.name : item}</span>
        <span className="entity-action-meta">
          {isCompany ? `${item.type} company` : `${node.companies.length} linked companies`}
        </span>
      </button>
    );
  };

  const renderGroupOverview = () => (
    <div className="workspace-section workspace-section-groups animate-fade-in">
      <div className="workspace-header">
        <div>
          <h2>Groups</h2>
          <p>Select a group button to load and explore its independent company-director network.</p>
        </div>
      </div>

      <div className="group-grid">
        {filteredGroups.map((group) => (
          <button
            key={group.id}
            type="button"
            className={`group-card${selectedGroup === group.id ? ' is-active' : ''}`}
            onClick={() => {
              setSelectedGroup(group.id);
              setSelectedNode(null);
              issueGraphCommand('reset');
            }}
          >
            <span className="group-card-title">{group.label}</span>
            <span className="group-card-meta">{group.companies.length} companies | {group.directors.length} directors</span>
          </button>
        ))}
      </div>

      {activeGroup ? (
        <div className="group-detail-shell">
          <div className="workspace-subheader">
            <h3>{activeGroup.label} Relationships</h3>
            <p>Click any company or director to open details and focus the network map.</p>
          </div>

          <div className="entity-columns">
            <section className="entity-column">
              <div className="entity-column-header">Companies</div>
              <div className="entity-column-scroll">
                {activeGroup.companies.map((company) => renderEntityButton(company, 'company'))}
              </div>
            </section>

            <section className="entity-column">
              <div className="entity-column-header">Directors</div>
              <div className="entity-column-scroll">
                {activeGroup.directors.map((person) => renderEntityButton(person, 'person'))}
              </div>
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );

  const renderFlatEntityList = (title, description, items, type) => (
    <div className="workspace-section animate-fade-in">
      <div className="workspace-header">
        <div>
          <h2>{title} ({activeGroup?.label || ''})</h2>
          <p>{description}</p>
        </div>
      </div>
      <div className="single-entity-scroll">
        {items.map((item) => renderEntityButton(item, type))}
      </div>
    </div>
  );

  return (
    <main className="network-shell">
      <header className="network-topbar">
        <div className="brand-lockup">
          <button type="button" className="brand-mark" onClick={onBackHome} aria-label="Back to home">
            N
          </button>
          <div>
            <div className="brand-title">NAAR</div>
            <div className="brand-subtitle">Barristers & Advocates | Network Analysis Platform</div>
          </div>
        </div>

        <div className="topbar-actions">
          <label className="search-field">
            <span className="search-field-label">Search</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="People, companies, or groups"
            />
          </label>

          <button type="button" className="ghost-action" onClick={() => issueGraphCommand('reset')}>
            Reset View
          </button>
          <button type="button" className="ghost-action" onClick={clearSelection}>
            Clear Selection
          </button>
          <button
            type="button"
            className="ghost-action light-toggle"
            onClick={() => window.dispatchEvent(new CustomEvent('naar:toggle-light-mode'))}
            aria-label={lightMode ? 'Switch to dark mode' : 'Switch to light mode'}
            title={lightMode ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {lightMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <section className="network-layout dashboard-layout">
        <aside className="panel sidebar-panel dashboard-sidebar">
          <div className="dashboard-sidebar-header">
            <div className="dashboard-sidebar-title">Dashboard</div>
            <div className="dashboard-sidebar-copy">Navigate the directory sections from here.</div>
          </div>

          <nav className="dashboard-nav-vertical" role="navigation" aria-label="Dashboard">
            <button type="button" className="nav-item" onClick={() => handleTabChange('home')}>
              Home
            </button>
            <button type="button" className={`nav-item${dashboardTab === 'groups' ? ' active' : ''}`} onClick={() => handleTabChange('groups')}>
              Groups
            </button>
            <button type="button" className={`nav-item${dashboardTab === 'companies' ? ' active' : ''}`} onClick={() => handleTabChange('companies')}>
              Companies
            </button>
            <button type="button" className={`nav-item${dashboardTab === 'directors' ? ' active' : ''}`} onClick={() => handleTabChange('directors')}>
              Directors
            </button>
            <button type="button" className={`nav-item${dashboardTab === 'network' ? ' active' : ''}`} onClick={() => handleTabChange('network')}>
              Network Map
            </button>
          </nav>
        </aside>

        <section ref={workspacePanelRef} className="panel workspace-panel">
          <div className="workspace-panel-inner">
            <div className="company-logo-panel company-logo-panel-compact">
              <div className="company-logo-watermark" aria-hidden="true">
                <div className="logo-stack logo-stack-compact">
                  <span className="logo-shadow logo-shadow-back">NAAR</span>
                  <span className="logo-shadow logo-shadow-mid">NAAR</span>
                  <span className="logo-wordmark">NAAR</span>
                </div>
                <div className="company-logo-caption">Barristers & Advocates</div>
              </div>
            </div>

            <div ref={entityRelationshipRef} className="workspace-panel-details-wrapper">
              <InfoPanel
                selectedNode={selectedNode}
                onSelectEntity={handleEntitySelect}
                companiesData={activeCompaniesData}
                personToCompanies={activePersonToCompanies}
              />
            </div>

            {dashboardTab === 'groups' && renderGroupOverview()}

            {dashboardTab === 'companies' &&
              renderFlatEntityList(
                'Companies',
                'Select a company to open its relationship details and focus the network map.',
                filteredCompanies,
                'company'
              )}

            {dashboardTab === 'directors' &&
              renderFlatEntityList(
                'Directors',
                'Select a director to open connected companies and update the graph on the right.',
                filteredPeople,
                'person'
              )}

            {dashboardTab === 'network' && (
              <div className="workspace-section">
                <div className="workspace-header">
                  <div>
                    <h2>Network Map</h2>
                    <p>Select a company or director from another section to view its mapped relationships on the right.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {graphFullscreen ? <div className="graph-modal-backdrop" onClick={toggleGraphFullscreen} /> : null}

        <aside className={`panel graph-panel-shell graph-panel-shell-static${graphFullscreen ? ' is-graph-popup' : ''}`}>
          <div className="workspace-subheader workspace-subheader-graph">
            <div className="graph-panel-title-block">
              <h3>Network Map ({activeGroup?.label || ''})</h3>
              <p>{selectedNode ? 'Showing the selected entity and direct relationships.' : 'Showing the full connected network.'}</p>
            </div>
            <div className="graph-panel-actions">
              {graphFullscreen ? (
                <button
                  type="button"
                  className="mini-action graph-reset-action"
                  onClick={() => issueGraphCommand('reset')}
                  aria-label="Reset network map view"
                  title="Reset network map view"
                >
                  ↺
                </button>
              ) : null}
              <button
                type="button"
                className="mini-action graph-expand-action"
                onClick={toggleGraphFullscreen}
                aria-label={graphFullscreen ? 'Close full page network map' : 'Open full page network map'}
                title={graphFullscreen ? 'Close full page network map' : 'Open full page network map'}
              >
                {graphFullscreen ? '×' : '⛶'}
              </button>
            </div>
          </div>
          <Graph2D
            onNodeClick={handleEntitySelect}
            command={graphCommand}
            selectedNode={selectedNode}
            selectedNodeId={selectedNodeId}
            filterTerm={normalizedSearch}
            forceLabels={graphFullscreen}
            customNodes={activeGraphNodes}
            customLinks={activeLinks}
          />
        </aside>
      </section>
    </main>
  );
};

export default MainPage;

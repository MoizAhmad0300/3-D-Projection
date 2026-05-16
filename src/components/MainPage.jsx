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

const ExpandableNameItem = ({ item, icon, expanded, onToggle, children }) => (
  <div className={`name-item ${expanded ? 'is-expanded' : ''}`}>
    <button
      type="button"
      className="name-button"
      onClick={onToggle}
      aria-expanded={expanded}
    >
      <span className="name-bullet">{icon}</span>
      <span className="name-button-text">{item.name}</span>
      <span className={`name-chevron ${expanded ? 'is-open' : ''}`} aria-hidden="true">
        v
      </span>
    </button>
    {expanded ? <div className="name-dropdown">{children}</div> : null}
  </div>
);

const NameListPanel = ({ onSelectNode }) => {
  const [expandedPerson, setExpandedPerson] = useState(null);
  const [expandedCompany, setExpandedCompany] = useState(null);

  const handlePersonToggle = (person) => {
    const nextValue = expandedPerson === person ? null : person;
    setExpandedPerson(nextValue);
    onSelectNode(
      nextValue
        ? { type: 'person', name: person, companies: personToCompanies.get(person) || [] }
        : null
    );
  };

  const handleCompanyToggle = (company) => {
    const nextValue = expandedCompany === company.id ? null : company.id;
    setExpandedCompany(nextValue);
    onSelectNode(
      nextValue
        ? { type: 'company', name: company.name, directors: company.directors, compType: company.type }
        : null
    );
  };

  return (
    <PanelCard title="Names" className="name-list-panel">
      <div className="name-list-layout">
        <div className="name-list-group">
          <div className="name-group-title">Directors</div>
          <div className="name-list-scroll">
            {personList.map((person) => {
              const companies = personToCompanies.get(person) || [];

              return (
                <ExpandableNameItem
                  key={person}
                  item={{ name: person }}
                  icon="P"
                  expanded={expandedPerson === person}
                  onToggle={() => handlePersonToggle(person)}
                >
                  <div className="name-dropdown-label">
                    Associated Companies ({companies.length})
                  </div>
                  {companies.length > 0 ? (
                    <ul className="name-dropdown-list">
                      {companies.map((companyName) => (
                        <li key={companyName}>{companyName}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="name-dropdown-empty">No associated companies listed.</p>
                  )}
                </ExpandableNameItem>
              );
            })}
          </div>
        </div>

        <div className="name-list-group">
          <div className="name-group-title">Companies</div>
          <div className="name-list-scroll">
            {companiesData.map((company) => (
              <ExpandableNameItem
                key={company.id}
                item={company}
                icon="C"
                expanded={expandedCompany === company.id}
                onToggle={() => handleCompanyToggle(company)}
              >
                <div className="name-dropdown-label">
                  Directors / Partners ({company.directors.length})
                </div>
                {company.directors.length > 0 ? (
                  <ul className="name-dropdown-list">
                    {company.directors.map((person) => (
                      <li key={person}>{person}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="name-dropdown-empty">No directors or partners listed.</p>
                )}
              </ExpandableNameItem>
            ))}
          </div>
        </div>
      </div>
    </PanelCard>
  );
};

const MainPage = () => {
  const [selectedNode, setSelectedNode] = useState(null);

  return (
    <main className="page-shell">
      <aside className="sidebar sidebar-left">
        <NameListPanel onSelectNode={setSelectedNode} />
      </aside>

      <section className="main-content">
        <PanelCard title="Network Map" className="graph-card">
          <div className="graph-card-description" />
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

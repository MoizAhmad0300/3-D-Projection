import React from 'react';

const InfoPanel = ({ selectedNode, onSelectEntity, companiesData, personToCompanies }) => {
  if (!selectedNode) {
    return (
      <div className="entity-panel-empty">
        <div className="entity-panel-title">Entity Details</div>
        <div className="empty-state-visual" aria-hidden="true">🎯</div>
        <p>Select a person or company from the graph or side panels to inspect relationships.</p>
      </div>
    );
  }

  const handleSelectPerson = (personName) => {
    if (typeof onSelectEntity === 'function') {
      onSelectEntity({
        id: `p_${personName.replace(/\s/g, '')}`,
        name: personName,
        type: 'person',
        companies: personToCompanies.get(personName) || [],
      });
    }
  };

  const handleSelectCompany = (companyName) => {
    if (typeof onSelectEntity === 'function') {
      const comp = companiesData.find((c) => c.name === companyName);
      if (comp) {
        onSelectEntity({
          ...comp,
          type: 'company',
          compType: comp.type,
        });
      }
    }
  };

  if (selectedNode.type === 'company') {
    const directors = selectedNode.directors || [];
    const typeLabel = selectedNode.compType === 'PVT'
      ? 'Private Limited'
      : selectedNode.compType === 'AOP'
        ? 'Association of Persons'
        : 'Individual / Sole Proprietorship';

    return (
      <div className="entity-panel-content animate-fade-in">
        <div className="entity-panel-title">Entity Details</div>

        <div className="entity-badges">
          <span className={`entity-badge entity-badge-company comp-badge-${selectedNode.compType}`}>
            {typeLabel}
          </span>
          <span className="entity-badge entity-badge-neutral">
            {directors.length} connected {directors.length === 1 ? 'person' : 'people'}
          </span>
        </div>

        <h3 className="entity-panel-name">{selectedNode.name}</h3>

        <div className="entity-section-label">Directors & Partners</div>
        {directors.length > 0 ? (
          <ul className="entity-interactive-list">
            {directors.map((person) => (
              <li key={person}>
                <button
                  type="button"
                  className="entity-pivot-btn"
                  onClick={() => handleSelectPerson(person)}
                  title={`Focus on ${person}`}
                >
                  <span className="pivot-btn-name">{person}</span>
                  <span className="pivot-btn-icon">→</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="entity-panel-empty-text">No directors or partners are listed for this company.</p>
        )}
      </div>
    );
  }

  const companies = selectedNode.companies || [];

  return (
    <div className="entity-panel-content animate-fade-in">
      <div className="entity-panel-title">Entity Details</div>

      <div className="entity-badges">
        <span className="entity-badge entity-badge-person">
          Director / Partner
        </span>
        <span className="entity-badge entity-badge-neutral">
          {companies.length} linked {companies.length === 1 ? 'company' : 'companies'}
        </span>
      </div>

      <h3 className="entity-panel-name">{selectedNode.name}</h3>

      <div className="entity-section-label">Associated Companies</div>
      {companies.length > 0 ? (
        <ul className="entity-interactive-list">
          {companies.map((company) => (
            <li key={company}>
              <button
                type="button"
                className="entity-pivot-btn"
                onClick={() => handleSelectCompany(company)}
                title={`Focus on ${company}`}
              >
                <span className="pivot-btn-name">{company}</span>
                <span className="pivot-btn-icon">→</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="entity-panel-empty-text">No company relationships are available for this person.</p>
      )}
    </div>
  );
};

export default InfoPanel;

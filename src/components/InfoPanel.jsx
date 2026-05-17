import React from 'react';

const InfoPanel = ({ selectedNode }) => {
  if (!selectedNode) {
    return (
      <div className="entity-panel-empty">
        <div className="entity-panel-title">Entity Details</div>
        <p>Select a person or company from the graph or side panels to inspect relationships.</p>
      </div>
    );
  }

  if (selectedNode.type === 'company') {
    const directors = selectedNode.directors || [];
    const typeLabel = selectedNode.compType === 'PVT'
      ? 'Private Limited'
      : selectedNode.compType === 'AOP'
        ? 'Association of Persons'
        : 'Individual / Sole Proprietorship';

    return (
      <div className="entity-panel-content">
        <div className="entity-panel-title">Entity Details</div>
        <div className="entity-badges">
          <span className="entity-badge entity-badge-company">{typeLabel}</span>
          <span className="entity-badge entity-badge-neutral">{directors.length} linked people</span>
        </div>
        <h3>{selectedNode.name}</h3>
        <div className="entity-section-label">Directors / Partners</div>
        {directors.length > 0 ? (
          <ul className="entity-list">
            {directors.map((person) => (
              <li key={person}>{person}</li>
            ))}
          </ul>
        ) : (
          <p>No directors or partners are listed for this company.</p>
        )}
      </div>
    );
  }

  const companies = selectedNode.companies || [];

  return (
    <div className="entity-panel-content">
      <div className="entity-panel-title">Entity Details</div>
      <div className="entity-badges">
        <span className="entity-badge entity-badge-person">Director / Partner</span>
        <span className="entity-badge entity-badge-neutral">{companies.length} linked companies</span>
      </div>
      <h3>{selectedNode.name}</h3>
      <div className="entity-section-label">Associated Companies</div>
      {companies.length > 0 ? (
        <ul className="entity-list">
          {companies.map((company) => (
            <li key={company}>{company}</li>
          ))}
        </ul>
      ) : (
        <p>No company relationships are available for this person.</p>
      )}
    </div>
  );
};

export default InfoPanel;

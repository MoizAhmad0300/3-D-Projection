import React from 'react';

const InfoPanel = ({ selectedNode }) => {
  const renderContent = () => {
    if (!selectedNode) {
      return (
        <p>
          ✨ Click on any <strong className="company-label">Company</strong> or <strong className="person-label">Director / Partner</strong> to inspect the network.
          <br />
          📌 <em>2D network map: circles = people, squares = companies</em>
        </p>
      );
    }

    if (selectedNode.type === 'company') {
      const directors = selectedNode.directors || [];
      const typeBadge = selectedNode.compType === 'PVT'
        ? '🏢 Private Limited'
        : selectedNode.compType === 'AOP'
          ? '🤝 Association of Persons'
          : '👤 Sole Proprietorship';

      return (
        <>
          <span className="badge">{typeBadge}</span>
          <h4>{selectedNode.name}</h4>
          <div className="info-line">
            <strong>Directors / Partners:</strong>
          </div>
          {directors.length > 0 ? (
            <ul className="info-list">
              {directors.map(person => (
                <li key={person}>{person}</li>
              ))}
            </ul>
          ) : (
            <p>No directors or partners listed.</p>
          )}
          <p className="info-note">🔗 Click a person in the tree or on the graph to inspect their companies.</p>
        </>
      );
    }

    const companies = selectedNode.companies || [];
    return (
      <>
        <span className="badge">👤 Director / Partner</span>
        <h4>{selectedNode.name}</h4>
        <div className="info-line">
          <strong>Associated Companies ({companies.length})</strong>
        </div>
        {companies.length > 0 ? (
          <ul className="info-list">
            {companies.map(company => (
              <li key={company}>{company}</li>
            ))}
          </ul>
        ) : (
          <p>No company relationships available.</p>
        )}
      </>
    );
  };

  return (
    <div className="info-panel">
      <h3>🔍 Entity Details</h3>
      {renderContent()}
    </div>
  );
};

export default InfoPanel;
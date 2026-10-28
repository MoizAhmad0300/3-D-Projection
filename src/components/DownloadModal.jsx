import React, { useState } from 'react';
import { downloadGroupAsExcel } from '../downloadExcel';

const COLUMNS = [
  { key: 'name',      label: 'Company Name',  desc: 'Full registered name' },
  { key: 'type',      label: 'Company Type',  desc: 'PVT / AOP / IND' },
  { key: 'groupName', label: 'Group Name',    desc: 'Parent group label' },
  { key: 'directors', label: 'Directors',     desc: 'All linked directors' },
];

const DownloadModal = ({ groups, onClose }) => {
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id || '');
  const [columns, setColumns] = useState({ name: true, type: true, groupName: true, directors: true });
  const [downloaded, setDownloaded] = useState(false);

  const selectedGroup = groups.find(g => g.id === selectedGroupId) || groups[0];
  const anyColumnSelected = Object.values(columns).some(Boolean);

  const toggleCol = (key) => setColumns(prev => ({ ...prev, [key]: !prev[key] }));

  const handleDownload = () => {
    if (!selectedGroup || !anyColumnSelected) return;
    downloadGroupAsExcel(selectedGroup, columns);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  return (
    <div className="dl-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dl-modal" role="dialog" aria-modal="true" aria-label="Download Group Data">

        {/* Header */}
        <div className="dl-modal-header">
          <div className="dl-modal-header-left">
            <div className="dl-modal-icon">⬇️</div>
            <div>
              <h2 className="dl-modal-title">Download Group Data</h2>
              <p className="dl-modal-subtitle">Export company data as a professional Excel file</p>
            </div>
          </div>
          <button type="button" className="dl-modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="dl-modal-body">
          {/* Left: Group selector */}
          <div className="dl-panel">
            <div className="dl-panel-label">Select Group</div>
            <div className="dl-group-list">
              {groups.map(g => (
                <button
                  key={g.id}
                  type="button"
                  className={`dl-group-item ${selectedGroupId === g.id ? 'dl-group-item-active' : ''}`}
                  onClick={() => setSelectedGroupId(g.id)}
                >
                  <span className="dl-group-dot" />
                  <span className="dl-group-name">{g.label}</span>
                  <span className="dl-group-count">{g.companies.length}</span>
                </button>
              ))}
            </div>

            {/* Column selector */}
            <div className="dl-panel-label" style={{ marginTop: '20px' }}>Select Columns</div>
            <div className="dl-col-list">
              {COLUMNS.map(col => (
                <label key={col.key} className={`dl-col-item ${columns[col.key] ? 'dl-col-item-active' : ''}`}>
                  <input
                    type="checkbox"
                    checked={columns[col.key]}
                    onChange={() => toggleCol(col.key)}
                  />
                  <div className="dl-col-info">
                    <span className="dl-col-name">{col.label}</span>
                    <span className="dl-col-desc">{col.desc}</span>
                  </div>
                  {columns[col.key] && <span className="dl-col-check">✓</span>}
                </label>
              ))}
            </div>

            <div className="dl-quick-btns">
              <button type="button" className="dl-quick-btn" onClick={() => setColumns({ name: true, type: true, groupName: true, directors: true })}>All</button>
              <button type="button" className="dl-quick-btn" onClick={() => setColumns({ name: false, type: false, groupName: false, directors: false })}>None</button>
            </div>
          </div>

          {/* Right: Preview */}
          <div className="dl-preview-panel">
            <div className="dl-preview-header">
              <span>Preview — <strong>{selectedGroup?.label}</strong></span>
              <span className="dl-preview-badge">{selectedGroup?.companies.length || 0} rows</span>
            </div>

            <div className="dl-preview-table-wrap">
              <table className="dl-preview-table">
                <thead>
                  <tr>
                    {columns.name      && <th>Company Name</th>}
                    {columns.type      && <th>Type</th>}
                    {columns.groupName && <th>Group</th>}
                    {columns.directors && <th>Directors</th>}
                  </tr>
                </thead>
                <tbody>
                  {(selectedGroup?.companies || []).slice(0, 12).map(c => (
                    <tr key={c.id}>
                      {columns.name      && <td className="dl-td-name">{c.name}</td>}
                      {columns.type      && <td><span className={`dl-type-badge dl-type-${c.type.toLowerCase()}`}>{c.type}</span></td>}
                      {columns.groupName && <td className="dl-td-muted">{selectedGroup.label}</td>}
                      {columns.directors && <td className="dl-td-muted">{c.directors.join(', ') || '—'}</td>}
                    </tr>
                  ))}
                  {(selectedGroup?.companies?.length || 0) > 12 && (
                    <tr>
                      <td colSpan={Object.values(columns).filter(Boolean).length} className="dl-td-more">
                        +{selectedGroup.companies.length - 12} more rows in the exported file…
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {(!selectedGroup || !selectedGroup.companies.length) && (
                <div className="dl-empty">No companies in this group.</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="dl-modal-footer">
          <div className="dl-footer-info">
            <span>📊 Excel file with branded header</span>
            <span>·</span>
            <span>{selectedGroup?.companies.length || 0} rows</span>
            <span>·</span>
            <span>{Object.values(columns).filter(Boolean).length} columns selected</span>
          </div>
          <div className="dl-footer-actions">
            <button type="button" className="dl-btn dl-btn-ghost" onClick={onClose}>Cancel</button>
            <button
              type="button"
              className={`dl-btn dl-btn-primary ${downloaded ? 'dl-btn-success' : ''}`}
              onClick={handleDownload}
              disabled={!anyColumnSelected || !selectedGroup?.companies.length}
            >
              {downloaded ? '✓ Downloaded!' : '⬇️ Download Excel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadModal;

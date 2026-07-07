import React, { useState } from 'react';

const FolderView = ({ entityName, folders, onClose }) => {
  const [expandedFolders, setExpandedFolders] = useState(new Set());

  const toggleFolder = (folderName) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderName)) {
      newExpanded.delete(folderName);
    } else {
      newExpanded.add(folderName);
    }
    setExpandedFolders(newExpanded);
  };

  if (!folders) {
    return null;
  }

  return (
    <div className="folder-view-modal-overlay" onClick={onClose}>
      <div className="folder-view-modal" onClick={(e) => e.stopPropagation()}>
        <div className="folder-view-header">
          <h2 className="folder-view-title">
            <span className="folder-view-icon">📁</span>
            {entityName}
          </h2>
          <button
            type="button"
            className="folder-view-close-btn"
            onClick={onClose}
            title="Close folder view"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="folder-view-content">
          <div className="folder-tree">
            {folders.folders && folders.folders.length > 0 ? (
              <ul className="folder-list">
                {folders.folders.map((folder) => (
                  <li key={folder.name} className="folder-item">
                    <button
                      type="button"
                      className="folder-toggle-btn"
                      onClick={() => toggleFolder(folder.name)}
                      title={`Toggle ${folder.name}`}
                    >
                      <span className="folder-toggle-icon">
                        {expandedFolders.has(folder.name) ? '▼' : '▶'}
                      </span>
                      <span className="folder-icon">{folder.icon}</span>
                      <span className="folder-name">{folder.name}</span>
                    </button>
                    {expandedFolders.has(folder.name) && (
                      <div className="folder-content-placeholder">
                        <p className="folder-placeholder-text">
                          Click to view files in {folder.name}
                        </p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="folder-view-empty">No folders available for this entity.</p>
            )}
          </div>
        </div>

        <div className="folder-view-footer">
          <button
            type="button"
            className="folder-view-action-btn"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default FolderView;

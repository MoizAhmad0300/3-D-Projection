import React, { useMemo, useState } from 'react';
import { buildProcessedGroups, createDefaultDatabase, normalizeEmail, normalizeId } from '../data';

const blankGroup = { label: '', description: '' };
const blankCompany = { groupId: '', name: '', type: 'PVT', directors: '' };
const blankUser = { name: '', email: '', role: 'viewer', allowedGroupIds: [] };

const createAuditEntry = (actorEmail, action) => ({
  id: `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  actorEmail,
  action,
  createdAt: new Date().toISOString(),
});

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'groups', label: 'Groups', icon: '🗂️' },
  { id: 'companies', label: 'Companies', icon: '🏢' },
  { id: 'users', label: 'Users', icon: '👥' },
  { id: 'permissions', label: 'Permissions', icon: '🔐' },
  { id: 'audit', label: 'Audit Log', icon: '📋' },
];

const formatDate = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
};

const AdminPanel = ({ database, activeEmail, onActiveEmailChange, onDatabaseSave, onBackDirectory, onLogout }) => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [groupForm, setGroupForm] = useState(blankGroup);
  const [companyForm, setCompanyForm] = useState({ ...blankCompany, groupId: database.groups[0]?.id || '' });
  const [userForm, setUserForm] = useState(blankUser);
  const [editingUserId, setEditingUserId] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(database.users[0]?.id || '');
  const [status, setStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const processedGroups = useMemo(() => buildProcessedGroups(database.groups), [database.groups]);
  const selectedUser = database.users.find((user) => user.id === selectedUserId) || database.users[0];
  const activeAdmin = database.users.find((user) => normalizeEmail(user.email) === normalizeEmail(activeEmail));
  const canAdmin = activeAdmin?.role === 'super_admin';

  const totalCompanies = useMemo(() => database.groups.reduce((t, g) => t + g.companies.length, 0), [database.groups]);
  const totalDirectors = useMemo(() => {
    const all = new Set();
    database.groups.forEach(g => g.companies.forEach(c => c.directors.forEach(d => all.add(d))));
    return all.size;
  }, [database.groups]);

  const saveWithAudit = (nextDatabase, action) => {
    onDatabaseSave({
      ...nextDatabase,
      auditLog: [
        createAuditEntry(activeEmail, action),
        ...(nextDatabase.auditLog || database.auditLog || []).slice(0, 49),
      ],
    });
    setStatus(action);
    setTimeout(() => setStatus(''), 4000);
  };

  // ── CRUD Handlers ──

  const handleAddGroup = (event) => {
    event.preventDefault();
    const label = groupForm.label.trim();
    if (!label) return;

    const idBase = normalizeId(label) || `group-${Date.now()}`;
    const existingIds = new Set(database.groups.map((group) => group.id));
    let id = idBase;
    let counter = 2;
    while (existingIds.has(id)) {
      id = `${idBase}-${counter}`;
      counter += 1;
    }

    const nextDatabase = {
      ...database,
      groups: [
        ...database.groups,
        {
          id,
          label: label.toUpperCase(),
          description: groupForm.description.trim(),
          companies: [],
        },
      ],
      users: database.users.map((user) =>
        user.role === 'super_admin'
          ? { ...user, allowedGroupIds: Array.from(new Set([...user.allowedGroupIds, id])) }
          : user
      ),
    };

    setGroupForm(blankGroup);
    setCompanyForm((current) => ({ ...current, groupId: id }));
    setShowGroupForm(false);
    saveWithAudit(nextDatabase, `Added group "${label}"`);
  };

  const handleDeleteGroup = (groupId) => {
    const group = database.groups.find(g => g.id === groupId);
    if (!group) return;
    const confirmed = window.confirm(`Delete group "${group.label}" and all its companies? This cannot be undone.`);
    if (!confirmed) return;

    const nextDatabase = {
      ...database,
      groups: database.groups.filter(g => g.id !== groupId),
      users: database.users.map(u => ({
        ...u,
        allowedGroupIds: u.allowedGroupIds.filter(id => id !== groupId),
      })),
    };
    saveWithAudit(nextDatabase, `Deleted group "${group.label}"`);
  };

  const handleAddCompany = (event) => {
    event.preventDefault();
    const name = companyForm.name.trim();
    if (!name || !companyForm.groupId) return;

    const directors = companyForm.directors
      .split(',')
      .map((director) => director.trim().toUpperCase())
      .filter(Boolean);

    const nextDatabase = {
      ...database,
      groups: database.groups.map((group) => {
        if (group.id !== companyForm.groupId) return group;

        return {
          ...group,
          companies: [
            ...group.companies,
            {
              id: `${group.id}-c-${Date.now()}`,
              name: name.toUpperCase(),
              type: companyForm.type,
              directors,
            },
          ],
        };
      }),
    };

    setCompanyForm({ ...blankCompany, groupId: companyForm.groupId });
    setShowCompanyForm(false);
    saveWithAudit(nextDatabase, `Added company "${name}"`);
  };

  const handleDeleteCompany = (groupId, companyId) => {
    const group = database.groups.find(g => g.id === groupId);
    const company = group?.companies.find(c => c.id === companyId);
    if (!company) return;
    const confirmed = window.confirm(`Delete company "${company.name}"?`);
    if (!confirmed) return;

    const nextDatabase = {
      ...database,
      groups: database.groups.map(g => {
        if (g.id !== groupId) return g;
        return { ...g, companies: g.companies.filter(c => c.id !== companyId) };
      }),
    };
    saveWithAudit(nextDatabase, `Deleted company "${company.name}"`);
  };

  const handleAddUser = (event) => {
    event.preventDefault();
    const email = normalizeEmail(userForm.email);
    if (!email) return;

    const existingUser = editingUserId
      ? database.users.find(u => u.id === editingUserId)
      : database.users.find((user) => user.email === email);

    const userPayload = {
      id: existingUser?.id || `user-${Date.now()}`,
      name: userForm.name.trim() || email,
      email,
      role: userForm.role,
      allowedGroupIds: userForm.role === 'super_admin'
        ? database.groups.map((group) => group.id)
        : userForm.allowedGroupIds,
      active: true,
    };

    const nextDatabase = {
      ...database,
      users: existingUser
        ? database.users.map((user) => (user.id === existingUser.id ? userPayload : user))
        : [...database.users, userPayload],
    };

    setUserForm(blankUser);
    setEditingUserId(null);
    setSelectedUserId(userPayload.id);
    setShowUserForm(false);
    saveWithAudit(nextDatabase, `${existingUser ? 'Updated' : 'Added'} user ${email}`);
  };

  const handleEditUser = (user) => {
    setUserForm({
      name: user.name,
      email: user.email,
      role: user.role,
      allowedGroupIds: [...user.allowedGroupIds],
    });
    setEditingUserId(user.id);
    setShowUserForm(true);
  };

  const handleDeleteUser = (userId) => {
    const user = database.users.find(u => u.id === userId);
    if (!user) return;
    if (user.role === 'super_admin' && database.users.filter(u => u.role === 'super_admin').length <= 1) {
      window.alert('Cannot delete the last super admin.');
      return;
    }
    const confirmed = window.confirm(`Delete user "${user.email}"?`);
    if (!confirmed) return;

    const nextDatabase = {
      ...database,
      users: database.users.filter(u => u.id !== userId),
    };
    saveWithAudit(nextDatabase, `Deleted user "${user.email}"`);
  };

  const toggleSelectedUserGroup = (groupId) => {
    if (!selectedUser || selectedUser.role === 'super_admin') return;

    const currentAccess = new Set(selectedUser.allowedGroupIds);
    if (currentAccess.has(groupId)) currentAccess.delete(groupId);
    else currentAccess.add(groupId);

    saveWithAudit(
      {
        ...database,
        users: database.users.map((user) =>
          user.id === selectedUser.id ? { ...user, allowedGroupIds: Array.from(currentAccess) } : user
        ),
      },
      `Updated group access for ${selectedUser.email}`
    );
  };

  const resetDatabase = () => {
    const confirmed = window.confirm('Reset the admin database to the original seeded data? All custom data will be lost.');
    if (!confirmed) return;
    onDatabaseSave(createDefaultDatabase());
    setStatus('Database reset to default seed data');
    setTimeout(() => setStatus(''), 4000);
  };

  // ── Access Denied Screen ──

  if (!canAdmin) {
    return (
      <main className="adm-shell">
        <div className="adm-denied-container">
          <div className="adm-denied-card">
            <div className="adm-denied-icon">🔒</div>
            <h1 className="adm-denied-title">Admin Access Required</h1>
            <p className="adm-denied-desc">The current email ({activeEmail}) does not have super admin permissions. Please sign in with an authorized email to access the admin panel.</p>
            <div className="adm-denied-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
              <button type="button" className="adm-btn adm-btn-ghost" onClick={onBackDirectory}>
                ← Back to Directory
              </button>
              <button type="button" className="adm-btn adm-btn-primary" onClick={onLogout}>
                Log Out
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ── Filter helper ──
  const normalizedSearch = searchTerm.trim().toLowerCase();

  // ── Render Sections ──

  const renderDashboard = () => (
    <div className="adm-section animate-fade-in">
      <div className="adm-section-header">
        <div>
          <h2 className="adm-section-title">Dashboard Overview</h2>
          <p className="adm-section-desc">A quick snapshot of your organization's data and activity.</p>
        </div>
      </div>

      <div className="adm-stats-grid">
        <div className="adm-stat-card adm-stat-purple">
          <div className="adm-stat-icon">🗂️</div>
          <div className="adm-stat-value">{database.groups.length}</div>
          <div className="adm-stat-label">Groups</div>
        </div>
        <div className="adm-stat-card adm-stat-blue">
          <div className="adm-stat-icon">🏢</div>
          <div className="adm-stat-value">{totalCompanies}</div>
          <div className="adm-stat-label">Companies</div>
        </div>
        <div className="adm-stat-card adm-stat-teal">
          <div className="adm-stat-icon">👤</div>
          <div className="adm-stat-value">{totalDirectors}</div>
          <div className="adm-stat-label">Directors</div>
        </div>
        <div className="adm-stat-card adm-stat-amber">
          <div className="adm-stat-icon">👥</div>
          <div className="adm-stat-value">{database.users.length}</div>
          <div className="adm-stat-label">Users</div>
        </div>
      </div>

      <div className="adm-dashboard-grid">
        <div className="adm-dash-card">
          <h3 className="adm-dash-card-title">Groups Overview</h3>
          <div className="adm-dash-table">
            <div className="adm-dash-table-header">
              <span>Group</span>
              <span>Companies</span>
              <span>Directors</span>
            </div>
            {database.groups.map((group) => (
              <div className="adm-dash-table-row" key={group.id}>
                <span className="adm-dash-cell-name">
                  <span className="adm-dot adm-dot-purple" />
                  {group.label}
                </span>
                <span className="adm-dash-cell-num">{group.companies.length}</span>
                <span className="adm-dash-cell-num">{processedGroups[group.id]?.personList.length || 0}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="adm-dash-card">
          <h3 className="adm-dash-card-title">Recent Activity</h3>
          <div className="adm-activity-feed">
            {(database.auditLog || []).slice(0, 8).map((entry) => (
              <div className="adm-activity-item" key={entry.id}>
                <div className="adm-activity-dot" />
                <div className="adm-activity-content">
                  <span className="adm-activity-action">{entry.action}</span>
                  <span className="adm-activity-meta">{entry.actorEmail} · {formatDate(entry.createdAt)}</span>
                </div>
              </div>
            ))}
            {(!database.auditLog || database.auditLog.length === 0) && (
              <p className="adm-empty-text">No recent activity.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderGroups = () => (
    <div className="adm-section animate-fade-in">
      <div className="adm-section-header">
        <div>
          <h2 className="adm-section-title">Groups Management</h2>
          <p className="adm-section-desc">Create and manage permission groups. Each group contains its own set of companies and directors.</p>
        </div>
        <button type="button" className="adm-btn adm-btn-primary" onClick={() => setShowGroupForm(!showGroupForm)}>
          {showGroupForm ? '✕ Cancel' : '+ Add Group'}
        </button>
      </div>

      {showGroupForm && (
        <form className="adm-form-card animate-fade-in" onSubmit={handleAddGroup}>
          <h3 className="adm-form-title">New Group</h3>
          <div className="adm-form-grid">
            <label className="adm-input-group">
              <span className="adm-input-label">Group Name</span>
              <input className="adm-input" value={groupForm.label} onChange={(e) => setGroupForm({ ...groupForm, label: e.target.value })} placeholder="e.g. Paragon Group" />
            </label>
            <label className="adm-input-group">
              <span className="adm-input-label">Description</span>
              <input className="adm-input" value={groupForm.description} onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })} placeholder="Short internal note" />
            </label>
          </div>
          <div className="adm-form-actions">
            <button type="submit" className="adm-btn adm-btn-primary">Create Group</button>
            <button type="button" className="adm-btn adm-btn-ghost" onClick={() => { setShowGroupForm(false); setGroupForm(blankGroup); }}>Cancel</button>
          </div>
        </form>
      )}

      <div className="adm-table-container">
        <div className="adm-table">
          <div className="adm-table-head">
            <div className="adm-th" style={{ flex: 2 }}>Group</div>
            <div className="adm-th" style={{ flex: 2 }}>Description</div>
            <div className="adm-th" style={{ flex: 1 }}>Companies</div>
            <div className="adm-th" style={{ flex: 1 }}>Directors</div>
            <div className="adm-th adm-th-actions">Actions</div>
          </div>
          {database.groups.map((group) => (
            <div className="adm-table-row" key={group.id}>
              <div className="adm-td" style={{ flex: 2 }}>
                <span className="adm-dot adm-dot-purple" />
                <strong>{group.label}</strong>
              </div>
              <div className="adm-td adm-td-muted" style={{ flex: 2 }}>{group.description || '—'}</div>
              <div className="adm-td" style={{ flex: 1 }}>
                <span className="adm-badge adm-badge-blue">{group.companies.length}</span>
              </div>
              <div className="adm-td" style={{ flex: 1 }}>
                <span className="adm-badge adm-badge-teal">{processedGroups[group.id]?.personList.length || 0}</span>
              </div>
              <div className="adm-td adm-td-actions">
                <button type="button" className="adm-icon-btn adm-icon-btn-danger" title="Delete group" onClick={() => handleDeleteGroup(group.id)}>🗑️</button>
              </div>
            </div>
          ))}
          {database.groups.length === 0 && (
            <div className="adm-table-empty">No groups yet. Add your first group above.</div>
          )}
        </div>
      </div>
    </div>
  );

  const renderCompanies = () => {
    const allCompanies = database.groups.flatMap(g =>
      g.companies.map(c => ({ ...c, groupId: g.id, groupLabel: g.label }))
    );
    const filtered = normalizedSearch
      ? allCompanies.filter(c => [c.name, c.type, c.groupLabel, ...c.directors].join(' ').toLowerCase().includes(normalizedSearch))
      : allCompanies;

    return (
      <div className="adm-section animate-fade-in">
        <div className="adm-section-header">
          <div>
            <h2 className="adm-section-title">Companies Management</h2>
            <p className="adm-section-desc">View and manage all companies across groups. {allCompanies.length} total companies.</p>
          </div>
          <button type="button" className="adm-btn adm-btn-primary" onClick={() => setShowCompanyForm(!showCompanyForm)}>
            {showCompanyForm ? '✕ Cancel' : '+ Add Company'}
          </button>
        </div>

        {showCompanyForm && (
          <form className="adm-form-card animate-fade-in" onSubmit={handleAddCompany}>
            <h3 className="adm-form-title">New Company</h3>
            <div className="adm-form-grid">
              <label className="adm-input-group">
                <span className="adm-input-label">Group</span>
                <select className="adm-select" value={companyForm.groupId} onChange={(e) => setCompanyForm({ ...companyForm, groupId: e.target.value })}>
                  {database.groups.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
                </select>
              </label>
              <label className="adm-input-group">
                <span className="adm-input-label">Company Name</span>
                <input className="adm-input" value={companyForm.name} onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} placeholder="Company Pvt Ltd" />
              </label>
              <label className="adm-input-group">
                <span className="adm-input-label">Type</span>
                <select className="adm-select" value={companyForm.type} onChange={(e) => setCompanyForm({ ...companyForm, type: e.target.value })}>
                  <option value="PVT">PVT</option>
                  <option value="AOP">AOP</option>
                  <option value="IND">IND</option>
                </select>
              </label>
              <label className="adm-input-group">
                <span className="adm-input-label">Directors (comma-separated)</span>
                <input className="adm-input" value={companyForm.directors} onChange={(e) => setCompanyForm({ ...companyForm, directors: e.target.value })} placeholder="Name One, Name Two" />
              </label>
            </div>
            <div className="adm-form-actions">
              <button type="submit" className="adm-btn adm-btn-primary">Add Company</button>
              <button type="button" className="adm-btn adm-btn-ghost" onClick={() => { setShowCompanyForm(false); setCompanyForm({ ...blankCompany, groupId: companyForm.groupId }); }}>Cancel</button>
            </div>
          </form>
        )}

        <div className="adm-search-bar">
          <span className="adm-search-icon">🔍</span>
          <input
            className="adm-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search companies, directors, or groups..."
          />
          {searchTerm && (
            <button type="button" className="adm-search-clear" onClick={() => setSearchTerm('')}>✕</button>
          )}
        </div>

        <div className="adm-table-container">
          <div className="adm-table">
            <div className="adm-table-head">
              <div className="adm-th" style={{ flex: 3 }}>Company</div>
              <div className="adm-th" style={{ flex: 1 }}>Type</div>
              <div className="adm-th" style={{ flex: 2 }}>Group</div>
              <div className="adm-th" style={{ flex: 3 }}>Directors</div>
              <div className="adm-th adm-th-actions">Actions</div>
            </div>
            {filtered.map((c) => (
              <div className="adm-table-row" key={c.id}>
                <div className="adm-td" style={{ flex: 3 }}><strong>{c.name}</strong></div>
                <div className="adm-td" style={{ flex: 1 }}>
                  <span className={`adm-type-badge adm-type-${c.type.toLowerCase()}`}>{c.type}</span>
                </div>
                <div className="adm-td adm-td-muted" style={{ flex: 2 }}>{c.groupLabel}</div>
                <div className="adm-td adm-td-muted" style={{ flex: 3 }}>{c.directors.join(', ') || '—'}</div>
                <div className="adm-td adm-td-actions">
                  <button type="button" className="adm-icon-btn adm-icon-btn-danger" title="Delete company" onClick={() => handleDeleteCompany(c.groupId, c.id)}>🗑️</button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="adm-table-empty">{normalizedSearch ? 'No companies match your search.' : 'No companies yet.'}</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderUsers = () => (
    <div className="adm-section animate-fade-in">
      <div className="adm-section-header">
        <div>
          <h2 className="adm-section-title">User Management</h2>
          <p className="adm-section-desc">Create and manage users. Assign roles and group access permissions.</p>
        </div>
        <button type="button" className="adm-btn adm-btn-primary" onClick={() => {
          if (showUserForm) {
            setShowUserForm(false);
            setUserForm(blankUser);
            setEditingUserId(null);
          } else {
            setShowUserForm(true);
          }
        }}>
          {showUserForm ? '✕ Cancel' : '+ Add User'}
        </button>
      </div>

      {showUserForm && (
        <form className="adm-form-card animate-fade-in" onSubmit={handleAddUser}>
          <h3 className="adm-form-title">{editingUserId ? 'Edit User' : 'New User'}</h3>
          <div className="adm-form-grid">
            <label className="adm-input-group">
              <span className="adm-input-label">Name</span>
              <input className="adm-input" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} placeholder="Full name" />
            </label>
            <label className="adm-input-group">
              <span className="adm-input-label">Email</span>
              <input className="adm-input" type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} placeholder="user@example.com" />
            </label>
            <label className="adm-input-group">
              <span className="adm-input-label">Role</span>
              <select className="adm-select" value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
                <option value="viewer">Viewer</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </label>
          </div>
          {userForm.role !== 'super_admin' && (
            <div className="adm-form-access">
              <span className="adm-input-label">Group Access</span>
              <div className="adm-checkbox-grid">
                {database.groups.map((group) => (
                  <label key={group.id} className="adm-checkbox-item">
                    <input
                      type="checkbox"
                      checked={userForm.allowedGroupIds.includes(group.id)}
                      onChange={() => {
                        const current = new Set(userForm.allowedGroupIds);
                        if (current.has(group.id)) current.delete(group.id);
                        else current.add(group.id);
                        setUserForm({ ...userForm, allowedGroupIds: Array.from(current) });
                      }}
                    />
                    <span className="adm-checkbox-label">{group.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="adm-form-actions">
            <button type="submit" className="adm-btn adm-btn-primary">{editingUserId ? 'Update User' : 'Create User'}</button>
            <button type="button" className="adm-btn adm-btn-ghost" onClick={() => { setShowUserForm(false); setUserForm(blankUser); setEditingUserId(null); }}>Cancel</button>
          </div>
        </form>
      )}

      <div className="adm-table-container">
        <div className="adm-table">
          <div className="adm-table-head">
            <div className="adm-th" style={{ flex: 2 }}>Name</div>
            <div className="adm-th" style={{ flex: 3 }}>Email</div>
            <div className="adm-th" style={{ flex: 1 }}>Role</div>
            <div className="adm-th" style={{ flex: 2 }}>Groups</div>
            <div className="adm-th adm-th-actions">Actions</div>
          </div>
          {database.users.map((user) => (
            <div className="adm-table-row" key={user.id}>
              <div className="adm-td" style={{ flex: 2 }}>
                <span className="adm-user-avatar">{(user.name || user.email).charAt(0).toUpperCase()}</span>
                <strong>{user.name || user.email}</strong>
              </div>
              <div className="adm-td adm-td-muted" style={{ flex: 3 }}>{user.email}</div>
              <div className="adm-td" style={{ flex: 1 }}>
                <span className={`adm-role-badge ${user.role === 'super_admin' ? 'adm-role-admin' : 'adm-role-viewer'}`}>
                  {user.role === 'super_admin' ? 'Admin' : 'Viewer'}
                </span>
              </div>
              <div className="adm-td adm-td-muted" style={{ flex: 2 }}>
                {user.role === 'super_admin' ? 'All groups' : `${user.allowedGroupIds.length} group${user.allowedGroupIds.length !== 1 ? 's' : ''}`}
              </div>
              <div className="adm-td adm-td-actions">
                <button type="button" className="adm-icon-btn" title="Edit user" onClick={() => handleEditUser(user)}>✏️</button>
                <button type="button" className="adm-icon-btn adm-icon-btn-danger" title="Delete user" onClick={() => handleDeleteUser(user.id)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPermissions = () => (
    <div className="adm-section animate-fade-in">
      <div className="adm-section-header">
        <div>
          <h2 className="adm-section-title">Permission Matrix</h2>
          <p className="adm-section-desc">Quickly toggle group access for existing users. Select a user to modify their permissions.</p>
        </div>
      </div>

      <div className="adm-perm-layout">
        <div className="adm-perm-user-select">
          <span className="adm-input-label">Select User</span>
          <select className="adm-select" value={selectedUser?.id || ''} onChange={(e) => setSelectedUserId(e.target.value)}>
            {database.users.map((user) => (
              <option key={user.id} value={user.id}>{user.name || user.email} ({user.role})</option>
            ))}
          </select>
          {selectedUser && (
            <div className="adm-perm-user-info">
              <span className="adm-user-avatar adm-user-avatar-lg">{(selectedUser.name || selectedUser.email).charAt(0).toUpperCase()}</span>
              <div>
                <div className="adm-perm-user-name">{selectedUser.name || selectedUser.email}</div>
                <div className="adm-perm-user-email">{selectedUser.email}</div>
                <span className={`adm-role-badge ${selectedUser.role === 'super_admin' ? 'adm-role-admin' : 'adm-role-viewer'}`}>
                  {selectedUser.role === 'super_admin' ? 'Super Admin' : 'Viewer'}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="adm-perm-grid">
          {database.groups.map((group) => {
            const hasAccess = selectedUser?.role === 'super_admin' || selectedUser?.allowedGroupIds.includes(group.id);
            const isDisabled = selectedUser?.role === 'super_admin';

            return (
              <button
                key={group.id}
                type="button"
                className={`adm-perm-card ${hasAccess ? 'adm-perm-active' : 'adm-perm-inactive'}`}
                disabled={isDisabled}
                onClick={() => toggleSelectedUserGroup(group.id)}
              >
                <div className="adm-perm-card-header">
                  <span className="adm-perm-card-name">{group.label}</span>
                  <span className={`adm-perm-toggle ${hasAccess ? 'adm-perm-toggle-on' : ''}`}>
                    <span className="adm-perm-toggle-knob" />
                  </span>
                </div>
                <div className="adm-perm-card-meta">
                  {group.companies.length} companies · {processedGroups[group.id]?.personList.length || 0} directors
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderAuditLog = () => (
    <div className="adm-section animate-fade-in">
      <div className="adm-section-header">
        <div>
          <h2 className="adm-section-title">Audit Log</h2>
          <p className="adm-section-desc">Track all administrative actions. Up to 50 most recent entries are stored.</p>
        </div>
      </div>

      <div className="adm-audit-timeline">
        {(database.auditLog || []).map((entry, idx) => (
          <div className="adm-audit-entry" key={entry.id}>
            <div className="adm-audit-line">
              <div className={`adm-audit-dot ${idx === 0 ? 'adm-audit-dot-latest' : ''}`} />
              {idx < (database.auditLog || []).length - 1 && <div className="adm-audit-connector" />}
            </div>
            <div className="adm-audit-body">
              <div className="adm-audit-action">{entry.action}</div>
              <div className="adm-audit-meta">
                <span className="adm-audit-actor">👤 {entry.actorEmail}</span>
                <span className="adm-audit-time">🕐 {formatDate(entry.createdAt)}</span>
              </div>
            </div>
          </div>
        ))}
        {(!database.auditLog || database.auditLog.length === 0) && (
          <p className="adm-empty-text">No audit entries yet.</p>
        )}
      </div>
    </div>
  );

  const sectionMap = {
    dashboard: renderDashboard,
    groups: renderGroups,
    companies: renderCompanies,
    users: renderUsers,
    permissions: renderPermissions,
    audit: renderAuditLog,
  };

  return (
    <main className="adm-shell">
      {/* Sidebar */}
      <aside className={`adm-sidebar ${sidebarCollapsed ? 'adm-sidebar-collapsed' : ''}`}>
        <div className="adm-sidebar-header">
          <button type="button" className="adm-sidebar-logo" onClick={onBackDirectory} title="Back to Directory">
            N
          </button>
          {!sidebarCollapsed && (
            <div className="adm-sidebar-brand">
              <div className="adm-sidebar-brand-title">NAAR</div>
              <div className="adm-sidebar-brand-sub">Admin Panel</div>
            </div>
          )}
          <button type="button" className="adm-sidebar-toggle" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        <nav className="adm-sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`adm-nav-item ${activeSection === item.id ? 'adm-nav-active' : ''}`}
              onClick={() => setActiveSection(item.id)}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <span className="adm-nav-icon">{item.icon}</span>
              {!sidebarCollapsed && <span className="adm-nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="adm-sidebar-footer">
          {!sidebarCollapsed && (
            <div className="adm-sidebar-user">
              <span className="adm-user-avatar">{(activeAdmin?.name || activeEmail).charAt(0).toUpperCase()}</span>
              <div className="adm-sidebar-user-info">
                <div className="adm-sidebar-user-name">{activeAdmin?.name || 'Admin'}</div>
                <div className="adm-sidebar-user-email">{activeEmail}</div>
              </div>
            </div>
          )}
          <button type="button" className="adm-nav-item adm-nav-danger" onClick={resetDatabase} title="Reset Database">
            <span className="adm-nav-icon">⚠️</span>
            {!sidebarCollapsed && <span className="adm-nav-label">Reset DB</span>}
          </button>
          <button type="button" className="adm-nav-item adm-nav-danger" onClick={onLogout} title="Log Out">
            <span className="adm-nav-icon">🚪</span>
            {!sidebarCollapsed && <span className="adm-nav-label">Log Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="adm-main">
        <header className="adm-topbar">
          <div className="adm-topbar-left">
            <h1 className="adm-topbar-title">{NAV_ITEMS.find(n => n.id === activeSection)?.label || 'Admin'}</h1>
            <span className="adm-topbar-breadcrumb">Admin Panel / {NAV_ITEMS.find(n => n.id === activeSection)?.label}</span>
          </div>
          <div className="adm-topbar-right">
            <label className="adm-topbar-email">
              <span className="adm-input-label">Active Email</span>
              <input className="adm-input" value={activeEmail} onChange={(e) => onActiveEmailChange(e.target.value)} />
            </label>
            <button type="button" className="adm-btn adm-btn-ghost" onClick={onBackDirectory}>
              ← Directory
            </button>
          </div>
        </header>

        {status && (
          <div className="adm-toast animate-fade-in">
            <span className="adm-toast-icon">✓</span>
            {status}
          </div>
        )}

        <div className="adm-content">
          {sectionMap[activeSection]?.()}
        </div>
      </div>
    </main>
  );
};

export default AdminPanel;

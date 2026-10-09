import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import PermissionGate from '../components/PermissionGate';
import api from '../api/client';

const initialFormData = {
  employee_id: '',
  first_name: '',
  last_name: '',
  department: '',
  job_title: '',
  email: '',
  phone: '',
};

const ALL_SYSTEM_PERMISSIONS = [
  {
    code: 'VIEW_EMPLOYEE',
    name: 'View Employees',
    description: 'Allows browsing the employee directory and viewing staff details.',
    category: 'Employees',
  },
  {
    code: 'CREATE_EMPLOYEE',
    name: 'Create Employee',
    description: 'Allows adding and onboarding new employee records into the system.',
    category: 'Employees',
  },
  {
    code: 'EDIT_EMPLOYEE',
    name: 'Edit Employee',
    description: 'Allows updating personal, departmental, and role information.',
    category: 'Employees',
  },
  {
    code: 'DELETE_EMPLOYEE',
    name: 'Delete Employee',
    description: 'Allows permanently removing employee records from the organization.',
    category: 'Employees',
  },
  {
    code: 'VIEW_SELF',
    name: 'View Self Profile',
    description: 'Allows inspecting personal account credentials and linked employee profile.',
    category: 'Identity',
  },
  {
    code: 'ASSIGN_PERMISSION',
    name: 'Assign Permissions',
    description: 'Allows managing users and granting/revoking fine-grained permissions.',
    category: 'Security',
  },
];

export default function HomePage() {
  const { user, permissions, logout, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [authorizationError, setAuthorizationError] = useState('');

  // Employee list & table state
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeesError, setEmployeesError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Filter & Search state for Employees table
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');

  // Modal (Add / Edit) state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, employee_id, name }
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Personal profile record for VIEW_SELF
  const [myProfile, setMyProfile] = useState(null);
  const [myProfileLoading, setMyProfileLoading] = useState(false);

  // Permission management state (ASSIGN_PERMISSION tab)
  const [pmUsers, setPmUsers] = useState([]);           // all users list
  const [pmFunctions, setPmFunctions] = useState([]);   // all available functions
  const [pmLoading, setPmLoading] = useState(false);
  const [pmError, setPmError] = useState('');
  const [pmSelectedUserId, setPmSelectedUserId] = useState(null);
  const [pmChecked, setPmChecked] = useState({});       // { CODE: boolean }
  const [pmSaving, setPmSaving] = useState(false);
  const [pmSaveSuccess, setPmSaveSuccess] = useState('');
  const [pmSaveError, setPmSaveError] = useState('');
  const [pmSearch, setPmSearch] = useState('');

  // Recent actions state
  const [recentActions, setRecentActions] = useState(() => {
    const formatTime = (date) =>
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const now = new Date();
    try {
      if (user?.email) {
        const saved = localStorage.getItem(`recent_actions_${user.email}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    } catch {
      // fallback
    }
    return [
      {
        id: 'act-login',
        type: 'AUTH',
        text: 'User Authenticated',
        detail: `Signed in as ${user?.email || 'user'} via JWT token`,
        time: formatTime(now),
        status: 'Verified',
        badgeClass: 'badge-success',
      },
      {
        id: 'act-perms',
        type: 'PERMISSION',
        text: 'Loaded Permissions',
        detail:
          permissions && permissions.length > 0
            ? `${permissions.length} fine-grained permissions loaded from database`
            : 'Zero permissions assigned to account',
        time: formatTime(now),
        status: 'Active',
        badgeClass: 'badge-info',
      },
      {
        id: 'act-session',
        type: 'SYSTEM',
        text: 'Session Active',
        detail: 'Capability-based authorization active on all API endpoints',
        time: formatTime(now),
        status: 'Connected',
        badgeClass: 'badge-neutral',
      },
    ];
  });

  const addRecentAction = useCallback(
    (type, text, detail, status = 'Success', badgeClass = 'badge-success') => {
      const formatTime = (date) =>
        date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newAction = {
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type,
        text,
        detail,
        time: formatTime(new Date()),
        status,
        badgeClass,
      };
      setRecentActions((prev) => {
        const updated = [newAction, ...prev.slice(0, 9)];
        try {
          if (user?.email) {
            localStorage.setItem(`recent_actions_${user.email}`, JSON.stringify(updated));
          }
        } catch {
          // ignore
        }
        return updated;
      });
    },
    [user]
  );

  // Helper to extract detailed error messages from DRF response
  const getErrorMessage = (err, fallback = 'An unexpected error occurred.') => {
    if (!err?.response) {
      return 'Cannot connect to backend server. Ensure backend is running.';
    }
    const { status, data } = err.response;
    if (status === 403) {
      return 'Not Authorized';
    }
    if (data?.detail) {
      return data.detail;
    }
    if (typeof data === 'object' && data !== null) {
      const errorStrings = Object.entries(data).map(([field, msgs]) => {
        const msgText = Array.isArray(msgs) ? msgs.join(', ') : String(msgs);
        return `${field}: ${msgText}`;
      });
      if (errorStrings.length > 0) {
        return errorStrings.join(' | ');
      }
    }
    return fallback;
  };

  // Fetch employees list from GET /api/employees/
  const fetchEmployees = useCallback(async () => {
    if (!hasPermission('VIEW_EMPLOYEE')) return;
    setEmployeesLoading(true);
    setEmployeesError('');
    try {
      const res = await api.get('/employees/');
      const list = res.data?.results !== undefined ? res.data.results : res.data;
      setEmployees(Array.isArray(list) ? list : []);
    } catch (err) {
      setEmployeesError(getErrorMessage(err, 'Failed to fetch employee records.'));
    } finally {
      setEmployeesLoading(false);
    }
  }, [hasPermission]);

  // Initial fetch for employees to populate stats on overview
  useEffect(() => {
    if (hasPermission('VIEW_EMPLOYEE')) {
      fetchEmployees();
    }
  }, [hasPermission, fetchEmployees]);

  // Fetch logged-in user profile from GET /api/employees/me/
  const fetchMyProfile = useCallback(async () => {
    if (!hasPermission('VIEW_SELF')) return;
    setMyProfileLoading(true);
    try {
      const res = await api.get('/employees/me/');
      setMyProfile(res.data);
    } catch {
      setMyProfile(null);
    } finally {
      setMyProfileLoading(false);
    }
  }, [hasPermission]);

  // Fetch all users for the permission management tab
  const fetchPmData = useCallback(async () => {
    if (!hasPermission('ASSIGN_PERMISSION')) return;
    setPmLoading(true);
    setPmError('');
    try {
      const [usersRes, funcsRes] = await Promise.all([
        api.get('/users/'),
        api.get('/permissions/functions/'),
      ]);
      setPmUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      setPmFunctions(Array.isArray(funcsRes.data) ? funcsRes.data : []);
    } catch (err) {
      setPmError(getErrorMessage(err, 'Failed to load permission management data.'));
    } finally {
      setPmLoading(false);
    }
  }, [hasPermission]);

  // When a user row is selected in PM tab, populate the checkbox map
  const handlePmSelectUser = useCallback((userId) => {
    setPmSelectedUserId(userId);
    setPmSaveSuccess('');
    setPmSaveError('');
    const targetUser = pmUsers.find((u) => u.id === userId);
    if (!targetUser) return;
    const checked = {};
    pmFunctions.forEach((f) => {
      checked[f.code] = targetUser.permissions.includes(f.code);
    });
    setPmChecked(checked);
  }, [pmUsers, pmFunctions]);

  const handlePmToggle = (code) => {
    if (!hasPermission('ASSIGN_PERMISSION')) {
      setAuthorizationError('Not Authorized');
      return;
    }
    setPmChecked((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  const handlePmClear = () => {
    if (!hasPermission('ASSIGN_PERMISSION')) {
      setAuthorizationError('Not Authorized');
      return;
    }
    const cleared = {};
    pmFunctions.forEach((f) => {
      cleared[f.code] = false;
    });
    setPmChecked(cleared);
    setPmSaveSuccess('');
    setPmSaveError('');
  };

  const handlePmSave = async () => {
    if (!hasPermission('ASSIGN_PERMISSION')) {
      setAuthorizationError('Not Authorized');
      return;
    }
    if (!pmSelectedUserId) return;
    setPmSaving(true);
    setPmSaveSuccess('');
    setPmSaveError('');
    const selectedCodes = Object.entries(pmChecked)
      .filter(([, v]) => v)
      .map(([k]) => k);
    try {
      const res = await api.put(`/users/${pmSelectedUserId}/permissions/`, {
        function_codes: selectedCodes,
      });
      setPmUsers((prev) =>
        prev.map((u) =>
          u.id === pmSelectedUserId
            ? { ...u, permissions: res.data.permissions.map((p) => p.code) }
            : u
        )
      );
      const targetUser = pmUsers.find((u) => u.id === pmSelectedUserId);
      setPmSaveSuccess(
        `Permissions saved for ${targetUser?.email || 'user'} — ${selectedCodes.length} permission(s) assigned.`
      );
      addRecentAction(
        'PERMISSION',
        'Permissions Updated',
        `Updated permissions for ${targetUser?.email || 'user'}: [${selectedCodes.join(', ') || 'none'}]`,
        'Saved',
        'badge-info'
      );
    } catch (err) {
      setPmSaveError(getErrorMessage(err, 'Failed to save permissions.'));
    } finally {
      setPmSaving(false);
    }
  };

  // Load employees when switching to employees tab
  useEffect(() => {
    if (activeTab === 'employees' && hasPermission('VIEW_EMPLOYEE')) {
      fetchEmployees();
    }
  }, [activeTab, hasPermission, fetchEmployees]);

  // Load profile when switching to my-profile tab
  useEffect(() => {
    if (activeTab === 'my-profile' && hasPermission('VIEW_SELF')) {
      fetchMyProfile();
    }
  }, [activeTab, hasPermission, fetchMyProfile]);

  // Load permission management data when switching to permissions tab
  useEffect(() => {
    if (activeTab === 'permissions') {
      setPmSelectedUserId(null);
      setPmChecked({});
      setPmSaveSuccess('');
      setPmSaveError('');
      if (hasPermission('ASSIGN_PERMISSION')) {
        fetchPmData();
      } else {
        setPmError('Not Authorized');
      }
    }
  }, [activeTab, hasPermission, fetchPmData]);

  // Distinct departments for filter dropdown
  const departmentsList = useMemo(() => {
    const deps = new Set();
    employees.forEach((emp) => {
      if (emp.department && emp.department.trim()) {
        deps.add(emp.department.trim());
      }
    });
    return Array.from(deps).sort();
  }, [employees]);

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        employeeSearch.trim() === '' ||
        `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        (emp.employee_id && emp.employee_id.toLowerCase().includes(employeeSearch.toLowerCase())) ||
        (emp.email && emp.email.toLowerCase().includes(employeeSearch.toLowerCase())) ||
        (emp.job_title && emp.job_title.toLowerCase().includes(employeeSearch.toLowerCase())) ||
        (emp.department && emp.department.toLowerCase().includes(employeeSearch.toLowerCase()));

      const matchesDepartment =
        departmentFilter === 'ALL' || emp.department === departmentFilter;

      return matchesSearch && matchesDepartment;
    });
  }, [employees, employeeSearch, departmentFilter]);

  // Modal open handlers
  const handleOpenAddModal = () => {
    if (!hasPermission('CREATE_EMPLOYEE')) {
      setAuthorizationError('Not Authorized');
      return;
    }
    setModalMode('create');
    setEditingId(null);
    setFormData({ ...initialFormData });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (emp) => {
    if (!hasPermission('EDIT_EMPLOYEE')) {
      setAuthorizationError('Not Authorized');
      return;
    }
    setModalMode('edit');
    setEditingId(emp.id);
    setFormData({
      employee_id: emp.employee_id || '',
      first_name: emp.first_name || '',
      last_name: emp.last_name || '',
      department: emp.department || '',
      job_title: emp.job_title || '',
      email: emp.email || '',
      phone: emp.phone || '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (formSubmitting) return;
    setIsModalOpen(false);
    setFormError('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Form submit (Add or Edit)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const requiredPermission = modalMode === 'create' ? 'CREATE_EMPLOYEE' : 'EDIT_EMPLOYEE';
    if (!hasPermission(requiredPermission)) {
      setFormError('Not Authorized');
      return;
    }
    setFormSubmitting(true);
    setFormError('');
    try {
      if (modalMode === 'create') {
        await api.post('/employees/', formData);
        setActionSuccess(`Employee ${formData.first_name} ${formData.last_name} created successfully.`);
        addRecentAction(
          'CREATE',
          'Employee Created',
          `Added ${formData.first_name} ${formData.last_name} (${formData.employee_id})`,
          'Created',
          'badge-success'
        );
      } else {
        await api.patch(`/employees/${editingId}/`, formData);
        setActionSuccess(`Employee ${formData.first_name} ${formData.last_name} updated successfully.`);
        addRecentAction(
          'UPDATE',
          'Employee Updated',
          `Updated record for ${formData.first_name} ${formData.last_name} (${formData.employee_id})`,
          'Updated',
          'badge-info'
        );
      }
      setIsModalOpen(false);
      await fetchEmployees();
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setFormError(getErrorMessage(err, `Failed to ${modalMode === 'create' ? 'create' : 'update'} employee.`));
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete handlers
  const handleOpenDeleteConfirm = (emp) => {
    if (!hasPermission('DELETE_EMPLOYEE')) {
      setAuthorizationError('Not Authorized');
      return;
    }
    setDeleteConfirm({
      id: emp.id,
      employee_id: emp.employee_id,
      name: `${emp.first_name} ${emp.last_name}`,
    });
    setDeleteError('');
  };

  const handleCloseDeleteConfirm = () => {
    if (isDeleting) return;
    setDeleteConfirm(null);
    setDeleteError('');
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    if (!hasPermission('DELETE_EMPLOYEE')) {
      setDeleteError('Not Authorized');
      return;
    }
    setIsDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/employees/${deleteConfirm.id}/`);
      const deletedName = deleteConfirm.name;
      setDeleteConfirm(null);
      setActionSuccess(`Employee ${deletedName} deleted successfully.`);
      addRecentAction(
        'DELETE',
        'Employee Deleted',
        `Removed employee ${deletedName} (${deleteConfirm.employee_id})`,
        'Deleted',
        'badge-neutral'
      );
      await fetchEmployees();
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setDeleteError(getErrorMessage(err, 'Failed to delete employee.'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Close mobile nav when tab clicked
  const handleTabSwitch = (tabName) => {
    setAuthorizationError('');
    setActiveTab(tabName);
    setMobileNavOpen(false);
  };

  // Determine user role badge text
  const userAccessTier = useMemo(() => {
    if (hasPermission('ASSIGN_PERMISSION')) return 'Security Admin';
    if (hasPermission('VIEW_EMPLOYEE')) return 'Standard Member';
    return 'Restricted Account';
  }, [hasPermission]);

  return (
    <div className="app-shell">
      {/* Mobile nav backdrop */}
      {mobileNavOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Left Sidebar */}
      <aside className={`app-sidebar ${mobileNavOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <div className="brand-text-wrap">
            <span className="brand-title">Shield</span>
            <span className="brand-subtitle">Permissions OS</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">NAVIGATION</div>

          {/* Overview / Dashboard */}
          <button
            id="nav-overview"
            className={`sidebar-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('overview')}
          >
            <span className="nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
              </svg>
            </span>
            <span className="nav-label">Dashboard</span>
          </button>

          {/* Employee data remains protected; the tab exposes permitted actions to all users. */}
          <button
            id="nav-employees"
            className={`sidebar-nav-item ${activeTab === 'employees' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('employees')}
          >
            <span className="nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </span>
            <span className="nav-label">Employees</span>
            {employees.length > 0 && (
              <span className="nav-badge">{employees.length}</span>
            )}
          </button>

          {/* Permission assignment data remains protected by the backend. */}
          <button
            id="nav-permission-management"
            className={`sidebar-nav-item ${activeTab === 'permissions' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('permissions')}
          >
            <span className="nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <span className="nav-label">Permission Management</span>
          </button>

          {/* VIEW_SELF -> My Profile */}
          <PermissionGate permission="VIEW_SELF">
            <button
              id="nav-my-profile"
              className={`sidebar-nav-item ${activeTab === 'my-profile' ? 'active' : ''}`}
              onClick={() => handleTabSwitch('my-profile')}
            >
              <span className="nav-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <span className="nav-label">My Profile</span>
            </button>
          </PermissionGate>
        </nav>

        {/* Sidebar Footer User Card */}
        <div className="sidebar-footer">
          <div className="sidebar-user-card">
            <div className="sidebar-avatar">
              {(user?.first_name || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">
                {user?.first_name || user?.last_name
                  ? `${user?.first_name || ''} ${user?.last_name || ''}`.trim()
                  : user?.email?.split('@')[0]}
              </span>
              <span className="sidebar-user-role">{userAccessTier}</span>
            </div>
          </div>

          <button
            id="logout-button"
            onClick={logout}
            className="sidebar-logout-btn"
            title="Sign out of system"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="app-main-wrap">
        {/* Top Header */}
        <header className="app-topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-nav-toggle"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              aria-label="Toggle Navigation Menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <div className="topbar-breadcrumbs">
              <span className="breadcrumb-root">Shield</span>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-current">
                {activeTab === 'overview' && 'Dashboard'}
                {activeTab === 'employees' && 'Employees'}
                {activeTab === 'permissions' && 'Permission Management'}
                {activeTab === 'my-profile' && 'My Profile'}
              </span>
            </div>
          </div>

          <div className="topbar-right">
            <div className="system-status-indicator">
              <span className="status-dot"></span>
              <span className="status-text">Connected</span>
            </div>

            <div className="topbar-user-badge">
              <span className="user-email-tag">{user?.email}</span>
              <span className="perms-count-tag">
                {permissions.length} {permissions.length === 1 ? 'perm' : 'perms'}
              </span>
            </div>
          </div>
        </header>

        {/* Main Content View */}
        <main className="app-content-area">
          {authorizationError && (
            <div className="alert alert-error" role="alert">
              <span>{authorizationError}</span>
            </div>
          )}

          {/* OVERVIEW / DASHBOARD TAB */}
          {activeTab === 'overview' && (
            <div className="tab-container">
              {/* Welcome Header */}
              <div className="page-header">
                <div>
                  <h1 className="page-title">
                    Welcome back, {user?.first_name || user?.email?.split('@')[0] || 'User'}
                  </h1>
                  <p className="page-description">
                    Fine-grained capability-based authorization and organization management dashboard.
                  </p>
                </div>
              </div>

              {/* Metric Cards Grid */}
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-header">
                    <span className="metric-label">Assigned Permissions</span>
                    <span className="metric-icon-wrap">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    </span>
                  </div>
                  <div className="metric-value">
                    {permissions.length} <span className="metric-sub">/ 6 Granted</span>
                  </div>
                  <div className="metric-progress-bar">
                    <div
                      className="metric-progress-fill"
                      style={{ width: `${Math.round((permissions.length / 6) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-header">
                    <span className="metric-label">Employee Records</span>
                    <span className="metric-icon-wrap">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                      </svg>
                    </span>
                  </div>
                  <div className="metric-value">
                    {employees.length} <span className="metric-sub">in Directory</span>
                  </div>
                  <span className="metric-hint">
                    {hasPermission('VIEW_EMPLOYEE') ? 'Live directory synchronization' : 'Requires VIEW_EMPLOYEE'}
                  </span>
                </div>

                <div className="metric-card">
                  <div className="metric-header">
                    <span className="metric-label">Access Level</span>
                    <span className="metric-icon-wrap">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                  </div>
                  <div className="metric-value metric-value-text">{userAccessTier}</div>
                  <span className="metric-hint">
                    {hasPermission('ASSIGN_PERMISSION') ? 'Full system administration' : 'Role-free capability model'}
                  </span>
                </div>

                <div className="metric-card">
                  <div className="metric-header">
                    <span className="metric-label">Authentication State</span>
                    <span className="metric-icon-wrap">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  </div>
                  <div className="metric-value metric-value-text">JWT Verified</div>
                  <span className="metric-hint">Bearer token attached to API client</span>
                </div>
              </div>

              {/* Two Column Layout: Permissions Matrix & Recent Activity */}
              <div className="dashboard-columns">
                {/* Left: Capability Matrix */}
                <div className="panel-card">
                  <div className="panel-header">
                    <div>
                      <h2 className="panel-title">System Capability Status</h2>
                      <p className="panel-subtitle">Current account capabilities evaluated from PostgreSQL</p>
                    </div>
                    <span className="badge badge-info">{permissions.length} Active</span>
                  </div>

                  <div className="capability-grid">
                    {ALL_SYSTEM_PERMISSIONS.map((perm) => {
                      const isGranted = hasPermission(perm.code);
                      return (
                        <div key={perm.code} className={`capability-card ${isGranted ? 'granted' : 'denied'}`}>
                          <div className="capability-top">
                            <span className="capability-code">{perm.code}</span>
                            <span className={`badge ${isGranted ? 'badge-success' : 'badge-neutral'}`}>
                              {isGranted ? 'Granted' : 'Not Assigned'}
                            </span>
                          </div>
                          <span className="capability-name">{perm.name}</span>
                          <p className="capability-desc">{perm.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Live Activity Log */}
                <div className="panel-card">
                  <div className="panel-header">
                    <div>
                      <h2 className="panel-title">Recent Activity</h2>
                      <p className="panel-subtitle">Audit stream of recent events & actions</p>
                    </div>
                    <span className="badge badge-neutral">Live Session</span>
                  </div>

                  <div className="activity-list">
                    {recentActions.map((act) => (
                      <div key={act.id} className="activity-item">
                        <div className="activity-bullet"></div>
                        <div className="activity-main">
                          <div className="activity-headline">
                            <span className="activity-text">{act.text}</span>
                            <span className="activity-time">{act.time}</span>
                          </div>
                          <span className="activity-sub">{act.detail}</span>
                        </div>
                        <span className={`badge ${act.badgeClass || 'badge-success'}`}>
                          {act.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* EMPLOYEES TAB */}
          {activeTab === 'employees' && (
            <div className="tab-container">
              {/* Header */}
              <div className="page-header">
                <div>
                  <h1 className="page-title">Employees</h1>
                  <p className="page-description">Browse, filter, and manage organizational staff records.</p>
                </div>

                {/* CREATE_EMPLOYEE -> Add Employee */}
                <PermissionGate permission="CREATE_EMPLOYEE" showWhenUnauthorized onDenied={setAuthorizationError}>
                  <button
                    id="btn-add-employee"
                    className="btn btn-primary"
                    onClick={handleOpenAddModal}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>Add Employee</span>
                  </button>
                </PermissionGate>
              </div>

              {/* Alerts */}
              {actionSuccess && (
                <div className="alert alert-success" role="alert">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{actionSuccess}</span>
                </div>
              )}

              {employeesError && (
                <div className="alert alert-error" role="alert">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{employeesError}</span>
                </div>
              )}

              {!hasPermission('VIEW_EMPLOYEE') && (
                <div className="alert alert-error" role="alert">
                  <span>Not Authorized to view employee records.</span>
                </div>
              )}

              {/* Table Card */}
              <div className="panel-card">
                {/* Search & Filter Toolbar */}
                <div className="table-toolbar">
                  <div className="toolbar-search">
                    <span className="search-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Search employees by name, role, department..."
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                    />
                    {employeeSearch && (
                      <button
                        type="button"
                        className="search-clear-btn"
                        onClick={() => setEmployeeSearch('')}
                        title="Clear search"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <div className="toolbar-filters">
                    <select
                      className="filter-select"
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                    >
                      <option value="ALL">All Departments ({employees.length})</option>
                      {departmentsList.map((dep) => (
                        <option key={dep} value={dep}>
                          {dep}
                        </option>
                      ))}
                    </select>

                    <span className="table-counter-badge">
                      Showing {filteredEmployees.length} of {employees.length}
                    </span>
                  </div>
                </div>

                {/* Loading / Table / Empty States */}
                {employeesLoading ? (
                  <div className="loading-state">
                    <span className="loading-spinner"></span>
                    <p>Loading employee directory...</p>
                  </div>
                ) : filteredEmployees.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon-wrap">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </div>
                    <h3>{hasPermission('VIEW_EMPLOYEE') ? 'No employees found' : 'Employee directory unavailable'}</h3>
                    <p>
                      {!hasPermission('VIEW_EMPLOYEE')
                        ? 'Employee records are not available to this account.'
                        : employees.length === 0
                        ? 'The organizational directory is currently empty.'
                        : 'No employees match your current search and department filter.'}
                    </p>
                    {employees.length > 0 && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setEmployeeSearch('');
                          setDepartmentFilter('ALL');
                        }}
                      >
                        Clear Filters
                      </button>
                    )}
                    {employees.length === 0 && (
                      <PermissionGate permission="CREATE_EMPLOYEE" showWhenUnauthorized onDenied={setAuthorizationError}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={handleOpenAddModal}
                        >
                          + Add the First Employee
                        </button>
                      </PermissionGate>
                    )}
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="enterprise-table">
                      <thead>
                        <tr>
                          <th>Employee ID</th>
                          <th>Name</th>
                          <th>Department</th>
                          <th>Role</th>
                          <th>Contact</th>
                          <th>Status</th>
                          <th className="th-actions">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEmployees.map((emp) => (
                          <tr key={emp.id}>
                            <td>
                              <span className="emp-badge-id">{emp.employee_id}</span>
                            </td>
                            <td>
                              <div className="emp-name-cell">
                                <div className="emp-initials-avatar">
                                  {emp.first_name?.charAt(0)}
                                  {emp.last_name?.charAt(0)}
                                </div>
                                <div className="emp-name-info">
                                  <span className="emp-name">
                                    {emp.first_name} {emp.last_name}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="dep-tag">{emp.department}</span>
                            </td>
                            <td className="emp-role-cell">{emp.job_title}</td>
                            <td>
                              <div className="emp-contact-stack">
                                {emp.email && <span className="contact-email">{emp.email}</span>}
                                {emp.phone && <span className="contact-phone">{emp.phone}</span>}
                                {!emp.email && !emp.phone && <span className="contact-empty">—</span>}
                              </div>
                            </td>
                            <td>
                              <span className="status-pill active">
                                <span className="status-pill-dot"></span>
                                Active
                              </span>
                            </td>
                            <td className="td-actions">
                              <div className="action-buttons-group">
                                  {/* EDIT_EMPLOYEE -> Edit Button */}
                                  <PermissionGate permission="EDIT_EMPLOYEE" showWhenUnauthorized onDenied={setAuthorizationError}>
                                    <button
                                      id={`btn-edit-employee-${emp.id}`}
                                      className="action-btn edit"
                                      onClick={() => handleOpenEditModal(emp)}
                                      title="Edit employee details"
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                      </svg>
                                      <span>Edit</span>
                                    </button>
                                  </PermissionGate>

                                  {/* DELETE_EMPLOYEE -> Delete Button */}
                                  <PermissionGate permission="DELETE_EMPLOYEE" showWhenUnauthorized onDenied={setAuthorizationError}>
                                    <button
                                      id={`btn-delete-employee-${emp.id}`}
                                      className="action-btn delete"
                                      onClick={() => handleOpenDeleteConfirm(emp)}
                                      title="Delete employee"
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                      </svg>
                                      <span>Delete</span>
                                    </button>
                                  </PermissionGate>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PERMISSION MANAGEMENT TAB */}
          {activeTab === 'permissions' && (
            <div className="tab-container">
              {/* Header */}
              <div className="page-header">
                <div>
                  <h1 className="page-title">Permission Management</h1>
                  <p className="page-description">
                    Assign and revoke fine-grained capabilities directly to user accounts.
                  </p>
                </div>
                <span className="badge badge-info">ASSIGN_PERMISSION Active</span>
              </div>

              {pmLoading && (
                <div className="loading-state">
                  <span className="loading-spinner"></span>
                  <p>Loading users and system capabilities...</p>
                </div>
              )}

              {pmError && (
                <>
                  <div className="alert alert-error" role="alert">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{pmError}</span>
                  </div>
                  {!hasPermission('ASSIGN_PERMISSION') && (
                    <div className="column-card">
                      <div className="empty-state">
                        <h3>Permission assignment is unavailable</h3>
                        <p>User and permission details remain protected for this account.</p>
                      </div>
                      <div className="column-card-footer">
                        <button
                          id="btn-pm-clear"
                          type="button"
                          className="btn btn-secondary"
                          onClick={handlePmClear}
                        >
                          Clear All
                        </button>
                        <button
                          id="btn-pm-save"
                          type="button"
                          className="btn btn-primary"
                          onClick={handlePmSave}
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {!pmLoading && !pmError && (
                <div className="pm-split-layout">
                  {/* Left Column: User Directory */}
                  <div className="pm-users-column">
                    <div className="column-card">
                      <div className="column-card-header">
                        <div>
                          <h3 className="column-title">User Directory</h3>
                          <span className="column-subtitle">{pmUsers.length} total accounts</span>
                        </div>
                      </div>

                      <div className="pm-search-box">
                        <span className="search-icon">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                          </svg>
                        </span>
                        <input
                          id="pm-user-search"
                          type="text"
                          className="pm-search-input"
                          placeholder="Filter users by email…"
                          value={pmSearch}
                          onChange={(e) => setPmSearch(e.target.value)}
                        />
                      </div>

                      <div className="pm-user-list">
                        {pmUsers
                          .filter(
                            (u) =>
                              pmSearch.trim() === '' ||
                              u.email.toLowerCase().includes(pmSearch.toLowerCase())
                          )
                          .map((u) => {
                            const isSelected = pmSelectedUserId === u.id;
                            return (
                              <button
                                key={u.id}
                                id={`pm-user-${u.id}`}
                                type="button"
                                className={`pm-user-item ${isSelected ? 'selected' : ''}`}
                                onClick={() => handlePmSelectUser(u.id)}
                              >
                                <div className="pm-user-avatar">
                                  {(u.first_name || u.email).charAt(0).toUpperCase()}
                                </div>
                                <div className="pm-user-meta">
                                  <span className="pm-user-email">{u.email}</span>
                                  <span className="pm-user-name">
                                    {u.first_name || u.last_name
                                      ? `${u.first_name || ''} ${u.last_name || ''}`.trim()
                                      : 'No name set'}
                                  </span>
                                </div>
                                <div className="pm-user-badges">
                                  <span className="pm-perm-pill">
                                    {u.permissions?.length || 0} perms
                                  </span>
                                </div>
                              </button>
                            );
                          })}

                        {pmUsers.filter(
                          (u) =>
                            pmSearch.trim() === '' ||
                            u.email.toLowerCase().includes(pmSearch.toLowerCase())
                        ).length === 0 && (
                          <div className="pm-user-empty">No matching users found</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Permission Matrix */}
                  <div className="pm-matrix-column">
                    {!pmSelectedUserId ? (
                      <div className="column-card empty-card-wrap">
                        <div className="empty-state">
                          <div className="empty-icon-wrap">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                          </div>
                          <h3>Select a user to manage capabilities</h3>
                          <p>
                            Choose an account from the left directory to inspect its granted permissions
                            and configure fine-grained capabilities.
                          </p>
                        </div>
                      </div>
                    ) : (() => {
                      const selectedUser = pmUsers.find((u) => u.id === pmSelectedUserId);
                      return (
                        <div className="column-card">
                          <div className="column-card-header">
                            <div>
                              <div className="user-header-line">
                                <h3 className="column-title">{selectedUser?.email}</h3>
                                <span className="status-pill active">
                                  <span className="status-pill-dot"></span>
                                  Active
                                </span>
                              </div>
                              <span className="column-subtitle">
                                User ID: {selectedUser?.id} ·{' '}
                                {selectedUser?.first_name || selectedUser?.last_name
                                  ? `${selectedUser?.first_name || ''} ${selectedUser?.last_name || ''}`.trim()
                                  : 'No name set'}
                              </span>
                            </div>
                          </div>

                          <div className="column-card-body">
                            {pmSaveSuccess && (
                              <div className="alert alert-success" role="alert">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span>{pmSaveSuccess}</span>
                              </div>
                            )}

                            {pmSaveError && (
                              <div className="alert alert-error" role="alert">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10" />
                                  <line x1="12" y1="8" x2="12" y2="12" />
                                  <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                <span>{pmSaveError}</span>
                              </div>
                            )}

                            <div className="pm-m2m-explanation">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="16" x2="12" y2="12" />
                                <line x1="12" y1="8" x2="12.01" y2="8" />
                              </svg>
                              <span>
                                Many-to-Many Permission Model: Toggling a capability directly grants or revokes
                                backend API authorization and dynamically toggles frontend controls for this user.
                              </span>
                            </div>

                            <div className="pm-checklist">
                              {pmFunctions.map((f) => {
                                const isChecked = !!pmChecked[f.code];
                                return (
                                  <label
                                    key={f.code}
                                    htmlFor={`pm-chk-${f.code}`}
                                    className={`pm-check-item ${isChecked ? 'active' : ''}`}
                                  >
                                    <div className="pm-check-left">
                                      <input
                                        id={`pm-chk-${f.code}`}
                                        type="checkbox"
                                        className="pm-checkbox-native"
                                        checked={isChecked}
                                        onChange={() => handlePmToggle(f.code)}
                                        disabled={pmSaving}
                                      />
                                      <div className="pm-check-info">
                                        <div className="pm-code-row">
                                          <span className="pm-check-code">{f.code}</span>
                                          <span className="pm-check-name">{f.name}</span>
                                        </div>
                                        {f.description && (
                                          <p className="pm-check-desc">{f.description}</p>
                                        )}
                                      </div>
                                    </div>
                                    <span className={`badge ${isChecked ? 'badge-success' : 'badge-neutral'}`}>
                                      {isChecked ? 'Granted' : 'Denied'}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>

                          <div className="column-card-footer">
                            <button
                              id="btn-pm-clear"
                              type="button"
                              className="btn btn-secondary"
                              onClick={handlePmClear}
                              disabled={pmSaving}
                            >
                              Clear All
                            </button>
                            <button
                              id="btn-pm-save"
                              type="button"
                              className="btn btn-primary"
                              onClick={handlePmSave}
                              disabled={pmSaving}
                            >
                              {pmSaving ? (
                                <>
                                  <span className="btn-spinner"></span>
                                  Saving Changes...
                                </>
                              ) : (
                                'Save Changes'
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MY PROFILE TAB */}
          {activeTab === 'my-profile' && hasPermission('VIEW_SELF') && (
            <div className="tab-container">
              <div className="page-header">
                <div>
                  <h1 className="page-title">My Profile</h1>
                  <p className="page-description">Your authenticated credentials and organizational employee record.</p>
                </div>
                <span className="badge badge-success">VIEW_SELF Active</span>
              </div>

              <div className="profile-grid">
                {/* Account Details Card */}
                <div className="panel-card">
                  <div className="panel-header">
                    <div>
                      <h2 className="panel-title">Account Credentials</h2>
                      <p className="panel-subtitle">Custom User model identity</p>
                    </div>
                  </div>
                  <div className="detail-list">
                    <div className="detail-row">
                      <span className="detail-label">User ID</span>
                      <span className="detail-value">{user?.id}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Email Address</span>
                      <span className="detail-value font-mono">{user?.email}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Account Name</span>
                      <span className="detail-value">
                        {user?.first_name || user?.last_name
                          ? `${user?.first_name || ''} ${user?.last_name || ''}`.trim()
                          : '—'}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Account Status</span>
                      <span className="detail-value">
                        <span className="status-pill active">
                          <span className="status-pill-dot"></span>
                          Active
                        </span>
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Assigned Permissions</span>
                      <span className="detail-value">{permissions.length} Functions</span>
                    </div>
                  </div>
                </div>

                {/* Linked Employee Record Card */}
                <div className="panel-card">
                  <div className="panel-header">
                    <div>
                      <h2 className="panel-title">Linked Employee Record</h2>
                      <p className="panel-subtitle">Profile synchronized from Employee model</p>
                    </div>
                  </div>
                  {myProfileLoading ? (
                    <div className="loading-state">
                      <span className="loading-spinner"></span>
                      <p>Loading personal employee record...</p>
                    </div>
                  ) : myProfile ? (
                    <div className="detail-list">
                      <div className="detail-row">
                        <span className="detail-label">Employee ID</span>
                        <span className="detail-value">
                          <span className="emp-badge-id">{myProfile.employee_id}</span>
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Department</span>
                        <span className="detail-value">{myProfile.department}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Job Title</span>
                        <span className="detail-value">{myProfile.job_title}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Contact Email</span>
                        <span className="detail-value">{myProfile.email || '—'}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Phone</span>
                        <span className="detail-value">{myProfile.phone || '—'}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Date of Joining</span>
                        <span className="detail-value">{myProfile.date_of_joining || '—'}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="empty-state">
                      <p className="text-muted">
                        No individual Employee profile is currently linked to your user account.
                        An administrator can link an employee record via Django Admin.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ADD / EDIT EMPLOYEE MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-container">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">
                  {modalMode === 'create' ? 'Add New Employee' : 'Edit Employee Record'}
                </h3>
                <p className="modal-subtitle">
                  {modalMode === 'create'
                    ? 'Provide staff details to register a new employee record.'
                    : 'Modify the employee details below.'}
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={handleCloseModal}
                disabled={formSubmitting}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-error" role="alert">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{formError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="input-employee-id">
                    Employee ID <span className="req">*</span>
                  </label>
                  <input
                    id="input-employee-id"
                    name="employee_id"
                    type="text"
                    value={formData.employee_id}
                    onChange={handleInputChange}
                    placeholder="e.g. EMP-101"
                    required
                    disabled={formSubmitting}
                  />
                  <span className="form-help-text">Unique company identifier for this employee</span>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="input-first-name">
                      First Name <span className="req">*</span>
                    </label>
                    <input
                      id="input-first-name"
                      name="first_name"
                      type="text"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      placeholder="Jane"
                      required
                      disabled={formSubmitting}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="input-last-name">
                      Last Name <span className="req">*</span>
                    </label>
                    <input
                      id="input-last-name"
                      name="last_name"
                      type="text"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      placeholder="Doe"
                      required
                      disabled={formSubmitting}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="input-department">
                      Department <span className="req">*</span>
                    </label>
                    <input
                      id="input-department"
                      name="department"
                      type="text"
                      value={formData.department}
                      onChange={handleInputChange}
                      placeholder="Engineering"
                      required
                      disabled={formSubmitting}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="input-job-title">
                      Role / Job Title <span className="req">*</span>
                    </label>
                    <input
                      id="input-job-title"
                      name="job_title"
                      type="text"
                      value={formData.job_title}
                      onChange={handleInputChange}
                      placeholder="Software Engineer"
                      required
                      disabled={formSubmitting}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="input-email">Contact Email</label>
                    <input
                      id="input-email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="jane.doe@company.com"
                      disabled={formSubmitting}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="input-phone">Contact Phone</label>
                    <input
                      id="input-phone"
                      name="phone"
                      type="text"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+1 (555) 0123"
                      disabled={formSubmitting}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  id="btn-cancel-employee"
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseModal}
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button
                  id="btn-save-employee"
                  type="submit"
                  className="btn btn-primary"
                  disabled={formSubmitting}
                >
                  {formSubmitting ? (
                    <>
                      <span className="btn-spinner"></span>
                      Saving...
                    </>
                  ) : modalMode === 'create' ? (
                    'Create Employee'
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirm && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-container modal-sm">
            <div className="modal-header">
              <div className="delete-dialog-title-wrap">
                <div className="delete-warning-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div>
                  <h3 className="modal-title">Delete Employee</h3>
                  <p className="modal-subtitle">Permanent action</p>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={handleCloseDeleteConfirm}
                disabled={isDeleting}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              {deleteError && (
                <div className="alert alert-error" role="alert">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{deleteError}</span>
                </div>
              )}

              <p className="delete-confirm-text">
                Are you sure you want to delete employee{' '}
                <strong>{deleteConfirm.name}</strong> (
                <span className="font-mono">{deleteConfirm.employee_id}</span>)?
              </p>
              <p className="delete-confirm-warning">
                This record will be permanently removed from the organization database. This action cannot be undone.
              </p>
            </div>

            <div className="modal-footer">
              <button
                id="btn-cancel-delete"
                type="button"
                className="btn btn-secondary"
                onClick={handleCloseDeleteConfirm}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                id="btn-confirm-delete"
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <span className="btn-spinner"></span>
                    Deleting...
                  </>
                ) : (
                  'Delete Employee'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

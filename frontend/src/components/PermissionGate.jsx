import React from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Reusable component to conditionally render children only if
 * the current user possesses the required permission.
 *
 * Usage:
 *   <PermissionGate permission="CREATE_EMPLOYEE">
 *     <button>Add Employee</button>
 *   </PermissionGate>
 */
export default function PermissionGate({ permission, children, fallback = null }) {
  const { hasPermission } = useAuth();

  if (!permission) return children;

  return hasPermission(permission) ? children : fallback;
}

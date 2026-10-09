import React, { cloneElement, isValidElement } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Optionally keeps an action visible and blocks its click without permission.
 *
 * Usage:
 *   <PermissionGate permission="CREATE_EMPLOYEE">
 *     <button onClick={handleAdd}>Add Employee</button>
 *   </PermissionGate>
 */
export default function PermissionGate({
  permission,
  children,
  fallback = null,
  showWhenUnauthorized = false,
  onDenied,
}) {
  const { hasPermission } = useAuth();

  if (!permission) return children;
  if (hasPermission(permission)) return children;
  if (!showWhenUnauthorized) return fallback;

  if (!isValidElement(children)) return children;

  return cloneElement(children, {
    onClick: (event) => {
      event.preventDefault();
      event.stopPropagation();
      onDenied?.('Not Authorized');
    },
  });
}

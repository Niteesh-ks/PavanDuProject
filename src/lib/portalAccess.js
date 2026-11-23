
export function getPortalAccessError(profile, requestedRole) {
  const role = String(requestedRole || '').trim().toUpperCase();
  const userRole = String(profile?.role || '').trim().toUpperCase();

  if (!profile) {
    return 'Access denied. User profile not found.';
  }

  if (!['STUDENT', 'ORGANIZER', 'ADMIN'].includes(role)) {
    return 'Access denied. Invalid portal selected.';
  }

  if (userRole !== role) {
    return `Access denied. This account is not authorized for the ${role} portal.`;
  }

  return '';
}

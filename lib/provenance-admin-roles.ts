import type { ProvenanceAdminRole } from '@/lib/data/ami-data';

export interface ProvenanceAdminRoleOption {
  id: ProvenanceAdminRole;
  label: string;
  canWrite: boolean;
  showProfile: boolean;
}

export const PROVENANCE_ADMIN_ROLES: ProvenanceAdminRoleOption[] = [
  { id: 'plant-admin', label: 'Plant Admin', canWrite: true, showProfile: true },
  { id: 'quality-admin', label: 'Quality Admin', canWrite: true, showProfile: true },
  { id: 'oem-viewer', label: 'OEM Admin (read-only)', canWrite: false, showProfile: false },
];

export function getProvenanceAdminRoleOption(role: ProvenanceAdminRole): ProvenanceAdminRoleOption {
  return PROVENANCE_ADMIN_ROLES.find((r) => r.id === role) ?? PROVENANCE_ADMIN_ROLES[0];
}

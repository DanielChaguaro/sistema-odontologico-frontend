/** Códigos de permiso del backend (sembrados en identity V2). */
export const P = {
  usersRead: 'users.read',
  usersWrite: 'users.write',
  usersManage: 'users.manage',
  profilesRead: 'profiles.read',
  permissionsRead: 'permissions.read',
  auditRead: 'audit.read',
  patientRead: 'patient.read',
  patientWrite: 'patient.write',
  practitionerRead: 'practitioner.read',
  practitionerWrite: 'practitioner.write',
  officeRead: 'office.read',
  officeWrite: 'office.write',
} as const

export type PermissionCode = (typeof P)[keyof typeof P]

/** Etiquetas legibles para la vista de roles. */
export const permissionGroups: { title: string; codes: PermissionCode[] }[] = [
  { title: 'Pacientes', codes: [P.patientRead, P.patientWrite] },
  { title: 'Personal clínico', codes: [P.practitionerRead, P.practitionerWrite] },
  { title: 'Consultorios', codes: [P.officeRead, P.officeWrite] },
  { title: 'Usuarios y roles', codes: [P.usersRead, P.usersWrite, P.usersManage, P.profilesRead, P.permissionsRead] },
  { title: 'Auditoría', codes: [P.auditRead] },
]

/** Superadmin pasa todas las verificaciones, igual que en el backend. */
export function hasPermission(granted: ReadonlySet<string>, isSuperAdmin: boolean, code: string | string[] | undefined): boolean {
  if (!code) return true
  if (isSuperAdmin) return true
  return (Array.isArray(code) ? code : [code]).some((c) => granted.has(c))
}

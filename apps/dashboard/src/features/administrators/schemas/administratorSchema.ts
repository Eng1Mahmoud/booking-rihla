export type AdministratorFilters = {
  email: string;
  role: '' | 'STAFF' | 'ADMIN' | 'SUPER_ADMIN';
  isActive: '' | 'true' | 'false';
};

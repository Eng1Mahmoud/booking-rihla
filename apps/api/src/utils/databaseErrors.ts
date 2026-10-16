// Prisma 8 exposes PostgreSQL SQLSTATE; pg itself exposes the same value as code.
function hasSqlState(error: unknown, state: string): boolean {
  return (
    error instanceof Error &&
    (('sqlState' in error && error.sqlState === state) ||
      ('code' in error && error.code === state))
  );
}

export function isForeignKeyViolation(error: unknown): boolean {
  return hasSqlState(error, '23503');
}

export function isRestrictViolation(error: unknown): boolean {
  return hasSqlState(error, '23001');
}

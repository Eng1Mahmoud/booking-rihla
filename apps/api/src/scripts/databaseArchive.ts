import { spawn, spawnSync } from 'node:child_process';
import { createReadStream, createWriteStream } from 'node:fs';
import { link, lstat, mkdir, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';

// Host-side Docker CLI utility. Never embeds a password in command arguments.
const root = resolve(import.meta.dirname, '../../../..');
const [operation, ...tokens] = process.argv.slice(2);
function options() {
  const values = new Map<string, string>();
  for (let index = 0; index < tokens.length; index += 2) {
    const key = tokens[index],
      value = tokens[index + 1];
    if (
      !key ||
      !['--compose', '--env-file', '--file', '--target'].includes(key) ||
      !value ||
      value.startsWith('--') ||
      values.has(key)
    )
      throw new Error('Invalid archive arguments');
    values.set(key, value);
  }
  if (
    !values.get('--compose') ||
    !values.get('--env-file') ||
    !values.get('--file')
  )
    throw new Error('Provide --compose, --env-file and --file');
  return values;
}
async function run(args: string[], input?: string, output?: string) {
  const child = spawn('docker', args, {
    cwd: root,
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  child.stderr.resume();
  const done = new Promise<void>((accept, reject) => {
    child.once('error', () => reject(new Error('Could not start Docker')));
    child.once('close', (code) =>
      code === 0
        ? accept()
        : reject(
            new Error(
              'Database archive operation failed; inspect Docker/PostgreSQL configuration',
            ),
          ),
    );
  });
  const streams: Promise<unknown>[] = [done];
  if (input) streams.push(pipeline(createReadStream(input), child.stdin));
  else child.stdin.end();
  if (output)
    streams.push(
      pipeline(
        child.stdout,
        createWriteStream(output, { flags: 'wx', mode: 0o600 }),
      ),
    );
  else child.stdout.resume();
  try {
    await Promise.all(streams);
  } catch (error) {
    child.kill();
    throw error;
  }
}
try {
  if (operation !== 'backup' && operation !== 'restore')
    throw new Error('Use backup or restore');
  const args = options();
  const compose = [
    'compose',
    '--project-directory',
    root,
    '--env-file',
    resolve(root, args.get('--env-file')!),
    '-f',
    resolve(root, args.get('--compose')!),
  ];
  // Capture configuration privately: it may contain database/SMTP/provider secrets.
  const config = spawnSync(
    'docker',
    [...compose, 'config', '--format', 'json'],
    {
      cwd: root,
      windowsHide: true,
      encoding: 'utf8',
      maxBuffer: 2 * 1024 * 1024,
    },
  );
  if (config.status !== 0)
    throw new Error('Could not read Docker Compose configuration');
  let database: string, user: string;
  try {
    const environment = JSON.parse(config.stdout).services.postgres
      .environment as Record<string, unknown>;
    if (
      typeof environment['POSTGRES_DB'] !== 'string' ||
      typeof environment['POSTGRES_USER'] !== 'string'
    )
      throw new Error();
    database = environment['POSTGRES_DB'];
    user = environment['POSTGRES_USER'];
  } catch {
    throw new Error(
      'Compose must define the postgres service database and user',
    );
  }
  if (
    ![database, user].every((value) =>
      /^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/.test(value),
    )
  )
    throw new Error('Unsupported PostgreSQL database/user name');
  const file = resolve(root, args.get('--file')!);
  const exec = [...compose, 'exec', '-T', 'postgres'];
  if (operation === 'backup') {
    if (args.has('--target'))
      throw new Error('--target is only supported for restore');
    await mkdir(dirname(file), { recursive: true });
    // Create exclusively. A failed backup keeps a .partial file for investigation.
    const partial = file + '.partial';
    await run(
      [
        ...exec,
        'pg_dump',
        '--username',
        user,
        '--dbname',
        database,
        '--format=custom',
        '--no-owner',
        '--no-privileges',
      ],
      undefined,
      partial,
    );
    // Hard-link creation is atomic and refuses to overwrite an existing destination.
    await link(partial, file);
    await unlink(partial);
    console.log(
      'Database backup completed. Keep this file private and encrypted off-host.',
    );
  } else {
    const target = args.get('--target');
    if (
      !target ||
      !/^restore_[a-z0-9_]{1,55}$/.test(target) ||
      target === database
    )
      throw new Error(
        'Restore requires a new --target name beginning with restore_',
      );
    const source = await lstat(file);
    if (!source.isFile() || source.isSymbolicLink())
      throw new Error('Restore input must be a regular backup file');
    // createdb fails if the target exists. Never clean or overwrite a database.
    await run([
      ...exec,
      'createdb',
      '--username',
      user,
      '--maintenance-db',
      'postgres',
      target,
    ]);
    await run(
      [
        ...exec,
        'pg_restore',
        '--username',
        user,
        '--dbname',
        target,
        '--single-transaction',
        '--exit-on-error',
        '--no-owner',
        '--no-privileges',
      ],
      file,
    );
    console.log(
      'Restore completed into the new database. Verify it before changing DATABASE_URL.',
    );
  }
} catch (error) {
  // Error messages above contain no raw child stderr/configuration or connection URL.
  console.error(
    error instanceof Error && error.message.startsWith('E')
      ? 'Archive file I/O failed; check paths and permissions'
      : error instanceof Error
        ? error.message
        : 'Database archive failed',
  );
  process.exitCode = 1;
}


const cassandra = require('cassandra-driver');

const client = new cassandra.Client({
  contactPoints: [process.env.DB_HOST || 'localhost'],
  localDataCenter: process.env.DB_DATA_CENTER || 'datacenter1',
  keyspace: process.env.DB_KEYSPACE || 'auth',
  credentials: {
    username: process.env.DB_USERNAME || 'cassandra',
    password: process.env.DB_PASSWORD || 'cassandra'
  },
});

async function createSchema() {
  try {
    await client.connect();
    console.log('Connected to Cassandra');

    const createUserTableQuery = `
      CREATE TABLE IF NOT EXISTS auth.users (
        cedula text PRIMARY KEY,
        nombre text,
        contrasena text,
        pin text,
        rol boolean,
        estado boolean
      );
    `;

    const createPermissionsTableQuery = `
      CREATE TABLE IF NOT EXISTS auth.permissions (
        cedula text PRIMARY KEY,
        keyspaces list<text>,
        operaciones list<text>
      );
    `;

    await client.execute(createUserTableQuery);
    console.log('Table "users" created or already exists.');

    await client.execute(createPermissionsTableQuery);
    console.log('Table "permissions" created or already exists.');

    await client.shutdown();
    console.log('Disconnected from Cassandra');
  } catch (error) {
    console.error('Error creating schema:', error);
    await client.shutdown();
  }
}

createSchema();

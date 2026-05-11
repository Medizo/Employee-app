import { MongoClient } from 'mongodb';

// SECURITY: Connection string MUST come from environment variables only.
// No hardcoded fallback credentials in production.
const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('MONGODB_URI environment variable is required. Check your .env file.');
}

// Connection pooling configuration
const options = {
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 30000,
  connectTimeoutMS: 10000,
  serverSelectionTimeoutMS: 10000,
};

let client;
let clientPromise;

if (!global._mongoClientPromise) {
  client = new MongoClient(uri, options);
  global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

export async function getDb() {
  const client = await clientPromise;
  return client.db('cluso');
}

export async function readData(collectionName) {
  const db = await getDb();
  const data = await db.collection(collectionName).find({}).toArray();
  return data.map(({ _id, ...rest }) => rest);
}

export async function writeData(collectionName, data) {
  const db = await getDb();
  await db.collection(collectionName).deleteMany({});
  if (data && data.length > 0) {
    const cleanData = data.map(d => { const { _id, ...rest } = d; return rest; });
    await db.collection(collectionName).insertMany(cleanData);
  }
}

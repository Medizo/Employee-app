import { MongoClient } from 'mongodb';

// Connection pooling configuration
const options = {
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 30000,
  connectTimeoutMS: 10000,
  serverSelectionTimeoutMS: 10000,
};

// Lazy connection — avoids crashing during Vercel build-time page collection
// where env vars are not yet available.
function getClientPromise() {
  if (!global._mongoClientPromise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is required. Check your .env file.');
    }
    const client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  return global._mongoClientPromise;
}

export async function getDb() {
  const client = await getClientPromise();
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


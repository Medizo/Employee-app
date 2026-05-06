import fs from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || "mongodb://DonyUser:Litera%402016@ac-4ndgql6-shard-00-00.ckemsuq.mongodb.net:27017,ac-4ndgql6-shard-00-01.ckemsuq.mongodb.net:27017,ac-4ndgql6-shard-00-02.ckemsuq.mongodb.net:27017/cluso?ssl=true&authSource=admin&retryWrites=true&w=majority&appName=Cluster0";

let client;
let clientPromise;

if (!global._mongoClientPromise) {
  client = new MongoClient(uri);
  global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

let seeded = false;

export async function getDb() {
  const client = await clientPromise;
  const db = client.db('cluso');

  if (!seeded) {
    seeded = true;
    try {
      const usersCount = await db.collection('users').countDocuments();
      if (usersCount === 0) {
        console.log('MongoDB is empty. Seeding from local JSON...');
        const absoluteDataDir = path.resolve('d:\\Employee Tracker\\app\\data');
        if (fs.existsSync(absoluteDataDir)) {
          const files = fs.readdirSync(absoluteDataDir);
          for (const file of files) {
            if (file.endsWith('.json')) {
              const colName = file.replace('.json', '');
              const fileData = JSON.parse(fs.readFileSync(path.join(absoluteDataDir, file), 'utf8'));
              if (fileData.length > 0) {
                const cleanData = fileData.map(d => { const { _id, ...rest } = d; return rest; });
                await db.collection(colName).insertMany(cleanData);
              }
            }
          }
          console.log('Seeding complete.');
        }
      }
    } catch (e) {
      console.error('Error during seeding:', e);
    }
  }

  return db;
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

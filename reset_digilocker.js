const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb://DonyUser:Litera%402016@ac-4ndgql6-shard-00-00.ckemsuq.mongodb.net:27017,ac-4ndgql6-shard-00-01.ckemsuq.mongodb.net:27017,ac-4ndgql6-shard-00-02.ckemsuq.mongodb.net:27017/cluso?ssl=true&authSource=admin&retryWrites=true&w=majority&appName=Cluster0';

async function resetDigilocker() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('cluso');

    const email = 'ahmadshajee0@gmail.com';

    // Find the user
    const user = await db.collection('users').findOne({ email });
    if (!user) {
      console.log(`❌ User with email ${email} not found`);
      return;
    }
    console.log(`✅ Found user: ${user.name || user.email} (id: ${user.id})`);

    // Remove digilocker verification record
    const dlResult = await db.collection('digilocker_verifications').deleteOne({ userId: user.id });
    console.log(`🗑️  Deleted ${dlResult.deletedCount} record(s) from digilocker_verifications`);

    // Remove verified flags from user record
    const userResult = await db.collection('users').updateOne(
      { id: user.id },
      { $unset: { digilockerVerified: '', digilockerVerifiedAt: '' } }
    );
    console.log(`🔄 Updated user record: ${userResult.modifiedCount} modified`);

    console.log(`\n✅ DigiLocker verification reset for ${email}. You can re-verify now!`);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.close();
  }
}

resetDigilocker();

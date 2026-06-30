require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  await db.collection('users').updateOne(
    { _id: new mongoose.Types.ObjectId('6a2e7de59b89b3e22b0e452c') },
    { $set: { hospitalName: 'Bệnh viện Chợ Rẫy' } }
  );
  console.log('✅ Done! Updated hospitalName for admin');
  process.exit();
}).catch(err => {
  console.error('❌ Lỗi:', err.message);
  process.exit(1);
});

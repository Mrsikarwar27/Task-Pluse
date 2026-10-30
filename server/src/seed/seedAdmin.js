import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { User } from '../models/User.js';

async function seedAdmin() {
  const name = process.env.ADMIN_NAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD?.trim();
  const phone = process.env.ADMIN_PHONE?.trim();

  if (!name || !email || !password || !phone) {
    throw new Error(
      'ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD and ADMIN_PHONE must be set in server/.env'
    );
  }

  await connectDatabase();

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`[TaskPulse] Admin already exists for ${email}. No changes made.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({
    name,
    email,
    phone,
    passwordHash,
    role: 'admin',
    isActive: true,
  });

  console.log('[TaskPulse] First admin created successfully.');
  console.log(`  Name:  ${name}`);
  console.log(`  Email: ${email}`);
  console.log('  Password: the ADMIN_PASSWORD value from server/.env');
}

seedAdmin()
  .catch((error) => {
    console.error('[TaskPulse] Seed failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });

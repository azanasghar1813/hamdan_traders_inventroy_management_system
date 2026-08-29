const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const User = require('./src/models/User');

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected.');

    const adminExists = await User.findOne({ email: 'hamdanadmin@gmail.com' });

    if (adminExists) {
      console.log('Admin user already exists!');
      process.exit();
    }

    const admin = await User.create({
      name: 'Hamdan Admin',
      email: 'hamdanadmin@gmail.com',
      password: 'hamdan@admin',
      role: 'ADMIN'
    });

    console.log(`Admin user created!`);
    console.log(`Login: ${admin.email}`);
    console.log(`Password: password123`);
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seedAdmin();

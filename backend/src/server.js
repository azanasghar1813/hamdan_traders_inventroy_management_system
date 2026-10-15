require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { initScheduler } = require('./utils/scheduler');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB().then(() => {
  initScheduler();
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


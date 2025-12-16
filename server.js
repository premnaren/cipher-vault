const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

// Load config
dotenv.config();

const app = express();

// Middleware (Allows JSON data and file access)
app.use(express.json());
app.use(cors());
app.use(express.static('public')); // Serves your HTML files

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ DB Connection Error:', err));

// Routes (We will create these next)
app.use('/api/user', require('./routes/auth'));
app.use('/api/vault', require('./routes/vault'));

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
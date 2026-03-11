const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

const allowedOrigins = [
  "https://toll-claim-billing.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000"
];

// 1. Unified CORS Setup
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Quick handle for preflight OPTIONS to avoid reaching routes unnecessarily
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return res.status(204).end(); // 204 No Content is better for OPTIONS
  }
  next();
});



app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/routes', require('./routes/routes'));
app.use('/api/transporters', require('./routes/transporters'));
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/data', require('./routes/data'));

// Health Check (To wake up the server)
app.get('/', (req, res) => {
  res.send('Server is running and healthy!');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
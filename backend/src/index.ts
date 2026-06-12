import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.routes';
import habitRoutes from './routes/habit.routes';
import profileRoutes from './routes/profile.routes';
import { authMiddleware } from './middleware/auth.middleware';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/habits', authMiddleware, habitRoutes);
app.use('/api/profile', authMiddleware, profileRoutes);

const PORT = process.env.PORT ?? 3000;

mongoose.connect(process.env.MONGODB_URI as string)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => { console.error('DB connection failed:', err); process.exit(1); });

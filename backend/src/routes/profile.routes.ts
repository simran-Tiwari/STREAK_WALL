import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import User from '../models/user.model';
import Habit from '../models/habit.model';

const router = Router();

// GET /api/profile
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId).select('-passwordHash');
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    const habits = await Habit.find({ userId: req.userId });
    const allDates = habits.flatMap(h => h.doneDates.map(d => d.date));
    const uniqueDates = [...new Set(allDates)];
    res.json({ email: user.email, username: user.username, joinDate: user.joinDate, totalDaysLogged: uniqueDates.length, habitCount: habits.length });
  } catch { res.status(500).json({ error: 'Failed to fetch profile' }); }
});

// PUT /api/profile/username
router.put('/username', async (req: AuthRequest, res: Response) => {
  try {
    const { username } = req.body;
    if (!username) { res.status(400).json({ error: 'username required' }); return; }
    await User.findByIdAndUpdate(req.userId, { username });
    res.json({ username });
  } catch { res.status(500).json({ error: 'Failed to update username' }); }
});

export default router;

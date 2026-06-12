import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import Habit from '../models/habit.model';

const MAX_HABITS = 5;
const MILESTONES = [3, 7, 14, 30];

function today(): string { return new Date().toISOString().slice(0, 10); }

function computeStreaks(dates: string[], freezes: string[]): { current: number; longest: number } {
  if (!dates.length) return { current: 0, longest: 0 };
  const sorted = [...new Set(dates)].sort();

  let longest = 1, cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / 864e5;
    cur = diff === 1 ? cur + 1 : (diff === 2 && freezes.includes(sorted[i - 1]) ? cur + 1 : 1);
    if (cur > longest) longest = cur;
  }

  const todayStr = today();
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const anchor = sorted[sorted.length - 1];
  if (anchor !== todayStr && anchor !== yesterday) return { current: 0, longest };

  let current = 1;
  for (let i = sorted.length - 2; i >= 0; i--) {
    const diff = (new Date(sorted[i + 1]).getTime() - new Date(sorted[i]).getTime()) / 864e5;
    if (diff === 1) { current++; }
    else if (diff === 2 && freezes.includes(sorted[i])) { current++; }
    else break;
  }
  return { current, longest };
}

function getWeekStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

const router = Router();

// GET /api/habits
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const habits = await Habit.find({ userId: req.userId });
    res.json(habits);
  } catch { res.status(500).json({ error: 'Failed to fetch habits' }); }
});

// POST /api/habits
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const count = await Habit.countDocuments({ userId: req.userId });
    if (count >= MAX_HABITS) { res.status(400).json({ error: `Max ${MAX_HABITS} habits allowed` }); return; }
    const { name } = req.body;
    if (!name) { res.status(400).json({ error: 'name required' }); return; }
    const habit = await Habit.create({ userId: req.userId, name });
    res.status(201).json(habit);
  } catch { res.status(500).json({ error: 'Failed to create habit' }); }
});

// PUT /api/habits/:id/name
router.put('/:id/name', async (req: AuthRequest, res: Response) => {
  try {
    const habit = await Habit.findOneAndUpdate(
      { _id: req.params['id'], userId: req.userId },
      { name: req.body.name },
      { new: true }
    );
    if (!habit) { res.status(404).json({ error: 'Habit not found' }); return; }
    res.json({ name: habit.name });
  } catch { res.status(500).json({ error: 'Failed to update name' }); }
});

// POST /api/habits/:id/toggle-day
router.post('/:id/toggle-day', async (req: AuthRequest, res: Response) => {
  try {
    const { date, note = '', intensity = '🙂' } = req.body as { date: string; note: string; intensity: string };
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) { res.status(400).json({ error: 'Invalid date' }); return; }
    if (date > today()) { res.status(400).json({ error: 'Cannot toggle future date' }); return; }

    const habit = await Habit.findOne({ _id: req.params['id'], userId: req.userId });
    if (!habit) { res.status(404).json({ error: 'Habit not found' }); return; }

    const idx = habit.doneDates.findIndex(d => d.date === date);
    if (idx === -1) {
      habit.doneDates.push({ date, note, intensity });
    } else {
      habit.doneDates.splice(idx, 1);
    }
    await habit.save();
    res.json({ doneDates: habit.doneDates, celebratedMilestones: habit.celebratedMilestones });
  } catch { res.status(500).json({ error: 'Failed to toggle day' }); }
});

// POST /api/habits/:id/freeze
router.post('/:id/freeze', async (req: AuthRequest, res: Response) => {
  try {
    const habit = await Habit.findOne({ _id: req.params['id'], userId: req.userId });
    if (!habit) { res.status(404).json({ error: 'Habit not found' }); return; }

    const weekStart = getWeekStart();
    const usedThisWeek = habit.freezesUsed.filter(d => d >= weekStart).length;
    if (usedThisWeek >= 1) { res.status(400).json({ error: 'Freeze already used this week' }); return; }

    const { date } = req.body as { date: string };
    if (!date) { res.status(400).json({ error: 'date required' }); return; }
    if (!habit.freezesUsed.includes(date)) habit.freezesUsed.push(date);
    await habit.save();
    res.json({ freezesUsed: habit.freezesUsed });
  } catch { res.status(500).json({ error: 'Failed to apply freeze' }); }
});

// POST /api/habits/:id/celebrate-milestone
router.post('/:id/celebrate-milestone', async (req: AuthRequest, res: Response) => {
  try {
    const habit = await Habit.findOne({ _id: req.params['id'], userId: req.userId });
    if (!habit) { res.status(404).json({ error: 'Habit not found' }); return; }
    const { milestone } = req.body as { milestone: number };
    if (!habit.celebratedMilestones.includes(milestone)) {
      habit.celebratedMilestones.push(milestone);
      await habit.save();
    }
    res.json({ celebratedMilestones: habit.celebratedMilestones });
  } catch { res.status(500).json({ error: 'Failed to record milestone' }); }
});

// GET /api/habits/:id/stats
router.get('/:id/stats', async (req: AuthRequest, res: Response) => {
  try {
    const habit = await Habit.findOne({ _id: req.params['id'], userId: req.userId });
    if (!habit) { res.status(404).json({ error: 'Habit not found' }); return; }

    const dates = habit.doneDates.map(d => d.date);
    const streaks = computeStreaks(dates, habit.freezesUsed);

    const now = new Date();
    const weekStart = getWeekStart();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    const weekDates = dates.filter(d => d >= weekStart);
    const monthDates = dates.filter(d => d >= monthStart);

    res.json({
      ...streaks,
      weeklyTotal: weekDates.length,
      weeklyPct: Math.round((weekDates.length / 7) * 100),
      monthlyTotal: monthDates.length,
      monthlyPct: Math.round((monthDates.length / daysInMonth) * 100),
    });
  } catch { res.status(500).json({ error: 'Failed to fetch stats' }); }
});

// GET /api/habits/:id/export
router.get('/:id/export', async (req: AuthRequest, res: Response) => {
  try {
    const habit = await Habit.findOne({ _id: req.params['id'], userId: req.userId });
    if (!habit) { res.status(404).json({ error: 'Habit not found' }); return; }
    const fmt = (req.query['format'] as string) ?? 'json';
    if (fmt === 'csv') {
      const csv = ['date,note,intensity', ...habit.doneDates.map(d => `${d.date},"${d.note}",${d.intensity}`)].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${habit.name}.csv"`);
      res.send(csv);
    } else {
      res.setHeader('Content-Disposition', `attachment; filename="${habit.name}.json"`);
      res.json({ name: habit.name, doneDates: habit.doneDates });
    }
  } catch { res.status(500).json({ error: 'Failed to export' }); }
});

// DELETE /api/habits/:id/reset
router.delete('/:id/reset', async (req: AuthRequest, res: Response) => {
  try {
    const habit = await Habit.findOneAndUpdate(
      { _id: req.params['id'], userId: req.userId },
      { doneDates: [], celebratedMilestones: [], freezesUsed: [] },
      { new: true }
    );
    if (!habit) { res.status(404).json({ error: 'Habit not found' }); return; }
    res.json({ message: 'Reset successful' });
  } catch { res.status(500).json({ error: 'Failed to reset' }); }
});

// DELETE /api/habits/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await Habit.findOneAndDelete({ _id: req.params['id'], userId: req.userId });
    res.json({ message: 'Habit deleted' });
  } catch { res.status(500).json({ error: 'Failed to delete habit' }); }
});

export default router;

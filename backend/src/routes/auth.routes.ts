import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/user.model';

const router = Router();

router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) { res.status(400).json({ error: 'Email and password required' }); return; }
    if (await User.findOne({ email })) { res.status(409).json({ error: 'Email already registered' }); return; }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, username: email.split('@')[0] });
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET as string, { expiresIn: '7d' });
    res.status(201).json({ token });
  } catch { res.status(500).json({ error: 'Signup failed' }); }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !await bcrypt.compare(password, user.passwordHash)) {
      res.status(401).json({ error: 'Invalid credentials' }); return;
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET as string, { expiresIn: '7d' });
    res.json({ token });
  } catch { res.status(500).json({ error: 'Login failed' }); }
});

export default router;

import mongoose, { Document, Schema } from 'mongoose';

export interface IDayEntry {
  date: string;
  note: string;
  intensity: string; // emoji: 😴 🙂 💪 🔥
}

export interface IHabit extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  doneDates: IDayEntry[];
  celebratedMilestones: number[];
  freezesUsed: string[]; // ISO dates when freeze was applied
  createdAt: string;
}

const DayEntrySchema = new Schema<IDayEntry>({
  date: { type: String, required: true },
  note: { type: String, default: '' },
  intensity: { type: String, default: '🙂' },
}, { _id: false });

const HabitSchema = new Schema<IHabit>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  doneDates: { type: [DayEntrySchema], default: [] },
  celebratedMilestones: { type: [Number], default: [] },
  freezesUsed: { type: [String], default: [] },
  createdAt: { type: String, default: () => new Date().toISOString().slice(0, 10) },
});

export default mongoose.model<IHabit>('Habit', HabitSchema);

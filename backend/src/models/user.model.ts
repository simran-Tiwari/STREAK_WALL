import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  joinDate: string;
  username: string;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  joinDate: { type: String, default: () => new Date().toISOString().slice(0, 10) },
  username: { type: String, default: '' },
});

export default mongoose.model<IUser>('User', UserSchema);

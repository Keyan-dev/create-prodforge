import { model, Schema } from 'mongoose';

const accountSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const AccountModel = model('Account', accountSchema);

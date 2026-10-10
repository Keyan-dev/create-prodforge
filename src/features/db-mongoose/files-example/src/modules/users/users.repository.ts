import { isValidObjectId, mongo, type Types } from 'mongoose';
import { UserModel } from './users.model';
import { EmailTakenError, type User, type UsersRepository } from './users.schema';

interface UserDocument {
  _id: Types.ObjectId;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

function toUser({ _id, email, name, createdAt, updatedAt }: UserDocument): User {
  return { id: _id.toString(), email, name, createdAt, updatedAt };
}

/** 11000: duplicate key, here the unique email index. */
function isDuplicateKey(error: unknown) {
  return error instanceof mongo.MongoServerError && error.code === 11000;
}

export const usersRepository: UsersRepository = {
  async list({ limit, offset }) {
    const docs = await UserModel.find().sort({ createdAt: 1 }).skip(offset).limit(limit).lean();
    return docs.map(toUser);
  },

  async findById(id) {
    if (!isValidObjectId(id)) return null;
    const doc = await UserModel.findById(id).lean();
    return doc && toUser(doc);
  },

  async create(data) {
    try {
      const doc = await UserModel.create(data);
      return toUser(doc.toObject());
    } catch (error) {
      if (isDuplicateKey(error)) throw new EmailTakenError();
      throw error;
    }
  },

  async update(id, data) {
    if (!isValidObjectId(id)) return null;
    try {
      const doc = await UserModel.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true,
      }).lean();
      return doc && toUser(doc);
    } catch (error) {
      if (isDuplicateKey(error)) throw new EmailTakenError();
      throw error;
    }
  },

  async remove(id) {
    if (!isValidObjectId(id)) return false;
    return (await UserModel.findByIdAndDelete(id)) !== null;
  },
};

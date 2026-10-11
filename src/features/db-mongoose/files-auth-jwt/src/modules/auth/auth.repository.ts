import { isValidObjectId, mongo, type Types } from 'mongoose';
import { AccountModel } from './auth.model';
import { type Account, AccountExistsError, type AccountsRepository } from './auth.schema';

interface AccountDocument {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

function toAccount({ _id, email, passwordHash, createdAt }: AccountDocument): Account {
  return { id: _id.toString(), email, passwordHash, createdAt };
}

export const accountsRepository: AccountsRepository = {
  async findByEmail(email) {
    const doc = await AccountModel.findOne({ email }).lean();
    return doc && toAccount(doc);
  },

  async findById(id) {
    if (!isValidObjectId(id)) return null;
    const doc = await AccountModel.findById(id).lean();
    return doc && toAccount(doc);
  },

  async create(data) {
    try {
      return toAccount((await AccountModel.create(data)).toObject());
    } catch (error) {
      // 11000: duplicate key, here the unique email index.
      if (error instanceof mongo.MongoServerError && error.code === 11000) {
        throw new AccountExistsError();
      }
      throw error;
    }
  },
};

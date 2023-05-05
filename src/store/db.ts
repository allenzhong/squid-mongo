import mongoose from "mongoose";
import { StatusModel } from "./status";
import { MongoStore } from "./store";

export interface MongoDatabaseOptions {
  url: string;
  dbName: string;
  statusIdentifier: string;
}

class BaseDatabase<S> {
  protected con?: mongoose.Connection;
  protected lastCommitted = -1;

  constructor(private readonly config: MongoDatabaseOptions) {}

  async connect(): Promise<number> {
    try {
      if (!this.config.dbName) {
        throw new Error("DbService.connect: MONGODB_DB_NAME is not defined");
      }
      await mongoose.connect(this.config.url, {
        dbName: this.config.dbName,
      });
      this.con = mongoose.connection;
      //check block heigh and return the last one
      const currentStatus = await StatusModel.findOne({ identifier: this.config.statusIdentifier }).exec();

      if (!currentStatus) {
        const newStatus = new StatusModel({
          height: -1,
          identifier: this.config.statusIdentifier,
        });
        await newStatus.save();
        return -1;
      } else {
        return currentStatus.height;
      }
    } catch (error) {
      console.log("DbService.connect: error:", error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.con) {
      await this.con.close();
    }
  }

  async transact(
    from: number,
    to: number,
    cb: (store: S) => Promise<void>
  ): Promise<void> {
    let retries = 3;
    while (true) {
      try {
        return await this.runTransaction(from, to, cb);
      } catch (e: any) {
        if (e.code == "40001" && retries) {
          retries -= 1;
        } else {
          throw e;
        }
      }
    }
  }

  protected async runTransaction(
    from: number,
    to: number,
    cb: (store: S) => Promise<void>
  ): Promise<void> {
    throw new Error("Not implemented");
  }

  protected async updateHeight(from: number, to: number): Promise<void> {
    await StatusModel.updateOne({ height: { $lt: from }, identifier: this.config.statusIdentifier }, { height: to });
  }
}

export class MongoDatabase extends BaseDatabase<MongoStore> {
  protected async runTransaction(
    from: number,
    to: number,
    cb: (store: MongoStore) => Promise<void>
  ): Promise<void> {
    try {
      let store = new MongoStore();
      this.createTx(from, to);
      await cb(store);
    } catch (e: any) {
      throw e;
    }
  }

  private async createTx(from: number, to: number): Promise<void> {
    try {
      await this.updateHeight(from, to);
    } catch (e: any) {
      throw e;
    }
  }

  async advance(height: number): Promise<void> {
    if (this.lastCommitted == height) return;
    await this.createTx(height, height);
  }
}

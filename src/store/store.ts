import {
  FilterQuery,
  Model,
  UpdateQuery,
  UpdateWithAggregationPipeline,
} from "mongoose";
export interface Entity {
  id: string;
}

export interface UpsertFilter {
  [key: string]: any;
}
export class MongoStore {
  async call<T extends Entity>(
    model: Model<T>,
    callback: (model: Model<T>) => Promise<void>
  ) {
    await callback(model);
  }

  async callAndReturn<T extends Entity, R>(
    model: Model<T>,
    callback: (model: Model<T>) => Promise<R>
  ): Promise<R> {
    return await callback(model);
  }

  async upsert<T extends Entity>(
    model: Model<T>,
    data: T | T[],
    filterFn: (item: T) => FilterQuery<T>,
    updateEntityFn: (
      item: T
    ) => UpdateQuery<T> | UpdateWithAggregationPipeline | null
  ): Promise<void> {
    if (Array.isArray(data)) {
      const bulkUpdateOps = data.map((item) => ({
        updateOne: {
          filter: filterFn(item) as any,
          update: updateEntityFn(item) as any,
          upsert: true,
        },
      }));
      await model.bulkWrite(bulkUpdateOps);
    } else {
      const updateData = updateEntityFn(data) ?? data;
      await model.updateOne(filterFn(data), updateData, { upsert: true });
    }
  }
}

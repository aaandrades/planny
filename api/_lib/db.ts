import { MongoClient, type Collection, type Db } from 'mongodb';
import type { Trip } from '../../shared/trip.js';
import { HttpError } from './http.js';

export type TripDoc = Omit<Trip, 'id'> & { _id: string };

// Cached across invocations of the same warm function instance.
let clientPromise: Promise<MongoClient> | undefined;
let indexesReady = false;

export async function getDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new HttpError(500, 'MONGODB_URI is not configured');
  clientPromise ??= new MongoClient(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 8000 })
    .connect()
    .catch((err) => {
      clientPromise = undefined;
      throw err;
    });
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB || 'planny');
}

export async function trips(): Promise<Collection<TripDoc>> {
  const col = (await getDb()).collection<TripDoc>('trips');
  if (!indexesReady) {
    indexesReady = true;
    void col.createIndex({ startDate: -1 }).catch(() => (indexesReady = false));
  }
  return col;
}

export function toTrip({ _id, ...rest }: TripDoc): Trip {
  return { id: _id, ...rest };
}

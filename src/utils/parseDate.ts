// src/utils/parseDate.ts
import { Timestamp } from "firebase/firestore";

export const parseFirestoreDate = (value: any): Date => {
  if (!value) return new Date('Invalid Date');
  if (typeof value.toDate === 'function') return value.toDate(); // Firestore Timestamp
  return new Date(value); // Assume ISO string
};

/** Domain types, ported verbatim from the React Native build's store/app-store.tsx. */

import type { Marking } from './markings';

export type Species =
  | 'sheep' | 'cow' | 'goat' | 'pig' | 'horse'
  | 'dog' | 'cat' | 'chicken' | 'other';

export interface User {
  id: string;
  name: string;
  email?: string;
  isFarmer: boolean;
  farmName?: string;
}

export interface RegisteredAnimal {
  id: string;
  ownerId: string;
  ownerName: string;
  farmName?: string;
  species: Species;
  name: string;
  primaryColor: string;
  /**
   * Human-readable summary of `markingDetails`, plus any free-text note.
   * Kept as the display string and as the fallback for rows registered before
   * markings were structured. Never used for matching.
   */
  markings: string;
  /** The structured markings matching actually runs on. */
  markingDetails: Marking[];
  markingNotes?: string;
  tagNumber?: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
}

export interface Post {
  id: string;
  userId: string;
  userName: string;
  photo?: string;
  caption: string;
  species?: Species;
  primaryColor?: string;
  /** Summary string; see the note on RegisteredAnimal.markings. */
  markings?: string;
  markingDetails: Marking[];
  markingNotes?: string;
  locationLabel?: string;
  latitude?: number;
  longitude?: number;
  likes: string[];
  confirmations: string[];
  comments: Comment[];
  timestamp: number;
  isSighting: boolean;
  sightingStatus?: 'open' | 'claimed' | 'resolved';
}

export interface FarmerNotification {
  id: string;
  farmerId: string;
  animalId: string;
  animalName: string;
  species: Species;
  reporterName: string;
  reporterCaption: string;
  /** The reporter's structured markings, already rendered to plain English. */
  reportedMarkings?: string;
  locationLabel?: string;
  latitude?: number;
  longitude?: number;
  timestamp: number;
  read: boolean;
}

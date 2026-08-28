/** Domain types, ported verbatim from the React Native build's store/app-store.tsx. */

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
  markings: string;
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
  markings?: string;
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
  locationLabel?: string;
  latitude?: number;
  longitude?: number;
  timestamp: number;
  read: boolean;
}

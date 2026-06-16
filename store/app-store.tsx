// @ts-nocheck
import React, { createContext, useContext, useState } from 'react';

export type Species = 'sheep' | 'cow' | 'goat' | 'pig' | 'horse' | 'dog' | 'cat' | 'chicken' | 'other';

export interface User {
  id: string;
  name: string;
  email: string;
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
  comments: Comment[];
  timestamp: number;
  isSighting: boolean;
  sightingStatus?: 'open' | 'claimed' | 'resolved';
}

const now = Date.now();

const SEED_ANIMALS: RegisteredAnimal[] = [
  {
    id: 'a1',
    ownerId: 'farmer-james',
    ownerName: 'James McGregor',
    farmName: 'Highland Farm',
    species: 'sheep',
    name: 'Dotty',
    primaryColor: 'white',
    markings: 'black spot on left ear, blue paint mark on back',
    tagNumber: '42',
  },
  {
    id: 'a2',
    ownerId: 'farmer-james',
    ownerName: 'James McGregor',
    farmName: 'Highland Farm',
    species: 'sheep',
    name: 'Woolly',
    primaryColor: 'cream',
    markings: 'yellow ear tag #7, brown fleece on legs',
    tagNumber: '7',
  },
  {
    id: 'a3',
    ownerId: 'farmer-james',
    ownerName: 'James McGregor',
    farmName: 'Highland Farm',
    species: 'goat',
    name: 'Billy',
    primaryColor: 'brown',
    markings: 'white beard, red collar with small bell',
  },
  {
    id: 'a4',
    ownerId: 'farmer-sue',
    ownerName: 'Sue Patterson',
    farmName: 'Cloverfield Ranch',
    species: 'cow',
    name: 'Bessie',
    primaryColor: 'black and white',
    markings: 'classic holstein pattern, notched right ear',
    tagNumber: '101',
  },
];

const SEED_POSTS: Post[] = [
  {
    id: 'p1',
    userId: 'user-sarah',
    userName: 'Sarah K.',
    caption: 'Found this little one wandering by the main road! Anyone know who she belongs to? Seems very friendly 🐑',
    species: 'sheep',
    primaryColor: 'white',
    markings: 'black spot on ear',
    locationLabel: 'Millbrook Road, 2km north of town',
    likes: ['user-tom', 'user-emma'],
    comments: [
      {
        id: 'c1',
        userId: 'user-tom',
        userName: 'Tom B.',
        text: 'Aww poor thing! Hope she gets home safe 🐑',
        timestamp: now - 3000000,
      },
    ],
    timestamp: now - 7200000,
    isSighting: true,
    sightingStatus: 'open',
  },
  {
    id: 'p2',
    userId: 'user-tom',
    userName: 'Tom B.',
    caption: "My neighbor's cows decided to visit my garden this morning 😂 Ate half my roses but honestly they're too cute to be mad at",
    species: 'cow',
    locationLabel: 'Greenfield Village',
    likes: ['user-sarah', 'user-emma', 'user-pete', 'user-anna'],
    comments: [],
    timestamp: now - 86400000,
    isSighting: false,
  },
  {
    id: 'p3',
    userId: 'user-emma',
    userName: 'Emma R.',
    caption: 'This fluffy highland cow walked up to my car window and just stared at me for a full minute. Made my entire week 🐄❤️',
    species: 'cow',
    locationLabel: 'Highland Trail, near the old mill',
    likes: ['user-tom', 'user-sarah', 'user-pete'],
    comments: [
      {
        id: 'c2',
        userId: 'user-pete',
        userName: 'Pete M.',
        text: "That's Hamish from the farm on the hill! Totally harmless, just very nosy 😄",
        timestamp: now - 168000000,
      },
      {
        id: 'c3',
        userId: 'user-emma',
        userName: 'Emma R.',
        text: 'Hamish!! I love him so much',
        timestamp: now - 165000000,
      },
    ],
    timestamp: now - 172800000,
    isSighting: false,
  },
  {
    id: 'p4',
    userId: 'user-pete',
    userName: 'Pete M.',
    caption: 'Spotted three goats trotting along the B7024 this morning. They looked healthy but were definitely not meant to be there!',
    species: 'goat',
    primaryColor: 'brown',
    markings: 'white patches, two had ear tags',
    locationLabel: 'B7024, opposite the petrol station',
    likes: ['user-anna'],
    comments: [],
    timestamp: now - 259200000,
    isSighting: true,
    sightingStatus: 'resolved',
  },
  {
    id: 'p5',
    userId: 'user-anna',
    userName: 'Anna W.',
    caption: 'The lambs at the farm down the road had babies last week! Absolute tiny fluffy perfection 🌿',
    species: 'sheep',
    locationLabel: 'Green Lane Farm',
    likes: ['user-tom', 'user-emma', 'user-sarah', 'user-pete'],
    comments: [
      {
        id: 'c4',
        userId: 'user-sarah',
        userName: 'Sarah K.',
        text: 'I NEED to visit them 😭',
        timestamp: now - 430000000,
      },
    ],
    timestamp: now - 432000000,
    isSighting: false,
  },
];

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [posts, setPosts] = useState(SEED_POSTS);
  const [registeredAnimals, setRegisteredAnimals] = useState(SEED_ANIMALS);

  const login = (name, email, isFarmer, farmName) => {
    setCurrentUser({ id: `user-${name.toLowerCase().replace(/\s+/g, '-')}`, name, email, isFarmer, farmName });
  };

  const logout = () => setCurrentUser(null);

  const submitSighting = (data) => {
    const user = currentUser ?? { id: 'guest', name: 'Anonymous' };
    const newPost = {
      id: `post-${Date.now()}`,
      userId: user.id,
      userName: user.name,
      photo: data.photo,
      caption: data.caption || `Spotted: ${SPECIES_LIST.find(s => s.value === data.species)?.label ?? data.species} near ${data.locationLabel ?? 'unknown location'}`,
      species: data.species,
      primaryColor: data.primaryColor,
      markings: data.markings,
      locationLabel: data.locationLabel,
      latitude: data.latitude,
      longitude: data.longitude,
      likes: [],
      comments: [],
      timestamp: Date.now(),
      isSighting: true,
      sightingStatus: 'open',
    };
    setPosts(prev => [newPost, ...prev]);

    const matches = registeredAnimals.filter(animal => {
      if (animal.species !== data.species) return false;
      const rc = (data.primaryColor || '').toLowerCase();
      const ac = animal.primaryColor.toLowerCase();
      return rc.includes(ac) || ac.includes(rc) || rc.split(' ').some(w => ac.includes(w));
    });
    return matches;
  };

  const addCommunityPost = (data) => {
    const user = currentUser ?? { id: 'guest', name: 'Anonymous' };
    const newPost = {
      id: `post-${Date.now()}`,
      userId: user.id,
      userName: user.name,
      photo: data.photo,
      caption: data.caption,
      species: data.species,
      locationLabel: data.locationLabel,
      likes: [],
      comments: [],
      timestamp: Date.now(),
      isSighting: false,
    };
    setPosts(prev => [newPost, ...prev]);
  };

  const toggleLike = (postId) => {
    const userId = currentUser?.id ?? 'guest';
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const alreadyLiked = p.likes.includes(userId);
      return { ...p, likes: alreadyLiked ? p.likes.filter(id => id !== userId) : [...p.likes, userId] };
    }));
  };

  const addComment = (postId, text) => {
    const user = currentUser ?? { id: 'guest', name: 'You' };
    const comment = {
      id: `c-${Date.now()}`,
      userId: user.id,
      userName: user.name,
      text,
      timestamp: Date.now(),
    };
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, comments: [...p.comments, comment] } : p
    ));
  };

  const registerAnimal = (data) => {
    if (!currentUser?.isFarmer) return;
    const animal = {
      id: `a-${Date.now()}`,
      ownerId: currentUser.id,
      ownerName: currentUser.name,
      farmName: currentUser.farmName,
      ...data,
    };
    setRegisteredAnimals(prev => [...prev, animal]);
  };

  return (
    <AppContext.Provider value={{
      currentUser, posts, registeredAnimals,
      login, logout, submitSighting, addCommunityPost,
      toggleLike, addComment, registerAnimal,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export const SPECIES_LIST = [
  { value: 'sheep', label: 'Sheep', emoji: '🐑' },
  { value: 'cow', label: 'Cow', emoji: '🐄' },
  { value: 'goat', label: 'Goat', emoji: '🐐' },
  { value: 'pig', label: 'Pig', emoji: '🐷' },
  { value: 'horse', label: 'Horse', emoji: '🐴' },
  { value: 'dog', label: 'Dog', emoji: '🐕' },
  { value: 'cat', label: 'Cat', emoji: '🐈' },
  { value: 'chicken', label: 'Chicken', emoji: '🐔' },
  { value: 'other', label: 'Other', emoji: '🐾' },
];

export function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

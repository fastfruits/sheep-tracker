// @ts-nocheck
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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

// Keep as empty — real profiles come from Supabase
export const SEED_USERS = {};

// ── Helpers ───────────────────────────────────────────────────────────────────

function transformPost(row): Post {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.profiles?.name ?? 'Unknown',
    photo: row.photo_url ?? undefined,
    caption: row.caption ?? '',
    species: row.species,
    primaryColor: row.primary_color,
    markings: row.markings,
    locationLabel: row.location_label,
    latitude: row.latitude,
    longitude: row.longitude,
    likes: (row.likes ?? []).map(l => l.user_id),
    confirmations: (row.confirmations ?? []).map(c => c.user_id),
    comments: (row.comments ?? [])
      .map(c => ({
        id: c.id,
        userId: c.user_id,
        userName: c.user_name,
        text: c.text,
        timestamp: new Date(c.created_at).getTime(),
      }))
      .sort((a, b) => a.timestamp - b.timestamp),
    timestamp: new Date(row.created_at).getTime(),
    isSighting: row.is_sighting,
    sightingStatus: row.sighting_status,
  };
}

async function uploadPhoto(localUri: string): Promise<string | null> {
  try {
    const ext = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `${Date.now()}.${ext}`;
    const response = await fetch(localUri);
    const blob = await response.blob();
    const { data, error } = await supabase.storage.from('photos').upload(path, blob, {
      contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      upsert: false,
    });
    if (error) { console.warn('Photo upload error:', error.message); return null; }
    const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(data.path);
    return publicUrl;
  } catch (e) {
    console.warn('Photo upload failed:', e);
    return null;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [registeredAnimals, setRegisteredAnimals] = useState<RegisteredAnimal[]>([]);
  const [notifications, setNotifications] = useState<FarmerNotification[]>([]);
  const [followGraph, setFollowGraph] = useState<{ [uid: string]: string[] }>({});
  const [profilesCache, setProfilesCache] = useState<{ [uid: string]: User }>({});
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await loadProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setNotifications([]);
      }
    });

    loadPosts();
    loadAnimals();
    loadFollowGraph();

    return () => subscription.unsubscribe();
  }, []);

  // Re-load notifications when currentUser changes
  useEffect(() => {
    if (currentUser?.isFarmer) loadNotifications(currentUser.id);
  }, [currentUser?.id]);

  // ── Loaders ─────────────────────────────────────────────────────────────────

  const loadProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
      const user: User = {
        id: data.id,
        name: data.name,
        email: '',
        isFarmer: data.is_farmer,
        farmName: data.farm_name,
      };
      setCurrentUser(user);
      setProfilesCache(prev => ({ ...prev, [data.id]: user }));
    }
  };

  const loadPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles!posts_user_id_fkey(name),
        likes(user_id),
        confirmations(user_id),
        comments(id, user_id, user_name, text, created_at)
      `)
      .order('created_at', { ascending: false })
      .limit(100);
    if (!error && data) {
      setPosts(data.map(transformPost));
      // Populate profiles cache from post authors
      const cache = {};
      data.forEach(row => {
        if (row.user_id && row.profiles?.name) {
          cache[row.user_id] = { id: row.user_id, name: row.profiles.name, isFarmer: false, email: '' };
        }
      });
      setProfilesCache(prev => ({ ...prev, ...cache }));
    }
  };

  const loadAnimals = async () => {
    const { data } = await supabase
      .from('animals')
      .select('*, profiles!animals_owner_id_fkey(name, farm_name)');
    if (data) {
      setRegisteredAnimals(data.map(a => ({
        id: a.id,
        ownerId: a.owner_id,
        ownerName: a.profiles?.name ?? 'Unknown',
        farmName: a.profiles?.farm_name,
        species: a.species,
        name: a.name,
        primaryColor: a.primary_color,
        markings: a.markings,
        tagNumber: a.tag_number,
      })));
    }
  };

  const loadFollowGraph = async () => {
    const { data } = await supabase.from('follows').select('follower_id, following_id');
    if (data) {
      const graph: { [uid: string]: string[] } = {};
      data.forEach(({ follower_id, following_id }) => {
        if (!graph[follower_id]) graph[follower_id] = [];
        graph[follower_id].push(following_id);
      });
      setFollowGraph(graph);
    }
  };

  const loadNotifications = async (userId: string) => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('farmer_id', userId)
      .order('created_at', { ascending: false });
    if (data) {
      setNotifications(data.map(n => ({
        id: n.id,
        farmerId: n.farmer_id,
        animalId: n.animal_id,
        animalName: n.animal_name,
        species: n.species,
        reporterName: n.reporter_name,
        reporterCaption: n.reporter_caption,
        locationLabel: n.location_label,
        latitude: n.latitude,
        longitude: n.longitude,
        timestamp: new Date(n.created_at).getTime(),
        read: n.read,
      })));
    }
  };

  // ── Auth ────────────────────────────────────────────────────────────────────

  const login = async (email: string, password: string) => {
    setAuthLoading(true);
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError(error.message);
    setAuthLoading(false);
  };

  const signup = async (
    name: string,
    email: string,
    password: string,
    isFarmer: boolean,
    farmName: string | undefined,
    animals: Omit<RegisteredAnimal, 'id' | 'ownerId' | 'ownerName' | 'farmName'>[]
  ) => {
    setAuthLoading(true);
    setAuthError(null);

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { setAuthError(error.message); setAuthLoading(false); return; }

    const userId = data.user?.id;
    if (!userId) { setAuthError('Signup failed. Please try again.'); setAuthLoading(false); return; }

    // Create profile
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId, name, is_farmer: isFarmer, farm_name: farmName ?? null,
    });
    if (profileError) { setAuthError(profileError.message); setAuthLoading(false); return; }

    // Register animals if farmer
    if (isFarmer && animals?.length) {
      await supabase.from('animals').insert(
        animals.map(a => ({
          owner_id: userId,
          species: a.species,
          name: a.name,
          primary_color: a.primaryColor,
          markings: a.markings || null,
          tag_number: a.tagNumber || null,
        }))
      );
      await loadAnimals();
    }

    // Set user manually (onAuthStateChange may lag)
    const user: User = { id: userId, name, email, isFarmer, farmName };
    setCurrentUser(user);
    setAuthLoading(false);
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const clearAuthError = () => setAuthError(null);

  // ── Posts ───────────────────────────────────────────────────────────────────

  const submitSighting = async (data) => {
    const user = currentUser ?? { id: 'guest', name: 'Anonymous' };

    // Upload photo first if present
    let photoUrl: string | null = null;
    if (data.photo && !data.photo.startsWith('http')) {
      photoUrl = await uploadPhoto(data.photo);
    }

    const caption = data.caption || `Spotted a ${SPECIES_LIST.find(s => s.value === data.species)?.label ?? data.species} near ${data.locationLabel ?? 'unknown location'}`;

    const { data: row, error } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        caption,
        species: data.species,
        primary_color: data.primaryColor,
        markings: data.markings || null,
        location_label: data.locationLabel || null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        photo_url: photoUrl,
        is_sighting: true,
        sighting_status: 'open',
      })
      .select('*, profiles!posts_user_id_fkey(name)')
      .single();

    if (error) { console.warn('submitSighting error:', error.message); return []; }

    const newPost = transformPost({ ...row, likes: [], confirmations: [], comments: [] });
    setPosts(prev => [newPost, ...prev]);

    // Match against registered animals
    const matches = registeredAnimals.filter(animal => {
      if (animal.species !== data.species) return false;
      const rc = (data.primaryColor || '').toLowerCase();
      const ac = animal.primaryColor.toLowerCase();
      return rc.includes(ac) || ac.includes(rc) || rc.split(/\s+/).some(w => w.length > 2 && ac.includes(w));
    });

    // Create notifications for matched farmers
    if (matches.length > 0) {
      await supabase.from('notifications').insert(
        matches.map(animal => ({
          farmer_id: animal.ownerId,
          post_id: row.id,
          animal_id: animal.id,
          animal_name: animal.name,
          species: animal.species,
          reporter_name: user.name,
          reporter_caption: caption,
          location_label: data.locationLabel || null,
          latitude: data.latitude ?? null,
          longitude: data.longitude ?? null,
        }))
      );
      // If the current user is a farmer who matched, refresh their notifications
      if (currentUser?.isFarmer) loadNotifications(currentUser.id);
    }

    return matches;
  };

  const addCommunityPost = async (data) => {
    const user = currentUser ?? { id: 'guest', name: 'Anonymous' };

    let photoUrl: string | null = null;
    if (data.photo && !data.photo.startsWith('http')) {
      photoUrl = await uploadPhoto(data.photo);
    }

    const { data: row, error } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        caption: data.caption,
        species: data.species || null,
        location_label: data.locationLabel || null,
        photo_url: photoUrl,
        is_sighting: false,
        sighting_status: 'open',
      })
      .select('*, profiles!posts_user_id_fkey(name)')
      .single();

    if (error) { console.warn('addCommunityPost error:', error.message); return; }

    const newPost = transformPost({ ...row, likes: [], confirmations: [], comments: [] });
    setPosts(prev => [newPost, ...prev]);
  };

  // ── Interactions (optimistic) ────────────────────────────────────────────────

  const toggleLike = async (postId: string) => {
    const userId = currentUser?.id ?? 'guest';
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const alreadyLiked = post.likes.includes(userId);

    // Optimistic update
    setPosts(prev => prev.map(p =>
      p.id !== postId ? p : {
        ...p, likes: alreadyLiked ? p.likes.filter(id => id !== userId) : [...p.likes, userId],
      }
    ));

    if (alreadyLiked) {
      await supabase.from('likes').delete().match({ user_id: userId, post_id: postId });
    } else {
      await supabase.from('likes').insert({ user_id: userId, post_id: postId });
    }
  };

  const addComment = async (postId: string, text: string) => {
    const user = currentUser ?? { id: 'guest', name: 'You' };
    const comment: Comment = {
      id: `temp-${Date.now()}`,
      userId: user.id,
      userName: user.name,
      text,
      timestamp: Date.now(),
    };

    // Optimistic update
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, comments: [...p.comments, comment] } : p
    ));

    const { data } = await supabase.from('comments').insert({
      post_id: postId,
      user_id: user.id,
      user_name: user.name,
      text,
    }).select('id').single();

    // Replace temp id with real id
    if (data) {
      setPosts(prev => prev.map(p =>
        p.id === postId ? {
          ...p,
          comments: p.comments.map(c => c.id === comment.id ? { ...c, id: data.id } : c),
        } : p
      ));
    }
  };

  const toggleConfirmation = async (postId: string) => {
    const userId = currentUser?.id ?? 'guest';
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const has = post.confirmations.includes(userId);

    setPosts(prev => prev.map(p =>
      p.id !== postId ? p : {
        ...p, confirmations: has ? p.confirmations.filter(id => id !== userId) : [...p.confirmations, userId],
      }
    ));

    if (has) {
      await supabase.from('confirmations').delete().match({ user_id: userId, post_id: postId });
    } else {
      await supabase.from('confirmations').insert({ user_id: userId, post_id: postId });
    }
  };

  const markReunited = async (postId: string) => {
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, sightingStatus: 'resolved' } : p
    ));
    await supabase.from('posts').update({ sighting_status: 'resolved' }).eq('id', postId);
  };

  const registerAnimal = async (data) => {
    if (!currentUser?.isFarmer) return;
    const { data: row } = await supabase.from('animals').insert({
      owner_id: currentUser.id,
      species: data.species,
      name: data.name,
      primary_color: data.primaryColor,
      markings: data.markings || null,
      tag_number: data.tagNumber || null,
    }).select().single();

    if (row) {
      setRegisteredAnimals(prev => [...prev, {
        id: row.id,
        ownerId: currentUser.id,
        ownerName: currentUser.name,
        farmName: currentUser.farmName,
        species: row.species,
        name: row.name,
        primaryColor: row.primary_color,
        markings: row.markings,
        tagNumber: row.tag_number,
      }]);
    }
  };

  // ── Follows ──────────────────────────────────────────────────────────────────

  const toggleFollow = async (targetId: string) => {
    if (!currentUser) return;
    const mine = followGraph[currentUser.id] ?? [];
    const already = mine.includes(targetId);

    setFollowGraph(prev => ({
      ...prev,
      [currentUser.id]: already ? mine.filter(id => id !== targetId) : [...mine, targetId],
    }));

    if (already) {
      await supabase.from('follows').delete().match({ follower_id: currentUser.id, following_id: targetId });
    } else {
      await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: targetId });
    }
  };

  const isFollowing = (targetId: string) => {
    if (!currentUser) return false;
    return (followGraph[currentUser.id] ?? []).includes(targetId);
  };

  const getFollowerCount = (userId: string) =>
    Object.values(followGraph).filter(arr => arr.includes(userId)).length;

  const getFollowingCount = (userId: string) =>
    (followGraph[userId] ?? []).length;

  const getUserById = (userId: string): User | null => {
    if (currentUser?.id === userId) return currentUser;
    return profilesCache[userId] ?? null;
  };

  // ── Notifications ────────────────────────────────────────────────────────────

  const markNotificationsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (currentUser) {
      await supabase.from('notifications').update({ read: true }).eq('farmer_id', currentUser.id);
    }
  };

  const myNotifications = notifications.filter(n => n.farmerId === currentUser?.id);
  const unreadCount = myNotifications.filter(n => !n.read).length;

  return (
    <AppContext.Provider value={{
      currentUser, posts, registeredAnimals,
      notifications: myNotifications, unreadCount,
      loading, authLoading, authError, clearAuthError,
      login, logout, signup,
      submitSighting, addCommunityPost,
      toggleLike, addComment, toggleConfirmation, markReunited, registerAnimal,
      toggleFollow, isFollowing, getFollowerCount, getFollowingCount, getUserById,
      markNotificationsRead,
      refreshPosts: loadPosts,
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
  { value: 'sheep',   label: 'Sheep',   emoji: '🐑' },
  { value: 'cow',     label: 'Cow',     emoji: '🐄' },
  { value: 'goat',    label: 'Goat',    emoji: '🐐' },
  { value: 'pig',     label: 'Pig',     emoji: '🐷' },
  { value: 'horse',   label: 'Horse',   emoji: '🐴' },
  { value: 'dog',     label: 'Dog',     emoji: '🐕' },
  { value: 'cat',     label: 'Cat',     emoji: '🐈' },
  { value: 'chicken', label: 'Chicken', emoji: '🐔' },
  { value: 'other',   label: 'Other',   emoji: '🐾' },
];

export function timeAgo(timestamp: number): string {
  const s = Math.floor((Date.now() - timestamp) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

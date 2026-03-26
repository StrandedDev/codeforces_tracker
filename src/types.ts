export interface Problem {
  id: string;
  contestId: number;
  index: string;
  name: string;
  rating: number | null;
  tags: string[];
  url: string;
}

export interface Contest {
  id: number;
  name: string;
  division: string;
}

export interface UserInfo {
  handle: string;
  rating: number;
  maxRating: number;
  rank: string;
  maxRank: string;
  avatar: string;
  titlePhoto: string;
  friendOfCount: number;
  contribution: number;
  registrationTimeSeconds: number;
  lastOnlineTimeSeconds: number;
}

export type SortKey = 'id-asc' | 'id-desc' | 'rating-asc' | 'rating-desc' | 'name-asc' | 'name-desc';

export type SolvedFilter = 'all' | 'solved' | 'unsolved';

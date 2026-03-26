import { Problem, UserInfo } from './types';

export async function fetchProblems(): Promise<Problem[]> {
  const res = await fetch('https://codeforces.com/api/problemset.problems');
  if (!res.ok) throw new Error(`Network error: ${res.status}`);
  const data = await res.json();
  if (data.status !== 'OK') throw new Error(data.comment || 'API error');

  return data.result.problems.map((p: any) => ({
    id: `${p.contestId}-${p.index}`,
    contestId: p.contestId,
    index: p.index,
    name: p.name,
    rating: p.rating || null,
    tags: p.tags || [],
    url: `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`,
  }));
}

export async function fetchContests(): Promise<Map<number, string>> {
  const res = await fetch('https://codeforces.com/api/contest.list');
  if (!res.ok) throw new Error(`Network error: ${res.status}`);
  const data = await res.json();
  if (data.status !== 'OK') throw new Error(data.comment || 'API error');

  const divMap = new Map<number, string>();

  for (const c of data.result) {
    const name: string = c.name || '';
    let division = '';

    if (name.includes('Div. 1') && name.includes('Div. 2')) {
      division = 'Div. 1 + Div. 2';
    } else if (name.includes('Div. 1')) {
      division = 'Div. 1';
    } else if (name.includes('Div. 2')) {
      division = 'Div. 2';
    } else if (name.includes('Div. 3')) {
      division = 'Div. 3';
    } else if (name.includes('Div. 4')) {
      division = 'Div. 4';
    }

    if (division) {
      divMap.set(c.id, division);
    }
  }

  return divMap;
}

export async function fetchUserInfo(handle: string): Promise<UserInfo> {
  const res = await fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`);
  if (!res.ok) throw new Error(`Network error: ${res.status}`);
  const data = await res.json();
  if (data.status !== 'OK') throw new Error(data.comment || 'User not found');

  const u = data.result[0];
  return {
    handle: u.handle,
    rating: u.rating ?? 0,
    maxRating: u.maxRating ?? 0,
    rank: u.rank ?? 'unrated',
    maxRank: u.maxRank ?? 'unrated',
    avatar: u.avatar ?? '',
    titlePhoto: u.titlePhoto ?? '',
    friendOfCount: u.friendOfCount ?? 0,
    contribution: u.contribution ?? 0,
    registrationTimeSeconds: u.registrationTimeSeconds ?? 0,
    lastOnlineTimeSeconds: u.lastOnlineTimeSeconds ?? 0,
  };
}

export async function fetchUserSubmissions(handle: string): Promise<Set<string>> {
  const res = await fetch(
    `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=100000`
  );
  if (!res.ok) throw new Error(`Network error: ${res.status}`);
  const data = await res.json();
  if (data.status !== 'OK') throw new Error(data.comment || 'API error');

  const solved = new Set<string>();
  for (const sub of data.result) {
    if (sub.verdict === 'OK') {
      const key = `${sub.problem.contestId}-${sub.problem.index}`;
      solved.add(key);
    }
  }
  return solved;
}

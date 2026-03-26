import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Problem, SortKey, SolvedFilter, UserInfo } from './types';
import { fetchProblems, fetchContests, fetchUserInfo, fetchUserSubmissions } from './api';
import { getRatingColor, getRankColor } from './utils';

const PAGE_SIZE = 50;

function useLocalStorage<T>(key: string, defaultValue: T): [T, (val: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch { /* ignore */ }
  }, [key, value]);

  return [value, setValue];
}

export default function App() {
  const [allProblems, setAllProblems] = useState<Problem[]>([]);
  const [divisionMap, setDivisionMap] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User handle (persistent)
  const [savedHandle, setSavedHandle] = useLocalStorage<string>('cf-handle', '');
  const [handleInput, setHandleInput] = useState(savedHandle);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [solvedSet, setSolvedSet] = useState<Set<string>>(new Set());
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  // Filters
  const [filterIndex, setFilterIndex] = useState('');
  const [filterRating, setFilterRating] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterDiv, setFilterDiv] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterSolved, setFilterSolved] = useState<SolvedFilter>('all');
  const [sortBy, setSortBy] = useState<SortKey>('id-desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load problems + contests
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [problems, divMap] = await Promise.all([
          fetchProblems(),
          fetchContests(),
        ]);
        setAllProblems(problems);
        setDivisionMap(divMap);
      } catch (e: any) {
        setError(e.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Auto-load user data if handle is saved
  useEffect(() => {
    if (savedHandle) {
      loadUserData(savedHandle);
    }
  }, []);

  async function loadUserData(handle: string) {
    if (!handle.trim()) return;
    setUserLoading(true);
    setUserError(null);
    try {
      const [info, solved] = await Promise.all([
        fetchUserInfo(handle.trim()),
        fetchUserSubmissions(handle.trim()),
      ]);
      setUserInfo(info);
      setSolvedSet(solved);
      setSavedHandle(handle.trim());
      setHandleInput(handle.trim());
    } catch (e: any) {
      setUserError(e.message || 'Failed to load user data');
      setUserInfo(null);
      setSolvedSet(new Set());
    } finally {
      setUserLoading(false);
    }
  }

  function handleConnect() {
    if (handleInput.trim()) {
      loadUserData(handleInput.trim());
    }
  }

  function handleDisconnect() {
    setSavedHandle('');
    setHandleInput('');
    setUserInfo(null);
    setSolvedSet(new Set());
    setUserError(null);
    setFilterSolved('all');
    setShowProfile(false);
  }

  function handleRefresh() {
    if (savedHandle) {
      loadUserData(savedHandle);
    }
  }

  // Filter options
  const indexes = useMemo(() => {
    const allIdx = [...new Set(allProblems.map((p) => p.index))];
    // Sort: single letters first (A, B, C...), then multi-char (A1, A2, B1...)
    return allIdx.sort((a, b) => {
      const aLetter = a.charAt(0);
      const bLetter = b.charAt(0);
      if (aLetter !== bLetter) return aLetter.localeCompare(bLetter);
      if (a.length !== b.length) return a.length - b.length;
      return a.localeCompare(b);
    });
  }, [allProblems]);

  const ratings = useMemo(() => {
    return [...new Set(allProblems.map((p) => p.rating).filter(Boolean) as number[])].sort(
      (a, b) => a - b
    );
  }, [allProblems]);

  const tags = useMemo(() => {
    return [...new Set(allProblems.flatMap((p) => p.tags))].sort();
  }, [allProblems]);

  const divisions = useMemo(() => {
    const divs = new Set(divisionMap.values());
    return [...divs].sort();
  }, [divisionMap]);

  const getDivision = useCallback(
    (contestId: number): string => {
      return divisionMap.get(contestId) || '';
    },
    [divisionMap]
  );

  // Solved stats
  const solvedCount = useMemo(() => {
    if (!solvedSet.size) return 0;
    return allProblems.filter((p) => solvedSet.has(p.id)).length;
  }, [allProblems, solvedSet]);

  // Filtered + sorted problems
  const filteredProblems = useMemo(() => {
    let result = allProblems.filter((p) => {
      if (filterIndex && p.index !== filterIndex) return false;
      if (filterRating && p.rating !== parseInt(filterRating)) return false;
      if (filterTag && !p.tags.includes(filterTag)) return false;
      if (filterDiv) {
        const div = getDivision(p.contestId);
        if (!div.includes(filterDiv)) return false;
      }
      if (filterSearch && !p.name.toLowerCase().includes(filterSearch.toLowerCase().trim()))
        return false;
      if (filterSolved === 'solved' && !solvedSet.has(p.id)) return false;
      if (filterSolved === 'unsolved' && solvedSet.has(p.id)) return false;
      return true;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case 'id-asc':
          return a.contestId - b.contestId || a.index.localeCompare(b.index);
        case 'id-desc':
          return b.contestId - a.contestId || b.index.localeCompare(a.index);
        case 'rating-asc':
          return (a.rating || 0) - (b.rating || 0);
        case 'rating-desc':
          return (b.rating || 0) - (a.rating || 0);
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

    return result;
  }, [allProblems, filterIndex, filterRating, filterTag, filterDiv, filterSearch, filterSolved, sortBy, getDivision, solvedSet]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterIndex, filterRating, filterTag, filterDiv, filterSearch, filterSolved, sortBy]);

  const totalPages = Math.ceil(filteredProblems.length / PAGE_SIZE);
  const pageProblems = filteredProblems.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  function handleTagClick(tag: string) {
    setFilterTag(tag === filterTag ? '' : tag);
  }

  function resetFilters() {
    setFilterIndex('');
    setFilterRating('');
    setFilterTag('');
    setFilterDiv('');
    setFilterSearch('');
    setFilterSolved('all');
    setSortBy('id-desc');
  }

  function handleSortColumn(column: 'id' | 'name' | 'rating') {
    setSortBy((prev) => {
      switch (column) {
        case 'id':
          return prev === 'id-asc' ? 'id-desc' : 'id-asc';
        case 'name':
          return prev === 'name-asc' ? 'name-desc' : 'name-asc';
        case 'rating':
          return prev === 'rating-asc' ? 'rating-desc' : 'rating-asc';
      }
    });
  }

  const paginationRange = useMemo(() => {
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    const pages: number[] = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [currentPage, totalPages]);

  const solvedOnPage = useMemo(() => {
    return pageProblems.filter((p) => solvedSet.has(p.id)).length;
  }, [pageProblems, solvedSet]);

  return (
    <div className="min-h-screen" style={{ background: '#0f0f1a', color: '#e0e0e0', fontFamily: "'Segoe UI', sans-serif" }}>
      {/* Header */}
      <header
        style={{
          background: '#1a1a2e',
          padding: '14px 30px',
          borderBottom: '2px solid #e84d4d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white" style={{ fontSize: '1.35rem' }}>⚡ Codeforces Problem Explorer</h1>
          <span
            className="text-xs font-bold text-white"
            style={{ background: '#e84d4d', padding: '3px 10px', borderRadius: '20px' }}
          >
            LIVE API
          </span>
        </div>

        {/* Handle Connection Area */}
        <div className="flex items-center gap-2 flex-wrap">
          {userInfo ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center gap-2 transition-all"
                style={{
                  background: '#16213e',
                  border: '1px solid #2a2a4a',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  cursor: 'pointer',
                  color: '#e0e0e0',
                }}
              >
                {userInfo.avatar && (
                  <img
                    src={userInfo.avatar.startsWith('//') ? 'https:' + userInfo.avatar : userInfo.avatar}
                    alt=""
                    style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }}
                  />
                )}
                <span style={{ color: getRankColor(userInfo.rank), fontWeight: 700 }}>
                  {userInfo.handle}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#888' }}>
                  ({userInfo.rating})
                </span>
                <span style={{ fontSize: '0.7rem', color: '#4ade80' }}>
                  ✓ {solvedSet.size} solved
                </span>
                <span style={{ fontSize: '0.8rem' }}>{showProfile ? '▲' : '▼'}</span>
              </button>
              <button
                onClick={handleRefresh}
                title="Refresh data"
                style={{
                  background: '#16213e',
                  border: '1px solid #2a2a4a',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  color: '#888',
                  fontSize: '0.85rem',
                }}
              >
                {userLoading ? '⏳' : '🔄'}
              </button>
              <button
                onClick={handleDisconnect}
                title="Disconnect handle"
                style={{
                  background: '#2a1a1a',
                  border: '1px solid #e84d4d44',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  color: '#e84d4d',
                  fontSize: '0.8rem',
                }}
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={handleInput}
                onChange={(e) => setHandleInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                placeholder="CF Handle..."
                style={{
                  background: '#0f0f1a',
                  color: '#e0e0e0',
                  border: '1px solid #2a2a4a',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '0.85rem',
                  outline: 'none',
                  width: '150px',
                }}
              />
              <button
                onClick={handleConnect}
                disabled={userLoading || !handleInput.trim()}
                style={{
                  background: '#e84d4d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 16px',
                  cursor: userLoading || !handleInput.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  opacity: userLoading || !handleInput.trim() ? 0.5 : 1,
                }}
              >
                {userLoading ? 'Loading...' : 'Connect'}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* User Error */}
      {userError && (
        <div style={{
          background: '#2a1a1a',
          borderBottom: '1px solid #e84d4d',
          color: '#ff9999',
          padding: '10px 30px',
          fontSize: '0.85rem',
        }}>
          ⚠️ {userError}
          <button
            onClick={() => setUserError(null)}
            style={{ marginLeft: 12, color: '#e84d4d', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* User Profile Panel */}
      {showProfile && userInfo && (
        <div
          style={{
            background: '#16213e',
            borderBottom: '1px solid #2a2a4a',
            padding: '20px 30px',
          }}
        >
          <div className="flex flex-wrap gap-6 items-start">
            {/* Avatar + basic info */}
            <div className="flex items-center gap-4">
              {userInfo.avatar && (
                <img
                  src={userInfo.avatar.startsWith('//') ? 'https:' + userInfo.avatar : userInfo.avatar}
                  alt={userInfo.handle}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: '12px',
                    objectFit: 'cover',
                    border: `2px solid ${getRankColor(userInfo.rank)}`,
                  }}
                />
              )}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ fontSize: '1.3rem', fontWeight: 700, color: getRankColor(userInfo.rank) }}>
                    {userInfo.handle}
                  </span>
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: getRankColor(userInfo.rank) + '22',
                    color: getRankColor(userInfo.rank),
                    fontWeight: 600,
                    textTransform: 'capitalize',
                  }}>
                    {userInfo.rank}
                  </span>
                </div>
                <div style={{ color: '#aaa', fontSize: '0.85rem' }}>
                  Max: <span style={{ color: getRankColor(userInfo.maxRank), fontWeight: 600 }}>{userInfo.maxRank}</span>
                  {' '}({userInfo.maxRating})
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div className="flex flex-wrap gap-4" style={{ flex: 1 }}>
              <StatCard label="Current Rating" value={userInfo.rating} color={getRankColor(userInfo.rank)} />
              <StatCard label="Max Rating" value={userInfo.maxRating} color={getRankColor(userInfo.maxRank)} />
              <StatCard label="Problems Solved" value={solvedSet.size} color="#4ade80" />
              <StatCard label="In Problem Set" value={solvedCount} color="#60a5fa" />
              <StatCard label="Contribution" value={userInfo.contribution >= 0 ? `+${userInfo.contribution}` : `${userInfo.contribution}`} color={userInfo.contribution >= 0 ? '#4ade80' : '#ef4444'} />
              <StatCard label="Friend Of" value={userInfo.friendOfCount} color="#c084fc" />
            </div>

            {/* Solved progress */}
            <div style={{ minWidth: 200 }}>
              <div style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: 6, textTransform: 'uppercase' }}>
                Solve Progress
              </div>
              <div style={{
                background: '#0f0f1a',
                borderRadius: '8px',
                height: 10,
                overflow: 'hidden',
                marginBottom: 6,
              }}>
                <div style={{
                  width: allProblems.length ? `${(solvedCount / allProblems.length) * 100}%` : '0%',
                  height: '100%',
                  background: 'linear-gradient(90deg, #4ade80, #22c55e)',
                  borderRadius: '8px',
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <div style={{ fontSize: '0.8rem', color: '#888' }}>
                {solvedCount} / {allProblems.length} problems ({allProblems.length ? ((solvedCount / allProblems.length) * 100).toFixed(1) : 0}%)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div
        className="flex flex-wrap items-end gap-3"
        style={{ background: '#16213e', padding: '16px 30px', borderBottom: '1px solid #2a2a4a' }}
      >
        <FilterGroup label="Problem Index">
          <select value={filterIndex} onChange={(e) => setFilterIndex(e.target.value)} className="cf-select">
            <option value="">All Indexes</option>
            {indexes.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </FilterGroup>

        <FilterGroup label="Rating">
          <select value={filterRating} onChange={(e) => setFilterRating(e.target.value)} className="cf-select">
            <option value="">All Ratings</option>
            {ratings.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </FilterGroup>

        <FilterGroup label="Tag" minWidth="200px">
          <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)} className="cf-select">
            <option value="">All Tags</option>
            {tags.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </FilterGroup>

        <FilterGroup label="Division">
          <select value={filterDiv} onChange={(e) => setFilterDiv(e.target.value)} className="cf-select">
            <option value="">All Divisions</option>
            {divisions.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </FilterGroup>

        {savedHandle && solvedSet.size > 0 && (
          <FilterGroup label="Status">
            <select value={filterSolved} onChange={(e) => setFilterSolved(e.target.value as SolvedFilter)} className="cf-select">
              <option value="all">All Problems</option>
              <option value="solved">✓ Solved</option>
              <option value="unsolved">✗ Unsolved</option>
            </select>
          </FilterGroup>
        )}

        <FilterGroup label="Search" minWidth="180px">
          <input
            type="text"
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            placeholder="e.g. Watermelon..."
            className="cf-select"
          />
        </FilterGroup>

        <FilterGroup label="Sort By">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className="cf-select">
            <option value="id-asc">Problem ID (Asc)</option>
            <option value="id-desc">Problem ID (Desc)</option>
            <option value="rating-asc">Rating (Low → High)</option>
            <option value="rating-desc">Rating (High → Low)</option>
            <option value="name-asc">Name (A → Z)</option>
            <option value="name-desc">Name (Z → A)</option>
          </select>
        </FilterGroup>

        <FilterGroup label={'\u00A0'}>
          <button
            onClick={resetFilters}
            className="font-semibold transition-opacity"
            style={{
              padding: '8px 20px',
              border: 'none',
              borderRadius: '6px',
              background: '#2a2a4a',
              color: '#ccc',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#3a3a5a'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#2a2a4a'; }}
          >
            Reset
          </button>
        </FilterGroup>
      </div>

      {/* Stats Bar */}
      <div
        className="flex items-center justify-between flex-wrap gap-2"
        style={{ padding: '10px 30px', background: '#12122a', fontSize: '0.83rem', color: '#888' }}
      >
        <div className="flex items-center gap-4">
          <span>
            Showing <span style={{ color: '#e84d4d', fontWeight: 'bold' }}>{filteredProblems.length}</span> problems
          </span>
          {savedHandle && solvedSet.size > 0 && (
            <span>
              <span style={{ color: '#4ade80' }}>✓ {filterSolved === 'all'
                ? `${filteredProblems.filter(p => solvedSet.has(p.id)).length} solved in view`
                : filterSolved === 'solved'
                  ? `${filteredProblems.length} solved`
                  : `${filteredProblems.length} unsolved`
              }</span>
            </span>
          )}
        </div>
        {totalPages > 1 && (
          <span>
            Page {currentPage} of {totalPages}
            {savedHandle && solvedSet.size > 0 && (
              <span style={{ color: '#4ade80', marginLeft: 8 }}>
                ({solvedOnPage}/{pageProblems.length} solved on page)
              </span>
            )}
          </span>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '0 30px 20px' }}>
        {loading && (
          <div className="text-center" style={{ padding: '60px', color: '#888' }}>
            <div
              className="mx-auto mb-4"
              style={{
                width: 40,
                height: 40,
                border: '3px solid #2a2a4a',
                borderTopColor: '#e84d4d',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            Fetching problems from Codeforces API...
          </div>
        )}

        {error && (
          <div
            style={{
              background: '#2a1a1a',
              border: '1px solid #e84d4d',
              color: '#ff9999',
              padding: '16px 24px',
              borderRadius: '8px',
              marginTop: '20px',
            }}
          >
            ⚠️ Failed to load problems: {error}.<br />
            This may be due to CORS restrictions. Try opening via a local server or use a browser
            extension to allow CORS.
          </div>
        )}

        {!loading && !error && pageProblems.length === 0 && (
          <div className="text-center" style={{ padding: '50px', color: '#555', fontSize: '1rem' }}>
            No problems match your filters.
          </div>
        )}

        {!loading && !error && pageProblems.length > 0 && (
          <div className="overflow-x-auto" style={{ marginTop: 16 }}>
            <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#1a1a2e', color: '#aaa', textTransform: 'uppercase', fontSize: '0.73rem', letterSpacing: '0.05em' }}>
                  {savedHandle && solvedSet.size > 0 && <Th>Status</Th>}
                  <Th onClick={() => handleSortColumn('id')}>
                    ID <SortArrow active={sortBy.startsWith('id')} dir={sortBy === 'id-asc' ? 'asc' : 'desc'} />
                  </Th>
                  <Th onClick={() => handleSortColumn('name')}>
                    Name <SortArrow active={sortBy.startsWith('name')} dir={sortBy === 'name-asc' ? 'asc' : 'desc'} />
                  </Th>
                  <Th onClick={() => handleSortColumn('rating')}>
                    Rating <SortArrow active={sortBy.startsWith('rating')} dir={sortBy === 'rating-asc' ? 'asc' : 'desc'} />
                  </Th>
                  <Th>Tags</Th>
                  <Th>Division</Th>
                  <Th>Link</Th>
                </tr>
              </thead>
              <tbody>
                {pageProblems.map((p) => {
                  const ratingColor = p.rating ? getRatingColor(p.rating) : '#888';
                  const division = getDivision(p.contestId);
                  const isSolved = solvedSet.has(p.id);

                  return (
                    <tr
                      key={p.id}
                      className="transition-colors"
                      style={{
                        borderBottom: '1px solid #1e1e3a',
                        background: isSolved && savedHandle ? '#0d1f0d' : 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = isSolved && savedHandle ? '#142b14' : '#1a1a2e';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isSolved && savedHandle ? '#0d1f0d' : 'transparent';
                      }}
                    >
                      {savedHandle && solvedSet.size > 0 && (
                        <td style={{ padding: '10px 12px', verticalAlign: 'middle', textAlign: 'center', width: 50 }}>
                          {isSolved ? (
                            <span style={{ color: '#4ade80', fontSize: '1.1rem', fontWeight: 700 }}>✓</span>
                          ) : (
                            <span style={{ color: '#444', fontSize: '0.9rem' }}>—</span>
                          )}
                        </td>
                      )}
                      <td style={{ padding: '10px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {p.contestId}{p.index}
                      </td>
                      <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: isSolved && savedHandle ? '#4ade80' : '#6ea8fe',
                            textDecoration: 'none',
                            fontWeight: 500,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#e84d4d';
                            e.currentTarget.style.textDecoration = 'underline';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = isSolved && savedHandle ? '#4ade80' : '#6ea8fe';
                            e.currentTarget.style.textDecoration = 'none';
                          }}
                        >
                          {p.name}
                        </a>
                      </td>
                      <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                        <span
                          className="inline-block text-xs font-bold"
                          style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: p.rating ? ratingColor : '#333',
                            color: p.rating ? '#000' : '#888',
                          }}
                        >
                          {p.rating ?? 'N/A'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                        <div className="flex flex-wrap gap-0.5">
                          {p.tags.map((tag) => (
                            <span
                              key={tag}
                              onClick={() => handleTagClick(tag)}
                              className="inline-block cursor-pointer transition-colors"
                              title={`Filter by "${tag}"`}
                              style={{
                                background: filterTag === tag ? '#3a3a6a' : '#1e1e3a',
                                color: '#aac4ff',
                                border: filterTag === tag ? '1px solid #6a6aaa' : '1px solid #2a2a5a',
                                borderRadius: '4px',
                                padding: '2px 7px',
                                fontSize: '0.7rem',
                                margin: '1px',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#2a2a5a')}
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background = filterTag === tag ? '#3a3a6a' : '#1e1e3a')
                              }
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', verticalAlign: 'middle', fontSize: '0.8rem', color: '#999' }}>
                        {division || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium no-underline"
                          style={{ color: '#6ea8fe', fontSize: '0.82rem' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#e84d4d';
                            e.currentTarget.style.textDecoration = 'underline';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#6ea8fe';
                            e.currentTarget.style.textDecoration = 'none';
                          }}
                        >
                          Open ↗
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2" style={{ padding: '20px' }}>
          <PageBtn
            onClick={() => setCurrentPage(1)}
            disabled={currentPage <= 1}
          >
            «
          </PageBtn>
          <PageBtn
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
          >
            ‹ Prev
          </PageBtn>
          {paginationRange[0] > 1 && (
            <>
              <PageBtn onClick={() => setCurrentPage(1)}>1</PageBtn>
              {paginationRange[0] > 2 && <span style={{ color: '#555' }}>...</span>}
            </>
          )}
          {paginationRange.map((page) => (
            <PageBtn
              key={page}
              active={page === currentPage}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </PageBtn>
          ))}
          {paginationRange[paginationRange.length - 1] < totalPages && (
            <>
              {paginationRange[paginationRange.length - 1] < totalPages - 1 && (
                <span style={{ color: '#555' }}>...</span>
              )}
              <PageBtn onClick={() => setCurrentPage(totalPages)}>{totalPages}</PageBtn>
            </>
          )}
          <PageBtn
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
          >
            Next ›
          </PageBtn>
          <PageBtn
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage >= totalPages}
          >
            »
          </PageBtn>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .cf-select {
          background: #0f0f1a;
          color: #e0e0e0;
          border: 1px solid #2a2a4a;
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 0.85rem;
          outline: none;
          transition: border 0.2s;
          width: 100%;
        }
        .cf-select:focus {
          border-color: #e84d4d;
        }
        table { table-layout: auto; }
        @media (max-width: 768px) {
          header { padding: 12px 16px !important; }
          .filters { padding: 12px 16px !important; }
          .table-wrapper { padding: 12px 16px !important; }
        }
      `}</style>
    </div>
  );
}

// --- Sub-components ---

function FilterGroup({
  label,
  children,
  minWidth = '150px',
}: {
  label: string;
  children: React.ReactNode;
  minWidth?: string;
}) {
  return (
    <div className="flex flex-col gap-1" style={{ minWidth }}>
      <label style={{ fontSize: '0.7rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Th({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) {
  return (
    <th
      onClick={onClick}
      className="select-none whitespace-nowrap"
      style={{
        padding: '12px 14px',
        textAlign: 'left',
        cursor: onClick ? 'pointer' : 'default',
      }}
      onMouseEnter={(e) => onClick && (e.currentTarget.style.color = '#e84d4d')}
      onMouseLeave={(e) => onClick && (e.currentTarget.style.color = '#aaa')}
    >
      {children}
    </th>
  );
}

function SortArrow({ active, dir }: { active?: boolean; dir?: 'asc' | 'desc' }) {
  if (!active) return <span style={{ marginLeft: 4, color: '#444' }}>↕</span>;
  return <span style={{ marginLeft: 4, color: '#e84d4d' }}>{dir === 'asc' ? '↑' : '↓'}</span>;
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{
      background: '#0f0f1a',
      border: '1px solid #2a2a4a',
      borderRadius: '8px',
      padding: '10px 16px',
      minWidth: 110,
    }}>
      <div style={{ fontSize: '0.68rem', color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: '1.2rem', fontWeight: 700, color }}>
        {value}
      </div>
    </div>
  );
}

function PageBtn({
  children,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="transition-all"
      style={{
        background: active ? '#e84d4d' : '#1a1a2e',
        color: active ? 'white' : '#ccc',
        border: `1px solid ${active ? '#e84d4d' : '#2a2a4a'}`,
        borderRadius: '6px',
        padding: '6px 12px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '0.85rem',
        opacity: disabled ? 0.4 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !active) {
          e.currentTarget.style.background = '#e84d4d';
          e.currentTarget.style.color = 'white';
          e.currentTarget.style.borderColor = '#e84d4d';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !active) {
          e.currentTarget.style.background = '#1a1a2e';
          e.currentTarget.style.color = '#ccc';
          e.currentTarget.style.borderColor = '#2a2a4a';
        }
      }}
    >
      {children}
    </button>
  );
}

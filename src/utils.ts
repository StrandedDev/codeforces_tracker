export function getRatingColor(rating: number): string {
  if (rating >= 2900) return '#ff0000';
  if (rating >= 2600) return '#aa00aa';
  if (rating >= 2300) return '#ff3333';
  if (rating >= 2000) return '#ff7777';
  if (rating >= 1700) return '#ffbb55';
  if (rating >= 1400) return '#aaffff';
  if (rating >= 1100) return '#77ff77';
  return '#aaaaaa';
}

export function getRankColor(rank: string): string {
  const r = rank.toLowerCase();
  if (r === 'legendary grandmaster') return '#ff0000';
  if (r === 'international grandmaster') return '#ff0000';
  if (r === 'grandmaster') return '#ff3333';
  if (r === 'international master') return '#ffbb55';
  if (r === 'master') return '#ffbb55';
  if (r === 'candidate master') return '#c084fc';
  if (r === 'expert') return '#6ea8fe';
  if (r === 'specialist') return '#aaffff';
  if (r === 'pupil') return '#77ff77';
  if (r === 'newbie') return '#aaaaaa';
  return '#888888';
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

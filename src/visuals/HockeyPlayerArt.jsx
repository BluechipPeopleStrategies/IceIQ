import { useId } from 'react';

/**
 * Decorative player artwork for existing SVG rink coordinates.
 * Radius is the full painted footprint. The caller owns position, labels,
 * hit targets, team meaning and visibility. Unknown facing is a neutral icon.
 * Authored facing uses SVG degrees: zero is right, positive is clockwise.
 */
export function HockeyPlayerArt({ radius = 10, team = 'home', goalie = false, facing = null, opacity = 1 }) {
  const id = `hockey-art-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const r = Number.isFinite(radius) && radius > 0 ? radius : 10;
  const directed = Number.isFinite(facing);
  const gold = team === 'away';
  const trim = gold ? '#142744' : '#D9B765';
  const jersey = gold ? ['#F4D98F', '#C9A24B', '#8E672D'] : ['#38516F', '#0B1A33', '#061123'];
  return <g className="hockey-player-art" data-hockey-art={goalie ? 'goalie' : 'skater'} data-team={gold ? 'away' : 'home'} data-pose={directed ? 'authored-heading' : 'neutral'}
    aria-hidden="true" pointerEvents="none" opacity={opacity} transform={`scale(${r / 10})`}>
    <defs>
      <linearGradient id={`${id}-jersey`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={jersey[0]} /><stop offset=".48" stopColor={jersey[1]} /><stop offset="1" stopColor={jersey[2]} /></linearGradient>
      <linearGradient id={`${id}-helmet`} x1="0" y1="0" x2=".65" y2="1"><stop stopColor="#65788C" /><stop offset=".4" stopColor="#23384E" /><stop offset="1" stopColor="#071322" /></linearGradient>
      <linearGradient id={`${id}-pad`} x1="0" y1="0" x2="1" y2=".35"><stop stopColor="#FFFDF7" /><stop offset=".58" stopColor="#E7EBEA" /><stop offset="1" stopColor="#9BAAB3" /></linearGradient>
    </defs>
    <ellipse cx=".3" cy="6" rx="8.4" ry="2.6" fill="#0B1A33" opacity=".19" />
    <ellipse cx=".2" cy="6" rx="6.5" ry="1.5" fill="#0B1A33" opacity=".11" />
    <g transform={directed ? `rotate(${facing + 90})` : undefined} strokeLinejoin="round" strokeLinecap="round">
      {goalie ? <>
        <path d="M-5.2 2.2 -5.8 6.8 M5.2 2.2 5.8 6.8" fill="none" stroke="#07111D" strokeWidth="2.6" />
        <rect x="-6.2" y="1.8" width="5.2" height="6.8" rx="1.1" fill={`url(#${id}-pad)`} stroke="#334554" strokeWidth=".45" />
        <rect x="1" y="1.8" width="5.2" height="6.8" rx="1.1" fill={`url(#${id}-pad)`} stroke="#334554" strokeWidth=".45" />
        <path d="M-5.5 3H-1.7 M1.7 3H5.5 M-5.5 5H-1.7 M1.7 5H5.5" stroke={trim} strokeWidth=".7" />
        <path d="M-5.1 8.8H-1.6 M1.6 8.8H5.1" stroke="#506575" strokeWidth=".55" />
      </> : <>
        <path d="M-2.8 2.8 -3.4 6.7 M2.8 2.8 3.4 6.7" fill="none" stroke="#091525" strokeWidth="3.5" />
        <path d="M-3.1 4.6 -3.3 6 M3.1 4.6 3.3 6" fill="none" stroke={trim} strokeWidth="2.8" />
        <path d="M-5.5 7.1Q-3.4 5.5-1.9 7.4 M1.9 7.4Q3.4 5.5 5.5 7.1" fill="none" stroke="#08131F" strokeWidth="2.2" />
        <path d="M-5.7 8.1 -1.8 8.3 M1.8 8.3 5.7 8.1" stroke="#788D9A" strokeWidth=".6" />
      </>}
      <path d="M-4.5-2.8Q-7-2.4-8.1 1.5L-6.2 3.2 -3.3-.3 M4.5-2.8Q7-2.4 8.1 1.5L6.2 3.2 3.3-.3" fill={`url(#${id}-jersey)`} stroke="#172B3D" strokeWidth=".6" />
      <path d="M-7.6 .2 -5.5 1.3 M7.6 .2 5.5 1.3" stroke={trim} strokeWidth="1.1" />
      <path d="M-4.5-3.1Q0-4.4 4.5-3.1L5.1 3Q0 5.1-5.1 3Z" fill={`url(#${id}-jersey)`} stroke="#071526" strokeWidth=".65" />
      <path d="M-4.7 2Q0 3.5 4.7 2" fill="none" stroke={trim} strokeWidth="1.2" />
      <path d="M-3.4-2Q0-2.7 3.4-2" fill="none" stroke="#FFFFFF" opacity=".2" strokeWidth=".55" />
      <path d="M-1-.8H1V.8H-1Z" fill={trim} opacity=".9" />
      {goalie ? <>
        <path d="M-8.3 0Q-10 1.5-7.3 3.9L-5.8 2.5-6.4 .4Z" fill={`url(#${id}-pad)`} stroke="#223B50" strokeWidth=".55" />
        <rect x="6.1" y="-.2" width="3" height="4" rx=".65" fill={`url(#${id}-pad)`} stroke="#223B50" strokeWidth=".55" />
      </> : <>
        <ellipse cx="-7" cy="2.1" rx="1.75" ry="1.45" fill="#14263B" stroke={trim} strokeWidth=".6" />
        <ellipse cx="7" cy="2.1" rx="1.75" ry="1.45" fill="#14263B" stroke={trim} strokeWidth=".6" />
      </>}
      {directed && <path d={goalie ? 'M6.9 1.8 3.7 8.5 -2 8.5' : 'M6.9 1.8 8.4-6.6 6.8-7.2'} fill="none" stroke="#182C3D" strokeWidth={goalie ? '.85' : '.65'} />}
      <ellipse cx="0" cy="-5.15" rx="3.6" ry="3.2" fill={`url(#${id}-helmet)`} stroke="#071421" strokeWidth=".6" />
      <path d="M-2.8-5.7Q-2.3-7.5 .5-7.5" fill="none" stroke="#B5C6D0" strokeWidth=".6" opacity=".7" />
      <path d="M-2.45-4.9Q0-4.1 2.45-4.9L2-2.6Q0-1.4-2-2.6Z" fill="#EAC3A5" stroke="#22374A" strokeWidth=".45" />
      <path d="M-2.5-4.8 2.5-4.8 M-2.2-3.5 2.2-3.5 M-1.2-4.8 -1-2.1 M1.2-4.8 1-2.1" fill="none" stroke="#7F97A7" strokeWidth=".4" />
      {goalie && <path d="M-2.6-6.4Q0-7.5 2.6-6.4" fill="none" stroke="#E9ECE8" strokeWidth=".8" />}
    </g>
  </g>;
}

export default HockeyPlayerArt;

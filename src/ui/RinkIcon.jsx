/** One optical weight and grid for navigation, missions, and action cards. */
export default function RinkIcon({ name = 'play', size = 22, className = '', ...props }) {
  const paths = {
    home: <><path d="m3 11 9-8 9 8M5 10v11h5v-7h4v7h5V10" /></>,
    scan: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    play: <><rect x="3" y="3" width="18" height="18" rx="6" /><path d="m10 8 6 4-6 4Z" /></>,
    map: <><path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Zm6-2v16m6-14v16" /></>,
    target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
    report: <><rect x="4" y="3" width="16" height="18" rx="3" /><path d="M8 16v-4m4 4V8m4 8v-6" /></>,
    book: <><path d="M12 6C9 3 5 3 2 4v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-3-1-7-1-10 2Zm0 0v15" /></>,
    ice: <><rect x="2" y="5" width="20" height="14" rx="6" /><path d="M12 5v14M7 5v14m10-14v14" /><circle cx="12" cy="12" r="3" /></>,
    training: <><path d="M4 8v8m3-11v14m10-14v14m3-11v8M7 12h10" /></>,
    chevron: <path d="m9 5 7 7-7 7" />,
    arrow: <path d="M3 12h18m-7-7 7 7-7 7" />,
    lock: <><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    star: <path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" />,
    trophy: <><path d="M7 3h10v7a5 5 0 0 1-10 0ZM7 5H3v3c0 3 2 4 4 4m10-7h4v3c0 3-2 4-4 4m-5 3v6m-4 0h8" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 6v6l4 2" /></>,
    team: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5" /></>,
    shield: <><path d="m12 2 8 3v7c0 5-8 10-8 10S4 17 4 12V5Z" /><path d="m8 12 3 3 5-6" /></>,
    flag: <><path d="M5 22V3m0 1c5-5 9 5 15 0v10c-6 5-10-5-15 0" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" className={`rr-icon ${className}`} aria-hidden="true" {...props}>{paths[name] || paths.play}</svg>;
}

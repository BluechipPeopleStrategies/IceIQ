import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './brand.css'

// Inject global animations for Liquid Glass theme
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  /* Keyboard focus indicator — gold ring, never relies on color alone for meaning */
  button:focus-visible,
  [role="button"]:focus-visible,
  a:focus-visible,
  input:focus-visible,
  textarea:focus-visible,
  select:focus-visible {
    outline: 2px solid #C9A24B;
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
    }
  }
`;
document.head.appendChild(style);

// Top-level safety net so an uncaught render error shows a recover card
// instead of a permanent blank navy screen.
class RootErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('App crashed:', error, info); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{minHeight:'100vh',background:'#0B1A33',color:'#F5EFE6',fontFamily:"'Inter', system-ui, sans-serif",display:'flex',alignItems:'center',justifyContent:'center',padding:'1.5rem'}}>
        <div style={{maxWidth:380,textAlign:'center',background:'rgba(13,21,37,0.6)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:16,padding:'1.75rem'}}>
          <div style={{fontSize:34,marginBottom:'.5rem'}}>⚠️</div>
          <div style={{fontFamily:"'Playfair Display', Georgia, serif",fontSize:'1.4rem',color:'#C9A24B',letterSpacing:'.03em',marginBottom:'.5rem'}}>Something went wrong</div>
          <div style={{fontSize:13,color:'#9fb0c3',lineHeight:1.5,marginBottom:'1.25rem'}}>The app hit an unexpected error. Reloading usually fixes it.</div>
          <button onClick={() => window.location.reload()} style={{background:'#C9A24B',color:'#0B1A33',border:'none',borderRadius:10,padding:'.75rem 1.5rem',cursor:'pointer',fontWeight:800,fontSize:14,fontFamily:"'Inter', system-ui, sans-serif"}}>Reload</button>
        </div>
      </div>
    );
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
)

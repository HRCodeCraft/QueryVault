import { useState, useEffect, useRef } from 'react';
import { register, login, saveToken } from '../auth';
import './AuthPage.css';

/* ── Animated neural-network canvas ── */
function NeuralCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animId;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const NODES = 72;
    const CONNECT_DIST = 130;
    const cx = () => canvas.width / 2;
    const cy = () => canvas.height / 2;
    const RADIUS = () => Math.min(canvas.width, canvas.height) * 0.32;

    // Distribute nodes on sphere surface (Fibonacci lattice)
    const nodes = Array.from({ length: NODES }, (_, i) => {
      const theta = Math.acos(1 - (2 * (i + 0.5)) / NODES);
      const phi = Math.PI * (1 + Math.sqrt(5)) * i;
      return {
        ox: Math.sin(theta) * Math.cos(phi),
        oy: Math.sin(theta) * Math.sin(phi),
        oz: Math.cos(theta),
        speed: 0.0002 + Math.random() * 0.0003,
        offset: Math.random() * Math.PI * 2,
      };
    });

    let t = 0;
    const draw = () => {
      t += 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Glow core
      const grad = ctx.createRadialGradient(cx(), cy(), 0, cx(), cy(), RADIUS() * 0.7);
      grad.addColorStop(0, 'rgba(108,99,255,0.13)');
      grad.addColorStop(1, 'rgba(108,99,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx(), cy(), RADIUS() * 0.7, 0, Math.PI * 2);
      ctx.fill();

      const rotY = t * 0.004;
      const rotX = t * 0.0015;
      const r = RADIUS();

      // Project 3-D → 2-D with rotation
      const projected = nodes.map(n => {
        // Rotate Y
        const x1 = n.ox * Math.cos(rotY) - n.oz * Math.sin(rotY);
        const z1 = n.ox * Math.sin(rotY) + n.oz * Math.cos(rotY);
        // Rotate X
        const y1 = n.oy * Math.cos(rotX) - z1 * Math.sin(rotX);
        const z2 = n.oy * Math.sin(rotX) + z1 * Math.cos(rotX);

        const scale = (z2 + 2) / 3;
        return {
          x: cx() + x1 * r,
          y: cy() + y1 * r,
          z: z2,
          scale,
          alpha: Math.max(0.1, (z2 + 1) / 2),
        };
      });

      // Edges
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const a = projected[i], b = projected[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < CONNECT_DIST) {
            const alpha = ((1 - d / CONNECT_DIST) * 0.4 * (a.alpha + b.alpha)) / 2;
            ctx.strokeStyle = `rgba(108,99,255,${alpha.toFixed(3)})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Nodes
      projected.forEach(p => {
        const size = 2.2 * p.scale;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(140,130,255,${(p.alpha * 0.9).toFixed(3)})`;
        ctx.fill();

        // Glow dot
        if (p.z > 0.4) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, size * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(108,99,255,${(p.alpha * 0.12).toFixed(3)})`;
          ctx.fill();
        }
      });

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="neural-canvas" />;
}

/* ── Main Auth Page ── */
export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      if (mode === 'register') {
        await register(email, password);
        setMessage({ text: 'Account created! Check your email to verify.', type: 'success' });
        setMode('login');
      } else {
        const res = await login(email, password);
        saveToken(res.data.token);
        onLogin();
      }
    } catch (err) {
      setMessage({
        text: err.response?.data?.detail || 'Something went wrong. Try again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }

  const switchMode = (m) => { setMode(m); setMessage({ text: '', type: '' }); };

  return (
    <div className="auth-page">
      {/* Left — animated sphere */}
      <div className="auth-left">
        <NeuralCanvas />
        <div className="auth-hero-text">
          <div className="auth-logo-mark">
            <div className="logo-ring" />
            <span className="logo-glyph">Q</span>
          </div>
          <h1 className="hero-title">QueryVault</h1>
          <p className="hero-sub">Talk to your documents.<br />Powered by AI.</p>
          <div className="hero-pills">
            <span className="pill">PDF</span>
            <span className="pill">DOCX</span>
            <span className="pill">TXT</span>
            <span className="pill dot">RAG</span>
          </div>
        </div>
      </div>

      {/* Right — glass card */}
      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-card-header">
            <h2>{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
            <p>{mode === 'login' ? 'Sign in to your vault' : 'Start chatting with your docs'}</p>
          </div>

          <div className="auth-tabs">
            <button className={`auth-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => switchMode('login')}>
              Sign In
            </button>
            <button className={`auth-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => switchMode('register')}>
              Register
            </button>
            <div className={`tab-slider ${mode === 'register' ? 'right' : ''}`} />
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label>Email address</label>
              <div className="input-wrap">
                <span className="input-icon">✉</span>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="auth-field">
              <label>Password</label>
              <div className="input-wrap">
                <span className="input-icon">🔒</span>
                <input
                  type="password"
                  placeholder={mode === 'register' ? 'Min. 6 characters' : 'Your password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {message.text && (
              <div className={`auth-message ${message.type}`}>
                <span className="msg-icon">{message.type === 'success' ? '✓' : '!'}</span>
                {message.text}
              </div>
            )}

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading
                ? <span className="btn-spinner" />
                : mode === 'login' ? 'Sign In →' : 'Create Account →'}
            </button>
          </form>

          <p className="auth-footer">
            {mode === 'login' ? "No account yet? " : 'Already registered? '}
            <button className="auth-link" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? 'Register' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

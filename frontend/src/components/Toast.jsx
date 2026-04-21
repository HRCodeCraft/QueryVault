import { useEffect, useState } from 'react';
import './Toast.css';

export default function Toast({ message, type = 'error', onDone }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const hide = setTimeout(() => setVisible(false), 3500);
    const remove = setTimeout(() => onDone?.(), 4000);
    return () => { clearTimeout(hide); clearTimeout(remove); };
  }, []);

  return (
    <div className={`toast toast-${type} ${visible ? 'show' : 'hide'}`}>
      <span className="toast-icon">{type === 'error' ? '⚠' : '✓'}</span>
      <span className="toast-msg">{message}</span>
      <button className="toast-close" onClick={() => { setVisible(false); setTimeout(() => onDone?.(), 400); }}>✕</button>
    </div>
  );
}

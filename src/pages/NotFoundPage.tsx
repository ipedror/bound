// ============================================================
// NotFoundPage - 404 Page for unmatched routes
// ============================================================

import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.code}>404</h1>
        <h2 style={styles.title}>Page Not Found</h2>
        <p style={styles.description}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/" style={styles.link}>
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'calc(100vh - 60px)',
    padding: '24px',
  },
  content: {
    textAlign: 'center',
  },
  code: {
    fontSize: '120px',
    fontWeight: 'bold',
    color: '#38bdf8',
    margin: '0 0 16px 0',
    lineHeight: 1,
  },
  title: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#f1f1f1',
    margin: '0 0 12px 0',
  },
  description: {
    fontSize: '16px',
    color: '#94a3b8',
    margin: '0 0 24px 0',
  },
  link: {
    display: 'inline-block',
    padding: '12px 24px',
    backgroundColor: '#38bdf8',
    color: '#0f172a',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
  },
};

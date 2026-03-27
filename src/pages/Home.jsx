import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Home() {
  const navigate = useNavigate()
  const { user, signInWithGoogle } = useAuth()

  return (
    <div className="home">
      <div className="home-hero">
        <div className="hero-glyph">♟</div>
        <h1 className="hero-title">
          Is there a <em>winning move</em>?
        </h1>
        <p className="hero-subtitle">
          Not every position has a solution. Train your instinct to tell the difference.
        </p>

        <div className="hero-actions">
          <button className="btn-primary" onClick={() => navigate('/puzzle')}>
            Play as Guest
          </button>
          {!user && (
            <button className="btn-secondary" onClick={signInWithGoogle}>
              Sign in to track ELO
            </button>
          )}
        </div>
      </div>

      <div className="home-features">
        <div className="feature-card">
          <span className="feature-icon">⚖</span>
          <h3>No guarantees</h3>
          <p>Each position might be winning, equal, or lost. Decide before you move.</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">📈</span>
          <h3>ELO rating</h3>
          <p>Sign in to track your rating. Puzzles are matched to your level.</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">🎯</span>
          <h3>Two-step challenge</h3>
          <p>First judge the position, then find the move. Both must be right.</p>
        </div>
      </div>
    </div>
  )
}

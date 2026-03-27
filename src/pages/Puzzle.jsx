import { useState, useEffect, useCallback } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { calculateNewElo, eloDiff } from '../lib/elo'

const PHASE = {
  JUDGE: 'judge',       // Step 1: Does this position have a winning move?
  MOVE: 'move',         // Step 2: Make the move
  RESULT: 'result',     // Show result
}

export default function PuzzlePage() {
  const { user, profile, refreshProfile } = useAuth()

  const [puzzle, setPuzzle] = useState(null)
  const [game, setGame] = useState(null)
  const [phase, setPhase] = useState(PHASE.JUDGE)
  const [result, setResult] = useState(null) // { correct, eloDelta, message }
  const [loading, setLoading] = useState(true)
  const [boardOrientation, setBoardOrientation] = useState('white')
  const [highlightSquares, setHighlightSquares] = useState({})
  const [wrongMove, setWrongMove] = useState(false)

  const loadPuzzle = useCallback(async () => {
    setLoading(true)
    setPhase(PHASE.JUDGE)
    setResult(null)
    setHighlightSquares({})
    setWrongMove(false)

    const playerElo = profile?.elo ?? 1000

    // Fetch puzzle close to player ELO
    const { data, error } = await supabase
      .from('puzzles')
      .select('*')
      .gte('rating', playerElo - 200)
      .lte('rating', playerElo + 200)
      .order('id')
      .limit(50)

    if (error || !data || data.length === 0) {
      // Fallback: fetch any puzzle
      const { data: fallback } = await supabase
        .from('puzzles')
        .select('*')
        .limit(20)

      if (!fallback || fallback.length === 0) {
        setLoading(false)
        return
      }
      const picked = fallback[Math.floor(Math.random() * fallback.length)]
      initPuzzle(picked)
    } else {
      const picked = data[Math.floor(Math.random() * data.length)]
      initPuzzle(picked)
    }
  }, [profile?.elo])

  function initPuzzle(p) {
    const chess = new Chess(p.fen)
    setPuzzle(p)
    setGame(chess)
    // Board orientation: show from the side to move
    setBoardOrientation(chess.turn() === 'w' ? 'white' : 'black')
    setLoading(false)
  }

  useEffect(() => {
    loadPuzzle()
  }, [])

  // Step 1: User judges the position
  async function handleJudge(userSaysWinning) {
    const actuallyWinning = puzzle.has_winning_move

    if (userSaysWinning === actuallyWinning) {
      if (actuallyWinning) {
        // Correct — now make the move
        setPhase(PHASE.MOVE)
      } else {
        // Correct — no winning move, puzzle done
        await finishPuzzle(true)
      }
    } else {
      // Wrong judgment
      await finishPuzzle(false, `This position ${actuallyWinning ? 'does have' : 'does not have'} a winning move.`)
    }
  }

  // Step 2: User makes a move on the board
  function onDrop(sourceSquare, targetSquare, piece) {
    if (phase !== PHASE.MOVE) return false

    const gameCopy = new Chess(game.fen())
    let move = null

    try {
      move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      })
    } catch {
      return false
    }

    if (!move) return false

    // Check if this matches the expected solution move
    const solutionMoves = puzzle.solution_moves // e.g. ["e2e4", "d7d5"]
    const firstMove = solutionMoves?.[0]

    if (!firstMove) return false

    const moveUci = move.from + move.to + (move.promotion || '')
    if (moveUci === firstMove) {
      setGame(gameCopy)
      highlightMove(sourceSquare, targetSquare, true)
      finishPuzzle(true)
    } else {
      highlightMove(sourceSquare, targetSquare, false)
      setWrongMove(true)
      finishPuzzle(false, 'Wrong move.')
    }

    return true
  }

  function highlightMove(from, to, correct) {
    const color = correct ? 'rgba(0,200,100,0.4)' : 'rgba(220,50,50,0.4)'
    setHighlightSquares({
      [from]: { background: color },
      [to]: { background: color },
    })
  }

  async function finishPuzzle(correct, message = '') {
    let delta = 0

    if (user && profile) {
      delta = eloDiff(profile.elo, puzzle.rating, correct)
      const newElo = calculateNewElo(profile.elo, puzzle.rating, correct)

      await supabase.from('profiles').update({ elo: newElo }).eq('id', user.id)
      await supabase.from('puzzle_attempts').insert({
        user_id: user.id,
        puzzle_id: puzzle.id,
        correct,
        player_elo_before: profile.elo,
      })
      await refreshProfile()
    }

    // Show correct solution squares if wrong
    if (!correct && puzzle.solution_moves?.[0]) {
      const uci = puzzle.solution_moves[0]
      const from = uci.slice(0, 2)
      const to = uci.slice(2, 4)
      setHighlightSquares({
        [from]: { background: 'rgba(255,200,0,0.5)' },
        [to]: { background: 'rgba(255,200,0,0.5)' },
      })
    }

    setResult({ correct, eloDelta: delta, message })
    setPhase(PHASE.RESULT)
  }

  if (loading) {
    return (
      <div className="puzzle-page">
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Loading puzzle…</p>
        </div>
      </div>
    )
  }

  if (!puzzle) {
    return (
      <div className="puzzle-page">
        <div className="loading-state">
          <p>No puzzles found. Check your Supabase setup.</p>
        </div>
      </div>
    )
  }

  const sideToMove = game?.turn() === 'w' ? 'White' : 'Black'

  return (
    <div className="puzzle-page">
      <div className="puzzle-layout">
        <div className="board-wrapper">
          <Chessboard
            position={game?.fen()}
            onPieceDrop={onDrop}
            boardOrientation={boardOrientation}
            arePiecesDraggable={phase === PHASE.MOVE}
            customSquareStyles={highlightSquares}
            customBoardStyle={{
              borderRadius: '4px',
              boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
            }}
            customDarkSquareStyle={{ backgroundColor: '#4a7c59' }}
            customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
          />
        </div>

        <div className="puzzle-panel">
          <div className="puzzle-meta">
            <span className="puzzle-rating-badge">Puzzle {puzzle.rating}</span>
            {puzzle.themes?.length > 0 && (
              <span className="puzzle-theme">{puzzle.themes[0]}</span>
            )}
          </div>

          <div className="puzzle-prompt">
            <p className="prompt-side">
              <strong>{sideToMove}</strong> to move
            </p>

            {phase === PHASE.JUDGE && (
              <div className="judge-phase">
                <p className="prompt-question">Does this position have a winning move?</p>
                <div className="judge-buttons">
                  <button className="judge-btn judge-yes" onClick={() => handleJudge(true)}>
                    ✓ Yes, there is
                  </button>
                  <button className="judge-btn judge-no" onClick={() => handleJudge(false)}>
                    ✗ No, it doesn't
                  </button>
                </div>
              </div>
            )}

            {phase === PHASE.MOVE && (
              <div className="move-phase">
                <p className="prompt-question">Find the winning move.</p>
                <p className="prompt-hint">Drag or click to move.</p>
              </div>
            )}

            {phase === PHASE.RESULT && result && (
              <div className={`result-phase ${result.correct ? 'correct' : 'wrong'}`}>
                <div className="result-icon">{result.correct ? '✓' : '✗'}</div>
                <p className="result-label">{result.correct ? 'Correct!' : 'Incorrect'}</p>
                {result.message && <p className="result-message">{result.message}</p>}

                {user && (
                  <div className={`elo-change ${result.eloDelta >= 0 ? 'gain' : 'loss'}`}>
                    {result.eloDelta >= 0 ? '+' : ''}{result.eloDelta} ELO
                  </div>
                )}
                {!user && (
                  <p className="guest-note">Sign in to track your ELO</p>
                )}

                <button className="btn-primary next-btn" onClick={loadPuzzle}>
                  Next Puzzle →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

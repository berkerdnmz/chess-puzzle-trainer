const K_FACTOR = 32

export function calculateNewElo(playerElo, puzzleElo, won) {
  const expected = 1 / (1 + Math.pow(10, (puzzleElo - playerElo) / 400))
  const actual = won ? 1 : 0
  const newElo = Math.round(playerElo + K_FACTOR * (actual - expected))
  return Math.max(100, newElo)
}

export function eloDiff(playerElo, puzzleElo, won) {
  const newElo = calculateNewElo(playerElo, puzzleElo, won)
  return newElo - playerElo
}

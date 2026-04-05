import { useState, useCallback, useEffect, useMemo } from 'react';

interface Props {
  imageUrl: string;
  gridSize: 3 | 4;
  onSolve: () => void;
}

function createSolvedBoard(size: number): number[] {
  const tiles: number[] = [];
  for (let i = 1; i < size * size; i++) tiles.push(i);
  tiles.push(0); // 0 = empty
  return tiles;
}

function shuffleBoard(size: number): number[] {
  const board = createSolvedBoard(size);
  // Fisher-Yates + solvability check
  let inversions: number;
  do {
    for (let i = board.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [board[i], board[j]] = [board[j], board[i]];
    }
    inversions = 0;
    for (let i = 0; i < board.length; i++) {
      for (let j = i + 1; j < board.length; j++) {
        if (board[i] && board[j] && board[i] > board[j]) inversions++;
      }
    }
    const emptyRow = Math.floor(board.indexOf(0) / size);
    const solvable = size % 2 === 1
      ? inversions % 2 === 0
      : (emptyRow % 2 === 0 ? inversions % 2 === 1 : inversions % 2 === 0);
    if (solvable) break;
  } while (true);
  return board;
}

function isSolved(board: number[]): boolean {
  for (let i = 0; i < board.length - 1; i++) {
    if (board[i] !== i + 1) return false;
  }
  return board[board.length - 1] === 0;
}

export default function SlidingPuzzle({ imageUrl, gridSize, onSolve }: Props) {
  const [board, setBoard] = useState<number[]>(() => shuffleBoard(gridSize));
  const [moves, setMoves] = useState(0);
  const [solved, setSolved] = useState(false);
  const tileSize = Math.floor(280 / gridSize);
  const totalSize = tileSize * gridSize;

  const handleTileClick = useCallback((index: number) => {
    if (solved) return;
    const emptyIndex = board.indexOf(0);
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    const emptyRow = Math.floor(emptyIndex / gridSize);
    const emptyCol = emptyIndex % gridSize;

    const isAdjacent =
      (Math.abs(row - emptyRow) === 1 && col === emptyCol) ||
      (Math.abs(col - emptyCol) === 1 && row === emptyRow);

    if (!isAdjacent) return;

    const newBoard = [...board];
    [newBoard[index], newBoard[emptyIndex]] = [newBoard[emptyIndex], newBoard[index]];
    setBoard(newBoard);
    setMoves(m => m + 1);

    if (isSolved(newBoard)) {
      setSolved(true);
      setTimeout(onSolve, 600);
    }
  }, [board, gridSize, solved, onSolve]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>이동: <strong className="text-foreground">{moves}</strong></span>
        <span>{gridSize}×{gridSize}</span>
      </div>

      <div
        className="relative rounded-lg overflow-hidden border-2 border-border shadow-lg bg-muted"
        style={{ width: totalSize, height: totalSize }}
      >
        {board.map((tile, index) => {
          if (tile === 0) return null;
          const targetRow = Math.floor((tile - 1) / gridSize);
          const targetCol = (tile - 1) % gridSize;
          const currentRow = Math.floor(index / gridSize);
          const currentCol = index % gridSize;

          return (
            <div
              key={tile}
              onClick={() => handleTileClick(index)}
              className={`absolute cursor-pointer transition-all duration-200 ease-out ${
                solved ? 'border-transparent' : 'border border-background/50 hover:brightness-110'
              }`}
              style={{
                width: tileSize,
                height: tileSize,
                left: currentCol * tileSize,
                top: currentRow * tileSize,
                backgroundImage: `url(${imageUrl})`,
                backgroundSize: `${totalSize}px ${totalSize}px`,
                backgroundPosition: `-${targetCol * tileSize}px -${targetRow * tileSize}px`,
              }}
            />
          );
        })}
      </div>

      {solved && (
        <div className="text-center animate-scale-in">
          <p className="text-lg font-bold text-primary">🎉 퍼즐 완성!</p>
          <p className="text-sm text-muted-foreground">{moves}번 만에 완성</p>
        </div>
      )}

      {/* Reference image (small) */}
      <details className="w-full">
        <summary className="text-xs text-muted-foreground cursor-pointer text-center">원본 이미지 보기</summary>
        <img src={imageUrl} alt="원본" className="mt-2 rounded-lg border w-full max-w-[200px] mx-auto" />
      </details>
    </div>
  );
}

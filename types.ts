export enum Gesture {
  None = 'Ninguno',
  Rock = 'Piedra',
  Paper = 'Papel',
  Scissors = 'Tijera',
  Unknown = 'Desconocido'
}

export enum GameState {
  Loading = 'LOADING',     // Loading AI Models
  Idle = 'IDLE',           // Waiting to start
  Countdown = 'COUNTDOWN', // 3, 2, 1...
  Detecting = 'DETECTING', // Capturing gesture
  Result = 'RESULT'        // Showing winner
}

export enum Winner {
  None = 'None',
  User = 'User',
  Cpu = 'Cpu',
  Draw = 'Draw'
}

export interface GameResult {
  userGesture: Gesture;
  cpuGesture: Gesture;
  winner: Winner;
  timestamp: number;
}
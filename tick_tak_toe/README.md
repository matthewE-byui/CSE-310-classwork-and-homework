# Tic-Tac-Toe (C#)

A console-based two-player Tic-Tac-Toe game built in C# using OOP principles.

# Youtube link

''' link (https://youtu.be/XuKE_HA6a9M)


## Features

- Numbered 3×3 game board that updates after every turn
- Two-player turns: Player 1 is X, Player 2 is O
- Win detection across all rows, columns, and diagonals
- Draw detection when the board fills with no winner
- Move validation — occupied or out-of-range spaces are rejected
- Replay prompt at the end of each round
- Persistent scoreboard tracking wins and draws across multiple rounds

## Project Structure

```
tick_tak_toe/
├── Program.cs          # Entry point
├── Board.cs            # 3×3 grid, move placement, win/draw logic
├── Player.cs           # Player name and symbol
├── GameManager.cs      # Game loop, input handling, scoreboard
└── tick_tak_toe.csproj # .NET 10 project file
```

## Requirements

- [.NET 10 SDK](https://dotnet.microsoft.com/download)

## How to Run

**From the terminal:**
```bash
dotnet run --project tick_tak_toe/tick_tak_toe.csproj
```

**From VS Code:**
1. Open the Run and Debug panel (`Ctrl+Shift+D`)
2. Select **Run Tic-Tac-Toe (C#)**
3. Press `F5`

## How to Play

1. The board displays numbers 1–9 showing available spaces:
   ```
    1 | 2 | 3
   -----------
    4 | 5 | 6
   -----------
    7 | 8 | 9
   ```
2. Each player types the number of the space they want to claim and presses Enter.
3. The game announces a winner or a draw after each round.
4. Type `y` to play again or `n` to quit.
5. The scoreboard is displayed after each round.

## Concepts Demonstrated

- Classes and OOP (`Board`, `Player`, `GameManager`)
- Arrays and 2D index logic
- Loops and conditionals
- Input validation
- Basic game state management

namespace TicTacToe;

public class GameManager
{
    private readonly Board board;
    private readonly Player playerOne;
    private readonly Player playerTwo;

    private int playerOneWins;
    private int playerTwoWins;
    private int draws;
    private bool exitRequested;

    public GameManager()
    {
        board = new Board();
        playerOne = new Player("Player 1", 'X');
        playerTwo = new Player("Player 2", 'O');
    }

    public void Run()
    {
        Console.Clear();
        Console.WriteLine("Tic-Tac-Toe");
        Console.WriteLine("Enter a number from 1 to 9 to place your mark.");

        var playAgain = true;

        while (playAgain)
        {
            PlaySingleRound();

            if (exitRequested)
            {
                break;
            }

            DisplayScoreboard();
            playAgain = AskReplay();
        }

        Console.WriteLine("Thanks for playing!");
    }

    private void PlaySingleRound()
    {
        board.Reset();
        var currentPlayer = playerOne;

        while (true)
        {
            board.Display();
            var move = AskForMove(currentPlayer);
            if (exitRequested)
            {
                Console.WriteLine("Input ended. Exiting game.");
                break;
            }

            board.PlaceMark(move, currentPlayer.Symbol);

            if (board.HasWinner())
            {
                board.Display();
                Console.WriteLine($"{currentPlayer.Name} wins this round!");
                UpdateScore(currentPlayer);
                break;
            }

            if (board.IsDraw())
            {
                board.Display();
                Console.WriteLine("This round is a draw.");
                draws++;
                break;
            }

            currentPlayer = currentPlayer == playerOne ? playerTwo : playerOne;
        }
    }

    private int AskForMove(Player player)
    {
        while (true)
        {
            Console.Write($"{player.Name} ({player.Symbol}), choose a space: ");
            var input = Console.ReadLine();

            if (input is null)
            {
                exitRequested = true;
                return -1;
            }

            if (!int.TryParse(input, out var position))
            {
                Console.WriteLine("Invalid input. Please enter a number from 1 to 9.");
                continue;
            }

            if (!board.IsMoveValid(position))
            {
                Console.WriteLine("That move is not allowed. Choose an open space from 1 to 9.");
                continue;
            }

            return position;
        }
    }

    private void UpdateScore(Player winner)
    {
        if (winner == playerOne)
        {
            playerOneWins++;
            return;
        }

        playerTwoWins++;
    }

    private void DisplayScoreboard()
    {
        Console.WriteLine();
        Console.WriteLine("Scoreboard");
        Console.WriteLine($"{playerOne.Name} (X): {playerOneWins}");
        Console.WriteLine($"{playerTwo.Name} (O): {playerTwoWins}");
        Console.WriteLine($"Draws: {draws}");
        Console.WriteLine();
    }

    private static bool AskReplay()
    {
        while (true)
        {
            Console.Write("Play again? (y/n): ");
            var input = Console.ReadLine()?.Trim().ToLowerInvariant();

            if (input is null)
            {
                return false;
            }

            if (input == "y" || input == "yes")
            {
                return true;
            }

            if (input == "n" || input == "no")
            {
                return false;
            }

            Console.WriteLine("Please enter y or n.");
        }
    }
}

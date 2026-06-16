namespace TicTacToe;

public class Player
{
    public Player(string name, char symbol)
    {
        Name = name;
        Symbol = symbol;
    }

    public string Name { get; }

    public char Symbol { get; }
}

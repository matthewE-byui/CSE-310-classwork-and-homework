namespace TicTacToe;

public class Board
{
    private readonly char[] cells = new char[9];

    public Board()
    {
        Reset();
    }

    public void Reset()
    {
        for (var i = 0; i < cells.Length; i++)
        {
            cells[i] = (char)('1' + i);
        }
    }

    public bool IsMoveValid(int position)
    {
        if (position < 1 || position > 9)
        {
            return false;
        }

        var index = position - 1;
        return cells[index] != 'X' && cells[index] != 'O';
    }

    public bool PlaceMark(int position, char symbol)
    {
        if (!IsMoveValid(position))
        {
            return false;
        }

        cells[position - 1] = symbol;
        return true;
    }

    public bool HasWinner()
    {
        var lines = new[]
        {
            new[] { 0, 1, 2 },
            new[] { 3, 4, 5 },
            new[] { 6, 7, 8 },
            new[] { 0, 3, 6 },
            new[] { 1, 4, 7 },
            new[] { 2, 5, 8 },
            new[] { 0, 4, 8 },
            new[] { 2, 4, 6 }
        };

        foreach (var line in lines)
        {
            var a = cells[line[0]];
            var b = cells[line[1]];
            var c = cells[line[2]];

            if (a == b && b == c)
            {
                return true;
            }
        }

        return false;
    }

    public bool IsDraw()
    {
        for (var i = 0; i < cells.Length; i++)
        {
            if (cells[i] != 'X' && cells[i] != 'O')
            {
                return false;
            }
        }

        return !HasWinner();
    }

    public void Display()
    {
        Console.WriteLine();
        Console.WriteLine($" {cells[0]} | {cells[1]} | {cells[2]} ");
        Console.WriteLine("-----------");
        Console.WriteLine($" {cells[3]} | {cells[4]} | {cells[5]} ");
        Console.WriteLine("-----------");
        Console.WriteLine($" {cells[6]} | {cells[7]} | {cells[8]} ");
        Console.WriteLine();
    }
}

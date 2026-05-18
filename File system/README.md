# Inventory Manager (Java)

This folder contains a simple console-based inventory management program written in Java.

## Video Link

- Project video: https://youtu.be/UBOM5c5A1wY

## Files in This Folder

- `Main.java`: Entry point of the program and menu-driven user interface.
- `Inventory.java`: Core inventory logic (add, remove, search, update, display, total value).
- `Item.java`: Data model for each inventory item.

## How the Program Works

The app runs in a loop and lets the user manage items from a menu:

1. Add Item
2. Remove Item
3. Search Item
4. Update Item
5. View All Items
6. Exit

At startup, the program preloads three sample items:

- Hammer
- Screwdriver Set
- Drill Bits

The loop continues until the user enters `6` to exit.

## Code Walkthrough

### `Item.java`

This class represents one inventory record.

- Fields:
  - `name` (`String`)
  - `quantity` (`int`)
  - `price` (`double`)
- Constructor:
  - `Item(String name, int quantity, double price)` initializes all fields.
- Getters:
  - `getName()`, `getQuantity()`, `getPrice()`
- Setters:
  - `setQuantity(int quantity)`, `setPrice(double price)`
- `toString()`:
  - Returns a formatted line for display, including name, quantity, and price.

### `Inventory.java`

This class stores and manages all items using:

- `private ArrayList<Item> items`

Main methods:

- `addItem(String name, int quantity, double price)`
  - Checks for duplicate names (case-insensitive).
  - If duplicate exists, prints a warning and does not add.
  - Otherwise creates a new `Item` and adds it.

- `removeItem(String name)`
  - Finds by name (case-insensitive).
  - Removes item if found, otherwise prints not found.

- `searchItem(String name)`
  - Finds by name and prints the item details if found.
  - Prints not found if missing.

- `updateItem(String name, int newQuantity, double newPrice)`
  - Finds by name and updates quantity and price.
  - Prints not found if missing.

- `displayAll()`
  - Prints a table-like list of all items.
  - Handles empty inventory message.
  - Prints total count of distinct items.

- `getTotalValue()`
  - Calculates inventory value using:
  - `sum(quantity * price)` for each item.

### `Main.java`

This class handles user input and controls program flow.

- Creates:
  - `Scanner scanner` for console input.
  - `Inventory inventory` for data operations.
- Prints welcome banner.
- Preloads sample data.
- Runs a `while` loop until exit choice `6`.
- Uses a `switch` for menu actions.

Input validation included:

- Menu choice is parsed inside `try/catch`.
- Quantity and price parsing for add/update are inside `try/catch`.
- Empty item name is blocked when adding.
- Invalid number input prints a clear message and returns to menu.

## How to Compile and Run

From this folder (`File system`), run:

```bash
javac Main.java Inventory.java Item.java
java Main
```

If your terminal is not already in this folder, navigate first and then run the commands.

## Example Usage Flow

- Start program
- Choose `1` to add a new item
- Choose `5` to view all items and total inventory value
- Choose `3` to search for an item by name
- Choose `4` to update quantity/price
- Choose `2` to remove an item
- Choose `6` to exit

## Notes

- Name comparisons use case-insensitive matching.
- Duplicate item names are prevented.
- The app stores data in memory only (no file/database persistence).

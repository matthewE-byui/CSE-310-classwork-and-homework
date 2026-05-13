import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        Inventory inventory = new Inventory();
        int choice = 0;

        System.out.println("====================================");
        System.out.println("   Welcome to Inventory Manager    ");
        System.out.println("====================================");

        // Preload some sample items
        inventory.addItem("Hammer", 15, 12.99);
        inventory.addItem("Screwdriver Set", 10, 24.99);
        inventory.addItem("Drill Bits", 50, 8.49);

        while (choice != 6) {
            printMenu();

            // Input validation for menu choice
            try {
                choice = Integer.parseInt(scanner.nextLine().trim());
            } catch (NumberFormatException e) {
                System.out.println("Invalid input. Please enter a number 1-6.");
                continue;
            }

            switch (choice) {
                case 1:
                    // Add item
                    System.out.print("Enter item name: ");
                    String addName = scanner.nextLine().trim();
                    if (addName.isEmpty()) { System.out.println("Name cannot be empty."); break; }

                    System.out.print("Enter quantity: ");
                    int addQty;
                    try { addQty = Integer.parseInt(scanner.nextLine().trim()); }
                    catch (NumberFormatException e) { System.out.println("Invalid quantity."); break; }

                    System.out.print("Enter price: ");
                    double addPrice;
                    try { addPrice = Double.parseDouble(scanner.nextLine().trim()); }
                    catch (NumberFormatException e) { System.out.println("Invalid price."); break; }

                    inventory.addItem(addName, addQty, addPrice);
                    break;

                case 2:
                    // Remove item
                    System.out.print("Enter item name to remove: ");
                    String removeName = scanner.nextLine().trim();
                    inventory.removeItem(removeName);
                    break;

                case 3:
                    // Search item
                    System.out.print("Enter item name to search: ");
                    String searchName = scanner.nextLine().trim();
                    inventory.searchItem(searchName);
                    break;

                case 4:
                    // Update item
                    System.out.print("Enter item name to update: ");
                    String updateName = scanner.nextLine().trim();

                    System.out.print("Enter new quantity: ");
                    int updateQty;
                    try { updateQty = Integer.parseInt(scanner.nextLine().trim()); }
                    catch (NumberFormatException e) { System.out.println("Invalid quantity."); break; }

                    System.out.print("Enter new price: ");
                    double updatePrice;
                    try { updatePrice = Double.parseDouble(scanner.nextLine().trim()); }
                    catch (NumberFormatException e) { System.out.println("Invalid price."); break; }

                    inventory.updateItem(updateName, updateQty, updatePrice);
                    break;

                case 5:
                    // Display all + total value
                    inventory.displayAll();
                    System.out.printf("Total Inventory Value: $%.2f%n", inventory.getTotalValue());
                    break;

                case 6:
                    System.out.println("Exiting. Goodbye!");
                    break;

                default:
                    System.out.println("Invalid choice. Please enter 1-6.");
            }

            System.out.println();
        }

        scanner.close();
    }

    static void printMenu() {
        System.out.println("--- Menu ---");
        System.out.println("1. Add Item");
        System.out.println("2. Remove Item");
        System.out.println("3. Search Item");
        System.out.println("4. Update Item");
        System.out.println("5. View All Items");
        System.out.println("6. Exit");
        System.out.print("Choice: ");
    }
}
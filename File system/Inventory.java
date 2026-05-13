import java.util.ArrayList;

public class Inventory {
    private ArrayList<Item> items;

    public Inventory() {
        items = new ArrayList<>();
    }

    // Add a new item
    public void addItem(String name, int quantity, double price) {
        // Check if item already exists
        for (Item item : items) {
            if (item.getName().equalsIgnoreCase(name)) {
                System.out.println("Item already exists. Use update to change quantity or price.");
                return;
            }
        }
        items.add(new Item(name, quantity, price));
        System.out.println("'" + name + "' added to inventory.");
    }

    // Remove an item by name
    public void removeItem(String name) {
        for (Item item : items) {
            if (item.getName().equalsIgnoreCase(name)) {
                items.remove(item);
                System.out.println("'" + name + "' removed from inventory.");
                return;
            }
        }
        System.out.println("Item '" + name + "' not found.");
    }

    // Search for an item by name
    public void searchItem(String name) {
        for (Item item : items) {
            if (item.getName().equalsIgnoreCase(name)) {
                System.out.println("Found: " + item);
                return;
            }
        }
        System.out.println("Item '" + name + "' not found.");
    }

    // Update quantity and price of an existing item
    public void updateItem(String name, int newQuantity, double newPrice) {
        for (Item item : items) {
            if (item.getName().equalsIgnoreCase(name)) {
                item.setQuantity(newQuantity);
                item.setPrice(newPrice);
                System.out.println("'" + name + "' updated.");
                return;
            }
        }
        System.out.println("Item '" + name + "' not found.");
    }

    // Display all items
    public void displayAll() {
        if (items.isEmpty()) {
            System.out.println("Inventory is empty.");
            return;
        }
        System.out.println("\n--- Current Inventory ---");
        System.out.printf("%-20s | %-10s | %s%n", "Name", "Quantity", "Price");
        System.out.println("-".repeat(45));
        for (Item item : items) {
            System.out.println(item);
        }
        System.out.println("-".repeat(45));
        System.out.println("Total items: " + items.size());
    }

    // Calculate total inventory value
    public double getTotalValue() {
        double total = 0;
        for (Item item : items) {
            total += item.getQuantity() * item.getPrice();
        }
        return total;
    }
}
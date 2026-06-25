import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Define paths
const DATA_DIR = path.join(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'inventory.json');

// Interface for Inventory Item
interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  description: string;
  category: string;
  price: number;
  quantity: number;
  minQuantity: number;
  location: string;
  createdAt: string;
  updatedAt: string;
}

// Initial seed data
const initialInventory: InventoryItem[] = [
  {
    id: "1",
    name: "MacBook Pro M3",
    sku: "LAP-MBP-M3",
    description: "Apple MacBook Pro with 14-inch display, M3 Chip, 16GB RAM, 512GB SSD.",
    category: "Electronics",
    price: 1599.99,
    quantity: 12,
    minQuantity: 5,
    location: "Aisle A - Row 1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "2",
    name: "Dell UltraSharp 27 Monitor",
    sku: "MON-DEL-27U",
    description: "27-inch 4K USB-C hub monitor, IPS panel, 60Hz, height adjustable.",
    category: "Electronics",
    price: 499.99,
    quantity: 4,
    minQuantity: 6, // Low stock
    location: "Aisle A - Row 3",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "3",
    name: "Ergonomic Office Chair",
    sku: "FUR-ERG-CHR",
    description: "High-back mesh chair with lumbar support, 3D armrests, and headrest.",
    category: "Furniture",
    price: 249.50,
    quantity: 18,
    minQuantity: 4,
    location: "Aisle C - Row 2",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "4",
    name: "Standing Desk (60x30)",
    sku: "FUR-STD-DSK",
    description: "Electric height adjustable standing desk with oak top and black frame.",
    category: "Furniture",
    price: 389.00,
    quantity: 2,
    minQuantity: 3, // Low stock
    location: "Aisle C - Row 1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "5",
    name: "Logitech MX Master 3S",
    sku: "ACC-LOG-MX3",
    description: "Wireless ergonomic mouse with 8K DPI tracking and quiet clicks.",
    category: "Accessories",
    price: 99.99,
    quantity: 35,
    minQuantity: 10,
    location: "Aisle B - Row 2",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "6",
    name: "Mechanical Keyboard",
    sku: "ACC-KBD-MECH",
    description: "Tenkeyless layout mechanical keyboard with hot-swappable tactile switches.",
    category: "Accessories",
    price: 129.99,
    quantity: 0,
    minQuantity: 5, // Out of stock
    location: "Aisle B - Row 1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "7",
    name: "Premium Gel Pens (12-pack)",
    sku: "OFF-PEN-GEL",
    description: "Fine point black ink gel pens with comfortable grip.",
    category: "Stationery",
    price: 14.99,
    quantity: 150,
    minQuantity: 20,
    location: "Aisle D - Row 4",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Helper to ensure directory and database exist
function loadDatabase(): InventoryItem[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(initialInventory, null, 2), 'utf-8');
      return initialInventory;
    }

    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading database file, returning default initial data.", error);
    return initialInventory;
  }
}

// Helper to save database
function saveDatabase(data: InventoryItem[]): boolean {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error("Error writing to database file:", error);
    return false;
  }
}

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// GET /api/stats - get summary metrics
app.get('/api/stats', (req: Request, res: Response) => {
  const items = loadDatabase();
  
  const totalItems = items.length;
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const lowStockItems = items.filter(item => item.quantity > 0 && item.quantity <= item.minQuantity);
  const outOfStockItems = items.filter(item => item.quantity === 0);
  
  // Calculate distribution by category
  const categories: Record<string, { count: number; value: number }> = {};
  items.forEach(item => {
    if (!categories[item.category]) {
      categories[item.category] = { count: 0, value: 0 };
    }
    categories[item.category].count += 1;
    categories[item.category].value += item.price * item.quantity;
  });

  res.json({
    totalItems,
    totalQuantity,
    totalValue: Math.round(totalValue * 100) / 100,
    lowStockCount: lowStockItems.length,
    outOfStockCount: outOfStockItems.length,
    categories
  });
});

// GET /api/items - list inventory items with search & filtering
app.get('/api/items', (req: Request, res: Response) => {
  let items = loadDatabase();
  const { search, category, status } = req.query;

  // Apply search filter (name, SKU, description)
  if (search) {
    const searchStr = String(search).toLowerCase();
    items = items.filter(item => 
      item.name.toLowerCase().includes(searchStr) ||
      item.sku.toLowerCase().includes(searchStr) ||
      item.description.toLowerCase().includes(searchStr) ||
      item.location.toLowerCase().includes(searchStr)
    );
  }

  // Apply category filter
  if (category && category !== 'All') {
    items = items.filter(item => item.category === category);
  }

  // Apply stock status filter
  if (status) {
    if (status === 'low') {
      items = items.filter(item => item.quantity > 0 && item.quantity <= item.minQuantity);
    } else if (status === 'out') {
      items = items.filter(item => item.quantity === 0);
    } else if (status === 'ok') {
      items = items.filter(item => item.quantity > item.minQuantity);
    }
  }

  res.json(items);
});

// GET /api/items/:id - get single inventory item
app.get('/api/items/:id', (req: Request, res: Response) => {
  const items = loadDatabase();
  const item = items.find(i => i.id === req.params.id);
  
  if (!item) {
    return res.status(404).json({ message: "Inventory item not found" });
  }
  
  res.json(item);
});

// POST /api/items - create a new inventory item
app.post('/api/items', (req: Request, res: Response) => {
  const { name, sku, description, category, price, quantity, minQuantity, location } = req.body;
  
  // Validation
  if (!name || !sku || !category || price === undefined || quantity === undefined) {
    return res.status(400).json({ message: "Missing required fields (name, sku, category, price, quantity)" });
  }

  const items = loadDatabase();

  // Check unique SKU
  if (items.some(i => i.sku.toUpperCase() === sku.toUpperCase())) {
    return res.status(400).json({ message: `SKU '${sku}' already exists` });
  }

  const newItem: InventoryItem = {
    id: Date.now().toString(),
    name,
    sku: sku.toUpperCase(),
    description: description || '',
    category,
    price: Number(price),
    quantity: Number(quantity),
    minQuantity: Number(minQuantity) || 0,
    location: location || 'Warehouse',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  items.unshift(newItem); // Add to beginning
  if (saveDatabase(items)) {
    res.status(201).json(newItem);
  } else {
    res.status(500).json({ message: "Failed to write database file" });
  }
});

// PUT /api/items/:id - update an inventory item
app.put('/api/items/:id', (req: Request, res: Response) => {
  const items = loadDatabase();
  const idx = items.findIndex(i => i.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ message: "Inventory item not found" });
  }

  const { name, sku, description, category, price, quantity, minQuantity, location } = req.body;

  // SKU conflict check
  if (sku && sku.toUpperCase() !== items[idx].sku) {
    if (items.some((i, index) => index !== idx && i.sku.toUpperCase() === sku.toUpperCase())) {
      return res.status(400).json({ message: `SKU '${sku}' already exists` });
    }
  }

  const updatedItem: InventoryItem = {
    ...items[idx],
    name: name !== undefined ? name : items[idx].name,
    sku: sku !== undefined ? sku.toUpperCase() : items[idx].sku,
    description: description !== undefined ? description : items[idx].description,
    category: category !== undefined ? category : items[idx].category,
    price: price !== undefined ? Number(price) : items[idx].price,
    quantity: quantity !== undefined ? Number(quantity) : items[idx].quantity,
    minQuantity: minQuantity !== undefined ? Number(minQuantity) : items[idx].minQuantity,
    location: location !== undefined ? location : items[idx].location,
    updatedAt: new Date().toISOString()
  };

  items[idx] = updatedItem;
  if (saveDatabase(items)) {
    res.json(updatedItem);
  } else {
    res.status(500).json({ message: "Failed to write database file" });
  }
});

// DELETE /api/items/:id - delete an inventory item
app.delete('/api/items/:id', (req: Request, res: Response) => {
  let items = loadDatabase();
  const exists = items.some(i => i.id === req.params.id);

  if (!exists) {
    return res.status(404).json({ message: "Inventory item not found" });
  }

  items = items.filter(i => i.id !== req.params.id);
  if (saveDatabase(items)) {
    res.json({ message: "Item deleted successfully" });
  } else {
    res.status(500).json({ message: "Failed to write database file" });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
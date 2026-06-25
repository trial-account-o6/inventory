import { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Search, Edit, Trash2, AlertTriangle, TrendingUp, 
  Archive, RefreshCw, Layers, MapPin, DollarSign, X, CheckCircle, Package
} from 'lucide-react';

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

interface CategoryStats {
  count: number;
  value: number;
}

interface DashboardStats {
  totalItems: number;
  totalQuantity: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  categories: Record<string, CategoryStats>;
}

export default function App() {
  // State variables
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and Filter state
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    category: 'Electronics',
    price: '',
    quantity: '',
    minQuantity: '',
    location: ''
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch functions
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error('Failed to fetch statistics');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
      setError('Could not connect to backend server. Make sure the API is running.');
    }
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (categoryFilter !== 'All') queryParams.append('category', categoryFilter);
      if (statusFilter !== 'all') queryParams.append('status', statusFilter);

      const res = await fetch(`/api/items?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch inventory items');
      const data = await res.json();
      setItems(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Could not fetch items. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, statusFilter]);

  // Combined refresh
  const handleRefresh = useCallback(() => {
    fetchStats();
    fetchItems();
  }, [fetchStats, fetchItems]);

  // Initial load and filter effect
  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  // Handle Delete
  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" from inventory?`)) return;

    try {
      const res = await fetch(`/api/items/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to delete item');
      }
      handleRefresh();
    } catch (err: any) {
      alert(`Error deleting item: ${err.message}`);
    }
  };

  // Open modal for Create
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      sku: '',
      description: '',
      category: 'Electronics',
      price: '',
      quantity: '',
      minQuantity: '5',
      location: 'Aisle A'
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      sku: item.sku,
      description: item.description,
      category: item.category,
      price: item.price.toString(),
      quantity: item.quantity.toString(),
      minQuantity: item.minQuantity.toString(),
      location: item.location
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Handle submit form
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const { name, sku, description, category, price, quantity, minQuantity, location } = formData;
    if (!name || !sku || !category || price === '' || quantity === '') {
      setFormError('Please fill out all required fields.');
      return;
    }

    const payload = {
      name,
      sku,
      description,
      category,
      price: parseFloat(price),
      quantity: parseInt(quantity),
      minQuantity: parseInt(minQuantity) || 0,
      location
    };

    try {
      const url = editingItem ? `/api/items/${editingItem.id}` : '/api/items';
      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Operation failed');
      }

      setIsModalOpen(false);
      handleRefresh();
    } catch (err: any) {
      setFormError(err.message || 'Something went wrong.');
    }
  };

  // Predefined Categories
  const categories = ['Electronics', 'Furniture', 'Accessories', 'Stationery', 'Apparel', 'Other'];

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="brand-section">
          <div className="brand-icon">
            <Package size={28} color="#ffffff" />
          </div>
          <div className="brand-title">
            <h1>Stellar Inventory</h1>
            <p>Premium Real-time Stock Management</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={handleRefresh} title="Refresh Dashboard">
            <RefreshCw size={16} className={loading ? 'spinner' : ''} />
            Refresh
          </button>
          <button className="btn btn-primary" onClick={handleOpenAddModal}>
            <Plus size={18} />
            Add Stock Item
          </button>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div style={{
          backgroundColor: 'var(--danger-glow)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#f87171',
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle size={20} />
            <span>{error}</span>
          </div>
          <button onClick={handleRefresh} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
            Try Again
          </button>
        </div>
      )}

      {/* Stats Section */}
      <section className="stats-grid animate-fade-in">
        {/* Total Items Widget */}
        <div className="glass-card stat-widget">
          <div className="stat-info">
            <h3>Total Unique Items</h3>
            <div className="stat-value">{stats ? stats.totalItems : '—'}</div>
          </div>
          <div className="stat-icon-wrapper primary">
            <Layers size={24} />
          </div>
        </div>

        {/* Stock Value Widget */}
        <div className="glass-card stat-widget">
          <div className="stat-info">
            <h3>Stock Valuation</h3>
            <div className="stat-value">
              {stats ? `$${stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
            </div>
          </div>
          <div className="stat-icon-wrapper secondary">
            <TrendingUp size={24} />
          </div>
        </div>

        {/* Low Stock Widget */}
        <div className="glass-card stat-widget">
          <div className="stat-info">
            <h3>Low Stock Alerts</h3>
            <div className="stat-value" style={{ color: stats && stats.lowStockCount > 0 ? 'var(--warning)' : 'inherit' }}>
              {stats ? stats.lowStockCount : '—'}
            </div>
          </div>
          <div className="stat-icon-wrapper warning">
            <AlertTriangle size={24} />
          </div>
        </div>

        {/* Out of Stock Widget */}
        <div className="glass-card stat-widget">
          <div className="stat-info">
            <h3>Out of Stock</h3>
            <div className="stat-value" style={{ color: stats && stats.outOfStockCount > 0 ? 'var(--danger)' : 'inherit' }}>
              {stats ? stats.outOfStockCount : '—'}
            </div>
          </div>
          <div className="stat-icon-wrapper danger">
            <Archive size={24} />
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <main className="main-grid">
        {/* Left Side: Table & Search */}
        <section className="glass-card animate-fade-in" style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Controls Bar */}
          <div className="controls-bar">
            <div className="search-wrapper">
              <Search size={18} className="search-icon" />
              <input 
                type="text" 
                placeholder="Search by SKU, item name, location..." 
                className="search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div className="filter-group">
              <select 
                className="select-input"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="All">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select 
                className="select-input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="ok">Healthy Stock</option>
                <option value="low">Low Stock</option>
                <option value="out">Out of Stock</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="loading-spinner">
              <RefreshCw size={36} className="spinner" />
            </div>
          ) : items.length === 0 ? (
            <div className="empty-state">
              <Package size={48} />
              <h3>No items found</h3>
              <p>Try modifying your search query or filters, or add a new stock item.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Item Details</th>
                    <th>SKU</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Qty</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => {
                    let statusBadge = <span className="badge badge-in-stock"><CheckCircle size={12} style={{marginRight: 4}}/> OK</span>;
                    if (item.quantity === 0) {
                      statusBadge = <span className="badge badge-out-of-stock"><Archive size={12} style={{marginRight: 4}}/> Out of Stock</span>;
                    } else if (item.quantity <= item.minQuantity) {
                      statusBadge = <span className="badge badge-low-stock"><AlertTriangle size={12} style={{marginRight: 4}}/> Low Stock</span>;
                    }

                    return (
                      <tr key={item.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'white' }}>{item.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: 280, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {item.description || 'No description provided'}
                          </div>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.85rem' }}>{item.sku}</td>
                        <td>
                          <span className="badge category-badge">{item.category}</span>
                        </td>
                        <td style={{ fontWeight: 500 }}>${item.price.toFixed(2)}</td>
                        <td style={{ fontWeight: 600 }}>{item.quantity}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            <MapPin size={12} />
                            {item.location}
                          </div>
                        </td>
                        <td>{statusBadge}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button 
                              className="btn-icon-only edit" 
                              onClick={() => handleOpenEditModal(item)}
                              title="Edit Item"
                            >
                              <Edit size={14} />
                            </button>
                            <button 
                              className="btn-icon-only delete" 
                              onClick={() => handleDelete(item.id, item.name)}
                              title="Delete Item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Right Side: Category Summary sidebar */}
        <aside className="sidebar-section">
          <div className="glass-card category-card">
            <h3>Inventory by Category</h3>
            <ul className="category-list">
              {stats && stats.categories && Object.keys(stats.categories).length > 0 ? (
                Object.entries(stats.categories).map(([catName, data]) => (
                  <li key={catName} className="category-item">
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span className="category-name">{catName}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Value: <span className="category-value">${data.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </span>
                    </div>
                    <span className="category-count">{data.count} items</span>
                  </li>
                ))
              ) : (
                <li style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No inventory categorized yet.</li>
              )}
            </ul>
          </div>

          <div className="glass-card category-card" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <h3 style={{ fontSize: '0.95rem' }}>Warehouse Insights</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <MapPin size={16} color="var(--secondary)" style={{ flexShrink: 0 }} />
                <span>Default storage bins are structured by aisle A-D. Always label storage tags on receipt.</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <AlertTriangle size={16} color="var(--warning)" style={{ flexShrink: 0 }} />
                <span>Low stock flags are triggered automatically when quantity drops below the safety threshold.</span>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* CRUD Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <header className="modal-header">
              <h2>{editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}</h2>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </header>

            <form onSubmit={handleFormSubmit}>
              <div className="modal-body">
                {formError && (
                  <div style={{
                    backgroundColor: 'var(--danger-glow)',
                    color: '#f87171',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '1rem',
                    fontSize: '0.85rem',
                    border: '1px solid rgba(239, 68, 68, 0.2)'
                  }}>
                    {formError}
                  </div>
                )}

                <div className="form-grid">
                  <div className="form-group full-width">
                    <label className="form-label">Item Name *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Dell PowerEdge Server" 
                      className="form-input"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">SKU *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. SRV-DEL-PE" 
                      className="form-input"
                      disabled={editingItem !== null} // Lock SKU on edit
                      value={formData.sku}
                      onChange={(e) => setFormData({...formData, sku: e.target.value})}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Category *</label>
                    <select 
                      className="form-input"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                    >
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Price ($) *</label>
                    <input 
                      type="number" 
                      required
                      step="0.01"
                      min="0"
                      placeholder="0.00" 
                      className="form-input"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Quantity *</label>
                    <input 
                      type="number" 
                      required
                      min="0"
                      placeholder="0" 
                      className="form-input"
                      value={formData.quantity}
                      onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Min Safety Qty</label>
                    <input 
                      type="number" 
                      min="0"
                      placeholder="5" 
                      className="form-input"
                      value={formData.minQuantity}
                      onChange={(e) => setFormData({...formData, minQuantity: e.target.value})}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Warehouse Location</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Aisle B - Row 4" 
                      className="form-input"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label className="form-label">Description</label>
                    <textarea 
                      placeholder="Provide specifications, usage details or condition..." 
                      className="form-textarea"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <footer className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingItem ? 'Save Changes' : 'Create Item'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

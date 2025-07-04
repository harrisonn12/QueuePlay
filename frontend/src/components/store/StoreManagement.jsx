import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/core/useAuth';
import './StoreManagement.css';

export const OfferType = {
  BOGO: 'bogo',
  DISCOUNT: 'discount',
  FREE: 'free',
};

const getDefaultExpiration = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(23, 59, 0, 0);
  return tomorrow.toISOString().slice(0, 16);
};

const StoreManagement = ({ storeId = 1 }) => {
    const { token } = useAuth();
    const [offers, setOffers] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingOffer, setEditingOffer] = useState(null);
    const [showAddProduct, setShowAddProduct] = useState(false);
    const [showProductManager, setShowProductManager] = useState(false);
    const [newProductName, setNewProductName] = useState('');
    const [newProductDescription, setNewProductDescription] = useState('');
    const [formData, setFormData] = useState({
        offerType: 'discount',
        value: '',
        count: 1,
        productId: '',
        expirationDate: ''
    });
    const [validationErrors, setValidationErrors] = useState([]);

    useEffect(() => {
        fetchOffers();
        fetchProducts();
    }, [storeId]);

    const fetchOffers = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/getStoreOffers/${storeId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setOffers(data.offers || []);
            } else {
                console.error('Failed to fetch offers');
            }
        } catch (error) {
            console.error('Error fetching offers:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const response = await fetch(`/api/getStoreProducts/${storeId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setProducts(data.products || []);
            } else {
                console.error('Failed to fetch products');
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const handleAddProduct = async () => {
        if (!newProductName.trim()) return;
        
        try {
            const response = await fetch('/api/createProduct', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    storeId,
                    name: newProductName,
                    description: newProductDescription
                })
            });

            if (response.ok) {
                const data = await response.json();
                setProducts([...products, data.product]);
                setNewProductName('');
                setNewProductDescription('');
                setShowAddProduct(false);
                
                // Auto-select the new product
                setFormData(prev => ({
                    ...prev,
                    productId: data.product.id
                }));
            } else {
                console.error('Failed to create product');
                alert('Failed to create product');
            }
        } catch (error) {
            console.error('Error adding product:', error);
            alert('Failed to create product');
        }
    };

    const handleDeactivateProduct = async (productId) => {
        if (!confirm('Are you sure you want to deactivate this product? It will no longer be available for new offers.')) return;
        
        try {
            const response = await fetch('/api/deactivateProduct', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    productId,
                    storeId
                })
            });

            if (response.ok) {
                console.log('Product deactivated successfully');
                await fetchProducts(); // Refresh the list
                
                // If the deactivated product was selected in the form, clear it
                if (formData.productId === productId) {
                    setFormData(prev => ({
                        ...prev,
                        productId: ''
                    }));
                }
            } else {
                console.error('Failed to deactivate product');
                alert('Failed to deactivate product');
            }
        } catch (error) {
            console.error('Error deactivating product:', error);
            alert('Failed to deactivate product');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        const updatedFormData = {
            ...formData,
            [name]: name === 'count' ? parseInt(value) || 0 : 
                    name === 'productId' ? (value === '' ? '' : parseInt(value)) :
                    value
        };
        
        // Clear value field for bogo and free offers
        if (name === 'offerType' && (value === 'bogo' || value === 'free')) {
            updatedFormData.value = '';
        }
        
        setFormData(updatedFormData);
        setValidationErrors([]); // Clear validation errors on input change
    };

    const validateForm = async () => {
        try {
            const response = await fetch('/api/validateOfferData', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    storeId,
                    ...formData,
                    expirationDate: new Date(formData.expirationDate).toISOString()
                })
            });

            const result = await response.json();
            setValidationErrors(result.errors || []);
            return result.valid;
        } catch (error) {
            console.error('Validation error:', error);
            setValidationErrors(['Validation failed. Please check your input.']);
            return false;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const isValid = await validateForm();
        
        if (!isValid) return;

        try {
            const url = editingOffer ? '/api/updateOffer' : '/api/createOffer';
            const method = editingOffer ? 'PUT' : 'POST';

            const payload = {
                storeId,
                ...formData,
                expirationDate: new Date(formData.expirationDate).toISOString()
            };
            
            if (editingOffer) {
                payload.offerId = editingOffer.id;
            }

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                await fetchOffers(); // Refresh the list
                resetForm();
            } else {
                const errorData = await response.json();
                setValidationErrors([errorData.detail || 'Failed to save offer']);
            }
        } catch (error) {
            console.error('Error saving offer:', error);
            setValidationErrors(['Failed to save offer. Please try again.']);
        }
    };

    const handleEdit = (offer) => {
        const formattedDate = new Date(offer.expirationDate).toISOString().slice(0, 16);
        setEditingOffer(offer);
        setFormData({
            offerType: offer.offerType,
            value: offer.value,
            count: offer.count,
            productId: offer.productId,
            expirationDate: formattedDate
        });
        setShowCreateForm(true);
        setValidationErrors([]);
    };

    const handleDelete = async (offerId) => {
        if (!confirm('Are you sure you want to delete this offer?')) return;

        try {
            const payload = { offerId, storeId };
            console.log('Sending delete request:', payload);

            const response = await fetch('/api/deleteOffer', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    offerId,
                    storeId
                })
            });

            if (response.ok) {
                console.log('Offer deleted successfully');
                await fetchOffers(); // Refresh the list
            } else {
                console.error('Delete failed:', result);
                alert('Failed to delete offer');
            }
        } catch (error) {
            console.error('Error deleting offer:', error);
            alert('Failed to delete offer');
        }
    };

    const resetForm = () => {
        setFormData({
            offerType: 'discount',
            value: '',
            count: 1,
            productId: '',
            expirationDate: ''
        });
        setEditingOffer(null);
        setShowCreateForm(false);
        setValidationErrors([]);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    if (loading) {
        return <div className="store-management loading">Loading store offers...</div>;
    }

    return (
        <div className="store-management">
            <div className="store-management-header">
                <h2>Store Offer Management</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                        className="btn btn-secondary"
                        onClick={() => setShowProductManager(true)}
                    >
                        Manage Products
                    </button>
                    <button 
                        className="btn btn-primary"
                        onClick={() => {
                            setShowCreateForm(true);
                        }}
                    >
                        Create New Offer
                    </button>
                </div>
            </div>

            {showCreateForm && (
                <div className="offer-form-overlay">
                    <div className="offer-form-container">
                        <h3>{editingOffer ? 'Edit Offer' : 'Create New Offer'}</h3>
                        
                        {validationErrors.length > 0 && (
                            <div className="validation-errors">
                                <h4>Please fix the following errors:</h4>
                                <ul>
                                    {validationErrors.map((error, index) => (
                                        <li key={index}>{error}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="offer-form">
                            <div className="form-group">
                                <label htmlFor="offerType">Offer Type</label>
                                <select
                                    id="offerType"
                                    name="offerType"
                                    value={formData.offerType}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value={OfferType.DISCOUNT}>Discount</option>
                                    <option value={OfferType.BOGO}>Buy One Get One</option>
                                    <option value={OfferType.FREE}>Free Item</option>
                                </select>
                            </div>

                            {formData.offerType === 'discount' && (
                                <div className="form-group">
                                    <label htmlFor="value">Offer Value</label>
                                    <input
                                        type="text"
                                        id="value"
                                        name="value"
                                        value={formData.value}
                                        onChange={handleInputChange}
                                        placeholder="e.g., '20% OFF', '15% OFF All Items'"
                                        required
                                    />
                                </div>
                            )}

                            <div className="form-group">
                                <label htmlFor="count">Weight (Selection Probability)</label>
                                <input
                                    type="number"
                                    id="count"
                                    name="count"
                                    value={formData.count}
                                    onChange={handleInputChange}
                                    min="1"
                                    max="10000"
                                    required
                                />
                                <small>Higher numbers = more likely to be selected</small>
                            </div>

                            <div className="form-group">
                                <label htmlFor="productId">Product</label>
                                <div className="product-selection">
                                    <select
                                        id="productId"
                                        name="productId"
                                        value={formData.productId}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="">Select a product</option>
                                        {products
                                            .sort((a, b) => a.name.localeCompare(b.name))
                                            .map(product => (
                                                <option key={product.id} value={product.id}>
                                                    {product.name}{product.description ? ` - ${product.description}` : ''}
                                                </option>
                                            ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddProduct(true)}
                                        className="btn btn-secondary btn-sm"
                                        style={{ marginLeft: '10px' }}
                                    >
                                        Add New Product
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="expirationDate">Expiration Date</label>
                                <input
                                    type="datetime-local"
                                    id="expirationDate"
                                    name="expirationDate"
                                    value={formData.expirationDate}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            <div className="form-actions">
                                <button type="button" onClick={resetForm} className="btn btn-secondary">
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingOffer ? 'Update Offer' : 'Create Offer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showAddProduct && (
                <div className="offer-form-overlay">
                    <div className="offer-form-container">
                        <h3>Add New Product</h3>
                        <form onSubmit={(e) => { e.preventDefault(); handleAddProduct(); }} className="offer-form">
                            <div className="form-group">
                                <label htmlFor="newProductName">Product Name</label>
                                <input
                                    type="text"
                                    id="newProductName"
                                    value={newProductName}
                                    onChange={(e) => setNewProductName(e.target.value)}
                                    placeholder="Enter product name"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="newProductDescription">Description (Optional)</label>
                                <textarea
                                    id="newProductDescription"
                                    value={newProductDescription}
                                    onChange={(e) => setNewProductDescription(e.target.value)}
                                    placeholder="Enter product description"
                                    rows="3"
                                />
                            </div>
                            <div className="form-actions">
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        setShowAddProduct(false);
                                        setNewProductName('');
                                        setNewProductDescription('');
                                    }}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Add Product
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Product Manager Modal */}
            {showProductManager && (
                <div className="offer-form-overlay">
                    <div className="offer-form-container">
                        <h3>Manage Products</h3>
                        <div className="products-list">
                            {products.length === 0 ? (
                                <p>No products found.</p>
                            ) : (
                                <div className="products-grid">
                                    {products
                                        .sort((a, b) => a.name.localeCompare(b.name))
                                        .map(product => (
                                            <div key={product.id} className="product-card">
                                                <div className="product-header">
                                                    <h4>{product.name}</h4>
                                                    <button
                                                        onClick={() => handleDeactivateProduct(product.id)}
                                                        className="btn-icon delete"
                                                        title="Deactivate product"
                                                    >
                                                        🚫
                                                    </button>
                                                </div>
                                                {product.description && (
                                                    <p className="product-description">{product.description}</p>
                                                )}
                                                <p className="product-id">Product ID: {product.id}</p>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                        <div className="form-actions">
                            <button 
                                type="button" 
                                onClick={() => setShowProductManager(false)}
                                className="btn btn-secondary"
                            >
                                Close
                            </button>
                            <button 
                                type="button" 
                                onClick={() => {
                                    setShowProductManager(false);
                                    setShowAddProduct(true);
                                }}
                                className="btn btn-primary"
                            >
                                Add New Product
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="offers-list">
                <h3>Current Offers ({offers.length})</h3>
                {offers.length === 0 ? (
                    <p className="no-offers">No offers created yet. Create your first offer to get started!</p>
                ) : (
                    <div className="offers-grid">
                        {offers.map(offer => (
                            <div key={offer.id} className="offer-card">
                                <div className="offer-header">
                                    <span className={`offer-type ${offer.offerType.toLowerCase()}`}>
                                        {offer.offerType}
                                    </span>
                                    <div className="offer-actions">
                                        <button 
                                            onClick={() => handleEdit(offer)}
                                            className="btn-icon edit"
                                            title="Edit offer"
                                        >
                                            ✏️
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(offer.id)}
                                            className="btn-icon delete"
                                            title="Delete offer"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                                <div className="offer-content">
                            <h4>{offer.value}</h4>
                            <p>
                                <strong>Product:</strong>{' '}
                                {(() => {
                                const product = products.find(p => p.id === offer.productId);
                                return product ? (product.description || product.name) : 'Unknown product';
                                })()}
                            </p>
                            <p><strong>Weight:</strong> {offer.count}</p>
                            <p><strong>Expires:</strong> {formatDate(offer.expirationDate)}</p>
                            {offer.createdAt && (
                                <p className="created-date">
                                Created: {formatDate(offer.createdAt)}
                                </p>
                            )}
                            </div>

                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StoreManagement;
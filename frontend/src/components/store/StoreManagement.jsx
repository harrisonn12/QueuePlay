import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/core/useAuth';
import './StoreManagement.css';

export const OfferType = {
  BOGO: 'bogo',
  DISCOUNT: 'discount',
  FREE: 'free',
};

const StoreManagement = ({ storeId = 1 }) => {
    const { token } = useAuth();
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingOffer, setEditingOffer] = useState(null);
    const [formData, setFormData] = useState({
        offerType: 'discount',
        value: '',
        count: 1,
        productId: 1,
        expirationDate: ''
    });
    const [validationErrors, setValidationErrors] = useState([]);

    useEffect(() => {
        fetchOffers();
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

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        const updatedFormData = {
            ...formData,
            [name]: name === 'count' || name === 'productId' ? parseInt(value) || 0 : value
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
        setEditingOffer(offer);
        setFormData({
            offerType: offer.offerType,
            value: offer.value,
            count: offer.count,
            productId: offer.productId,
            expirationDate: offer.expirationDate
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
            productId: 1,
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
                <button 
                    className="btn btn-primary"
                    onClick={() => setShowCreateForm(true)}
                >
                    Create New Offer
                </button>
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
                                <label htmlFor="productId">Product ID</label>
                                <input
                                    type="number"
                                    id="productId"
                                    name="productId"
                                    value={formData.productId}
                                    onChange={handleInputChange}
                                    min="1"
                                    required
                                />
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
                                    <p><strong>Product ID:</strong> {offer.productId}</p>
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
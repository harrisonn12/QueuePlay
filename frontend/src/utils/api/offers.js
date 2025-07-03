import { authenticatedApiRequest } from './auth';

export const offerAPI = {
    // Create a new offer
    async createOffer(offerData, token) {
        return await authenticatedApiRequest('/createOffer', {
            method: 'POST',
            body: JSON.stringify(offerData)
        }, token);
    },

    // Get all offers for a store
    async getStoreOffers(storeId, token) {
        return await authenticatedApiRequest(`/getStoreOffers/${storeId}`, {
            method: 'GET'
        }, token);
    },

    // Update an existing offer
    async updateOffer(offerData, token) {
        return await authenticatedApiRequest('/updateOffer', {
            method: 'PUT',
            body: JSON.stringify(offerData)
        }, token);
    },

    // Delete an offer
    async deleteOffer(offerId, storeId, token) {
        return await authenticatedApiRequest('/deleteOffer', {
            method: 'DELETE',
            body: JSON.stringify({ offerId, storeId })
        }, token);
    },

    // Validate offer data
    async validateOfferData(offerData, token) {
        return await authenticatedApiRequest('/validateOfferData', {
            method: 'POST',
            body: JSON.stringify(offerData)
        }, token);
    }
};
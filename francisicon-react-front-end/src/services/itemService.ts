import api from './api';

export interface Item {
    ItemId: number;
    Name: string;
    Code: string;
    Price: number;
    ChurchId: number;
    IsRefType: boolean;
    DocType: string;
}

export interface CreateItemRequest {
    name: string;
    code: string;
    price: number;
    isRefType?: boolean;
    docType?: string;
}

export const itemService = {
    /**
     * List all items with cache-busting
     */
    listItems: async (category?: string, bypassCache: boolean = false): Promise<Item[]> => {
        const params: any = category ? { category } : {};
        if (bypassCache) {
            params._t = Date.now(); // Cache-busting timestamp
            params.bypassCache = true;
        }

        const response = await api.get('/api/items', {
            params,
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
        // Handle both { success, data } and direct array
        return response.data.data || response.data;
    },

    /**
     * Get item by ID with cache-busting
     */
    getItem: async (id: number, bypassCache: boolean = false): Promise<Item> => {
        const params: any = {};
        if (bypassCache) {
            params._t = Date.now(); // Cache-busting timestamp
            params.bypassCache = true;
        }

        const response = await api.get(`/api/items/${id}`, {
            params,
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
        return response.data.data || response.data;
    },

    /**
     * Create a new item
     */
    createItem: async (item: CreateItemRequest): Promise<Item> => {
        const response = await api.post('/api/items', item, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
        return response.data.data || response.data;
    },

    /**
     * Update an existing item
     */
    updateItem: async (id: number, item: Partial<CreateItemRequest>): Promise<Item> => {
        const response = await api.put(`/api/items/${id}`, item, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
        return response.data.data || response.data;
    },

    /**
     * Delete an item
     */
    deleteItem: async (id: number): Promise<void> => {
        await api.delete(`/api/items/${id}`, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
    },

    /**
     * Get categories
     */
    getCategories: async (): Promise<string[]> => {
        const response = await api.get('/api/items/categories');
        return response.data.data || response.data;
    }
};

export default itemService;

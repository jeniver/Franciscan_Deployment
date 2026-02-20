import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import {
    Search,
    Plus,
    Edit2,
    Trash2,
    DollarSign,
    Tag,
    Package,
    Filter,
    X,
    Check,
    Loader2,
    AlertCircle,
    ChevronRight,
    RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { itemService, Item } from '../services/itemService';
import { useToast } from '../contexts/ToastContext';

export default function PricingManagementPage() {
    const { showSuccess, showError } = useToast();
    const [items, setItems] = useState<Item[]>([]);
    const [filteredItems, setFilteredItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [categories, setCategories] = useState<string[]>(['All']);

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Item | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        price: 0,
        docType: 'OTHERS',
        isRefType: true
    });

    const fetchItems = useCallback(async (category?: string, forceRefresh: boolean = false) => {
        setLoading(true);
        try {
            const apiCategory = category === 'All' ? undefined : category;
            const data = await itemService.listItems(apiCategory, forceRefresh);
            console.log(`[Pricing] Fetched ${data?.length || 0} items (filter: ${category}, force: ${forceRefresh})`, data);
            setItems(data || []);
            setFilteredItems(data || []);

            // Initialize categories if not already done
            if (categories.length <= 1) {
                const cats = await itemService.getCategories();
                if (cats && cats.length > 0) {
                    setCategories(['All', ...cats]);
                }
            }
        } catch (error: any) {
            showError('Error', 'Failed to load items');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [showError, categories.length]);

    useEffect(() => {
        fetchItems(categoryFilter);
    }, [categoryFilter]); // Re-fetch when category changes

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    useEffect(() => {
        let result = [...(items || [])]; // Create a copy to sort

        // 1. Filter
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(item =>
                (item.Name || '').toLowerCase().includes(lower) ||
                (item.Code || '').toLowerCase().includes(lower) ||
                (item.DocType || '').toLowerCase().includes(lower)
            );
        }

        // 2. Sort (Newest First by ItemId)
        result.sort((a, b) => (b.ItemId || 0) - (a.ItemId || 0));

        setFilteredItems(result);
        setCurrentPage(1); // Reset to page 1 on filter change
    }, [searchTerm, items]);

    // Calculate pagination
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

    const handlePageChange = (pageNumber: number) => {
        setCurrentPage(pageNumber);
    };

    const handleOpenModal = (item: Item | null = null) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                name: item.Name,
                code: item.Code,
                price: item.Price,
                docType: item.DocType,
                isRefType: item.IsRefType
            });
        } else {
            setEditingItem(null);
            setFormData({
                name: '',
                code: '',
                price: 0,
                docType: 'OTHERS',
                isRefType: true
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingItem(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingItem) {
                await itemService.updateItem(editingItem.ItemId, formData);
                showSuccess('Success', 'Item updated successfully');
            } else {
                await itemService.createItem(formData);
                showSuccess('Success', 'Item created successfully');
            }
            handleCloseModal();
            // Clear search and reset category to ensure the new/updated item is visible
            setSearchTerm('');
            setCategoryFilter('All');

            // Wait a bit for DB propagation
            setTimeout(() => {
                console.log('[Pricing] Refreshing table after save...');
                // Force refresh to ensure updated data is shown
                fetchItems('All', true);
            }, 500);
        } catch (error: any) {
            showError('Error', error.response?.data?.message || 'Failed to save item');
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            try {
                await itemService.deleteItem(id);
                showSuccess('Success', 'Item deleted successfully');
                // Clear search and reset category to ensure table is fresh
                setSearchTerm('');
                setCategoryFilter('All');

                // Wait a bit for DB propagation
                setTimeout(() => {
                    console.log('[Pricing] Refreshing table after delete...');
                    // Force refresh to ensure updated data is shown
                    fetchItems('All', true);
                }, 500);
            } catch (error: any) {
                showError('Error', 'Failed to delete item');
            }
        }
    };

    return (
        <Layout title="Pricing & Items Management">
            <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-8">
                {/* Standardized Header */}
                <div className="bg-white border-b border-gray-200 sticky top-0 z-40 -mx-4 lg:-mx-8 px-6 py-4 mb-8">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                                <Package className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 leading-tight">Pricing Catalog</h2>
                                <p className="text-sm text-gray-500 font-medium">Manage church service items and pricing</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search by name, code..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64 transition-all"
                                />
                            </div>

                            <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-200">
                                <Filter className="w-4 h-4 text-gray-400 ml-2" />
                                <select
                                    value={categoryFilter}
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                    className="bg-transparent text-sm font-bold text-gray-700 outline-none py-1 px-2 border-none focus:ring-0"
                                >
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => fetchItems(categoryFilter, true)}
                                    className="p-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all active:scale-95"
                                    title="Refresh Data"
                                >
                                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                </button>
                                <button
                                    onClick={() => handleOpenModal()}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-md transition-all active:scale-95"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add New Item
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {[
                        { label: 'Total Items', value: items.length, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
                        { label: 'Active Categories', value: categories.length - 1, icon: Tag, color: 'text-purple-600', bg: 'bg-purple-50' },
                        { label: 'Avg Price', value: `$${(items.reduce((s, i) => s + i.Price, 0) / (items.length || 1)).toFixed(2)}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
                    ].map((stat, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4"
                        >
                            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{stat.label}</p>
                                <p className="text-2xl font-black text-gray-900">{stat.value}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Items Table */}
                <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-6 py-5 text-sm font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">Item Name</th>
                                    <th className="px-6 py-5 text-sm font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">Code</th>
                                    <th className="px-6 py-5 text-sm font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">Category</th>
                                    <th className="px-6 py-5 text-sm font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 text-right">Price</th>
                                    <th className="px-6 py-5 text-sm font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence mode='popLayout'>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="py-20 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                                                    <p className="font-bold text-gray-400">Fetching pricing data...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-20 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <AlertCircle className="w-12 h-12 text-gray-300" />
                                                    <p className="font-bold text-gray-400">No items found matching your search</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : currentItems.map((item) => (
                                        <motion.tr
                                            key={item.ItemId}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="group hover:bg-indigo-50/30 transition-all duration-200"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900 group-hover:text-indigo-700 transition-colors uppercase">{item.Name || 'N/A'}</div>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-sm text-gray-500">{item.Code || 'N/A'}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest 
                          ${item.DocType === 'NAPP' ? 'bg-blue-100 text-blue-700' :
                                                        item.DocType === 'INCR' ? 'bg-orange-100 text-orange-700' :
                                                            item.DocType === 'GOLA' ? 'bg-emerald-100 text-emerald-700' :
                                                                item.DocType === 'URN' ? 'bg-purple-100 text-purple-700' :
                                                                    item.DocType === 'WAPP' ? 'bg-rose-100 text-rose-700' :
                                                                        item.DocType === 'OTHERS' ? 'bg-indigo-100 text-indigo-700' :
                                                                            'bg-gray-100 text-gray-700'}`}>
                                                    {item.DocType || 'OTHERS'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="font-black text-gray-900">${(item.Price || 0).toFixed(2)}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => handleOpenModal(item)}
                                                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-lg shadow-none hover:shadow-sm border border-transparent hover:border-indigo-100 transition-all"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.ItemId)}
                                                        className="p-2 text-gray-400 hover:text-rose-600 hover:bg-white rounded-lg shadow-none hover:shadow-sm border border-transparent hover:border-rose-100 transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {!loading && filteredItems.length > 0 && (
                        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                            <div className="text-sm text-gray-500 font-medium">
                                Showing <span className="font-bold text-gray-900">{indexOfFirstItem + 1}</span> to <span className="font-bold text-gray-900">{Math.min(indexOfLastItem, filteredItems.length)}</span> of <span className="font-bold text-gray-900">{filteredItems.length}</span> items
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    <ChevronRight className="w-4 h-4 rotate-180" />
                                </button>

                                <span className="text-sm font-bold text-gray-700 bg-white px-3 py-1 rounded-lg border border-gray-200 shadow-sm">
                                    Page {currentPage} of {totalPages}
                                </span>

                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Overlay */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleCloseModal}
                            className="fixed inset-0 bg-[#0F172ACC]/80 backdrop-blur-md"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden"
                        >
                            <div className="p-8">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-2xl font-black text-gray-900">
                                        {editingItem ? 'Edit Item Details' : 'Add New Service Item'}
                                    </h2>
                                    <button
                                        onClick={handleCloseModal}
                                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-all"
                                    >
                                        <X className="w-5 h-5 text-gray-500" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 uppercase tracking-wide px-1">Item Name</label>
                                        <input
                                            required
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl font-bold transition-all"
                                            placeholder="e.g. Level 1 Niche"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-700 uppercase tracking-wide px-1">Code</label>
                                            <input
                                                required
                                                type="text"
                                                value={formData.code}
                                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                                className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl font-bold transition-all"
                                                placeholder="e.01"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-gray-700 uppercase tracking-wide px-1">Price ($)</label>
                                            <div className="relative">
                                                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    required
                                                    type="number"
                                                    step="0.01"
                                                    value={formData.price}
                                                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                                    className="w-full pl-10 pr-5 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl font-bold transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 uppercase tracking-wide px-1">Application Type (DocType)</label>
                                        <select
                                            value={formData.docType}
                                            onChange={(e) => setFormData({ ...formData, docType: e.target.value })}
                                            className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl font-bold transition-all appearance-none"
                                        >
                                            {categories.filter(c => c !== 'All').map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                                        <input
                                            type="checkbox"
                                            id="isRefType"
                                            checked={formData.isRefType}
                                            onChange={(e) => setFormData({ ...formData, isRefType: e.target.checked })}
                                            className="w-5 h-5 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <label htmlFor="isRefType" className="font-bold text-indigo-700 cursor-pointer">
                                            Reference Document Required
                                            <p className="text-[10px] font-medium text-indigo-400 uppercase mt-0.5">Determines if this item is tied to a specific application form</p>
                                        </label>
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <button
                                            type="button"
                                            onClick={handleCloseModal}
                                            className="flex-1 py-4 font-black text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-[20px] transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 py-4 font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-[20px] shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Check className="w-5 h-5" />
                                            {editingItem ? 'Update Item' : 'Create Item'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </Layout>
    );
}

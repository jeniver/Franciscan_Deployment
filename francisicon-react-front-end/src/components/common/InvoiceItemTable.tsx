import React, { useMemo } from 'react';
import { PlusIcon, Trash2Icon } from 'lucide-react';

export interface InvoiceItem {
    id: string;
    selectItem: string;
    reference: string;
    defaultAmount: number;
    amountPaying: number;
    quantity: number;
    totalNoTax: number;
    taxPercent: number;
    taxAmount: number;
    totalAmount: number;
}

interface InvoiceItemTableProps {
    items: InvoiceItem[];
    setItems: React.Dispatch<React.SetStateAction<InvoiceItem[]>>;
    availableItems: string[];
    receiptItems?: any[]; // Array of full item objects for price lookup
    disabled?: boolean;
}

export function InvoiceItemTable({
    items,
    setItems,
    availableItems,
    receiptItems = [],
    disabled = false
}: InvoiceItemTableProps) {
    const GST_OPTIONS = [7, 8, 9, 10, 11];

    const toNumber = (value: unknown): number => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const totals = useMemo(() => {
        const subtotal = items.reduce((sum, item) => sum + item.totalNoTax, 0);
        const taxAmount = items.reduce((sum, item) => sum + item.taxAmount, 0);
        const totalPayable = items.reduce((sum, item) => sum + item.totalAmount, 0);

        return {
            subtotal,
            taxAmount,
            totalPayable,
        };
    }, [items]);

    const handleAddItem = () => {
        const newItem: InvoiceItem = {
            id: Math.random().toString(36).substr(2, 9),
            selectItem: availableItems[0] || 'Other',
            reference: '',
            defaultAmount: 0,
            amountPaying: 0,
            quantity: 1,
            totalNoTax: 0,
            taxPercent: 9, // Singapore GST 9%
            taxAmount: 0,
            totalAmount: 0,
        };

        // If we have receipt items, try to populate defaults for the first item
        if (receiptItems.length > 0 && availableItems.length > 0) {
            const firstItemName = availableItems[0];
            const matchedStats = receiptItems.find(r => r.itemName === firstItemName || r.description === firstItemName);
            if (matchedStats) {
                const price = matchedStats.unitPrice || matchedStats.defaultAmount || 0;
                newItem.defaultAmount = price;
                newItem.amountPaying = price;
                newItem.totalNoTax = price * 1;
                newItem.taxAmount = newItem.totalNoTax * 0.09;
                newItem.totalAmount = newItem.totalNoTax + newItem.taxAmount;
            }
        }

        setItems([...items, newItem]);
    };

    const handleRemoveItem = (id: string) => {
        setItems(items.filter((item) => item.id !== id));
    };

    const handleUpdateItem = (id: string, updates: Partial<InvoiceItem>) => {
        setItems(items.map((item) => {
            if (item.id === id) {
                let updatedItem = { ...item, ...updates };

                // If item selection changed, update prices from receiptItems
                if (updates.selectItem && receiptItems.length > 0) {
                    const selectedName = updates.selectItem;
                    const matchedItem = receiptItems.find(r => r.itemName === selectedName || r.description === selectedName);

                    if (matchedItem) {
                        const price = matchedItem.unitPrice || matchedItem.defaultAmount || 0;
                        updatedItem.defaultAmount = price;
                        updatedItem.amountPaying = price;
                        // Trigger recalculation below
                    } else {
                        // Reset if "Other" or unknown
                        updatedItem.defaultAmount = 0;
                        updatedItem.amountPaying = 0;
                    }
                }

                const qty = Math.max(1, toNumber(updatedItem.quantity)); // Default to 1 to avoid div by zero
                const taxPercent = Math.max(0, toNumber(updatedItem.taxPercent));
                const taxRate = taxPercent / 100;

                const hasManualTotalNoTaxEdit = Object.prototype.hasOwnProperty.call(updates, 'totalNoTax');

                if (hasManualTotalNoTaxEdit) {
                    // If user edits "Amount" directly
                    const totalNoTax = Math.max(0, toNumber(updatedItem.totalNoTax));
                    updatedItem.totalNoTax = totalNoTax;
                    updatedItem.amountPaying = totalNoTax / qty;
                    updatedItem.taxAmount = totalNoTax * taxRate;
                    updatedItem.totalAmount = totalNoTax + updatedItem.taxAmount;
                } else {
                    // Standard calculation flow for qty/unit price/gst edits
                    const price = Math.max(0, toNumber(updatedItem.amountPaying));
                    updatedItem.totalNoTax = qty * price;
                    updatedItem.taxAmount = updatedItem.totalNoTax * taxRate;
                    updatedItem.totalAmount = updatedItem.totalNoTax + updatedItem.taxAmount;
                }

                return updatedItem;
            }
            return item;
        }));
    };

    return (
        <div className="bg-white rounded-lg p-4 shadow-md overflow-x-auto">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-700">Item Details</h3>
                <button
                    onClick={handleAddItem}
                    disabled={disabled}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#4b3621] text-white rounded-lg text-sm hover:bg-[#5a4730] transition-colors disabled:opacity-50"
                >
                    <PlusIcon className="w-4 h-4" />
                    Add Item
                </button>
            </div>

            <table className="w-full text-sm">
                <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                    <tr>
                        <th className="px-3 py-2 text-left w-64">Item Name</th>
                        <th className="px-3 py-2 text-left w-40">Ref No</th>
                        <th className="px-3 py-2 text-right w-20">Qty</th>
                        <th className="px-3 py-2 text-right w-32">Unit Price</th>
                        <th className="px-3 py-2 text-right w-32">Amount</th>
                        <th className="px-3 py-2 text-right w-24">GST %</th>
                        <th className="px-1 py-2 w-10"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {items.map((item) => (
                        <tr key={item.id}>
                            <td className="px-2 py-2">
                                <select
                                    value={item.selectItem}
                                    onChange={(e) => handleUpdateItem(item.id, { selectItem: e.target.value })}
                                    disabled={disabled}
                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:border-[#4b3621] outline-none"
                                >
                                    {availableItems.map((opt) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </td>
                            <td className="px-2 py-2">
                                <input
                                    type="text"
                                    value={item.reference}
                                    onChange={(e) => handleUpdateItem(item.id, { reference: e.target.value })}
                                    disabled={disabled}
                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:border-[#4b3621] outline-none text-xs"
                                    placeholder="Reference"
                                />
                            </td>
                            <td className="px-2 py-2">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={item.quantity}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '' || /^\d+$/.test(val)) {
                                            handleUpdateItem(item.id, { quantity: val === '' ? 0 : Number(val) });
                                        }
                                    }}
                                    disabled={disabled}
                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:border-[#4b3621] outline-none text-right"
                                />
                            </td>
                            <td className="px-2 py-2">
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={item.amountPaying}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                            handleUpdateItem(item.id, { amountPaying: val === '' ? 0 : Number(val) });
                                        }
                                    }}
                                    disabled={disabled}
                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:border-[#4b3621] outline-none text-right"
                                />
                            </td>
                            <td className="px-2 py-2">
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={item.totalNoTax.toFixed(2)}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                            handleUpdateItem(item.id, { totalNoTax: val === '' ? 0 : Number(val) });
                                        }
                                    }}
                                    disabled={disabled}
                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:border-[#4b3621] outline-none text-right font-medium"
                                />
                            </td>
                            <td className="px-2 py-2">
                                <select
                                    value={item.taxPercent}
                                    onChange={(e) => handleUpdateItem(item.id, { taxPercent: Number(e.target.value) })}
                                    disabled={disabled}
                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:border-[#4b3621] outline-none text-right"
                                >
                                    {GST_OPTIONS.map((rate) => (
                                        <option key={rate} value={rate}>{rate}%</option>
                                    ))}
                                </select>
                            </td>
                            <td className="px-1 py-2 text-center">
                                <button
                                    onClick={() => handleRemoveItem(item.id)}
                                    disabled={disabled}
                                    className="text-red-500 hover:text-red-700 transition-colors disabled:opacity-30"
                                >
                                    <Trash2Icon className="w-4 h-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {items.length === 0 && (
                        <tr>
                            <td colSpan={7} className="px-3 py-6 text-center text-gray-400 italic">
                                No items added. Click "Add Item" to begin.
                            </td>
                        </tr>
                    )}
                </tbody>
                <tfoot className="bg-gray-50 font-semibold border-t-2 border-gray-200">
                    <tr>
                        <td colSpan={5} className="px-3 py-2 text-right text-gray-600">Subtotal:</td>
                        <td className="px-3 py-2 text-right text-gray-800">${totals.subtotal.toFixed(2)}</td>
                        <td></td>
                    </tr>
                    <tr>
                        <td colSpan={5} className="px-3 py-2 text-right text-gray-600">GST:</td>
                        <td className="px-3 py-2 text-right text-gray-800">${totals.taxAmount.toFixed(2)}</td>
                        <td></td>
                    </tr>
                    <tr className="text-lg text-[#4b3621] bg-[#4b3621]/5">
                        <td colSpan={5} className="px-3 py-3 text-right font-bold">Total Payable:</td>
                        <td className="px-3 py-3 text-right font-extrabold">${totals.totalPayable.toFixed(2)}</td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}

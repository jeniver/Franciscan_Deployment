import React from 'react';
import { Layout } from '../components/Layout';
import { CreditCardIcon, PlusIcon, SearchIcon } from 'lucide-react';
export function MiscInvoicePage() {
  return <Layout title="Miscellaneous Invoice">
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Miscellaneous Invoices
            </h1>
            <p className="text-gray-600 text-lg">
              Manage additional invoices and billing
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl flex items-center justify-center">
                  <CreditCardIcon className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">89</h3>
              <p className="text-sm text-gray-600">Total Misc. Invoices</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center">
                  <CreditCardIcon className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">$34.8K</h3>
              <p className="text-sm text-gray-600">Total Amount</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-fuchsia-500 to-fuchsia-600 rounded-xl flex items-center justify-center">
                  <CreditCardIcon className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">15</h3>
              <p className="text-sm text-gray-600">Pending Payment</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Recent Invoices
              </h2>
              <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#8b2828] to-[#7d1f1f] text-white rounded-xl hover:shadow-lg transition-all duration-200">
                <PlusIcon className="w-4 h-4" />
                New Invoice
              </button>
            </div>
            <div className="mb-6 relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" placeholder="Search miscellaneous invoices..." className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <p className="text-gray-600 text-center py-12">
              No miscellaneous invoices found. Click "New Invoice" to create
              one.
            </p>
          </div>
        </div>
      </div>
    </Layout>;
}
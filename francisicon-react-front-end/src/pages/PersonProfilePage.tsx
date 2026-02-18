import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import {
    User, Mail, Phone, MapPin, CreditCard, Church,
    FileText, ReceiptIcon, Bed, BookOpen, Search,
    ArrowLeft, ChevronRight, Loader2, AlertCircle,
    MessageSquare, Shield, Users, Hash
} from 'lucide-react';
import { personService, PersonProfile, PersonData } from '../services/personService';

// ─── Status Helpers ─────────────────────────────────────────────────
const getAppStatusText = (status: number) => {
    const map: Record<number, string> = { 0: 'Deleted', 1: 'Draft', 2: 'Pending', 3: 'Booked', 4: 'Completed' };
    return map[status] || 'Unknown';
};

const getBookingStatusText = (status: number) => {
    const map: Record<number, string> = { 0: 'Inactive', 1: 'Active', 2: 'Completed' };
    return map[status] || 'Unknown';
};

const getInvoiceStatusText = (status: number) => {
    const map: Record<number, string> = { 0: 'Deleted', 1: 'Active', 2: 'Paid' };
    return map[status] || 'Unknown';
};

const getStatusColor = (status: number, type: 'app' | 'booking' | 'invoice') => {
    if (type === 'app') {
        if (status === 3 || status === 4) return 'bg-green-100 text-green-800';
        if (status === 2) return 'bg-yellow-100 text-yellow-800';
        if (status === 0) return 'bg-red-100 text-red-800';
        return 'bg-gray-100 text-gray-800';
    }
    if (type === 'booking') {
        if (status === 1) return 'bg-green-100 text-green-800';
        if (status === 2) return 'bg-blue-100 text-blue-800';
        return 'bg-gray-100 text-gray-800';
    }
    // invoice/receipt
    if (status === 2) return 'bg-green-100 text-green-800';
    if (status === 1) return 'bg-blue-100 text-blue-800';
    if (status === 0) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
};

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('en-SG', {
            year: 'numeric', month: 'short', day: 'numeric',
        });
    } catch { return dateString; }
};

const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return '$0.00';
    return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD' }).format(amount);
};

// ─── Tab Types ──────────────────────────────────────────────────────
type TabType = 'bookings' | 'applications' | 'wakeroom' | 'invoices' | 'receipts';

// ─── Person List / Search View ──────────────────────────────────────
function PersonListView({ onSelect }: { onSelect: (id: number) => void }) {
    const [query, setQuery] = useState('');
    const [persons, setPersons] = useState<PersonData[]>([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
    const [searched, setSearched] = useState(false);

    const doSearch = useCallback(async (q: string, page = 1) => {
        setLoading(true);
        try {
            const result = await personService.searchCustomers(q, page, 20);
            setPersons(result.data || []);
            setPagination(result.pagination || { page: 1, total: 0, pages: 0 });
            setSearched(true);
        } catch (err) {
            console.error('Search failed:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Load on mount with empty query to show all
    useEffect(() => {
        doSearch('', 1);
    }, [doSearch]);

    const handleSearch = () => doSearch(query, 1);

    return (
        <Layout title="Persons">
            <div className="p-4 md:p-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-6 md:mb-8">
                        <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">Persons</h1>
                        <p className="text-gray-600 text-sm md:text-lg">
                            View and manage contact persons, nominees, and beneficiaries
                        </p>
                    </div>

                    {/* Search Card */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 md:p-6 mb-6">
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name, NRIC, or email..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                                />
                            </div>
                            <button
                                onClick={handleSearch}
                                disabled={loading}
                                className="px-6 py-3 bg-gradient-to-r from-[#8b2828] to-[#7d1f1f] text-white rounded-xl hover:shadow-lg transition-all duration-200 text-sm md:text-base font-medium disabled:opacity-60"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
                            </button>
                        </div>
                    </div>

                    {/* Results */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                        {loading ? (
                            <div className="p-12 text-center">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                                <p className="mt-4 text-gray-600">Searching persons...</p>
                            </div>
                        ) : persons.length > 0 ? (
                            <>
                                <div className="p-4 md:p-6 border-b border-gray-200">
                                    <h2 className="text-lg font-semibold text-gray-900">
                                        {pagination.total} Person{pagination.total !== 1 ? 's' : ''} Found
                                    </h2>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID No</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roles</th>
                                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {persons.map((p) => (
                                                <tr key={p.personId} className="hover:bg-gray-50 cursor-pointer" onClick={() => onSelect(p.personId)}>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.name || 'N/A'}</td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{p.idNo || '—'}</td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{p.emailID || '—'}</td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{p.mobileNo || '—'}</td>
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        <div className="flex gap-1 flex-wrap">
                                                            {p.isContactPerson && <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">Contact</span>}
                                                            {p.isNominee && <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800">Nominee</span>}
                                                            {p.isBeneficiary && <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800">Beneficiary</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap text-center">
                                                        <button className="text-blue-600 hover:text-blue-900 text-sm font-medium inline-flex items-center gap-1">
                                                            View <ChevronRight className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Pagination */}
                                {pagination.pages > 1 && (
                                    <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                                        <span className="text-sm text-gray-600">
                                            Page {pagination.page} of {pagination.pages}
                                        </span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => doSearch(query, pagination.page - 1)}
                                                disabled={pagination.page <= 1}
                                                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"
                                            >
                                                Previous
                                            </button>
                                            <button
                                                onClick={() => doSearch(query, pagination.page + 1)}
                                                disabled={pagination.page >= pagination.pages}
                                                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : searched ? (
                            <div className="p-12 text-center">
                                <Users className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-2 text-sm font-medium text-gray-900">No persons found</h3>
                                <p className="mt-1 text-sm text-gray-500">Try a different search term</p>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </Layout>
    );
}

// ─── Info Card Component ────────────────────────────────────────────
function InfoCard({ icon: Icon, label, value, gradient }: {
    icon: React.ElementType; label: string; value: string; gradient: string;
}) {
    return (
        <div className="bg-white rounded-2xl p-4 md:p-5 shadow-lg border border-gray-100">
            <div className="flex items-start gap-3">
                <div className={`w-10 h-10 ${gradient} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">{label}</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5 break-words">{value || '—'}</p>
                </div>
            </div>
        </div>
    );
}

// ─── Person Detail View ─────────────────────────────────────────────
function PersonDetailView({ personId }: { personId: number }) {
    const navigate = useNavigate();
    const [profile, setProfile] = useState<PersonProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('bookings');

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        personService.getPersonProfile(personId)
            .then((data) => {
                if (!cancelled) setProfile(data);
            })
            .catch((err) => {
                if (!cancelled) setError(err?.message || 'Failed to load profile');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [personId]);

    if (loading) {
        return (
            <Layout title="Person Profile">
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <Loader2 className="w-10 h-10 text-gray-400 animate-spin mx-auto" />
                        <p className="mt-4 text-gray-600">Loading person profile...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    if (error || !profile) {
        return (
            <Layout title="Person Profile">
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
                        <h3 className="mt-4 text-lg font-medium text-gray-900">Failed to load profile</h3>
                        <p className="mt-1 text-gray-500">{error}</p>
                        <button onClick={() => navigate('/persons')} className="mt-4 px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">
                            Back to Persons
                        </button>
                    </div>
                </div>
            </Layout>
        );
    }

    const { person } = profile;

    // Build full address
    const addressParts = [person.addressNo, person.addressLine1, person.addressLine2, person.addressCity, person.addressState, person.addressCountry].filter(Boolean);
    const fullAddress = addressParts.join(', ');

    // Tab data with counts
    const tabs: { key: TabType; label: string; icon: React.ElementType; count: number }[] = [
        { key: 'bookings', label: 'Niche Bookings', icon: BookOpen, count: profile.nicheBookings.length },
        { key: 'applications', label: 'Applications', icon: FileText, count: profile.nicheApplications.length },
        { key: 'wakeroom', label: 'Wake Room', icon: Bed, count: profile.wakeRoomBookings.length },
        { key: 'invoices', label: 'Invoices', icon: CreditCard, count: profile.invoices.length },
        { key: 'receipts', label: 'Receipts', icon: ReceiptIcon, count: profile.receipts.length },
    ];

    return (
        <Layout title={`${person.name || 'Person'} — Profile`}>
            <div className="p-4 md:p-8">
                <div className="max-w-7xl mx-auto">
                    {/* Back Button */}
                    <button
                        onClick={() => navigate('/persons')}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Persons
                    </button>

                    {/* Header Card */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8 mb-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-gradient-to-br from-[#8b2828] to-[#7d1f1f] rounded-2xl flex items-center justify-center">
                                    <User className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{person.name || 'Unknown'}</h1>
                                    <p className="text-gray-500 text-sm mt-1">Person ID: {person.personId}</p>
                                </div>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {person.isContactPerson && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                        <Shield className="w-3.5 h-3.5" /> Contact Person
                                    </span>
                                )}
                                {person.isNominee && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                                        <Users className="w-3.5 h-3.5" /> Nominee
                                    </span>
                                )}
                                {person.isBeneficiary && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                        <User className="w-3.5 h-3.5" /> Beneficiary
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Info Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        <InfoCard icon={Mail} label="Email" value={person.emailID || ''} gradient="bg-gradient-to-br from-blue-500 to-blue-600" />
                        <InfoCard icon={Phone} label="Mobile" value={[person.mobileNo, person.homeTelNo ? `(Home: ${person.homeTelNo})` : ''].filter(Boolean).join(' ')} gradient="bg-gradient-to-br from-green-500 to-green-600" />
                        <InfoCard icon={MapPin} label="Address" value={fullAddress} gradient="bg-gradient-to-br from-purple-500 to-purple-600" />
                        <InfoCard icon={Hash} label="ID No (NRIC/FIN)" value={person.idNo || ''} gradient="bg-gradient-to-br from-orange-500 to-orange-600" />
                        <InfoCard icon={Church} label="Catholic" value={person.isCatholic ? 'Yes' : 'No'} gradient="bg-gradient-to-br from-teal-500 to-teal-600" />
                        <InfoCard icon={MessageSquare} label="Remarks" value={person.remarks || ''} gradient="bg-gradient-to-br from-gray-500 to-gray-600" />
                    </div>

                    {/* Activity Tabs */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                        {/* Tab Bar */}
                        <div className="border-b border-gray-200 overflow-x-auto">
                            <div className="flex min-w-max">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key)}
                                        className={`flex items-center gap-2 px-4 md:px-6 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.key
                                            ? 'border-[#8b2828] text-[#8b2828]'
                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        <tab.icon className="w-4 h-4" />
                                        {tab.label}
                                        {tab.count > 0 && (
                                            <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${activeTab === tab.key ? 'bg-[#8b2828]/10 text-[#8b2828]' : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                {tab.count}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="p-0">
                            {activeTab === 'bookings' && (
                                profile.nicheBookings.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booked Date</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Niche</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chapel</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {profile.nicheBookings.map((b) => (
                                                    <tr key={b.NicheBookingId} className="hover:bg-gray-50 cursor-pointer" onClick={() => b.Code && navigate(`/niche/view/${b.Code}`)}>
                                                        <td className="px-4 py-4 text-sm font-medium text-blue-600">{b.Code || '—'}</td>
                                                        <td className="px-4 py-4 text-sm text-gray-700">{formatDate(b.BookedDate)}</td>
                                                        <td className="px-4 py-4 text-sm text-gray-700">{b.NicheCode || '—'}</td>
                                                        <td className="px-4 py-4 text-sm text-gray-700">{b.ChapelName || '—'}</td>
                                                        <td className="px-4 py-4 text-sm">
                                                            <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-800">{b.PersonRole}</span>
                                                        </td>
                                                        <td className="px-4 py-4 text-sm">
                                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(b.BookingStatus, 'booking')}`}>
                                                                {getBookingStatusText(b.BookingStatus)}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <EmptyTabState message="No niche bookings found for this person" />
                                )
                            )}

                            {activeTab === 'applications' && (
                                profile.nicheApplications.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied Date</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applicant</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Niche</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {profile.nicheApplications.map((a) => (
                                                    <tr key={a.NicheApplicationId} className="hover:bg-gray-50 cursor-pointer" onClick={() => a.Code && navigate(`/niche/view/${a.Code}`)}>
                                                        <td className="px-4 py-4 text-sm font-medium text-blue-600">{a.Code || '—'}</td>
                                                        <td className="px-4 py-4 text-sm text-gray-700">{formatDate(a.AppliedDate)}</td>
                                                        <td className="px-4 py-4 text-sm text-gray-700">{a.ApplicantName || '—'}</td>
                                                        <td className="px-4 py-4 text-sm text-gray-700">{a.NicheCode || '—'}</td>
                                                        <td className="px-4 py-4 text-sm text-right font-medium text-gray-900">{formatCurrency(a.Amount)}</td>
                                                        <td className="px-4 py-4 text-sm">
                                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(a.Status, 'app')}`}>
                                                                {getAppStatusText(a.Status)}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <EmptyTabState message="No niche applications found for this person" />
                                )
                            )}

                            {activeTab === 'wakeroom' && (
                                profile.wakeRoomBookings.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Using Date</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deceased</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hall</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Donation</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {profile.wakeRoomBookings.map((w) => (
                                                    <tr key={w.WakeRoomBookingId} className="hover:bg-gray-50 cursor-pointer" onClick={() => w.Code && navigate(`/wake-room/edit/${w.Code}`)}>
                                                        <td className="px-4 py-4 text-sm font-medium text-blue-600">{w.Code || '—'}</td>
                                                        <td className="px-4 py-4 text-sm text-gray-700">{formatDate(w.UsingDate)}</td>
                                                        <td className="px-4 py-4 text-sm text-gray-700">{w.NameOfDeceased || '—'}</td>
                                                        <td className="px-4 py-4 text-sm text-gray-700">{w.HallNo || '—'}</td>
                                                        <td className="px-4 py-4 text-sm text-right font-medium text-gray-900">{formatCurrency(w.DonationAmount)}</td>
                                                        <td className="px-4 py-4 text-sm">
                                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(w.Status, 'booking')}`}>
                                                                {getBookingStatusText(w.Status)}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <EmptyTabState message="No wake room bookings found for this person" />
                                )
                            )}

                            {activeTab === 'invoices' && (
                                profile.invoices.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice No</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ref Doc</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {profile.invoices.map((inv) => (
                                                    <tr key={inv.InvoiceId} className="hover:bg-gray-50 cursor-pointer" onClick={() => inv.Code && navigate(`/create-invoice/${inv.Code}`)}>
                                                        <td className="px-4 py-4 text-sm font-medium text-blue-600">{inv.Code || '—'}</td>
                                                        <td className="px-4 py-4 text-sm text-gray-700">{formatDate(inv.TransactionDate)}</td>
                                                        <td className="px-4 py-4 text-sm text-gray-700">{inv.RefDocNumber || '—'}</td>
                                                        <td className="px-4 py-4 text-sm text-right font-medium text-gray-900">{formatCurrency(inv.TotalAmount || inv.PayingAmount)}</td>
                                                        <td className="px-4 py-4 text-sm text-gray-700">{inv.PaymentMode || '—'}</td>
                                                        <td className="px-4 py-4 text-sm">
                                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(inv.Status || 1, 'invoice')}`}>
                                                                {getInvoiceStatusText(inv.Status || 1)}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <EmptyTabState message="No invoices found for this person" />
                                )
                            )}

                            {activeTab === 'receipts' && (
                                profile.receipts.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt No</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ref Doc</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {profile.receipts.map((r) => (
                                                    <tr key={r.ReceiptId} className="hover:bg-gray-50">
                                                        <td className="px-4 py-4 text-sm font-medium text-gray-900">{r.Code || '—'}</td>
                                                        <td className="px-4 py-4 text-sm text-gray-700">{formatDate(r.TransactionDate)}</td>
                                                        <td className="px-4 py-4 text-sm text-gray-700">{r.RefDocNumber || '—'}</td>
                                                        <td className="px-4 py-4 text-sm text-right font-medium text-gray-900">{formatCurrency(r.TotalAmount || r.PayingAmount)}</td>
                                                        <td className="px-4 py-4 text-sm text-gray-700">{r.PaymentMode || '—'}</td>
                                                        <td className="px-4 py-4 text-sm">
                                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(r.Status || 1, 'invoice')}`}>
                                                                {getInvoiceStatusText(r.Status || 1)}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <EmptyTabState message="No receipts found for this person" />
                                )
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

// ─── Empty State ────────────────────────────────────────────────────
function EmptyTabState({ message }: { message: string }) {
    return (
        <div className="p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{message}</h3>
        </div>
    );
}

// ─── Main Page Component ────────────────────────────────────────────
export function PersonProfilePage() {
    const { personId } = useParams<{ personId: string }>();
    const navigate = useNavigate();

    // If we have a personId param, show the detail view
    if (personId) {
        const id = parseInt(personId, 10);
        if (isNaN(id)) {
            return (
                <Layout title="Person Profile">
                    <div className="flex items-center justify-center min-h-[60vh]">
                        <div className="text-center">
                            <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
                            <h3 className="mt-4 text-lg font-medium text-gray-900">Invalid Person ID</h3>
                            <button onClick={() => navigate('/persons')} className="mt-4 px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">
                                Back to Persons
                            </button>
                        </div>
                    </div>
                </Layout>
            );
        }
        return <PersonDetailView personId={id} />;
    }

    // Otherwise, show the list/search view
    return <PersonListView onSelect={(id) => navigate(`/person/${id}`)} />;
}

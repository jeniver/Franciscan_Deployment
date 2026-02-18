import { useRef, useCallback } from 'react';
import { addressService } from '../../services/addressService';

interface CustomerAddressFormProps {
    addressBlock: string;
    setAddressBlock: (val: string) => void;
    addressNumber: string;
    setAddressNumber: (val: string) => void;
    addressStreet: string;
    setAddressStreet: (val: string) => void;
    addressUnit: string;
    setAddressUnit: (val: string) => void;
    addressPostalCode: string;
    setAddressPostalCode: (val: string) => void;
    addressCountry: string;
    setAddressCountry: (val: string) => void;
    label?: string;
    disabled?: boolean;
}

export function CustomerAddressForm({
    addressBlock,
    setAddressBlock,
    addressNumber,
    setAddressNumber,
    addressStreet,
    setAddressStreet,
    addressUnit,
    setAddressUnit,
    addressPostalCode,
    setAddressPostalCode,
    addressCountry,
    setAddressCountry,
    label = "Address:",
    disabled = false
}: CustomerAddressFormProps) {
    const postalCodeDebounceRef = useRef<NodeJS.Timeout | null>(null);

    const handlePostalCodeChange = useCallback(async (code: string) => {
        setAddressPostalCode(code);

        if (postalCodeDebounceRef.current) {
            clearTimeout(postalCodeDebounceRef.current);
        }

        if (code.length === 6 && /^\d+$/.test(code)) {
            postalCodeDebounceRef.current = setTimeout(async () => {
                try {
                    const result = await addressService.searchByPostalCode(code);
                    if (result && result.address) {
                        setAddressStreet(result.address);
                    }
                } catch (error) {
                    console.error('Postal code lookup failed:', error);
                }
            }, 500);
        }
    }, [setAddressPostalCode, setAddressStreet]);

    return (
        <div className="bg-white rounded-lg p-4 shadow-md">
            <label className="block font-semibold text-gray-700 text-sm mb-3">{label}</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <select
                    value={addressBlock}
                    onChange={(e) => setAddressBlock(e.target.value)}
                    disabled={disabled}
                    className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#4b3621] focus:outline-none focus:ring-2 focus:ring-[#4b3621]/20 transition-all disabled:bg-gray-100"
                >
                    <option>Block</option>
                </select>
                <input
                    type="text"
                    value={addressNumber}
                    onChange={(e) => setAddressNumber(e.target.value)}
                    disabled={disabled}
                    className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#4b3621] focus:outline-none focus:ring-2 focus:ring-[#4b3621]/20 transition-all disabled:bg-gray-100"
                    placeholder="Number"
                />
                <input
                    type="text"
                    value={addressStreet}
                    onChange={(e) => setAddressStreet(e.target.value)}
                    disabled={disabled}
                    className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#4b3621] focus:outline-none focus:ring-2 focus:ring-[#4b3621]/20 transition-all disabled:bg-gray-100"
                    placeholder="Street"
                />
                <input
                    type="text"
                    value={addressUnit}
                    onChange={(e) => setAddressUnit(e.target.value)}
                    disabled={disabled}
                    className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#4b3621] focus:outline-none focus:ring-2 focus:ring-[#4b3621]/20 transition-all disabled:bg-gray-100"
                    placeholder="Unit"
                />
                <input
                    type="text"
                    value={addressPostalCode}
                    onChange={(e) => handlePostalCodeChange(e.target.value)}
                    disabled={disabled}
                    className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#4b3621] focus:outline-none focus:ring-2 focus:ring-[#4b3621]/20 transition-all disabled:bg-gray-100"
                    placeholder="Postal Code"
                />
                <select
                    value={addressCountry}
                    onChange={(e) => setAddressCountry(e.target.value)}
                    disabled={disabled}
                    className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#4b3621] focus:outline-none focus:ring-2 focus:ring-[#4b3621]/20 transition-all disabled:bg-gray-100"
                >
                    <option>Singapore</option>
                    <option>Malaysia</option>
                    <option>Indonesia</option>
                    <option>Other</option>
                </select>
            </div>
        </div>
    );
}

import React from 'react';
import { MapPinIcon } from 'lucide-react';
import { formatAddress } from '../../utils/addressMapper';

interface AddressDisplayProps {
    addressData?: {
        block?: string;
        blockNo?: string;
        streetName?: string;
        unitNo?: string;
        postalCode?: string;
        country?: string;
        addressNo?: string;
        addressLine1?: string;
        addressLine2?: string;
        addressCity?: string;
        addressState?: string;
        addressCountry?: string;
        formattedAddress?: string;
    };
    rawAddress?: string;
    className?: string;
    showIcon?: boolean;
}

/**
 * A unified component to display addresses consistently across the app.
 * Can take structured address data or a pre-formatted string.
 */
export const AddressDisplay: React.FC<AddressDisplayProps> = ({
    addressData,
    rawAddress,
    className = "",
    showIcon = true
}) => {
    // Determine the best address string to display
    let displayAddress = rawAddress || '';

    if (addressData) {
        if (addressData.formattedAddress) {
            displayAddress = addressData.formattedAddress;
        } else {
            // If we only have raw fields, use the formatter
            displayAddress = formatAddress({
                block: addressData.block || (addressData.addressNo === 'Blk' ? 'Block' : ''),
                blockNo: addressData.blockNo || addressData.addressLine1 || '',
                streetName: addressData.streetName || addressData.addressLine2 || '',
                unitNo: addressData.unitNo || addressData.addressCity || '',
                postalCode: addressData.postalCode || addressData.addressState || '',
                country: addressData.country || addressData.addressCountry || 'Singapore'
            });
        }
    }

    if (!displayAddress || displayAddress === 'N/A') {
        return <span className={`text-gray-400 italic ${className}`}>No address provided</span>;
    }

    return (
        <div className={`flex items-start gap-1.5 ${className}`}>
            {showIcon && <MapPinIcon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />}
            <span className="text-gray-600 leading-tight">{displayAddress}</span>
        </div>
    );
};

import React from 'react';
import { useNavigate } from 'react-router-dom';

export function TestInvoiceNavigation() {
  const navigate = useNavigate();

  const testNavigation = (invoiceCode: string) => {
    console.log(`Navigating to invoice: ${invoiceCode}`);
    navigate(`/invoice-receipt/${invoiceCode}`);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
    </div>
  );
}
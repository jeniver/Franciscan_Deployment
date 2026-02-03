import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { Beneficiary } from '../services/inscriptionService';
import { setBeneficiaries, updateDeceasedDetail } from '../store/inscriptionSlice';

export const useBeneficiaries = () => {
  const dispatch = useDispatch();
  const { beneficiaries, deceasedDetails } = useSelector((state: RootState) => state.inscription);

  const handleBeneficiarySelect = (index: number, beneficiaryName: string) => {
    // Find the selected beneficiary
    const selectedBeneficiary = beneficiaries.find(b => b.name === beneficiaryName);
    
    if (selectedBeneficiary) {
      // Update the deceased detail at the specified index with beneficiary data
      dispatch(updateDeceasedDetail({
        index,
        detail: {
          nameOfDeceased: selectedBeneficiary.name,
          dateBorn: selectedBeneficiary.dateOfBirth || '',
          dateDied: '', // Leave death date empty as it's not typically known from beneficiary info
          deathCertNo: '' // Leave death cert number empty
        }
      }));
    }
  };

  return {
    beneficiaries,
    deceasedDetails,
    handleBeneficiarySelect
  };
};
import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';
import { RootState, AppDispatch } from '../store';
import {
  loadAllWakeRooms,
  loadWakeRoomsByChurch,
  loadWakeRoomsDropdown,
  checkAvailability,
  checkAvailabilityRange,
  checkAvailabilityDates,
  createBooking,
  getBookingByCode,
  searchBookings,
  updateBooking,
  deleteBooking,
  setSelectedWakeRoom,
  setSelectedBooking,
  setSelectedChurch,
  setSearchCriteria,
  clearAvailabilityCheck,
  clearAvailabilityRangeCheck,
  clearAvailabilityDatesCheck,
  clearError,
  resetWakeRoomState
} from '../store/wakeRoomSlice';

export function useWakeRoom() {
  const dispatch = useDispatch<AppDispatch>();

  const {
    wakeRooms,
    selectedWakeRoom,
    selectedChurchId,
    wakeRoomDropdownOptions,
    bookings,
    selectedBooking,
    searchResults,
    availabilityCheck,
    availabilityRangeCheck,
    availabilityDatesCheck,
    loading,
    error,
    lastErrorType,
    isDataLoaded,
    searchCriteria,
    searchPagination
  } = useSelector((state: RootState) => state.wakeRoom);

  const handleLoadAllWakeRooms = useCallback(() => {
    dispatch(loadAllWakeRooms());
  }, [dispatch]);

  const handleLoadWakeRoomsByChurch = useCallback((churchId: number) => {
    dispatch(loadWakeRoomsByChurch(churchId));
  }, [dispatch]);

  const handleSetSelectedChurch = useCallback((churchId: number | null) => {
    dispatch(setSelectedChurch(churchId));
  }, [dispatch]);

  const handleLoadWakeRoomsDropdown = useCallback((churchId: number) => {
    dispatch(loadWakeRoomsDropdown(churchId));
  }, [dispatch]);

  const handleCheckAvailability = useCallback((wakeRoomId: number, fromTime: string, toTime: string) => {
    dispatch(checkAvailability({ wakeRoomId, fromTime, toTime }));
  }, [dispatch]);

  const handleCheckAvailabilityRange = useCallback((wakeRoomId: number, fromDate: string, toDate: string) => {
    dispatch(checkAvailabilityRange({ wakeRoomId, fromDate, toDate }));
  }, [dispatch]);

  const handleCheckAvailabilityDates = useCallback((wakeRoomId: number, dates: string[]) => {
    dispatch(checkAvailabilityDates({ wakeRoomId, dates }));
  }, [dispatch]);

  const handleCreateBooking = useCallback((bookingData: any) => {
    dispatch(createBooking(bookingData));
  }, [dispatch]);

  const handleGetBookingByCode = useCallback((code: string, churchId: number) => {
    dispatch(getBookingByCode({ code, churchId }));
  }, [dispatch]);

  const handleSearchBookings = useCallback((searchCriteria: any) => {
    dispatch(searchBookings(searchCriteria));
  }, [dispatch]);

  const handleUpdateBooking = useCallback((bookingId: number, bookingData: any) => {
    dispatch(updateBooking({ bookingId, bookingData }));
  }, [dispatch]);

  const handleDeleteBooking = useCallback((bookingId: number) => {
    dispatch(deleteBooking(bookingId));
  }, [dispatch]);

  const handleSetSelectedWakeRoom = useCallback((wakeRoom: any) => {
    dispatch(setSelectedWakeRoom(wakeRoom));
  }, [dispatch]);

  const handleSetSelectedBooking = useCallback((booking: any) => {
    dispatch(setSelectedBooking(booking));
  }, [dispatch]);

  const handleSetSearchCriteria = useCallback((criteria: any) => {
    dispatch(setSearchCriteria(criteria));
  }, [dispatch]);

  const handleClearAvailabilityCheck = useCallback(() => {
    dispatch(clearAvailabilityCheck());
  }, [dispatch]);

  const handleClearAvailabilityRangeCheck = useCallback(() => {
    dispatch(clearAvailabilityRangeCheck());
  }, [dispatch]);

  const handleClearAvailabilityDatesCheck = useCallback(() => {
    dispatch(clearAvailabilityDatesCheck());
  }, [dispatch]);

  const handleClearError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  const handleResetWakeRoomState = useCallback(() => {
    dispatch(resetWakeRoomState());
  }, [dispatch]);

  // Helper function to get wake room by ID
  const getWakeRoomById = useCallback((wakeRoomId: number) => {
    return wakeRooms.find(wakeRoom => wakeRoom.wakeRoomId === wakeRoomId);
  }, [wakeRooms]);

  // Helper function to get available wake rooms
  const getAvailableWakeRooms = useCallback(() => {
    return wakeRooms.filter(wakeRoom => {
      const now = new Date();
      const openingTime = new Date(wakeRoom.openingTime);
      const closingTime = new Date(wakeRoom.clossingTime);
      return now >= openingTime && now <= closingTime;
    });
  }, [wakeRooms]);

  // Helper function to format date for API
  const formatDateForAPI = useCallback((date: Date) => {
    return date.toISOString();
  }, []);

  // Helper function to calculate booking duration in days
  const calculateBookingDuration = useCallback((fromTime: string, toTime: string) => {
    const from = new Date(fromTime);
    const to = new Date(toTime);
    const diffTime = Math.abs(to.getTime() - from.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, []);

  // Helper function to format applicant data for API
  const formatApplicantData = useCallback((applicantData: any) => {
    return {
      applicantName: applicantData.name,
      applicantIDNo: applicantData.idNo || '',
      applicantEmailID: applicantData.email,
      applicantMobileNo: applicantData.mobileNo,
      applicantHomeTelNo: applicantData.homeTelNo || '',
      applicantOfficeTelNo: applicantData.officeTelNo || '',
      applicantAddressNo: applicantData.addressDetails?.no || '',
      applicantAddressLine1: applicantData.addressDetails?.line1 || '',
      applicantAddressLine2: applicantData.addressDetails?.line2 || '',
      applicantAddressCity: applicantData.addressDetails?.city || '',
      applicantAddressState: applicantData.addressDetails?.state || '',
      applicantAddressCountry: applicantData.addressDetails?.country || ''
    };
  }, []);

  // Helper function to format booking data for API
  const formatBookingData = useCallback((bookingData: any) => {
    return {
      wakeRoomId: bookingData.wakeRoomId,
      nameOfDeceased: bookingData.nameOfDeceased,
      purpose: bookingData.purpose || 'Wake Service',
      usingDate: bookingData.usingDate,
      massTime: bookingData.massTime,
      usingTimeFrom: bookingData.usingTimeFrom,
      usingTimeTo: bookingData.usingTimeTo,
      noOfDays: bookingData.noOfDays || 1,
      donationAmount: bookingData.donationAmount || 0,
      defaultDonationAmount: bookingData.defaultDonationAmount || 0,
      remarks: bookingData.remarks || '',
      serviceby: bookingData.serviceby || '',
      casketCompany: bookingData.casketCompany || '',
      hallNo: bookingData.hallNo || '',
      timeOfCremation: bookingData.timeOfCremation || ''
    };
  }, []);

  // Helper function to create complete booking data
  const createCompleteBookingData = useCallback((applicantData: any, bookingData: any) => {
    const formattedApplicant = formatApplicantData(applicantData);
    const formattedBooking = formatBookingData(bookingData);

    return {
      ...formattedApplicant,
      ...formattedBooking
    };
  }, [formatApplicantData, formatBookingData]);

  return {
    // State
    wakeRooms,
    selectedWakeRoom,
    selectedChurchId,
    wakeRoomDropdownOptions,
    bookings,
    selectedBooking,
    searchResults,
    availabilityCheck,
    availabilityRangeCheck,
    availabilityDatesCheck,
    loading,
    error,
    lastErrorType,
    isDataLoaded,
    searchCriteria,
    searchPagination,

    // Actions
    handleLoadAllWakeRooms,
    handleLoadWakeRoomsByChurch,
    handleSetSelectedChurch,
    handleLoadWakeRoomsDropdown,
    handleCheckAvailability,
    handleCheckAvailabilityRange,
    handleCheckAvailabilityDates,
    handleCreateBooking,
    handleGetBookingByCode,
    handleSearchBookings,
    handleUpdateBooking,
    handleDeleteBooking,
    handleSetSelectedWakeRoom,
    handleSetSelectedBooking,
    handleSetSearchCriteria,
    handleClearAvailabilityCheck,
    handleClearAvailabilityRangeCheck,
    handleClearAvailabilityDatesCheck,
    handleClearError,
    handleResetWakeRoomState,

    // Helper functions
    getWakeRoomById,
    getAvailableWakeRooms,
    formatDateForAPI,
    calculateBookingDuration,
    formatApplicantData,
    formatBookingData,
    createCompleteBookingData
  };
}
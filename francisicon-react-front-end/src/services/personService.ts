import api from './api';

export interface PersonProfile {
    person: PersonData;
    nicheBookings: NicheBookingRecord[];
    nicheApplications: NicheAppRecord[];
    wakeRoomBookings: WakeRoomRecord[];
    invoices: InvoiceRecord[];
    receipts: ReceiptRecord[];
}

export interface PersonData {
    personId: number;
    name: string;
    idNo?: string;
    emailID?: string;
    mobileNo?: string;
    homeTelNo?: string;
    officeTelNo?: string;
    addressNo?: string;
    addressLine1?: string;
    addressLine2?: string;
    addressCity?: string;
    addressState?: string;
    addressCountry?: string;
    isCatholic?: boolean;
    churchId?: number;
    remarks?: string;
    isContactPerson?: boolean;
    isNominee?: boolean;
    isBeneficiary?: boolean;
}

export interface NicheBookingRecord {
    NicheBookingId: number;
    Code: string;
    BookedDate: string;
    BookingStatus: number;
    NicheCode?: string;
    ChapelName?: string;
    WallName?: string;
    RowName?: string;
    PersonRole: string;
}

export interface NicheAppRecord {
    NicheApplicationId: number;
    Code: string;
    AppliedDate: string;
    Status: number;
    ApplicantName?: string;
    NicheCode?: string;
    ChapelName?: string;
    Amount?: number;
}

export interface WakeRoomRecord {
    WakeRoomBookingId: number;
    Code: string;
    UsingDate: string;
    Status: number;
    ApplicantName?: string;
    NameOfDeceased?: string;
    HallNo?: string;
    DonationAmount?: number;
    WakeRoomName?: string;
}

export interface InvoiceRecord {
    InvoiceId: number;
    Code: string;
    TransactionDate: string;
    CustomerName?: string;
    TotalAmount?: number;
    PayingAmount?: number;
    PaymentMode?: string;
    Status?: number;
    RefDocNumber?: string;
    RefDocName?: string;
}

export interface ReceiptRecord {
    ReceiptId: number;
    Code: string;
    TransactionDate: string;
    CustomerName?: string;
    TotalAmount?: number;
    PayingAmount?: number;
    PaymentMode?: string;
    Status?: number;
    RefDocNumber?: string;
}

export const personService = {
    async getPersonProfile(personId: number): Promise<PersonProfile> {
        const response = await api.get(`/api/persons/${personId}/profile`);
        return response.data.data;
    },

    async searchCustomers(query: string, page = 1, limit = 20): Promise<{
        data: PersonData[];
        pagination: { page: number; limit: number; total: number; pages: number };
    }> {
        const response = await api.get('/api/persons/customers/search', {
            params: { q: query, page, limit }
        });
        return response.data.data;
    },
};

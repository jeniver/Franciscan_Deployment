export interface NomineeData {
  name?: string;
  nric?: string;
  relationship?: string;
  date?: string;
}

export interface ConsentFormData {
  nicheNo?: string;
  applicantName?: string;
  applicantNRIC?: string;
  nominee1?: NomineeData;
  nominee2?: NomineeData;
}
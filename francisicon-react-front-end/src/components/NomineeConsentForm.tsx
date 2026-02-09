import React from 'react'
import { ConsentFormData } from './InvoiceData'
interface NomineeConsentFormProps {
  data: ConsentFormData
}
export function NomineeConsentForm({ data }: NomineeConsentFormProps) {
  const styles = {
    page: {
      width: '794px',
      minHeight: '1123px',
      padding: '60px',
      backgroundColor: '#ffffff',
      fontFamily: "'Times New Roman', serif",
      color: '#000000',
      boxSizing: 'border-box' as const,
      position: 'relative' as const,
      fontSize: '14px',
      lineHeight: '1.4',
    },
    header: {
      textAlign: 'center' as const,
      marginBottom: '30px',
    },
    title: {
      fontSize: '18px',
      fontWeight: 'bold',
      marginBottom: '5px',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
      marginBottom: '20px',
      border: '1px solid #000',
    },
    th: {
      border: '1px solid #000',
      padding: '5px 10px',
      textAlign: 'left' as const,
      fontWeight: 'bold',
      backgroundColor: '#333',
      color: '#fff',
    },
    td: {
      border: '1px solid #000',
      padding: '5px 10px',
      verticalAlign: 'middle' as const,
    },
    tdLabel: {
      border: '1px solid #000',
      padding: '5px 10px',
      width: '150px',
      verticalAlign: 'middle' as const,
    },
    tdColon: {
      border: '1px solid #000',
      padding: '5px',
      width: '20px',
      textAlign: 'center' as const,
      verticalAlign: 'middle' as const,
    },
    tdValue: {
      border: '1px solid #000',
      padding: '5px 10px',
      verticalAlign: 'middle' as const,
    },
    sectionTitle: {
      fontWeight: 'bold',
      marginBottom: '15px',
      marginTop: '30px',
    },
    paragraph: {
      textAlign: 'justify' as const,
      marginBottom: '20px',
      lineHeight: '1.5',
    },
    verticalTextCell: {
      border: '1px solid #000',
      width: '40px',
      textAlign: 'center' as const,
      verticalAlign: 'middle' as const,
      backgroundColor: '#f3f4f6', // Light gray for vertical header
    },
    verticalText: {
      writingMode: 'vertical-rl' as const,
      transform: 'rotate(180deg)',
      whiteSpace: 'nowrap' as const,
      margin: '0 auto',
      fontWeight: 'bold',
      height: '150px', // Ensure enough height for rotation
    },
    noteSection: {
      marginTop: '30px',
      fontStyle: 'italic',
    },
    noteTitle: {
      fontWeight: 'bold',
      fontStyle: 'normal',
      marginBottom: '5px',
    },
    bulletList: {
      paddingLeft: '20px',
      margin: 0,
    },
    bulletItem: {
      marginBottom: '5px',
    },
  }
  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.title}>Franciscan Columbarium</div>
        <div style={styles.title}>Nominee Consent Form</div>
      </div>

      {/* Applicant Details Table */}
      <table style={styles.table}>
        <thead>
          <tr>
            <th colSpan={3} style={styles.th}>
              Applicant Details
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdLabel}>Niche no.</td>
            <td style={styles.tdColon}>:</td>
            <td style={styles.tdValue}>{data.nicheNo}</td>
          </tr>
          <tr>
            <td style={styles.tdLabel}>Applicant Name</td>
            <td style={styles.tdColon}>:</td>
            <td style={styles.tdValue}>{data.applicantName}</td>
          </tr>
          <tr>
            <td style={styles.tdLabel}>Applicant NRIC</td>
            <td style={styles.tdColon}>:</td>
            <td style={styles.tdValue}>{data.applicantNRIC}</td>
          </tr>
        </tbody>
      </table>

      {/* Nominee Details & Consent Section */}
      <div style={styles.sectionTitle}>Nominee Details & Consent</div>

      <div style={styles.paragraph}>
        I, the undersigned, consent to be a nominee for the abovenamed
        Applicant’s niche at the Franciscan Columbarium. I understand that my
        role and responsibilities of a nominee are to receive notices from the
        Order of Friars Minor (S) Ltd (“Management”) in case the Applicant
        cannot be reached at his/her last known address. In addition, where the
        Applicant is deceased, incapacitated or untraceable, I will assist to
        communicate with and give instructions to the Management, if asked by
        them to do so, on matters relating to the Applicant’s niche. For these
        purposes, I consent to the use by the Management of my personal data set
        out below.
      </div>

      {/* Nominee Details Table */}
      <table style={styles.table}>
        <thead>
          <tr>
            <th colSpan={3} style={styles.th}>
              Nominee/Nominees details
            </th>
          </tr>
        </thead>
        <tbody>
          {/* Nominee 1 */}
          <tr>
            <td rowSpan={5} style={styles.verticalTextCell}>
              <div style={styles.verticalText}>Nominee 1</div>
            </td>
            <td
              style={{
                ...styles.td,
                width: '200px',
              }}
            >
              Name as per NRIC
            </td>
            <td style={styles.td}>{data.nominee1?.name}</td>
          </tr>
          <tr>
            <td style={styles.td}>NRIC #</td>
            <td style={styles.td}>{data.nominee1?.nric}</td>
          </tr>
          <tr>
            <td style={styles.td}>Relationship to Applicant</td>
            <td style={styles.td}>{data.nominee1?.relationship}</td>
          </tr>
          <tr>
            <td style={styles.td}>
              <strong>Signature</strong>
            </td>
            <td
              style={{
                ...styles.td,
                height: '40px',
              }}
            >
              {/* Signature placeholder */}
            </td>
          </tr>
          <tr>
            <td style={styles.td}>Date</td>
            <td style={styles.td}>{data.nominee1?.date}</td>
          </tr>

          {/* Nominee 2 */}
          <tr>
            <td rowSpan={5} style={styles.verticalTextCell}>
              <div style={styles.verticalText}>Nominee 2</div>
            </td>
            <td
              style={{
                ...styles.td,
                width: '200px',
              }}
            >
              Name as per NRIC
            </td>
            <td style={styles.td}>{data.nominee2?.name}</td>
          </tr>
          <tr>
            <td style={styles.td}>NRIC #</td>
            <td style={styles.td}>{data.nominee2?.nric}</td>
          </tr>
          <tr>
            <td style={styles.td}>Relationship to Applicant</td>
            <td style={styles.td}>{data.nominee2?.relationship}</td>
          </tr>
          <tr>
            <td style={styles.td}>
              <strong>Signature</strong>
            </td>
            <td
              style={{
                ...styles.td,
                height: '40px',
              }}
            >
              {/* Signature placeholder */}
            </td>
          </tr>
          <tr>
            <td style={styles.td}>Date</td>
            <td style={styles.td}>{data.nominee2?.date}</td>
          </tr>
        </tbody>
      </table>

      {/* Note Section */}
      <div style={styles.noteSection}>
        <div style={styles.noteTitle}>Note:</div>
        <ul style={styles.bulletList}>
          <li style={styles.bulletItem}>
            All nominees must be present at the time of niche application and
            must initial next to their names to consent to their nomination.
          </li>
          <li style={styles.bulletItem}>
            If a nominee cannot be present at that time, this signed Consent
            must be submitted before the niche application will be accepted by
            the Management.
          </li>
        </ul>
      </div>
    </div>
  )
}

const express = require('express')
const app = express()

// Mock data based on the images provided
const mockNicheAgreementData = {
  success: true,
  data: {
    applicationNumber: "3795-1",
    appliedDate: "2023-01-15T00:00:00.000Z",
    agreementDate: "2023-01-20T00:00:00.000Z",
    
    // Contact Person (Applicant) Details - from image
    applicant: {
      name: "Gabriella Wong Lye Ying",
      address: "343 Choa Chu Kang Loop #06-43, Singapore, 680345",
      email: "test@gmail.com",
      idNo: "0000000000",
      mobileNo: "0000000000",
      homeTelNo: "0000000000",
      officeTelNo: "",
      isCatholic: true,
      status: "Active",
      religion: "Catholic"
    },
    
    // Beneficiary Details - from image
    beneficiaries: [
      {
        name: "Monica Pang Oi Moi",
        idNo: "S0399339F",
        isCatholic: true,
        isMale: false,
        relationshipToApplicant: "Mother",
        dateOfBirth: "1936-08-27T00:00:00.000Z",
        birthYear: 1936,
        relationshipToNominee1: null,
        relationshipToNominee2: null,
        status: "Occupied",
        sex: "Female"
      },
      {
        name: "Peter Wong Ngok Heong",
        idNo: "S0399340Z",
        isCatholic: true,
        isMale: true,
        relationshipToApplicant: "Father",
        dateOfBirth: "1932-11-03T00:00:00.000Z",
        birthYear: 1932,
        relationshipToNominee1: null,
        relationshipToNominee2: null,
        status: "Occupied",
        sex: "Male"
      }
    ],
    
    // Nominee Details - from image
    nominee: {
      name: "Denis Yu Wen Hui",
      address: "10B Boon Tiong Road #27-533, Singapore 164010",
      email: "test@gmail.com",
      idNo: "0000000000",
      mobileNo: "0000000000",
      homeTelNo: "0000000000",
      officeTelNo: "",
      relationship: "Nephew",
      status: "Active"
    },
    
    nominee2: {
      name: "Marcus Leong Jun Wen",
      address: "343 Choa Chu Kang Loop #06-43, Singapore 680345",
      email: "test@gmail.com",
      idNo: "0000000000",
      mobileNo: "0000000000",
      homeTelNo: "0000000000",
      officeTelNo: "",
      relationship: "Son",
      status: "Active"
    },
    
    // Niche Details
    niche: {
      number: "3795",
      rowNumber: null,
      wallName: null,
      chapelName: null,
      totalAmount: 5000.00,
      lineAmount: 5000.00
    },
    
    // Invoice Details (if available)
    invoice: {
      invoiceNo: "INV-2023-001",
      invoiceDate: "2023-01-20T00:00:00.000Z",
      receiptAmount: 5000.00,
      taxAmount: 0.00,
      invoicePayingAmount: 5000.00,
      receiptPayingAmount: 5000.00,
      refDocNumber: "3795-1"
    },
    
    // Consent Form Status
    consentForm: {
      status: "completed",
      timestamp: "2023-01-20T10:30:00.000Z",
      submittedBy: "Gabriella Wong Lye Ying",
      notes: "All consent forms completed"
    },
    
    // Agreement Status
    agreement: {
      status: "completed",
      timestamp: "2023-01-20T10:30:00.000Z",
      signedBy: "Gabriella Wong Lye Ying",
      notes: "Agreement signed and completed"
    },
    
    // Comprehensive Crystal Reports Paths - All available reports
    crystalReports: {
      // Main Agreement Report
      agreement: {
        reportPath: "Reports/NicheAgreement1.rpt",
        reportName: "NicheAgreement1",
        description: "Main Niche Agreement Report",
        parameters: {
          applicationCode: "3795-1",
          applicantName: "Gabriella Wong Lye Ying",
          nicheNumber: "3795"
        }
      },
      
      // Invoice Reports
      invoice: {
        reportPath: "Reports/Invoice_v4.rpt",
        reportName: "Invoice_v4",
        description: "Invoice Report",
        parameters: {
          invoiceNo: "INV-2023-001",
          applicationCode: "3795-1"
        }
      },
      
      // Invoice with Receipt
      invoiceReceipt: {
        reportPath: "Reports/Invoice_Receipt.rpt",
        reportName: "Invoice_Receipt",
        description: "Invoice with Receipt Report",
        parameters: {
          invoiceNo: "INV-2023-001",
          receiptAmount: 5000.00
        }
      },
      
      // Beneficiary Reports - All consent forms
      beneficiaryReports: {
        // First Beneficiary Reports
        firstBeneficiaryLiving: {
          reportPath: "Reports/ConcentForm1stLivingBeneficery.rpt",
          reportName: "ConcentForm1stLivingBeneficery",
          description: "1st Beneficiary Living Consent Form"
        },
        
        firstBeneficiaryDeceased: {
          reportPath: "Reports/ConcentForm1stDecessedBeneficery.rpt",
          reportName: "ConcentForm1stDecessedBeneficery",
          description: "1st Beneficiary Deceased Consent Form"
        },
        
        firstBeneficiaryLostCapacity: {
          reportPath: "Reports/ConcentForm1stLostCapacity.rpt",
          reportName: "ConcentForm1stLostCapacity",
          description: "1st Beneficiary Lost Capacity Consent Form"
        },
        
        // Second Beneficiary Reports
        secondBeneficiaryLiving: {
          reportPath: "Reports/ConcentForm2ndLivingBeneficery.rpt",
          reportName: "ConcentForm2ndLivingBeneficery",
          description: "2nd Beneficiary Living Consent Form"
        },
        
        secondBeneficiaryDeceased: {
          reportPath: "Reports/ConcentForm2ndDecessedBeneficery.rpt",
          reportName: "ConcentForm2ndDecessedBeneficery",
          description: "2nd Beneficiary Deceased Consent Form"
        },
        
        secondBeneficiaryLostCapacity: {
          reportPath: "Reports/ConcentForm2ndLostCapacity.rpt",
          reportName: "ConcentForm2ndLostCapacity",
          description: "2nd Beneficiary Lost Capacity Consent Form"
        },
        
        // Both Beneficiaries Reports
        bothBeneficiariesLiving: {
          reportPath: "Reports/ConcentFormLivingBeneficeries.rpt",
          reportName: "ConcentFormLivingBeneficeries",
          description: "Both Beneficiaries Living Consent Form"
        },
        
        bothBeneficiariesDeceased: {
          reportPath: "Reports/ConcentFormDecessedBeneficeries.rpt",
          reportName: "ConcentFormDecessedBeneficeries",
          description: "Both Beneficiaries Deceased Consent Form"
        },
        
        bothBeneficiariesLostCapacity: {
          reportPath: "Reports/ConcentFormLostCapacity.rpt",
          reportName: "ConcentFormLostCapacity",
          description: "Both Beneficiaries Lost Capacity Consent Form"
        }
      },
      
      // Nominee Agreement Reports
      nomineeReports: {
        // Second Nominee Agreement (as seen in the UI)
        secondNomineeAgreement: {
          reportPath: "Reports/ChangeNominee.rpt",
          reportName: "ChangeNominee",
          description: "2nd Nominee Agreement Report"
        }
      },
      
      // Inscription Reports
      inscriptionReports: {
        inscription: {
          reportPath: "Reports/Inscription.rpt",
          reportName: "Inscription",
          description: "Inscription Report"
        },
        
        inscriptionLive: {
          reportPath: "Reports/Inscriptionlive.rpt",
          reportName: "Inscriptionlive",
          description: "Live Inscription Report"
        },
        
        inscriptionNew: {
          reportPath: "Reports/Inscriptionnew.rpt",
          reportName: "Inscriptionnew",
          description: "New Inscription Report"
        },
        
        secondInscription: {
          reportPath: "Reports/2ndInscription.rpt",
          reportName: "2ndInscription",
          description: "Second Inscription Report"
        },
        
        secondBenInsertion: {
          reportPath: "Reports/2ndBenInsertion.rpt",
          reportName: "2ndBenInsertion",
          description: "Second Beneficiary Insertion Report"
        }
      },
      
      // Additional Reports
      additionalReports: {
        beneficiaryList: {
          reportPath: "Reports/BeneficiryList.rpt",
          reportName: "BeneficiryList",
          description: "Beneficiary List Report"
        },
        
        monthlyInscription: {
          reportPath: "Reports/MonthlyInscription.rpt",
          reportName: "MonthlyInscription",
          description: "Monthly Inscription Report"
        },
        
        receiptMonthly: {
          reportPath: "Reports/ReceiptMonthlyReport.rpt",
          reportName: "ReceiptMonthlyReport",
          description: "Monthly Receipt Report"
        },
        
        printNiches: {
          reportPath: "Reports/Print Niches.rpt",
          reportName: "Print Niches",
          description: "Print Niches Report"
        },
        
        vacancy: {
          reportPath: "Reports/Vacancy.rpt",
          reportName: "Vacancy",
          description: "Vacancy Report"
        },
        
        chapelMonth: {
          reportPath: "Reports/ChapelMonth.rpt",
          reportName: "ChapelMonth",
          description: "Chapel Month Report"
        }
      }
    },
    
    // Print-ready flags
    printReady: {
      agreementReady: true,
      invoiceReady: true,
      receiptReady: true,
      consentFormReady: true
    },
    
    // Metadata
    metadata: {
      generatedAt: "2025-10-22T20:56:00.000Z",
      applicationNumber: "3795-1",
      hasInvoice: true,
      hasReceipt: true,
      beneficiaryCount: 2,
      nomineeCount: 2
    }
  },
  message: "Niche agreement details retrieved successfully"
}

// Mock API endpoint
app.get('/api/niche-agreements/3795-1', (req, res) => {
  res.json(mockNicheAgreementData)
})

// Mock Crystal Reports endpoint
app.get('/api/niche-agreements/3795-1/reports', (req, res) => {
  res.json({
    success: true,
    data: mockNicheAgreementData.data.crystalReports,
    message: "Crystal Reports information retrieved successfully"
  })
})

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: 'development',
    version: '1.0.0'
  })
})

const PORT = 3000
app.listen(PORT, () => {
  console.log(`🚀 Mock API Server running on http://localhost:${PORT}`)
  console.log(`📋 Available endpoints:`)
  console.log(`   GET /api/niche-agreements/3795-1 - Complete niche agreement data`)
  console.log(`   GET /api/niche-agreements/3795-1/reports - Crystal Reports paths only`)
  console.log(`   GET /health - Health check`)
  console.log(`\n✨ This mock API demonstrates the complete structure with all Crystal Reports paths`)
  console.log(`📊 Based on the ASP.NET application data from the provided images`)
})

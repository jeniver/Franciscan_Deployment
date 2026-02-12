import React, { useState, useRef } from 'react'
import {
  XIcon,
  DownloadIcon,
  PrinterIcon,
  Maximize2Icon,
  Minimize2Icon,
} from 'lucide-react'
import { AGREEMENT_DEFAULTS } from '../components/common/FranciscanLogo'

interface InscriptionAgreementViewerModalProps {
  isOpen: boolean
  onClose: () => void
  agreementData: any | null
  inscriptionCode: string
  loading?: boolean
}

interface DeceasedDetails {
  name: string
  deathCertNo: string
  dateBorn: string
  dateDied: string
}

interface PaymentItem {
  date: string
  invReceipt: string
  description: string
  amount: number
  gst: string
  totalAmount: number
}

export function InscriptionAgreementViewerModal({
  isOpen,
  onClose,
  agreementData,
  inscriptionCode,
  loading = false,
}: InscriptionAgreementViewerModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  // Helper function to get all computed styles as inline styles
  const getComputedStylesAsString = (element: Element): string => {
    const computedStyle = window.getComputedStyle(element)
    let styleString = ''
    for (let i = 0; i < computedStyle.length; i++) {
      const prop = computedStyle[i]
      styleString += `${prop}:${computedStyle.getPropertyValue(prop)};`
    }
    return styleString
  }

  // Deep clone with computed styles
  const cloneWithStyles = (element: HTMLElement): HTMLElement => {
    const clone = element.cloneNode(true) as HTMLElement
    // Apply computed styles to the clone and all its children
    const applyStyles = (original: Element, cloned: Element) => {
      if (original instanceof HTMLElement && cloned instanceof HTMLElement) {
        cloned.style.cssText = getComputedStylesAsString(original)
      }
      const originalChildren = original.children
      const clonedChildren = cloned.children
      for (let i = 0; i < originalChildren.length; i++) {
        if (clonedChildren[i]) {
          applyStyles(originalChildren[i], clonedChildren[i])
        }
      }
    }
    applyStyles(element, clone)
    return clone
  }

  const handlePrint = () => {
    if (!contentRef.current) return
    // Clone with all computed styles
    const styledClone = cloneWithStyles(contentRef.current)
    // Create print window
    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) {
      alert('Please allow popups to print the document')
      return
    }
    // Write the document with the styled clone
    const printStyles = `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family: Arial, sans-serif;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      @media print {
        body {
          margin: 0;
          padding: 0;
        }
        @page {
          size: A4;
          margin: 5mm;
        }
      }
    `
    printWindow.document.write(
      '<!DOCTYPE html><html><head>' +
      '<title>Inscription Agreement - ' +
      inscriptionCode +
      '</title>' +
      '<style>' +
      printStyles +
      '</style>' +
      '</head><body>' +
      styledClone.outerHTML +
      '</body></html>',
    )
    printWindow.document.close()
    // Wait for images to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus()
        printWindow.print()
      }, 500)
    }
  }

  const handleDownloadPdf = async () => {
    if (!contentRef.current) return
    setIsGeneratingPdf(true)
    try {
      // Check if html2pdf is already loaded
      let html2pdf = (window as any).html2pdf
      if (!html2pdf) {
        // Dynamically load html2pdf from CDN
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script')
          script.src =
            'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('Failed to load PDF library'))
          document.head.appendChild(script)
        })
        html2pdf = (window as any).html2pdf
      }
      // Clone with all computed styles
      const styledClone = cloneWithStyles(contentRef.current)
      // Create a container with proper dimensions
      const container = document.createElement('div')
      container.style.position = 'absolute'
      container.style.left = '-9999px'
      container.style.top = '0'
      container.style.width = '210mm'
      container.style.backgroundColor = 'white'
      container.appendChild(styledClone)
      document.body.appendChild(container)
      // Wait a bit for styles to apply
      await new Promise((resolve) => setTimeout(resolve, 100))
      // PDF options
      const opt = {
        margin: [5, 5, 5, 5],
        filename: `Inscription-Agreement-${inscriptionCode}.pdf`,
        image: {
          type: 'jpeg',
          quality: 0.98,
        },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          letterRendering: true,
          allowTaint: true,
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
        },
        pagebreak: {
          mode: ['avoid-all', 'css', 'legacy'],
        },
      }
      // Generate and save PDF
      await html2pdf().set(opt).from(container).save()
      // Cleanup
      setTimeout(() => {
        if (document.body.contains(container)) {
          document.body.removeChild(container)
        }
      }, 1000)
    } catch (error: any) {
      console.error('Error generating PDF:', error)
      alert(
        'PDF generation failed. Please try the Print option and save as PDF.',
      )
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  if (!isOpen) return null

  // Map backend data to component props
  const mapAgreementDataToProps = (data: any) => {
    if (!data) return null

    // Format deceased details
    const deceased1: DeceasedDetails = data.deceased?.[0] ? {
      name: data.deceased[0].name || '',
      deathCertNo: data.deceased[0].deathCertificateNo || '',
      dateBorn: data.deceased[0].dateOfBirth ? new Date(data.deceased[0].dateOfBirth).toLocaleDateString('en-SG') : '',
      dateDied: data.deceased[0].dateOfDeath ? new Date(data.deceased[0].dateOfDeath).toLocaleDateString('en-SG') : '',
    } : {
      name: '',
      deathCertNo: '',
      dateBorn: '',
      dateDied: '',
    }

    const deceased2: DeceasedDetails = data.deceased?.[1] ? {
      name: data.deceased[1].name || '',
      deathCertNo: data.deceased[1].deathCertificateNo || '',
      dateBorn: data.deceased[1].dateOfBirth ? new Date(data.deceased[1].dateOfBirth).toLocaleDateString('en-SG') : '',
      dateDied: data.deceased[1].dateOfDeath ? new Date(data.deceased[1].dateOfDeath).toLocaleDateString('en-SG') : '',
    } : {
      name: '',
      deathCertNo: '',
      dateBorn: '',
      dateDied: '',
    }

    // Format payments (this would come from invoice data in a real implementation)
    const payments = [
      {
        date: data.formattedDate || '',
        invReceipt: '',
        description: 'Inscription',
        amount: 400.0,
        gst: '$ 36.00',
        totalAmount: 436.0,
      }
    ]

    return {
      inscriptionNo: data.inscriptionCode || inscriptionCode,
      chapelName: data.niche?.chapel || '',
      nicheNo: data.niche?.code || '',
      applicantName: data.applicant?.name || '',
      address: data.applicant?.address || '',
      telOff: data.applicant?.phone || '',
      telRes: '',
      telHP: data.applicant?.mobile || '',
      crossType: data.inscription?.crossType || 'Crucifix',
      deceased1: deceased1,
      deceased2: deceased2,
      bibleInscriptionNumber: data.inscription?.bibleChoiceId || '',
      dateOfInterment: deceased1.dateDied || '',
      timeOfInterment: '11:00AM', // Default value
      bibleInscriptionText: data.inscription?.bibleText || data.inscription?.additionalPhrase || '',
      payments: payments,
      signatureName: data.applicant?.name || '',
      signatureDate: data.formattedDate || new Date().toLocaleDateString('en-SG'),
    }
  }

  const mappedProps = mapAgreementDataToProps(agreementData)

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-75 transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className={`fixed inset-0 flex items-center justify-center p-4 transition-all ${isFullscreen ? 'p-0' : ''}`}
      >
        <div
          className={`relative bg-white rounded-lg shadow-2xl flex flex-col transition-all ${isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-6xl h-[90vh]'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-[#8b2828] to-[#7d1f1f] px-6 py-4 rounded-t-lg flex items-center justify-between z-10">
            <h2 className="text-xl font-bold text-white">
              Inscription Agreement - {inscriptionCode}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleFullscreen}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize2Icon className="w-5 h-5" />
                ) : (
                  <Maximize2Icon className="w-5 h-5" />
                )}
              </button>

              <button
                onClick={handlePrint}
                disabled={isGeneratingPdf || loading}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Print Agreement"
              >
                <PrinterIcon className="w-5 h-5" />
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf || loading}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download PDF"
              >
                <DownloadIcon className="w-5 h-5" />
              </button>

              <button
                onClick={onClose}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto relative bg-gray-50">
            {loading && !agreementData ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#8b2828] mb-4"></div>
                  <p className="text-gray-600">Loading inscription agreement...</p>
                </div>
              </div>
            ) : isGeneratingPdf ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-75 z-20">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#8b2828] mb-4"></div>
                  <p className="text-gray-600">Generating PDF...</p>
                </div>
              </div>
            ) : agreementData && mappedProps ? (
              <div ref={contentRef} className="p-4">
                <InscriptionAgreementView {...mappedProps} />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-8">
                  <p className="text-gray-600">No inscription agreement data available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// The existing InscriptionGreementView component with proper prop mapping
function InscriptionAgreementView({
  inscriptionNo = 'I-5674-0',
  chapelName = 'St Margaret',
  nicheNo = '5674',
  applicantName = 'Jamus Yuen Yee Cheong',
  address = 'Block 63, Bishan Street 21 #06-04 Tower A1\nSingapore 574045',
  telOff = '',
  telRes = '',
  telHP = '9688-1841',
  crossType = 'Crucifix',
  deceased1 = {
    name: 'Jimmy Yuen Yu Jim',
    deathCertNo: '903257F',
    dateBorn: '30-Jun-1950',
    dateDied: '25-Jan-2026',
  },
  deceased2 = {
    name: '',
    deathCertNo: '',
    dateBorn: '',
    dateDied: '',
  },
  bibleInscriptionNumber = '',
  dateOfInterment = '30-Jan-2026',
  timeOfInterment = '11:00AM',
  bibleInscriptionText = 'Come, O blessed of my Father, inherit the kingdom prepared for you from the foundation of',
  payments = [
    {
      date: '27-January-2026',
      invReceipt: '53299',
      description: 'Inscription',
      amount: 400.0,
      gst: '$ 36.00',
      totalAmount: 436.0,
    },
  ],
  signatureName = 'Jamus Yuen Yee Cheong',
  signatureDate = '02-02-2026',
}: {
  inscriptionNo?: string
  chapelName?: string
  nicheNo?: string
  applicantName?: string
  address?: string
  telOff?: string
  telRes?: string
  telHP?: string
  crossType?: string
  deceased1?: DeceasedDetails
  deceased2?: DeceasedDetails
  bibleInscriptionNumber?: string
  dateOfInterment?: string
  timeOfInterment?: string
  bibleInscriptionText?: string
  payments?: PaymentItem[]
  signatureName?: string
  signatureDate?: string
}) {
  return (
    <div className="w-full max-w-[800px] bg-white p-6 md:p-8 mx-auto text-black font-sans text-[11px] leading-tight">
      {/* Header */}
      <div className="mb-4">
        <p className="text-xs">Franciscan Columbarium a ministry of</p>
        <p className="font-bold text-sm mt-1">
          The Order of Friars Minor (Singapore) Ltd Co & GST Reg No.{' '}
          {AGREEMENT_DEFAULTS.orderRegNo}
        </p>
        <p className="text-[10px] text-gray-600">(Co. Reg.No.201016323M)</p>
        <p className="text-[10px]">{AGREEMENT_DEFAULTS.orderAddress}</p>
        <p className="text-[10px]">
          Telephone : {AGREEMENT_DEFAULTS.orderTel}, &nbsp; Fax : 6566-2852,
          &nbsp; E-mail : {AGREEMENT_DEFAULTS.orderEmail}
        </p>
      </div>

      {/* Title */}
      <h1 className="text-center text-xl italic font-serif mb-4">
        "Request for inscription plaque"
      </h1>

      {/* Inscription No */}
      <div className="flex justify-end mb-4 text-xs">
        <span>Inscription No :</span>
        <span className="ml-4 font-medium">{inscriptionNo}</span>
      </div>

      {/* Chapel and Niche */}
      <table className="w-full border-collapse border border-black text-[10px] mb-3">
        <tbody>
          <tr>
            <td className="border border-black px-2 py-1.5 w-24 bg-gray-100 font-medium">
              Name of Chapel
            </td>
            <td className="border border-black px-2 py-1.5">{chapelName}</td>
            <td className="border border-black px-2 py-1.5 w-20 bg-gray-100 font-medium">
              Niche No
            </td>
            <td className="border border-black px-2 py-1.5 w-20">{nicheNo}</td>
          </tr>
        </tbody>
      </table>

      {/* Applicant Details */}
      <table className="w-full border-collapse border border-black text-[10px] mb-3">
        <tbody>
          <tr>
            <td className="border border-black px-2 py-1.5 w-28 bg-gray-100 font-medium">
              Name of Applicant
            </td>
            <td className="border border-black px-2 py-1.5" colSpan={3}>
              {applicantName}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1.5 bg-gray-100 font-medium">
              Address
            </td>
            <td
              className="border border-black px-2 py-1.5 whitespace-pre-line"
              colSpan={3}
            >
              {address}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1.5 bg-gray-100 font-medium">
              Tel(Off)
            </td>
            <td className="border border-black px-2 py-1.5 w-28">{telOff}</td>
            <td className="border border-black px-2 py-1.5 bg-gray-100 font-medium w-16">
              Tel(Res)
            </td>
            <td className="border border-black px-2 py-1.5 w-28">{telRes}</td>
            <td className="border border-black px-2 py-1.5 bg-gray-100 font-medium w-16">
              Tel(HP)
            </td>
            <td className="border border-black px-2 py-1.5 w-24">{telHP}</td>
          </tr>
        </tbody>
      </table>

      {/* Details of Deceased No.1 */}
      <div className="mb-1">
        <div className="flex items-center gap-4 mb-1">
          <span className="font-bold text-[10px] bg-gray-100 px-2 py-0.5 border border-black">
            Details of Deceased No.1
          </span>
          <span className="text-[10px]">Cross Type :</span>
          <span className="text-[10px] font-medium">{crossType}</span>
        </div>
      </div>

      <table className="w-full border-collapse border border-black text-[10px] mb-3">
        <tbody>
          <tr>
            <td className="border border-black px-2 py-1.5 w-36 bg-gray-100 font-medium">
              Name Of Deceased No.1
            </td>
            <td className="border border-black px-2 py-1.5">
              {deceased1.name}
            </td>
            <td className="border border-black px-2 py-1.5 w-24 bg-gray-100 font-medium">
              Death Cert No:
            </td>
            <td className="border border-black px-2 py-1.5 w-24">
              {deceased1.deathCertNo}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1.5 bg-gray-100 font-medium">
              Date Born
            </td>
            <td className="border border-black px-2 py-1.5">
              {deceased1.dateBorn}
            </td>
            <td className="border border-black px-2 py-1.5 bg-gray-100 font-medium">
              Date Died
            </td>
            <td className="border border-black px-2 py-1.5">
              {deceased1.dateDied}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Details of Deceased No.2 */}
      <div className="mb-1">
        <span className="font-bold text-[10px] bg-gray-100 px-2 py-0.5 border border-black">
          Details of Deceased No.2
        </span>
      </div>

      <table className="w-full border-collapse border border-black text-[10px] mb-3">
        <tbody>
          <tr>
            <td className="border border-black px-2 py-1.5 w-36 bg-gray-100 font-medium">
              Name Of Deceased No.2
            </td>
            <td className="border border-black px-2 py-1.5">
              {deceased2.name}
            </td>
            <td className="border border-black px-2 py-1.5 w-24 bg-gray-100 font-medium">
              Death Cert No:
            </td>
            <td className="border border-black px-2 py-1.5 w-24">
              {deceased2.deathCertNo}
            </td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1.5 bg-gray-100 font-medium">
              Date Born
            </td>
            <td className="border border-black px-2 py-1.5">
              {deceased2.dateBorn}
            </td>
            <td className="border border-black px-2 py-1.5 bg-gray-100 font-medium">
              Date Died
            </td>
            <td className="border border-black px-2 py-1.5">
              {deceased2.dateDied}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Bible Inscription and Interment */}
      <div className="flex gap-4 mb-3">
        <div className="border border-black p-2 w-48">
          <p className="text-[9px] text-gray-600 mb-1">
            Bible Inscription of choice number
          </p>
          <p className="text-[10px]">{bibleInscriptionNumber}</p>
        </div>
        <div className="flex-1">
          <table className="w-full border-collapse border border-black text-[10px]">
            <tbody>
              <tr>
                <td className="border border-black px-2 py-1 bg-gray-100 font-medium w-28">
                  Date of Interment :
                </td>
                <td className="border border-black px-2 py-1">
                  {dateOfInterment}
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-1 bg-gray-100 font-medium">
                  Time:
                </td>
                <td className="border border-black px-2 py-1">
                  {timeOfInterment}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Bible Inscription Text */}
      <p className="text-[9px] text-gray-600 mb-1">
        Bible Inscription or phrases of your choice(max 80 chars)
      </p>
      <p className="text-[9px] text-gray-500 mb-1">
        This is subject to the approval of our Franciscan Friars Custos
      </p>
      <p className="text-[10px] italic mb-4">{bibleInscriptionText}</p>

      {/* Payment Details */}
      <div className="border border-black mb-6">
        <div className="bg-gray-100 px-2 py-1.5 border-b border-black">
          <p className="font-bold text-[10px]">
            Payment Details: Cheque made payable to' The Order of Friars Minor
            (S) Ltd-Columbarium"
          </p>
          <p className="text-[9px]">
            (1st name = $400, 2nd name = $300, 2 names together = $650)
          </p>
          <p className="text-[9px] font-medium">
            Prices subject to change without notice)
          </p>
        </div>

        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-black px-2 py-1 text-left font-bold">
                Date
              </th>
              <th className="border border-black px-2 py-1 text-left font-bold">
                Inv/ Receipt
              </th>
              <th className="border border-black px-2 py-1 text-left font-bold">
                Description
              </th>
              <th className="border border-black px-2 py-1 text-right font-bold">
                Amount
              </th>
              <th className="border border-black px-2 py-1 text-right font-bold">
                GST
              </th>
              <th className="border border-black px-2 py-1 text-right font-bold">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment, index) => (
              <tr key={index}>
                <td className="border border-black px-2 py-1.5">
                  {payment.date}
                </td>
                <td className="border border-black px-2 py-1.5">
                  {payment.invReceipt}
                </td>
                <td className="border border-black px-2 py-1.5 whitespace-pre-line">
                  {payment.description}
                </td>
                <td className="border border-black px-2 py-1.5 text-right">
                  {payment.amount > 0 ? `$ ${payment.amount.toFixed(2)}` : ''}
                </td>
                <td className="border border-black px-2 py-1.5 text-right">
                  {payment.gst}
                </td>
                <td className="border border-black px-2 py-1.5 text-right">
                  $ {payment.totalAmount.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Consent Text */}
      <div className="border-t border-black pt-4 mt-8">
        <p className="text-[9px] leading-relaxed mb-6">
          By submitting this form I consent to my personal data being collected,
          used or disclosed by the Order of Friars Minor (S) Ltd in accordance
          with its Personal Data Protection Policy Statement which may be found
          at
          <span className="underline ml-1">www.franciscans.sg</span>. We have
          checked and confirmed that the information given above is correct.
        </p>
      </div>

      {/* Signature */}
      <div className="mt-8">
        <div className="w-64 border-t border-black mb-4"></div>
        <div className="grid grid-cols-[60px_1fr] gap-y-1 text-[10px]">
          <span className="font-medium">Name:</span>
          <span>{signatureName}</span>
          <span className="font-medium">Date :</span>
          <span>{signatureDate}</span>
        </div>
      </div>
    </div>
  )
}
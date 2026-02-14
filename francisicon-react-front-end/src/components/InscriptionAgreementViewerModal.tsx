import { useState, useRef, useEffect } from 'react'
import {
  XIcon,
  DownloadIcon,
  PrinterIcon,
  Maximize2Icon,
  Minimize2Icon,
  AlertCircleIcon,
} from 'lucide-react'
import inscriptionAgreementService, {
  InscriptionAgreementData,
  InscriptionAgreementError,
} from '../services/inscriptionAgreementService'

interface InscriptionAgreementViewerModalProps {
  isOpen: boolean
  onClose: () => void
  inscriptionCode: string
  initialData?: InscriptionAgreementData | null
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
  inscriptionCode,
  initialData = null,
}: InscriptionAgreementViewerModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [loading, setLoading] = useState(false)
  const [agreementData, setAgreementData] = useState<InscriptionAgreementData | null>(initialData)
  const [error, setError] = useState<string | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Fetch inscription agreement data when modal opens
  useEffect(() => {
    if (isOpen && inscriptionCode && !agreementData && !initialData) {
      const fetchAgreementData = async () => {
        setLoading(true)
        setError(null)
        try {
          const data = await inscriptionAgreementService.getPdfData(inscriptionCode)
          setAgreementData(data)
        } catch (err: any) {
          if (err instanceof InscriptionAgreementError) {
            setError(err.message)
          } else {
            setError('Failed to load inscription agreement')
          }
          console.error('Error fetching inscription agreement:', err)
        } finally {
          setLoading(false)
        }
      }

      fetchAgreementData()
    }
  }, [isOpen, inscriptionCode, agreementData, initialData])

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
  const mapAgreementDataToProps = (data: InscriptionAgreementData) => {
    if (!data) return null

    // Format deceased details using enhanced formatted dates if available
    const deceased1 = data.deceased?.[0] ? {
      name: data.deceased[0].name || '',
      deathCertNo: data.deceased[0].deathCertificateNo || '',
      dateBorn: data.deceased[0].formattedDates?.birth || 
                (data.deceased[0].dateOfBirth 
                  ? new Date(data.deceased[0].dateOfBirth).toLocaleDateString('en-SG') 
                  : ''),
      dateDied: data.deceased[0].formattedDates?.death || 
                (data.deceased[0].dateOfDeath 
                  ? new Date(data.deceased[0].dateOfDeath).toLocaleDateString('en-SG') 
                  : ''),
    } : {
      name: '',
      deathCertNo: '',
      dateBorn: '',
      dateDied: '',
    }

    const deceased2 = data.deceased?.[1] ? {
      name: data.deceased[1].name || '',
      deathCertNo: data.deceased[1].deathCertificateNo || '',
      dateBorn: data.deceased[1].formattedDates?.birth || 
                (data.deceased[1].dateOfBirth 
                  ? new Date(data.deceased[1].dateOfBirth).toLocaleDateString('en-SG') 
                  : ''),
      dateDied: data.deceased[1].formattedDates?.death || 
                (data.deceased[1].dateOfDeath 
                  ? new Date(data.deceased[1].dateOfDeath).toLocaleDateString('en-SG') 
                  : ''),
    } : {
      name: '',
      deathCertNo: '',
      dateBorn: '',
      dateDied: '',
    }

    // Format address properly - use the full address from data if available
    const formattedAddress = data.applicant?.address || '';

    // Format payments - use from data if available, fallback to default
    const payments = data.payments && data.payments.length > 0 
      ? data.payments 
      : [
          {
            date: data.formattedDate || new Date().toLocaleDateString('en-SG'),
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
      address: formattedAddress,
      telOff: data.applicant?.phone || data.contactPerson?.phone || '',
      telRes: data.contactPerson?.phone || '',  // Use contact person phone if available
      telHP: data.applicant?.mobile || data.contactPerson?.mobile || '',
      crossType: data.inscription?.crossType || 'Crucifix',
      deceased1: deceased1,
      deceased2: deceased2,
      bibleInscriptionNumber: data.inscription?.bibleChoiceId?.toString() || '',
      dateOfInterment: data.deceased?.[0]?.formattedDates?.internment || 
                       data.deceased?.[0]?.internmentDate || 
                       deceased1.dateDied || '',
      timeOfInterment: '11:00AM', // Default value
      bibleInscriptionText: data.inscription?.fullInscription || 
                           data.inscription?.bibleText || 
                           data.inscription?.additionalPhrase || 
                           data.inscription?.remarks || '',
      payments: payments,
      signatureName: data.applicant?.name || '',
      signatureDate: data.formattedDate || new Date().toLocaleDateString('en-SG'),
    }
  }

  const mappedProps = agreementData ? mapAgreementDataToProps(agreementData) : null

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
            ) : error ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-8 max-w-md">
                  <AlertCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Failed to Load</h3>
                  <p className="text-gray-600 mb-4">{error}</p>
                  <button
                    onClick={() => {
                      setError(null)
                      setAgreementData(null)
                    }}
                    className="bg-[#8b2828] hover:bg-[#7d1f1f] text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Try Again
                  </button>
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

// The new Inscription Agreement View component with exact template matching
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
    <div className="w-full max-w-[210mm] mx-auto bg-white p-12 shadow-lg text-black font-serif text-sm leading-tight print:shadow-none print:p-0">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-bold text-sm">
          Franciscan Columbarium a ministry of
        </h1>
        <h2 className="font-bold text-sm">
          The Order of Friars Minor (Singapore) Ltd Co & GST Reg No. 2010163236M
        </h2>
        <p>(Co Reg no.201016236M)</p>
        <p>5 Bukit Batok East Ave 2</p>
        <p>Singapore 659918</p>
        <p>
          Telephone : 6560-6361, Fax : 6566-2852, E-mail :
          franciscan.columbarium@gmail.com
        </p>
      </div>

      {/* Title */}
      <h2 className="text-center italic text-xl mb-4">
        "Request for inscription plaque"
      </h2>

      {/* Inscription No */}
      <div className="flex justify-end items-baseline mb-2">
        <span className="mr-2">Inscription No :</span>
        <span className="w-24 text-center">{inscriptionNo}</span>
      </div>

      {/* Table 1 - Chapel Info */}
      <div className="border border-black mb-4">
        <div className="flex">
          <div className="w-32 p-1 border-r border-black">Name of Chapel</div>
          <div className="flex-1 p-1 border-r border-black">{chapelName}</div>
          <div className="w-24 p-1 border-r border-black">Niche No</div>
          <div className="w-24 p-1">{nicheNo}</div>
        </div>
      </div>

      {/* Table 2 - Applicant Info */}
      <div className="border border-black mb-4">
        <div className="flex border-b border-black">
          <div className="w-32 p-1 border-r border-black">
            Name of Applicant
          </div>
          <div className="flex-1 p-1">{applicantName}</div>
        </div>
        <div className="flex border-b border-black">
          <div className="w-32 p-1 border-r border-black h-12">Address</div>
          <div className="flex-1 p-1 whitespace-pre-line">
            {address}
          </div>
        </div>
        <div className="flex">
          <div className="w-32 p-1 border-r border-black">Tel(Off)</div>
          <div className="flex-1 p-1 border-r border-black">{telOff}</div>
          <div className="w-24 p-1 border-r border-black">Tel(Res)</div>
          <div className="flex-1 p-1 border-r border-black">{telRes}</div>
          <div className="w-24 p-1 border-r border-black">Tel(HP)</div>
          <div className="w-32 p-1">{telHP}</div>
        </div>
      </div>

      {/* Table 3 - Details of Deceased No.1 */}
      <div className="border border-black mb-4">
        <div className="bg-gray-100 border-b border-black flex font-bold">
          <div className="flex-1 p-1 border-r border-black">
            Details of Deceased No.1
          </div>
          <div className="w-64 flex">
            <div className="w-24 p-1 text-right pr-2">Cross Type :</div>
            <div className="flex-1 p-1 pl-2">{crossType}</div>
          </div>
        </div>
        <div className="flex border-b border-black">
          <div className="w-40 p-1 border-r border-black">
            Name Of Deceased No.1
          </div>
          <div className="flex-1 p-1 border-r border-black">
            {deceased1.name}
          </div>
          <div className="w-24 p-1 border-r border-black">Death Cert No:</div>
          <div className="w-32 p-1">{deceased1.deathCertNo}</div>
        </div>
        <div className="flex">
          <div className="w-40 p-1 border-r border-black">Date Born</div>
          <div className="flex-1 p-1 border-r border-black">{deceased1.dateBorn}</div>
          <div className="w-24 p-1 border-r border-black">Date Died</div>
          <div className="w-32 p-1">{deceased1.dateDied}</div>
        </div>
      </div>

      {/* Table 4 - Details of Deceased No.2 */}
      <div className="border border-black mb-6">
        <div className="bg-gray-100 border-b border-black p-1 font-bold">
          Details of Deceased No.2
        </div>
        <div className="flex border-b border-black">
          <div className="w-40 p-1 border-r border-black">
            Name Of Deceased No.2
          </div>
          <div className="flex-1 p-1 border-r border-black">{deceased2.name}</div>
          <div className="w-24 p-1 border-r border-black">Death Cert No:</div>
          <div className="w-32 p-1">{deceased2.deathCertNo}</div>
        </div>
        <div className="flex">
          <div className="w-40 p-1 border-r border-black">Date Born</div>
          <div className="flex-1 p-1 border-r border-black">{deceased2.dateBorn}</div>
          <div className="w-24 p-1 border-r border-black">Date Died</div>
          <div className="w-32 p-1">{deceased2.dateDied}</div>
        </div>
      </div>

      {/* Bible Inscription Section */}
      <div className="mb-6">
        <div className="flex items-start mb-2">
          <div className="flex-1">
            <div className="flex items-center mb-2">
              <span className="mr-2">Bible inscription of choice number</span>
              <div className="border border-black w-24 h-8 text-center pt-1">
                {bibleInscriptionNumber}
              </div>
            </div>
          </div>
          <div className="w-64">
            <div className="flex items-baseline mb-2">
              <span className="w-32">Date of interment :</span>
              <span className="flex-1 border-b border-black text-center">
                {dateOfInterment}
              </span>
            </div>
            <div className="flex items-baseline">
              <span className="w-32">Time:</span>
              <span className="flex-1 border-b border-black text-center">
                {timeOfInterment}
              </span>
            </div>
          </div>
        </div>

        <p className="mb-1">
          Bible Inscription or phrases of your choice(max 80 chars)
        </p>
        <p className="mb-2 text-xs italic">
          This is subject to the approval of our Franciscan Friars Custos
        </p>
        <div className="border-b border-black italic pb-1 mb-6">
          {bibleInscriptionText}
        </div>
      </div>

      {/* Payment Details */}
      <div className="border border-black">
        <div className="p-1 border-b border-black font-bold text-xs">
          <p>
            Payment Details: Cheque made payable to" The Order of Friars Minor
            (S) Ltd-Columbarium"
          </p>
          <p>(1st name = $400, 2nd name = $300, 2 names together = $550)</p>
          <p>Prices subject to change without notice)</p>
        </div>

        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-black">
              <th className="border-r border-black p-1 text-left w-24 font-normal">
                Date
              </th>
              <th className="border-r border-black p-1 text-left w-20 font-normal">
                Inv/ Receipt
              </th>
              <th className="border-r border-black p-1 text-left font-normal">
                Description
              </th>
              <th className="border-r border-black p-1 text-left w-20 font-normal">
                Amount
              </th>
              <th className="border-r border-black p-1 text-left w-16 font-normal">
                GST
              </th>
              <th className="p-1 text-right w-20 font-normal">Amount</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment, index) => (
              <tr key={index} className="border-b border-black">
                <td className="border-r border-black p-1">{payment.date}</td>
                <td className="border-r border-black p-1">{payment.invReceipt}</td>
                <td className="border-r border-black p-1 whitespace-pre-line">
                  {payment.description}
                </td>
                <td className="border-r border-black p-1">
                  {payment.amount > 0 ? `$ ${payment.amount.toFixed(2)}` : '-'}
                </td>
                <td className="border-r border-black p-1">{payment.gst}</td>
                <td className="p-1 text-right">$ {payment.totalAmount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Consent and Signature */}
      <div className="w-full max-w-[210mm] min-h-[297mm] mx-auto bg-white p-12 shadow-lg text-black font-serif text-sm leading-tight print:shadow-none print:p-0 flex flex-col">
        <p className="mb-12 leading-relaxed">
          By submitting this form, I consent to my personal data being collected,
          used or disclosed by the Order of Friars Minor (S) Ltd in accordance
          with its Personal Data Protection Policy Statement which may be found at
          www.franciscans.sg. We have checked and confirmed that the information
          given above is correct.
        </p>

        <div className="border-b border-black w-64 mb-2"></div>

        <div className="grid grid-cols-[50px_1fr] gap-2 w-96">
          <span>Name:</span>
          <span>{signatureName}</span>

          <span>Date :</span>
          <span>{signatureDate}</span>
        </div>
      </div>
    </div>
  )
}
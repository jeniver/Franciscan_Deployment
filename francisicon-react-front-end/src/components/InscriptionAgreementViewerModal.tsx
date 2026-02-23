import { useState, useRef, useEffect } from 'react'
import {
  XIcon,
  DownloadIcon,
  PrinterIcon,
  Maximize2Icon,
  Minimize2Icon,
  AlertCircleIcon,
  MailIcon,
  Loader2Icon,
} from 'lucide-react'
import { InscriptionMailModal } from './InscriptionMailModal'
import inscriptionAgreementService, {
  InscriptionAgreementData,
  InscriptionAgreementError,
} from '../services/inscriptionAgreementService'
import { invoiceService } from '../services/invoiceService'
import { paymentModeToLabel } from '../utils/paymentMode'
import addressUtils from '../utils/addressUtils'

interface InscriptionAgreementViewerModalProps {
  isOpen: boolean
  onClose: () => void
  inscriptionCode: string
  initialData?: InscriptionAgreementData | null
  /** When true and initialData is provided, skip fetching - use pre-fetched data (e.g. from InscriptionAgreementPage) */
  skipFetchWhenDataProvided?: boolean
}

export function InscriptionAgreementViewerModal({
  isOpen,
  onClose,
  inscriptionCode,
  initialData = null,
  skipFetchWhenDataProvided = false,
}: InscriptionAgreementViewerModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [loading, setLoading] = useState(false)
  const [agreementData, setAgreementData] = useState<InscriptionAgreementData | null>(initialData)
  const [error, setError] = useState<string | null>(null)
  const [isMailModalOpen, setIsMailModalOpen] = useState(false)
  const [isPreparingEmail, setIsPreparingEmail] = useState(false)
  const [pdfBase64, setPdfBase64] = useState<string | undefined>(undefined)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen || !inscriptionCode) return

    const fetchAgreementData = async () => {
      setLoading(true)
      setError(null)
      try {
        // Use initialData if provided and skipFetch is requested, otherwise fetch base agreement payload
        let data: InscriptionAgreementData | null = (initialData && skipFetchWhenDataProvided) ? initialData : null

        if (!data) {
          data = await inscriptionAgreementService.getPdfData(inscriptionCode)
        }

        // Always try to enrich agreement view with real invoice/receipt details if not already present.
        // We do this to ensure payments are shown even if core data was passed via props.
        if (data && (!data.payments || data.payments.length === 0)) {
          try {
            // Strip I- if searching for invoice to be robust against prefix variations
            const cleanCode = inscriptionCode.startsWith('I-') ? inscriptionCode.substring(2) : inscriptionCode
            const invoiceData = await invoiceService.getInvoiceByCode(inscriptionCode, 'INCR') || await invoiceService.getInvoiceByCode(cleanCode, 'INCR')

            const hasInvoice = Boolean(invoiceData?.hasInvoice && invoiceData?.code)
            const rcpt = invoiceData?.receipt
            const receiptCode = invoiceData?.receiptCode || rcpt?.receiptCode || ''
            const hasReceipt = Boolean(invoiceData?.hasReceipt && receiptCode)

            const fmtPaymentDate = (raw: any) => {
              if (!raw) return ''
              const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
              const pad = (n: number) => String(n).padStart(2, '0')
              const d = new Date(raw)
              if (!isNaN(d.getTime())) return `${pad(d.getDate())}-${months[d.getMonth()]}-${d.getFullYear()}`
              return String(raw).trim()
            }

            const paymentRows: any[] = []
            if (hasInvoice) {
              const invoiceSubtotal = Number(invoiceData?.summary?.subtotal ?? invoiceData?.payingAmount ?? invoiceData?.totalAmount ?? 0)
              const invoiceTax = Number(invoiceData?.summary?.totalTax ?? invoiceData?.taxAmount ?? 0)
              const invoiceTotal = Number(invoiceData?.summary?.grandTotal ?? invoiceData?.totalAmount ?? 0)
              const invoiceDetails = invoiceData?.details || []
              const detailDescriptions = invoiceDetails
                .map((d: any) => d.itemName || d.description || '')
                .filter(Boolean)
                .join(', ')
              paymentRows.push({
                date: fmtPaymentDate(invoiceData?.transactionDate),
                invReceipt: invoiceData?.code || '',
                description: detailDescriptions || invoiceData?.refDocNumber || invoiceData?.applicationCode || inscriptionCode,
                amount: Number.isFinite(invoiceSubtotal) ? invoiceSubtotal : 0,
                gst: Number.isFinite(invoiceTax) ? `$ ${invoiceTax.toFixed(2)}` : '',
                totalAmount: Number.isFinite(invoiceTotal) ? invoiceTotal : 0,
              })
            }

            if (hasReceipt) {
              const resolvedPaymentMode = paymentModeToLabel(
                rcpt?.receiptPaymentMode ?? invoiceData?.receiptPaymentMode ?? invoiceData?.paymentMode
              )
              const receiptAmount = Number(
                rcpt?.receiptPayingAmount ?? invoiceData?.receiptPayingAmount
                ?? rcpt?.receiptTotalAmount ?? invoiceData?.receiptTotalAmount
                ?? invoiceData?.payingAmount ?? 0
              )
              const receiptDate = rcpt?.receiptDate ?? invoiceData?.receiptDate
              paymentRows.push({
                date: fmtPaymentDate(receiptDate),
                invReceipt: receiptCode,
                description: resolvedPaymentMode,
                amount: 0,
                gst: '',
                totalAmount: Number.isFinite(receiptAmount) ? receiptAmount : 0,
              })
            }

            if (data) {
              data = {
                ...data,
                payments: paymentRows
              }
            }
          } catch (enrichErr) {
            console.warn('Silent enrichment failure:', enrichErr)
          }
        }

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
  }, [isOpen, inscriptionCode, initialData])

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
          margin: 10mm 8mm;
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
    const images = Array.from(styledClone.querySelectorAll('img'))
    const imagePromises = images.map(img => {
      if (img.complete) return Promise.resolve()
      return new Promise(resolve => {
        img.onload = resolve
        img.onerror = resolve
      })
    })

    Promise.all(imagePromises).then(() => {
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus()
          printWindow.print()
        }, 500)
      }
    })
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
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
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

      // Wait a bit for images and styles
      const images = Array.from(container.querySelectorAll('img'))
      await Promise.all(images.map(img => {
        if (img.complete) return Promise.resolve()
        return new Promise(resolve => {
          img.onload = resolve
          img.onerror = resolve
        })
      }))

      await new Promise((resolve) => setTimeout(resolve, 100))

      // PDF options
      const opt = {
        margin: [5, 5, 5, 5],
        filename: `Inscription-Agreement-${inscriptionCode}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          letterRendering: true,
          allowTaint: true,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
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
      alert('PDF generation failed. Please try the Print option and save as PDF.')
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const handleEmailAgreement = async () => {
    if (!contentRef.current) return
    setIsPreparingEmail(true)
    try {
      // Load html2pdf if needed
      let html2pdf = (window as any).html2pdf
      if (!html2pdf) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('Failed to load PDF library'))
          document.head.appendChild(script)
        })
        html2pdf = (window as any).html2pdf
      }

      const styledClone = cloneWithStyles(contentRef.current)
      const container = document.createElement('div')
      container.style.position = 'absolute'
      container.style.left = '-9999px'
      container.style.width = '210mm'
      container.appendChild(styledClone)
      document.body.appendChild(container)

      const opt = {
        margin: [5, 5, 5, 5],
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }

      // Wait for images to load in container
      const images = Array.from(container.querySelectorAll('img'))
      await Promise.all(images.map(img => {
        if (img.complete) return Promise.resolve()
        return new Promise(resolve => {
          img.onload = resolve
          img.onerror = resolve
        })
      }))

      // Generate PDF as base64
      const generatedPdf = await html2pdf().set(opt).from(container).outputPdf('datauristring')
      setPdfBase64(generatedPdf)

      // Cleanup
      document.body.removeChild(container)

      // Open email modal
      setIsMailModalOpen(true)
    } catch (error) {
      console.error('Error preparing PDF for email:', error)
      alert('Failed to prepare PDF for email.')
    } finally {
      setIsPreparingEmail(false)
    }
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  if (!isOpen) return null

  // Consistent date formatter: DD-Mon-YYYY (e.g. "19-Feb-2026") matching invoice/receipt
  const formatDate = (raw: string | undefined | null): string => {
    if (!raw) return ''
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const pad = (n: number) => String(n).padStart(2, '0')
    const d = new Date(raw)
    if (!isNaN(d.getTime())) return `${pad(d.getDate())}-${months[d.getMonth()]}-${d.getFullYear()}`
    return String(raw).trim()
  }

  // Map backend data to component props
  const mapAgreementDataToProps = (data: InscriptionAgreementData) => {
    if (!data) return null

    // Build structured address lines using addressUtils (same format as AgreementPdfTemplate)
    // Map inscription agreement fields to the AddressEntity format expected by buildAddressLines
    const applicantAddressEntity = {
      addressNo: data.applicant?.addressNo || '',
      addressLine1: data.applicant?.addressLine1 || '',
      addressLine2: data.applicant?.addressLine2 || '',
      addressCity: data.applicant?.addressCity || '',
      addressState: data.applicant?.addressState || '',
      addressCountry: data.applicant?.addressCountry || '',
    }
    const applicantAddressLines = addressUtils.buildAddressLines(applicantAddressEntity)

    const mapDeceased = (deceased: typeof data.deceased[0] | undefined) => {
      if (!deceased) return { name: '', deathCertNo: '', dateBorn: '', dateDied: '' }
      return {
        name: deceased.name || '',
        deathCertNo: deceased.deathCertificateNo || '',
        dateBorn: deceased.formattedDates?.birth || formatDate(deceased.dateOfBirth),
        dateDied: deceased.formattedDates?.death || formatDate(deceased.dateOfDeath),
      }
    }

    const payments = Array.isArray(data.payments) ? data.payments : []

    return {
      inscriptionNo: data.inscriptionCode || inscriptionCode,
      chapelName: data.niche?.chapel || '',
      nicheNo: data.niche?.code || '',
      applicantName: data.applicant?.name || '',
      addressLines: applicantAddressLines,
      telOff: data.applicant?.phone || (data.applicant as any)?.homeTel || '',
      telRes: data.contactPerson?.mobile || '',
      telHP: data.applicant?.mobile || '',
      crossType: data.inscription?.crossType || 'Crucifix',
      deceased1: mapDeceased(data.deceased?.[0]),
      deceased2: mapDeceased(data.deceased?.[1]),
      bibleInscriptionNumber: data.inscription?.bibleChoiceId?.toString() || '',
      dateOfInterment: data.deceased?.[0]?.formattedDates?.internment || formatDate(data.deceased?.[0]?.internmentDate),
      timeOfInterment: data.deceased?.[0]?.internmentDate
        ? new Date(data.deceased[0].internmentDate!).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).replace(/ /g, '')
        : '',
      bibleInscriptionText: data.inscription?.fullInscription
        || [data.inscription?.bibleChoiceText, data.inscription?.additionalPhrase].filter(Boolean).join('\n')
        || '',
      payments,
      signatureName: data.applicant?.name || '',
      signatureDate: data.formattedDate || formatDate(new Date().toISOString()),
    }
  }

  const mappedProps = agreementData ? mapAgreementDataToProps(agreementData) : null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={onClose} />
      <div className={`fixed inset-0 flex items-center justify-center p-4 transition-all ${isFullscreen ? 'p-0' : ''}`}>
        <div className={`relative bg-white rounded-lg shadow-2xl flex flex-col transition-all ${isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-6xl h-[90vh]'}`} onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-gradient-to-r from-[#8b2828] to-[#7d1f1f] px-6 py-4 rounded-t-lg flex items-center justify-between z-10">
            <h2 className="text-xl font-bold text-white">Inscription Agreement - {inscriptionCode}</h2>
            <div className="flex items-center gap-2">
              <button onClick={toggleFullscreen} className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors">
                {isFullscreen ? <Minimize2Icon className="w-5 h-5" /> : <Maximize2Icon className="w-5 h-5" />}
              </button>
              <button onClick={handlePrint} disabled={isGeneratingPdf || loading} className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <PrinterIcon className="w-5 h-5" />
              </button>
              <button onClick={handleDownloadPdf} disabled={isGeneratingPdf || loading || isPreparingEmail} className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <DownloadIcon className="w-5 h-5" />
              </button>
              <button onClick={handleEmailAgreement} disabled={isGeneratingPdf || loading || isPreparingEmail} className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {isPreparingEmail ? <Loader2Icon className="w-5 h-5 animate-spin" /> : <MailIcon className="w-5 h-5" />}
              </button>
              <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
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
                  <button onClick={() => { setError(null); setAgreementData(null); }} className="bg-[#8b2828] hover:bg-[#7d1f1f] text-white px-4 py-2 rounded-lg transition-colors">Try Again</button>
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
              <div className="absolute inset-0 flex items-center justify-center"><p className="text-gray-600">No data available</p></div>
            )}
          </div>
        </div>
      </div>
      {agreementData && (
        <InscriptionMailModal
          isOpen={isMailModalOpen}
          onClose={() => setIsMailModalOpen(false)}
          inscriptionCode={inscriptionCode}
          recipientEmail={agreementData.applicant?.email || ''}
          applicantName={agreementData.applicant?.name || ''}
          pdfBase64={pdfBase64}
        />
      )}
    </div>
  )
}

function InscriptionAgreementView({
  inscriptionNo, chapelName, nicheNo, applicantName, addressLines, telOff, telRes, telHP, crossType, deceased1, deceased2, bibleInscriptionNumber, dateOfInterment, timeOfInterment, bibleInscriptionText, payments, signatureName, signatureDate
}: any) {
  const safePayments = Array.isArray(payments) ? payments : []
  const safeAddressLines: string[] = Array.isArray(addressLines) ? addressLines : []

  return (
    <div className="w-full max-w-[210mm] mx-auto bg-white p-12 shadow-lg text-black font-sans text-[11px] leading-tight print:shadow-none print:p-6">
      {/* Header Section */}
      <div className="mb-4">
        <h1 className="font-bold text-[12px]">Franciscan Columbarium a ministry of</h1>
        <h2 className="font-bold text-[12px] mt-1">The Order of Friars Minor (Singapore) Ltd Co & GST Reg No. 2010163236M</h2>
        <p className="font-bold text-[10px]">(Co Reg no.2010163236M)</p>
        <p className="mt-1">5 Bukit Batok East Ave 2</p>
        <p>Singapore 659918</p>
        <p>Telephone : 6560-6361, Fax : 6566-2852, &nbsp;&nbsp;&nbsp; E-mail : franciscan.columbarium@gmail.com</p>
      </div>

      <h2 className="text-center italic text-xl mb-4 font-normal">"Request for inscription plaque"</h2>

      {/* Inscription No and Niche Table */}
      <div className="flex justify-end items-center mb-1 text-[12px]">
        <span className="mr-2">Inscription No :</span>
        <span className="w-24 text-left">{inscriptionNo}</span>
      </div>

      <div className="border border-black flex mb-4">
        <div className="w-36 p-1 pl-2 border-r border-black">Name of Chapel</div>
        <div className="flex-1 p-1 pl-2 border-r border-black">{chapelName}</div>
        <div className="w-20 p-1 pl-2 border-r border-black">Niche No</div>
        <div className="w-32 p-1 pl-2 font-bold">{nicheNo}</div>
      </div>

      {/* Applicant Details - Address formatted like invoice/receipt (multi-line structured) */}
      <div className="border border-black mb-4">
        <div className="flex border-b border-black">
          <div className="w-36 p-1 pl-2 border-r border-black">Name of Applicant</div>
          <div className="flex-1 p-1 pl-2 font-bold">{applicantName}</div>
        </div>
        <div className="flex border-b border-black">
          <div className="w-36 p-1 pl-2 border-r border-black h-[78px]">Address</div>
          <div className="flex-1 flex flex-col">
            <div className="flex-1 p-1 pl-2 border-b border-black font-bold">{safeAddressLines[0] || ''}</div>
            <div className="flex-1 p-1 pl-2 border-b border-black font-bold">{safeAddressLines[1] || ''}</div>
            <div className="flex-1 p-1 pl-2 font-bold">{safeAddressLines[2] || ''}</div>
          </div>
        </div>
        <div className="flex">
          <div className="w-36 p-1 pl-2 border-r border-black">Tel(Off)</div>
          <div className="w-40 p-1 pl-2 border-r border-black font-bold">{telOff}</div>
          <div className="w-20 p-1 pl-2 border-r border-black">Tel(Res)</div>
          <div className="w-40 p-1 pl-2 border-r border-black font-bold">{telRes}</div>
          <div className="w-20 p-1 pl-2 border-r border-black">Tel(HP)</div>
          <div className="flex-1 p-1 pl-2 font-bold">{telHP}</div>
        </div>
      </div>

      {/* Deceased No. 1 */}
      <div className="border border-black mb-4">
        <div className="bg-[#f0f0f0] border-b border-black flex font-bold h-7 items-center px-2">
          <div className="flex-1 text-[#8b2828]">Details of Deceased No.1</div>
          <div className="w-64 font-normal">Cross Type : &nbsp;&nbsp; <span className="font-bold">{crossType}</span></div>
        </div>
        <div className="flex border-b border-black">
          <div className="w-52 p-1 pl-2 border-r border-black">Name Of Deceased No.1</div>
          <div className="flex-1 p-1 pl-2 border-r border-black font-bold">{deceased1.name}</div>
          <div className="w-36 p-1 pl-2 border-r border-black">Death Cert No:</div>
          <div className="w-48 p-1 pl-2 font-bold">{deceased1.deathCertNo}</div>
        </div>
        <div className="flex">
          <div className="w-52 p-1 pl-2 border-r border-black">Date Born</div>
          <div className="flex-1 p-1 pl-2 border-r border-black font-bold">{deceased1.dateBorn}</div>
          <div className="w-36 p-1 pl-2 border-r border-black">Date Died</div>
          <div className="w-48 p-1 pl-2 font-bold">{deceased1.dateDied}</div>
        </div>
      </div>

      {/* Deceased No. 2 */}
      <div className="border border-black mb-4">
        <div className="bg-[#f0f0f0] border-b border-black p-1 pl-2 font-bold h-7 flex items-center text-[#8b2828]">
          Details of Deceased No.2
        </div>
        <div className="flex border-b border-black">
          <div className="w-52 p-1 pl-2 border-r border-black">Name Of Deceased No.2</div>
          <div className="flex-1 p-1 pl-2 border-r border-black font-bold">{deceased2.name}</div>
          <div className="w-36 p-1 pl-2 border-r border-black">Death Cert No:</div>
          <div className="w-48 p-1 pl-2 font-bold">{deceased2.deathCertNo}</div>
        </div>
        <div className="flex">
          <div className="w-52 p-1 pl-2 border-r border-black">Date Born</div>
          <div className="flex-1 p-1 pl-2 border-r border-black font-bold">{deceased2.dateBorn}</div>
          <div className="w-36 p-1 pl-2 border-r border-black">Date Died</div>
          <div className="w-48 p-1 pl-2 font-bold">{deceased2.dateDied}</div>
        </div>
      </div>

      {/* Bible Inscription Section */}
      <div className="flex justify-between items-start mb-4">
        <div className="border border-black p-4 flex items-center w-[200px] h-[60px]">
          <span className="mr-4">Bible inscription of choice number</span>
          <div className="border border-black w-10 h-10 flex items-center justify-center font-bold text-lg">
            {bibleInscriptionNumber}
          </div>
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <div className="flex items-center">
            <span className="w-32">Date of interment :</span>
            <div className="w-32 border-b border-black text-center">{dateOfInterment}</div>
          </div>
          <div className="flex items-center">
            <span className="w-32">Time:</span>
            <div className="w-32 border-b border-black text-center">{timeOfInterment}</div>
          </div>
        </div>
      </div>

      <p className="mb-1">Bible Inscription or phrases of your choice(max 80 chars)  </p>
      <div className="border-b border-black italic pb-1 mb-2 min-h-[1.5rem] whitespace-pre-line">{bibleInscriptionText}</div>

      <p className="mt-4 mb-1">This is subject to the approval of our Franciscan Friars Custos</p>


      {/* Payment Details */}
      <div className="border border-black mb-4">
        <div className="p-1 pl-2 border-b border-black font-bold text-[11px]">
          Payment Details: Cheque made payable to" The Order of Friars Minor (S) Ltd-Columbarium" <br />
          (1st name = $400, 2nd name = $300, 2 names together = $650 <br />
          Prices subject to change without notice)
          Internet Banking Transfer: OFMS- Columbarium DBS 072-1185447-4
          PayNow: uen 201016236m2CO
        </div>
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="border-b border-black bg-white">
              <th className="border-r border-black p-1 text-left w-24">Date</th>
              <th className="border-r border-black p-1 text-left w-24">Inv/ Receipt</th>
              <th className="border-r border-black p-1 text-left">Description</th>
              <th className="border-r border-black p-1 text-right w-20 pr-2">Amount</th>
              <th className="border-r border-black p-1 text-right w-16 pr-2">GST</th>
              <th className="p-1 text-right w-24 pr-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {safePayments.length > 0 ? safePayments.map((p: any, i: number) => {
              const amount = Number(p?.amount || 0)
              const totalAmount = Number(p?.totalAmount || 0)
              return (
                <tr key={i} className="border-b border-black last:border-0 h-8">
                  <td className="border-r border-black p-1 pl-2 font-bold">{p?.date || ''}</td>
                  <td className="border-r border-black p-1 pl-2 font-bold">{p?.invReceipt || ''}</td>
                  <td className="border-r border-black p-1 pl-2 font-bold">{p?.description || ''}</td>
                  <td className="border-r border-black p-1 pr-2 text-right font-bold w-20">{Number.isFinite(amount) && amount !== 0 ? `$ ${amount.toFixed(2)}` : ''}</td>
                  <td className="border-r border-black p-1 pr-2 text-right font-bold w-16">{p?.gst || ''}</td>
                  <td className="p-1 pr-2 text-right font-bold w-24">{Number.isFinite(totalAmount) ? `$ ${totalAmount.toFixed(2)}` : ''}</td>
                </tr>
              )
            }) : (
              <tr className="h-8">
                <td className="border-r border-black p-1">&nbsp;</td>
                <td className="border-r border-black p-1">&nbsp;</td>
                <td className="border-r border-black p-1">&nbsp;</td>
                <td className="border-r border-black p-1">&nbsp;</td>
                <td className="border-r border-black p-1">&nbsp;</td>
                <td className="p-1 text-right">&nbsp;</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Consent */}
      <div className="mt-2 text-justify">
        <p className="mb-4 text-[10px] leading-tight">
          By submitting this form, I consent to my personal data being collected, used or disclosed by the Order of Friars Minor (S) Ltd in accordance with its Personal Data Protection Policy Statement which may be found at www.franciscans.sg. We have checked and confirmed that the information given above is correct.
        </p>

        <div className="mt-8 flex flex-col items-start">
          <div className="border-b border-black w-64 mb-1"></div>
          <div className="flex flex-col gap-1 w-full text-[11px]">
            <div className="flex">
              <span className="w-16">Name :</span>
              <span className="font-bold">{signatureName}</span>
            </div>
            <div className="flex">
              <span className="w-16">Date :</span>
              <span>{signatureDate}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
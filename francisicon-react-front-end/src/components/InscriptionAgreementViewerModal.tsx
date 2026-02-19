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
  const [isMailModalOpen, setIsMailModalOpen] = useState(false)
  const [isPreparingEmail, setIsPreparingEmail] = useState(false)
  const [pdfBase64, setPdfBase64] = useState<string | undefined>(undefined)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    setError(null)
    setAgreementData(initialData || null)
  }, [isOpen, inscriptionCode, initialData])

  // Fetch inscription agreement data when modal opens.
  // Even if initial data exists, refresh from API so the modal shows latest values.
  useEffect(() => {
    if (isOpen && inscriptionCode) {
      const fetchAgreementData = async () => {
        setLoading(true)
        setError(null)
        try {
          const data = await inscriptionAgreementService.getPdfData(inscriptionCode)

          // Try to enrich agreement view with real invoice/receipt details.
          // Keep silent fallback so agreement still opens even if lookup fails.
          let enrichedData: InscriptionAgreementData = data
          try {
            const invoiceData = await invoiceService.getInvoiceByCode(inscriptionCode, 'INCR')
            const hasInvoice = Boolean(invoiceData?.hasInvoice && invoiceData?.code)
            const hasReceipt = Boolean(invoiceData?.hasReceipt && invoiceData?.receiptCode)

            const paymentRows = []
            if (hasInvoice) {
              const invoiceSubtotal = Number(invoiceData?.summary?.subtotal ?? invoiceData?.totalAmount ?? 0)
              const invoiceTax = Number(invoiceData?.summary?.totalTax ?? invoiceData?.taxAmount ?? 0)
              const invoiceTotal = Number(invoiceData?.summary?.grandTotal ?? invoiceData?.totalAmount ?? 0)
              paymentRows.push({
                date: invoiceData?.transactionDate
                  ? new Date(invoiceData.transactionDate).toLocaleDateString('en-SG')
                  : '',
                invReceipt: invoiceData?.code || '',
                description: invoiceData?.applicationCode || inscriptionCode,
                amount: Number.isFinite(invoiceSubtotal) ? invoiceSubtotal : 0,
                gst: Number.isFinite(invoiceTax) ? `$ ${invoiceTax.toFixed(2)}` : '',
                totalAmount: Number.isFinite(invoiceTotal) ? invoiceTotal : 0,
              })
            }

            if (hasReceipt) {
              const resolvedPaymentMode = paymentModeToLabel(
                invoiceData?.receiptPaymentMode ?? invoiceData?.paymentMode
              )
              const receiptAmount = Number(
                invoiceData?.receiptPayingAmount
                ?? invoiceData?.receiptTotalAmount
                ?? 0
              )
              paymentRows.push({
                date: invoiceData?.receiptDate
                  ? new Date(invoiceData.receiptDate).toLocaleDateString('en-SG')
                  : '',
                invReceipt: invoiceData?.receiptCode || '',
                description: resolvedPaymentMode,
                amount: 0,
                gst: '',
                totalAmount: Number.isFinite(receiptAmount) ? receiptAmount : 0,
              })
            }

            enrichedData = {
              ...data,
              payments: paymentRows
            }
          } catch {
            // No-op: keep base agreement payload when invoice lookup is unavailable.
          }

          setAgreementData(enrichedData)
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
  }, [isOpen, inscriptionCode])

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

  // Map backend data to component props
  const mapAgreementDataToProps = (data: InscriptionAgreementData) => {
    if (!data) return null

    // Format deceased details
    const deceased1 = data.deceased?.[0] ? {
      name: data.deceased[0].name || '',
      deathCertNo: data.deceased[0].deathCertificateNo || '',
      dateBorn: data.deceased[0].formattedDates?.birth ||
        (data.deceased[0].dateOfBirth ? new Date(data.deceased[0].dateOfBirth).toLocaleDateString('en-SG') : ''),
      dateDied: data.deceased[0].formattedDates?.death ||
        (data.deceased[0].dateOfDeath ? new Date(data.deceased[0].dateOfDeath).toLocaleDateString('en-SG') : ''),
    } : { name: '', deathCertNo: '', dateBorn: '', dateDied: '' }

    const deceased2 = data.deceased?.[1] ? {
      name: data.deceased[1].name || '',
      deathCertNo: data.deceased[1].deathCertificateNo || '',
      dateBorn: data.deceased[1].formattedDates?.birth ||
        (data.deceased[1].dateOfBirth ? new Date(data.deceased[1].dateOfBirth).toLocaleDateString('en-SG') : ''),
      dateDied: data.deceased[1].formattedDates?.death ||
        (data.deceased[1].dateOfDeath ? new Date(data.deceased[1].dateOfDeath).toLocaleDateString('en-SG') : ''),
    } : { name: '', deathCertNo: '', dateBorn: '', dateDied: '' }

    const payments = Array.isArray(data.payments) ? data.payments : []

    return {
      inscriptionNo: data.inscriptionCode || inscriptionCode,
      chapelName: data.niche?.chapel || '',
      nicheNo: data.niche?.code || '',
      applicantName: data.applicant?.name || '',
      address: data.applicant?.address || '',
      telOff: data.applicant?.phone || '',
      telRes: data.contactPerson?.phone || '',
      telHP: data.applicant?.mobile || '',
      crossType: data.inscription?.crossType || 'Crucifix',
      deceased1,
      deceased2,
      bibleInscriptionNumber: data.inscription?.bibleChoiceId?.toString() || '',
      dateOfInterment: data.deceased?.[0]?.formattedDates?.internment || data.deceased?.[0]?.internmentDate || '',
      timeOfInterment: '11:00AM',
      bibleInscriptionText: data.inscription?.fullInscription || '',
      payments,
      signatureName: data.applicant?.name || '',
      signatureDate: data.formattedDate || new Date().toLocaleDateString('en-SG'),
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
  inscriptionNo, chapelName, nicheNo, applicantName, address, telOff, telRes, telHP, crossType, deceased1, deceased2, bibleInscriptionNumber, dateOfInterment, timeOfInterment, bibleInscriptionText, payments, signatureName, signatureDate
}: any) {
  const safePayments = Array.isArray(payments) ? payments : []

  return (
    <div className="w-full max-w-[210mm] mx-auto bg-white p-12 shadow-lg text-black font-serif text-sm leading-tight print:shadow-none print:p-0">
      <div className="mb-6">
        <h1 className="font-bold text-sm">Franciscan Columbarium a ministry of</h1>
        <h2 className="font-bold text-sm">The Order of Friars Minor (Singapore) Ltd Co & GST Reg No. 2010163236M</h2>
        <p>5 Bukit Batok East Ave 2, Singapore 659918</p>
        <p>Telephone: 6560-6361, Fax: 6566-2852, Email: franciscan.columbarium@gmail.com</p>
      </div>
      <h2 className="text-center italic text-xl mb-4">"Request for inscription plaque"</h2>
      <div className="flex justify-end items-baseline mb-2">
        <span className="mr-2">Inscription No:</span>
        <span className="w-24 text-center">{inscriptionNo}</span>
      </div>
      <div className="border border-black mb-4 flex">
        <div className="w-32 p-1 border-r border-black">Chapel</div>
        <div className="flex-1 p-1 border-r border-black">{chapelName}</div>
        <div className="w-24 p-1 border-r border-black">Niche No</div>
        <div className="w-24 p-1">{nicheNo}</div>
      </div>
      <div className="border border-black mb-4">
        <div className="flex border-b border-black"><div className="w-32 p-1 border-r border-black">Applicant</div><div className="flex-1 p-1">{applicantName}</div></div>
        <div className="flex border-b border-black"><div className="w-32 p-1 border-r border-black h-12">Address</div><div className="flex-1 p-1 whitespace-pre-line">{address}</div></div>
        <div className="flex">
          <div className="w-32 p-1 border-r border-black">Tel(Off)</div><div className="flex-1 p-1 border-r border-black">{telOff}</div>
          <div className="w-24 p-1 border-r border-black">Tel(Res)</div><div className="flex-1 p-1 border-r border-black">{telRes}</div>
          <div className="w-24 p-1 border-r border-black">Tel(HP)</div><div className="w-32 p-1">{telHP}</div>
        </div>
      </div>
      <div className="border border-black mb-4">
        <div className="bg-gray-100 border-b border-black flex font-bold"><div className="flex-1 p-1 border-r border-black">Deceased No.1</div><div className="w-64 p-1 pl-2">Cross: {crossType}</div></div>
        <div className="flex border-b border-black"><div className="w-40 p-1 border-r border-black">Name</div><div className="flex-1 p-1 border-r border-black">{deceased1.name}</div><div className="w-24 p-1 border-r border-black">Cert No:</div><div className="w-32 p-1">{deceased1.deathCertNo}</div></div>
        <div className="flex"><div className="w-40 p-1 border-r border-black">Date Born</div><div className="flex-1 p-1 border-r border-black">{deceased1.dateBorn}</div><div className="w-24 p-1 border-r border-black">Date Died</div><div className="w-32 p-1">{deceased1.dateDied}</div></div>
      </div>
      <div className="border border-black mb-4">
        <div className="bg-gray-100 border-b border-black p-1 font-bold">Deceased No.2</div>
        <div className="flex border-b border-black"><div className="w-40 p-1 border-r border-black">Name</div><div className="flex-1 p-1 border-r border-black">{deceased2.name}</div><div className="w-24 p-1 border-r border-black">Cert No:</div><div className="w-32 p-1">{deceased2.deathCertNo}</div></div>
        <div className="flex"><div className="w-40 p-1 border-r border-black">Date Born</div><div className="flex-1 p-1 border-r border-black">{deceased2.dateBorn}</div><div className="w-24 p-1 border-r border-black">Date Died</div><div className="w-32 p-1">{deceased2.dateDied}</div></div>
      </div>
      <div className="mb-6">
        <div className="flex items-start mb-2"><div className="flex-1 flex items-center mb-2"><span className="mr-2">Bible No:</span><div className="border border-black w-24 h-8 text-center pt-1">{bibleInscriptionNumber}</div></div><div className="w-64 flex flex-col gap-1 items-end"><div>Interment: {dateOfInterment}</div><div>Time: {timeOfInterment}</div></div></div>
        <p className="mb-1 text-xs italic">Bible Inscription or phrases (max 80 chars)</p>
        <div className="border-b border-black italic pb-1 mb-6 min-h-[1.5rem]">{bibleInscriptionText}</div>
      </div>
      <div className="border border-black">
        <div className="p-1 border-b border-black font-bold text-[10px] bg-gray-50">Payment Details: Cheque to "The Order of Friars Minor (S) Ltd-Columbarium"</div>
        <table className="w-full text-xs">
          <thead><tr className="border-b border-black bg-gray-50"><th className="border-r border-black p-1 text-left">Date</th><th className="border-r border-black p-1 text-left">Inv/Receipt</th><th className="border-r border-black p-1 text-left">Description</th><th className="border-r border-black p-1 text-left">Amount</th><th className="border-r border-black p-1 text-left">GST</th><th className="p-1 text-right">Total</th></tr></thead>
          <tbody>
            {safePayments.length > 0 ? safePayments.map((p: any, i: number) => {
              const amount = Number(p?.amount || 0)
              const totalAmount = Number(p?.totalAmount || 0)
              return (
                <tr key={i} className="border-b border-black last:border-0">
                  <td className="border-r border-black p-1">{p?.date || ''}</td>
                  <td className="border-r border-black p-1">{p?.invReceipt || ''}</td>
                  <td className="border-r border-black p-1">{p?.description || ''}</td>
                  <td className="border-r border-black p-1">{Number.isFinite(amount) ? `$${amount.toFixed(2)}` : ''}</td>
                  <td className="border-r border-black p-1">{p?.gst || ''}</td>
                  <td className="p-1 text-right">{Number.isFinite(totalAmount) ? `$${totalAmount.toFixed(2)}` : ''}</td>
                </tr>
              )
            }) : (
              <tr className="border-b border-black last:border-0">
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
      <div className="mt-8">
        <p className="mb-8 text-[11px] leading-relaxed">By submitting this form, I consent to my personal data being collected, used or disclosed by the Order of Friars Minor (S) Ltd in accordance with its Personal Data Protection Policy Statement.</p>
        <div className="grid grid-cols-2 gap-8"><div><div className="border-b border-black w-full mb-1"></div><p className="text-xs italic">Signature of Applicant</p></div><div><p className="text-sm font-bold">{signatureName}</p><p className="text-xs">Date: {signatureDate}</p></div></div>
      </div>
    </div>
  )
}
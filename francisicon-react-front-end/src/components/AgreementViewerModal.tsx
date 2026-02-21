import React, { useState, useRef, Children, createElement } from 'react'
import {
  XIcon,
  DownloadIcon,
  PrinterIcon,
  Maximize2Icon,
  Minimize2Icon,
} from 'lucide-react'
import { AgreementPdfTemplate } from './AgreementPdfTemplate'
import { NomineeAgreement } from './NomineeAgreementPdfView'
import { BeneficiaryAgreement } from './BeneficiaryAgreementPdfView'
import { GatesOfLifeAgreementTemplate } from './GatesOfLifeAgreementTemplate'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
interface AgreementViewerModalProps {
  isOpen: boolean
  onClose: () => void
  agreementData: any | null
  secoundNomineeAgreement: any | null
  secoundBeneficiaryAgreement?: any | null
  applicationNumber: string
  loading?: boolean
  templateType?: 'niche' | 'nominee' | 'gateOfLife' | 'beneficiary'
}
export function AgreementViewerModal({
  isOpen,
  onClose,
  agreementData,
  secoundNomineeAgreement,
  secoundBeneficiaryAgreement,
  applicationNumber,
  loading = false,
  templateType = 'niche',
}: AgreementViewerModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
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
  // const handlePrint = () => {
  //   if (!contentRef.current) return
  //   // Clone with all computed styles
  //   const styledClone = cloneWithStyles(contentRef.current)
  //   // Create print window
  //   const printWindow = window.open('', '_blank', 'width=700,height=900')
  //   if (!printWindow) {
  //     alert('Please allow popups to print the document')
  //     return
  //   }
  //   // Write the document with the styled clone
  //   const printStyles = ` * { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: Arial, sans-serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; } @page { size: A4; margin: 10mm; } @media print { body { margin: 0; padding: 0; } .print-container { width: 100%; max-width: 100%; zoom: 1.2; /* scale up to fill A4 */ } }
  //   `
  //   printWindow.document.write(
  //     '<!DOCTYPE html><html><head>' +
  //     '<title>Agreement - ' +
  //     applicationNumber +
  //     '</title>' +
  //     '<style>{`' +
  //     printStyles +
  //     '`}</style>' +
  //     '</head><body>' +
  //     styledClone.outerHTML +
  //     '</body></html>',
  //   )
  //   printWindow.document.close()
  //   // Wait for images to load, then print
  //   printWindow.onload = () => {
  //     setTimeout(() => {
  //       printWindow.focus()
  //       printWindow.print()
  //     }, 500)
  //   }
  // }

  // const handlePrint = () => {
  //   if (!contentRef.current) return

  //   const styledClone = cloneWithStyles(contentRef.current)

  //   const printWindow = window.open('', '_blank', 'width=900,height=1200')
  //   if (!printWindow) {
  //     alert('Please allow popups to print the document')
  //     return
  //   }

  //   const printStyles = `
  //   * {
  //     box-sizing: border-box;
  //   }

  //   body {
  //     margin: 0;
  //     padding: 0;
  //     font-family: Arial, sans-serif;
  //     -webkit-print-color-adjust: exact;
  //     print-color-adjust: exact;
  //   }

  //   /* REAL A4 SIZE */
  //   .print-container {
  //     width: 210mm;
  //     min-height: 297mm;
  //     margin: 0 auto;
  //     padding: 15mm;
  //   }

  //   @page {
  //     size: A4;
  //     margin: 0;
  //   }

  //   @media print {
  //     body {
  //       margin: 0;
  //     }
  //   }
  // `

  //   printWindow.document.write(`
  //   <!DOCTYPE html>
  //   <html>
  //     <head>
  //       <title>Agreement - ${applicationNumber}</title>
  //       <style>${printStyles}</style>
  //     </head>
  //     <body>
  //       ${styledClone.outerHTML}
  //     </body>
  //   </html>
  // `)

  //   printWindow.document.close()

  //   printWindow.onload = () => {
  //     setTimeout(() => {
  //       printWindow.focus()
  //       printWindow.print()
  //     }, 300)
  //   }
  // }
  const handleGeneratePDF = async () => {
    if (!contentRef.current || isGenerating) return
    setIsGenerating(true)
    try {
      // Find all page elements
      const pages = contentRef.current.querySelectorAll('[data-pdf-page]')
      if (pages.length === 0) {
        throw new Error('No pages found to print')
      }
      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })
      // Process each page
      for (let i = 0; i < pages.length; i++) {
        const pageElement = pages[i] as HTMLElement
        // Temporarily remove shadow for clean capture
        const originalBoxShadow = pageElement.style.boxShadow
        pageElement.style.boxShadow = 'none'
        // Capture the page
        const canvas = await html2canvas(pageElement, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          windowWidth: pageElement.scrollWidth,
          windowHeight: pageElement.scrollHeight,
        })
        // Restore styles
        pageElement.style.boxShadow = originalBoxShadow
        // Add page to PDF (except for the first one which is created by default)
        if (i > 0) {
          pdf.addPage()
        }
        const imgData = canvas.toDataURL('image/png', 1.0)
        const pdfWidth = pdf.internal.pageSize.getWidth()
        const pdfHeight = pdf.internal.pageSize.getHeight()
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      }
      // Generate blob and open in new tab
      const pdfBlob = pdf.output('blob')
      const blobUrl = URL.createObjectURL(pdfBlob)
      const newTab = window.open(blobUrl, '_blank')
      if (!newTab) {
        // Fallback: download the file if popup blocked
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = `Agreement-${applicationNumber}.pdf`
        link.click()
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
      } else {
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000)
      }
    } catch (error) {
      console.error('PDF generation failed:', error)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setIsGenerating(false)
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
        filename: `Agreement-${applicationNumber}.pdf`,
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
              Agreement - {applicationNumber}
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
                onClick={handleGeneratePDF}
                disabled={isGenerating}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Print Agreement"
              >
                <PrinterIcon className="w-5 h-5" />
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
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
            {loading && !agreementData && !secoundNomineeAgreement ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#8b2828] mb-4"></div>
                  <p className="text-gray-600">Loading agreement...</p>
                </div>
              </div>
            ) : isGeneratingPdf ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-75 z-20">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#8b2828] mb-4"></div>
                  <p className="text-gray-600">Generating PDF...</p>
                </div>
              </div>
            ) : secoundNomineeAgreement ? (
              <div ref={contentRef}>
                <NomineeAgreement
                  data={secoundNomineeAgreement.rawData || secoundNomineeAgreement}
                  nicheNo={secoundNomineeAgreement.nicheNo}
                  chapelName={secoundNomineeAgreement.chapelName}
                  applicant={secoundNomineeAgreement.applicant}
                  nominee={secoundNomineeAgreement.nominee}
                  agreementDate={secoundNomineeAgreement.agreementDate}
                />
              </div>
            ) : templateType === 'beneficiary' && secoundBeneficiaryAgreement ? (
              <div ref={contentRef}>
                <BeneficiaryAgreement data={secoundBeneficiaryAgreement} />
              </div>
            ) : templateType === 'gateOfLife' && agreementData ? (
              <div ref={contentRef}>
                <GatesOfLifeAgreementTemplate data={agreementData} />
              </div>
            ) : agreementData ? (
              <div ref={contentRef}>
                <AgreementPdfTemplate data={agreementData} />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-8">
                  <p className="text-gray-600">No agreement data available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

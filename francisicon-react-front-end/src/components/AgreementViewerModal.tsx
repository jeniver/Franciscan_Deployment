import React, { useState, useRef } from 'react'
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
import { printContentFromRef } from '../utils/printContent'
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
  const handleGeneratePDF = () => {
    if (!contentRef.current) return
    printContentFromRef(contentRef.current, `Agreement - ${applicationNumber}`)
  }

  const handleDownloadPdf = () => {
    if (!contentRef.current) return
    printContentFromRef(contentRef.current, `Agreement - ${applicationNumber}`)
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

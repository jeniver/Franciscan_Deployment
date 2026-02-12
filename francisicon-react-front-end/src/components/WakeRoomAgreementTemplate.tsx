import React, { forwardRef } from 'react';
import { WakeRoomBooking } from '../services/wakeRoomService';
import { PDF_ASSETS } from './common/FranciscanLogo';

interface WakeRoomAgreementTemplateProps {
    booking: WakeRoomBooking | any;
}

export const WakeRoomAgreementTemplate = forwardRef<HTMLDivElement, WakeRoomAgreementTemplateProps>(({ booking }, ref) => {
    if (!booking) return null;

    const applicant = booking.applicant || {};
    const bookingDetails = booking.booking || {};
    const serviceDetails = booking.service || {};
    const wakeRoom = booking.wakeRoom || {};
    const financial = booking.financial || {};

    // Format dates
    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatTime = (dateString: string) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const formatDay = (dateString: string) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-US', { weekday: 'long' });
    };

    // Address formatting
    const address = applicant.addressDetails || {};
    const fullAddress = [
        address.no ? `No ${address.no}` : '',
        address.line1,
        address.line2,
        address.city,
        address.state,
        address.country
    ].filter(Boolean).join(' ');

    return (
        <div ref={ref} className="w-full max-w-[210mm] mx-auto bg-white text-black font-serif text-sm leading-tight print:p-0">
            <style type="text/css" media="print">
                {`
          @page { size: A4; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; }
          .page-break { page-break-after: always; }
        `}
            </style>

            {/* Page 1: Application Form */}
            <div className="p-12 shadow-lg print:shadow-none print:p-0 min-h-[297mm] relative">
                {/* Header */}
                <div className="flex items-start gap-6 mb-8">
                    <div className="w-32 h-32 flex-shrink-0 border border-black p-1">
                        <img
                            src={PDF_ASSETS.headerImageUrl}
                            alt="Franciscan Columbarium Logo"
                            className="w-full h-full object-contain"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = PDF_ASSETS.headerImageBase64
                            }}
                        />
                    </div>
                    <div className="flex-1 pt-2">
                        <h1 className="font-bold text-lg">
                            FRANCISCAN COLUMBARIUM A Ministry of
                        </h1>
                        <p>The Order of Friars Minor (S) Ltd Co & GST Reg No.</p>
                        <p>2010163236M</p>
                        <p>5 Bukit Batok East Ave 2, Singapore 659918</p>
                        <p>Tel: 6560-6361 Fax: 6566-2852</p>
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-center font-bold text-xl uppercase mb-6 tracking-wide">
                    APPLICATION FOR USE OF {wakeRoom.name ? wakeRoom.name.toUpperCase() : 'WAKE ROOM'}
                </h2>

                {/* Booking No */}
                <div className="flex justify-end mb-4">
                    <div className="flex items-center gap-2">
                        <span className="font-bold">Wake Booking No :</span>
                        <span className="w-32 text-center border-b border-black">{booking.code}</span>
                    </div>
                </div>

                {/* Personal Info Table */}
                <div className="border border-black mb-8">
                    {/* Row 1 */}
                    <div className="flex border-b border-black">
                        <div className="w-32 p-2 border-r border-black flex items-center justify-center font-bold">
                            NAME
                        </div>
                        <div className="flex-1 p-2">{applicant.name}</div>
                    </div>
                    {/* Row 2 */}
                    <div className="flex border-b border-black">
                        <div className="w-32 p-2 border-r border-black flex items-center justify-center font-bold">
                            ADDRESS
                        </div>
                        <div className="flex-1 p-2">
                            {fullAddress}
                        </div>
                    </div>
                    {/* Row 3 */}
                    <div className="flex border-b border-black">
                        <div className="w-32 p-2 border-r border-black flex items-center justify-center font-bold">
                            POSTAL
                        </div>
                        <div className="flex-1 p-2">{address.postalCode || ''}</div>
                    </div>
                    {/* Row 4 */}
                    <div className="flex">
                        <div className="w-32 p-2 border-r border-black flex items-center justify-center font-bold">
                            TEL NOS.
                        </div>
                        <div className="flex-1 flex">
                            <div className="flex-1 p-2 border-r border-black">
                                <span className="block text-xs mb-1">Residence</span>
                                <span>{applicant.homeTelNo}</span>
                            </div>
                            <div className="flex-1 p-2 border-r border-black">
                                <span className="block text-xs mb-1">Office</span>
                                <span>{applicant.officeTelNo}</span>
                            </div>
                            <div className="flex-1 p-2">
                                <span className="block text-xs mb-1">Hp</span>
                                <span>{applicant.mobileNo}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Details Section */}
                <div className="mb-8">
                    <h3 className="font-bold mb-4 text-base">
                        Details for use of {wakeRoom.name || 'Wake Room'}
                    </h3>

                    <div className="space-y-3 pl-1">
                        <div className="grid grid-cols-[150px_1fr] items-baseline">
                            <span className="font-bold">Period of Use</span>
                            <div className="flex items-center">
                                <span className="mx-2">:</span>
                                <span className="border-b border-black px-2 min-w-[100px] text-center">
                                    {formatDate(bookingDetails.usingTimeFrom)}
                                </span>
                                <span className="mx-4">-</span>
                                <span className="border-b border-black px-2 min-w-[100px] text-center">
                                    {formatDate(bookingDetails.usingTimeTo)}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-[150px_1fr] items-baseline">
                            <span className="font-bold">Name of deceased</span>
                            <div className="flex items-center">
                                <span className="mx-2">:</span>
                                <span className="border-b border-black px-2 flex-1">
                                    {bookingDetails.nameOfDeceased}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-[150px_1fr] items-baseline">
                            <span className="font-bold">Date of funeral</span>
                            <div className="flex items-center">
                                <span className="mx-2">:</span>
                                <span className="border-b border-black px-2 min-w-[120px]">
                                    {formatDate(bookingDetails.usingTimeTo)}
                                </span>
                                <span className="border-b border-black px-2 flex-1 ml-4">
                                    {formatDay(bookingDetails.usingTimeTo)}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-[150px_1fr] items-baseline">
                            <span className="font-bold">Time of mass</span>
                            <div className="flex items-center">
                                <span className="mx-2">:</span>
                                <span className="border-b border-black px-2 flex-1">
                                    {bookingDetails.massTime ? formatTime(bookingDetails.massTime) : (formatTime(bookingDetails.usingTimeTo))}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cremation Details */}
                <div className="mb-8">
                    <div className="flex items-baseline mb-4">
                        <h3 className="font-bold mr-4 text-base">Cremation Details</h3>
                        <span className="mx-2">:</span>
                        <span className="font-bold mr-2">Hall No:</span>
                        <span className="border-b border-black px-2 w-16 text-center">{serviceDetails.hallNo}</span>
                        <div className="flex-1"></div>
                        <span className="font-bold mr-2">Time:</span>
                        <span className="border-b border-black px-2 w-32 text-center">
                            {formatTime(serviceDetails.timeOfCremation)}
                        </span>
                    </div>

                    <table className="w-full border-collapse border border-black text-sm">
                        <thead>
                            <tr className="border-b border-black">
                                <th className="border-r border-black p-1 text-left w-24 font-normal">
                                    Date
                                </th>
                                <th className="border-r border-black p-1 text-left w-24 font-normal">
                                    Inv/ Receipt
                                </th>
                                <th className="border-r border-black p-1 text-left font-normal">
                                    Description
                                </th>
                                <th className="border-r border-black p-1 text-center w-20 font-normal">
                                    Amount
                                </th>
                                <th className="border-r border-black p-1 text-center w-16 font-normal">
                                    GST
                                </th>
                                <th className="p-1 text-right w-24 font-normal">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="h-24 align-top">
                                <td className="border-r border-black p-1">{formatDate(bookingDetails.usingDate)}</td>
                                <td className="border-r border-black p-1"></td>
                                <td className="border-r border-black p-1">
                                    <div>{booking.code}</div>
                                    <div>
                                        {formatDate(bookingDetails.usingTimeFrom)} <span className="float-right">-</span>
                                    </div>
                                    <div>{formatDate(bookingDetails.usingTimeTo)}</div>
                                </td>
                                <td className="border-r border-black p-1"></td>
                                <td className="border-r border-black p-1"></td>
                                <td className="p-1 text-right">$ {financial.donationAmount?.toFixed(2)}</td>
                            </tr>
                            <tr className="h-12 border-t border-black">
                                <td className="border-r border-black p-1"></td>
                                <td className="border-r border-black p-1"></td>
                                <td className="border-r border-black p-1"></td>
                                <td className="border-r border-black p-1"></td>
                                <td className="border-r border-black p-1"></td>
                                <td className="p-1 text-right align-top">-</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Bottom Fields */}
                <div className="space-y-4 mt-8">
                    <div className="flex items-baseline">
                        <span className="font-bold w-48">No of Days Used</span>
                        <span className="mr-2">:</span>
                        <span className="border-b border-black px-2 w-24 text-center">{bookingDetails.noOfDays}</span>
                        <div className="flex-1 flex justify-end items-baseline">
                            <span className="font-bold mr-4">Amount Payable</span>
                            <span className="mr-2">:</span>
                            <span className="border-b border-black px-2 w-32 text-right">
                                $ {financial.donationAmount?.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-baseline">
                        <span className="font-bold w-48">Funeral mass / service by</span>
                        <span className="mr-2">:</span>
                        <span className="border-b border-black px-2 flex-1">{serviceDetails.serviceby}</span>
                    </div>

                    <div className="flex items-baseline">
                        <span className="font-bold w-48">Casket Company</span>
                        <span className="mr-2">:</span>
                        <span className="border-b border-black px-2 flex-1">{serviceDetails.casketCompany}</span>
                    </div>

                    <div className="flex items-baseline">
                        <span className="font-bold w-48">Burial</span>
                        <span className="mr-2">:</span>
                        <span className="border-b border-black px-2 flex-1">&nbsp;</span>
                    </div>
                </div>
            </div>

            <div className="page-break" />

            {/* Page 2: Terms & Conditions */}
            <div className="p-12 shadow-lg print:shadow-none print:p-0 min-h-[297mm]">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="font-bold text-lg mb-1">FRANCISCAN COLUMBARIUM</h1>
                    <h2 className="font-bold text-xs mb-1">
                        THE ORDER OF FRIARS MINOR (SINGAPORE) LTD
                    </h2>
                    <p className="mb-1">COMPANY REG NO. : 201016236M</p>
                    <p className="mb-1">5 Bukit Batok East Ave 2</p>
                    <p className="mb-1">Singapore 659918</p>
                    <p>Tel : 6560-6361 Fax : 6566-2852</p>
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-2 gap-8 mb-12 text-[11px] leading-relaxed">
                    {/* Left Column */}
                    <div className="space-y-6">
                        <section>
                            <h3 className="uppercase mb-2 font-bold">PASTORAL</h3>
                            <ol className="list-decimal pl-5 space-y-2 marker:font-normal">
                                <li>
                                    Only catholics are allowed to use La Verna or any other wake
                                    facilities in our premises.
                                </li>
                                <li>
                                    The columbarium is not oblige to find a priest for the funeral
                                    mass/service. Your priest should be contacted as you are a
                                    parishioner of his parish. We can only assist you as best we
                                    could if you need our assistance.
                                </li>
                                <li>
                                    Only catholic prayer groups are allowed to hold prayer sessions
                                    during the wake
                                </li>
                            </ol>
                        </section>

                        <section>
                            <h3 className="uppercase mb-2 font-bold">PAYMENT</h3>
                            <ol className="list-decimal pl-5 space-y-2 marker:font-normal">
                                <li>
                                    La Verna Room - the donation of $600 per day is inclusive of an
                                    air-conditioned room, 2 washrooms, 1 pantry, 6 round tables and
                                    100 chairs.
                                </li>
                                <li>
                                    All payment must be made before the funeral day. Payment by cash
                                    or cheque made payable to "The Order of Friars Minor (S) Ltd
                                    -Columbarium"
                                </li>
                                <li>
                                    Additional charge of $8 per stand will be imposed if there are
                                    more than 10 flower stands.
                                </li>
                            </ol>
                        </section>

                        <section>
                            <h3 className="uppercase mb-2 font-bold">MISCELLANEOUS</h3>
                            <ol className="list-decimal pl-5 space-y-2 marker:font-normal">
                                <li>
                                    The columbarium office reserves the right to remind the bereaved
                                    family of the terms & conditions at any time.
                                </li>
                            </ol>
                        </section>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        <section>
                            <h3 className="uppercase mb-2 font-bold">LOGISTIC</h3>
                            <ol className="list-decimal pl-5 space-y-2 marker:font-normal">
                                <li>
                                    All doors to church and La Verna will be closed at 10.30pm sharp
                                    and everyone must leave the premises by 10.30pm.{' '}
                                    <span className="font-bold">
                                        No extension of time is allowed.
                                    </span>{' '}
                                    The room will be opened at 7.30am
                                </li>
                                <li>
                                    No staying overnight is allowed in the wake room (La Verna).
                                </li>
                                <li>
                                    Only authorized St Mary's caterer for drink & food are allowed
                                    in this wake room and these bills must be settled with the
                                    respective caterer before the funeral.
                                </li>
                                <li>
                                    Only candles & flowers are allowed to be placed on the table in
                                    front of the casket
                                </li>
                                <li>No gambling or card game is allowed in this room</li>
                                <li>No smoking</li>
                                <li>
                                    No double-sided tapes are allowed except blue tac and these must
                                    be removed immediately after the funeral.
                                </li>
                                <li>
                                    When the air-conditioning is on, please ensure that all wake
                                    room doors are closed in order to avoid water condensation from
                                    the air-conditioning units.
                                </li>
                                <li>
                                    Please be reminded that this is a service provided to bereaved
                                    family. Hence on the day of funeral, if the wake room is needed
                                    by <span className="font-bold">ANOTHER BEREAVED FAMILY</span>,
                                    the Franciscan Friars have the right to take over the room as
                                    soon as possible after the funeral mass. In the above event, if
                                    the family needs to have their meals after the funeral, the
                                    columbarium office will find another alternative to allow the
                                    family to have their meal.
                                </li>
                            </ol>
                        </section>
                    </div>
                </div>

                {/* Footer / Signature */}
                <div className="mt-8 space-y-8 text-sm">
                    <p className="italic">
                        By submitting this form, I consent to my personal data being
                        collected, used or disclosed by the Order of Friars Minor (S) Ltd in
                        accordance with its Personal Data Protection Policy Statement which
                        may be found at www.franciscans.sg
                    </p>

                    <p>
                        I have read the above terms & conditions and agree to abide with it.
                    </p>

                    <div className="mt-12 max-w-sm">
                        <div className="border-b border-black w-full mb-2"></div>

                        <div className="grid grid-cols-[60px_1fr] gap-2 mt-4">
                            <span>Name:</span>
                            <span>{applicant.name}</span>

                            <span>Date:</span>
                            {/* <span>{formatDate(bookingDetails.usingDate)}</span> */}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

WakeRoomAgreementTemplate.displayName = 'WakeRoomAgreementTemplate';

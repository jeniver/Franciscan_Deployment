import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { App } from './App';
import { LoginPage } from './pages/LoginPage';
import { GatesOfLifePage } from './pages/GatesOfLifePage';
import { WakeRoomPage } from './pages/WakeRoomPage';
import { ReportsPage } from './pages/ReportsPage';
import { MonthlyReceiptsReportPage } from './pages/MonthlyReceiptsReportPage';
import { MonthlyWakeRoomsReportPage } from './pages/MonthlyWakeRoomsReportPage';
import { MonthlyInscriptionsReportPage } from './pages/MonthlyInscriptionsReportPage';
import { MonthlyGOAReportPage } from './pages/MonthlyGOAReportPage';
import { MonthlyGSTReportPage } from './pages/MonthlyGSTReportPage';
import { NichesReportPage } from './pages/NichesReportPage';
import { MiscReceiptPage } from './pages/MiscReceiptPage';
import { MiscInvoicePage } from './pages/MiscInvoicePage';
import { InvoiceAndReceiptPage } from './pages/InvoiceAndReceiptPage';
import { InvoiceAndReceiptManagementPage } from './pages/InvoiceAndReceiptManagementPage';
import { InscriptionPage } from './pages/InscriptionPage';
import { InscriptionManagementPage } from './pages/InscriptionManagementPage';
import { InscriptionAgreementPage } from './pages/InscriptionAgreementPage';
import { NichiBookingPage } from './pages/NichiBookingPage';
import { GlobalSearchTestPage } from './components/GlobalSearchTestPage';
import { InfiniteLoopTest } from './components/InfiniteLoopTest';
import PricingManagementPage from './pages/PricingManagementPage';
import { ProtectedRoute } from './components/common/ProtectedRoute';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/niche" element={
          <ProtectedRoute>
            <App />
          </ProtectedRoute>
        } />
        <Route path="/niche/new" element={
          <ProtectedRoute>
            <App />
          </ProtectedRoute>
        } />
        <Route path="/niche/view/:applicationCode" element={
          <ProtectedRoute>
            <App />
          </ProtectedRoute>
        } />
        <Route path="/niche/edit/:applicationCode" element={
          <ProtectedRoute>
            <App />
          </ProtectedRoute>
        } />
        <Route path="/receipt" element={
          <ProtectedRoute>
            <InvoiceAndReceiptManagementPage />
          </ProtectedRoute>
        } />
        <Route path="/invoice" element={
          <ProtectedRoute>
            <InvoiceAndReceiptManagementPage />
          </ProtectedRoute>
        } />
        <Route path="/invoice-receipt" element={
          <ProtectedRoute>
            <InvoiceAndReceiptPage />
          </ProtectedRoute>
        } />
        <Route path="/invoice-receipt/:invoiceCode" element={
          <ProtectedRoute>
            <InvoiceAndReceiptPage />
          </ProtectedRoute>
        } />
        <Route path="/:churchId/invoice-receipt" element={
          <ProtectedRoute>
            <InvoiceAndReceiptPage />
          </ProtectedRoute>
        } />
        <Route path="/:churchId/invoice-receipt/:invoiceCode" element={
          <ProtectedRoute>
            <InvoiceAndReceiptPage />
          </ProtectedRoute>
        } />
        <Route path="/gates-of-life" element={
          <ProtectedRoute>
            <GatesOfLifePage />
          </ProtectedRoute>
        } />
        <Route path="/gates-of-life/new" element={
          <ProtectedRoute>
            <GatesOfLifePage />
          </ProtectedRoute>
        } />
        <Route path="/gates-of-life/view/:applicationCode" element={
          <ProtectedRoute>
            <GatesOfLifePage />
          </ProtectedRoute>
        } />
        <Route path="/gates-of-life/edit/:applicationCode" element={
          <ProtectedRoute>
            <GatesOfLifePage />
          </ProtectedRoute>
        } />
        <Route path="/inscription" element={
          <ProtectedRoute>
            <InscriptionPage />
          </ProtectedRoute>
        } />
        <Route path="/inscriptions" element={
          <ProtectedRoute>
            <InscriptionManagementPage />
          </ProtectedRoute>
        } />
        <Route path="/inscriptions/new" element={
          <ProtectedRoute>
            <InscriptionPage />
          </ProtectedRoute>
        } />
        <Route path="/inscriptions/:id/edit" element={
          <ProtectedRoute>
            <InscriptionPage />
          </ProtectedRoute>
        } />
        <Route path="/inscription-agreement/:inscriptionCode" element={
          <ProtectedRoute>
            <InscriptionAgreementPage />
          </ProtectedRoute>
        } />
        <Route path="/wake-room" element={
          <ProtectedRoute>
            <WakeRoomPage />
          </ProtectedRoute>
        } />
        <Route path="/wake-room/new" element={
          <ProtectedRoute>
            <WakeRoomPage />
          </ProtectedRoute>
        } />
        <Route path="/wake-room/edit/:bookingCode" element={
          <ProtectedRoute>
            <WakeRoomPage />
          </ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute>
            <ReportsPage />
          </ProtectedRoute>
        } />
        <Route path="/reports/monthly-receipts" element={
          <ProtectedRoute>
            <MonthlyReceiptsReportPage />
          </ProtectedRoute>
        } />
        <Route path="/reports/monthly-inscriptions" element={
          <ProtectedRoute>
            <MonthlyInscriptionsReportPage />
          </ProtectedRoute>
        } />
        <Route path="/reports/monthly-wakerooms" element={
          <ProtectedRoute>
            <MonthlyWakeRoomsReportPage />
          </ProtectedRoute>
        } />
        <Route path="/reports/monthly-goa" element={
          <ProtectedRoute>
            <MonthlyGOAReportPage />
          </ProtectedRoute>
        } />
        <Route path="/reports/gst" element={
          <ProtectedRoute>
            <MonthlyGSTReportPage />
          </ProtectedRoute>
        } />
        <Route path="/reports/niches/:reportType" element={
          <ProtectedRoute>
            <NichesReportPage />
          </ProtectedRoute>
        } />
        <Route path="/misc-receipt" element={
          <ProtectedRoute>
            <MiscReceiptPage />
          </ProtectedRoute>
        } />
        <Route path="/misc-invoice" element={
          <ProtectedRoute>
            <MiscInvoicePage />
          </ProtectedRoute>
        } />
        <Route path="/nichi-booking" element={
          <ProtectedRoute>
            <NichiBookingPage />
          </ProtectedRoute>
        } />
        <Route path="/global-search-test" element={
          <ProtectedRoute>
            <GlobalSearchTestPage />
          </ProtectedRoute>
        } />
        <Route path="/pricing" element={
          <ProtectedRoute>
            <PricingManagementPage />
          </ProtectedRoute>
        } />
        <Route path="/infinite-loop-test" element={
          <ProtectedRoute>
            <InfiniteLoopTest />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
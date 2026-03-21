import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { App } from './App';
import { LoginPage } from './pages/LoginPage';
import { GatesOfLifePage } from './pages/GatesOfLifePage';
import { WakeRoomPage } from './pages/WakeRoomPage';
import { ReportsPage } from './pages/ReportsPage';
import { MonthlyReceiptsReportPage } from './pages/MonthlyReceiptsReportPage';
import { ReceiptRegisterReportPage } from './pages/ReceiptRegisterReportPage';
import { MonthlyWakeRoomsReportPage } from './pages/MonthlyWakeRoomsReportPage';
import { MonthlyInscriptionsReportPage } from './pages/MonthlyInscriptionsReportPage';
import { MonthlyGOAReportPage } from './pages/MonthlyGOAReportPage';
import { MonthlyGSTReportPage } from './pages/MonthlyGSTReportPage';
import { NichesReportPage } from './pages/NichesReportPage';
import { MiscReceiptPage } from './pages/MiscReceiptPage';
import { MiscReceiptCreatePage } from './pages/MiscReceiptCreatePage';
import { MiscInvoicePage } from './pages/MiscInvoicePage';
import { CreateInvoicePage } from './pages/CreateInvoicePage';
import { CreateReceiptPage } from './pages/CreateReceiptPage';
import { InvoiceAndReceiptManagementPage } from './pages/InvoiceAndReceiptManagementPage';
import { InscriptionPage } from './pages/InscriptionPage';
import { InscriptionManagementPage } from './pages/InscriptionManagementPage';
import { InscriptionAgreementPage } from './pages/InscriptionAgreementPage';
import { NichiBookingPage } from './pages/NichiBookingPage';
import { GlobalSearchTestPage } from './components/GlobalSearchTestPage';
import { InfiniteLoopTest } from './components/InfiniteLoopTest';
import PricingManagementPage from './pages/PricingManagementPage';
import { PersonProfilePage } from './pages/PersonProfilePage';
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
        {/* Standardized Invoice & Receipt Routes */}
        <Route path="/create-invoice" element={
          <ProtectedRoute>
            <CreateInvoicePage key="new-invoice" />
          </ProtectedRoute>
        } />
        <Route path="/create-invoice/:code" element={
          <ProtectedRoute>
            <CreateInvoicePage />
          </ProtectedRoute>
        } />

        {/* Aliases for backward compatibility */}
        <Route path="/invoice-receipt" element={<Navigate to="/create-invoice" replace />} />
        <Route path="/invoice-receipt/:code" element={<Navigate to="/create-invoice/:code" replace />} />
        <Route path="/:churchId/invoice-receipt" element={<Navigate to="/create-invoice" replace />} />
        <Route path="/:churchId/invoice-receipt/:code" element={<Navigate to="/create-invoice/:code" replace />} />

        <Route path="/create-receipt" element={
          <ProtectedRoute>
            <CreateReceiptPage key="new-receipt" />
          </ProtectedRoute>
        } />
        <Route path="/create-receipt/:code" element={
          <ProtectedRoute>
            <CreateReceiptPage />
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
        <Route path="/reports/receipt-register" element={
          <ProtectedRoute>
            <ReceiptRegisterReportPage />
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
        <Route path="/misc-receipt/new" element={
          <ProtectedRoute>
            <MiscReceiptCreatePage />
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
        <Route path="/persons" element={
          <ProtectedRoute>
            <PersonProfilePage />
          </ProtectedRoute>
        } />
        <Route path="/person/:personId" element={
          <ProtectedRoute>
            <PersonProfilePage />
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
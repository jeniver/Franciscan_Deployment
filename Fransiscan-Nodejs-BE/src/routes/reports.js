const express = require('express');
const router = express.Router();
const reportController = require('../controllers/ReportController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all report routes
router.use(authenticateToken);

// Get available reports
router.get('/', async (req, res) => reportController.getAvailableReports(req, res));

// Invoice & Receipt Reports
router.get('/invoices/receipt/:invoiceCode', async (req, res) => reportController.generateReceipt(req, res));

// Inscription Reports
router.get('/inscriptions/:insCode', async (req, res) => reportController.generateInscription(req, res));

// Monthly Reports
router.get('/monthly/receipts', async (req, res) => reportController.generateMonthlyReceipts(req, res));
router.get('/monthly/inscriptions', async (req, res) => reportController.generateMonthlyInscriptions(req, res));
router.get('/monthly/wakerooms', async (req, res) => reportController.generateMonthlyWakeRooms(req, res));
router.get('/monthly/goa', async (req, res) => reportController.generateGOAMonthly(req, res));

// Niche Reports
router.get('/niches/sold-both', async (req, res) => reportController.generateNichesSoldBoth(req, res));
router.get('/niches/sold-catholic', async (req, res) => reportController.generateNichesSoldCatholic(req, res));
router.get('/niches/sold-noncatholic', async (req, res) => reportController.generateNichesSoldNonCatholic(req, res));
router.get('/niches/renewal', async (req, res) => reportController.generateRenewalNiches(req, res));
router.get('/niches/same-address', async (req, res) => reportController.generateSameAddressNiches(req, res));

// Chapel Reports
router.get('/chapel/level', async (req, res) => reportController.generateChapelLevel(req, res));
router.get('/chapel/month', async (req, res) => reportController.generateChapelMonth(req, res));
router.get('/chapel/vacancy', async (req, res) => reportController.generateVacancyChapel(req, res));

// Beneficiary Reports
router.get('/beneficiaries/list', async (req, res) => reportController.generateBeneficiaryList(req, res));

// GST Reports
router.get('/gst/report', async (req, res) => reportController.generateGSTReport(req, res));

module.exports = router;


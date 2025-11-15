// --- IMPORTS & INITIALIZATION ---
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Razorpay = require('razorpay');
const multer = require('multer');
const path = require('path');
const twilio = require('twilio');
const cron = require('node-cron');

const app = express();
const port = 3000;

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// --- MULTER CONFIGURATION ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });


// --- DATABASE CONNECTION POOL ---
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_DATABASE || 'traahi_db',
    password: process.env.DB_PASSWORD || '30102005',
    port: process.env.DB_PORT || 5432,
});
pool.on('connect', () => console.log('Database pool connected.'));


// --- RAZORPAY INITIALIZATION ---
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// --- TWILIO INITIALIZATION ---
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);


// --- AUTHENTICATION MIDDLEWARE ---
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.status(401).json({ error: 'Access denied. No token provided.' });

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token is not valid' });
        req.user = user;
        next();
    });
}


// --- API ROUTES ---

// Health Check
app.get('/api/status', (req, res) => res.status(200).json({ status: 'Backend is running' }));

// Authentication
app.post('/api/auth/register', async (req, res) => {
    const { ngoName, email, password } = req.body;
    if (!ngoName || !email || !password) { return res.status(400).json({ error: 'All fields are required.' }); }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const userRes = await client.query('INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id', [email, hashedPassword]);
            const userId = userRes.rows[0].id;
            await client.query('INSERT INTO ngos (name, user_id) VALUES ($1, $2)', [ngoName, userId]);
            await client.query('COMMIT');
            res.status(201).json({ message: 'NGO registered successfully. Please log in.' });
        } catch (error) {
            await client.query('ROLLBACK');
            if (error.code === '23505') { return res.status(409).json({ error: 'An account with this email already exists.' }); }
            throw error;
        } finally { client.release(); }
    } catch (error) { res.status(500).json({ error: 'Internal server error' }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT u.id, u.password_hash, n.name as ngo_name FROM users u JOIN ngos n ON u.id = n.user_id WHERE u.email = $1', [email]);
        const user = result.rows[0];
        if (!user) { return res.status(401).json({ error: 'Invalid credentials' }); }
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) { return res.status(401).json({ error: 'Invalid credentials' }); }
        const token = jwt.sign({ userId: user.id, ngoName: user.ngo_name }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
        res.json({ message: 'Logged in successfully', token, ngoName: user.ngo_name });
    } catch (error) { res.status(500).json({ error: 'Internal server error' }); }
});

// Public Routes
app.get('/api/campaigns', async (req, res) => {
    try {
        const campaignsResult = await pool.query('SELECT * FROM campaigns ORDER BY event_date ASC');
        const ngosResult = await pool.query('SELECT id, name FROM ngos');
        const ngosMap = new Map(ngosResult.rows.map(ngo => [ngo.id, ngo.name]));

        const allCampaigns = campaignsResult.rows.map(campaign => ({
            ...campaign,
            ngo: ngosMap.get(campaign.ngo_id) || 'Unknown NGO'
        }));
        
        const now = new Date();
        const upcoming = allCampaigns.filter(c => new Date(c.event_date) >= now);
        const conducted = allCampaigns.filter(c => new Date(c.event_date) < now);
        
        res.json({ upcoming, conducted });

    } catch (error) {
        res.status(500).json({ error: 'Internal server error while fetching campaigns' });
    }
});

app.post('/api/register', async (req, res) => {
    const { fullName, email, phone, campaignTitle } = req.body;
    if (!fullName || !email || !campaignTitle) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const campRes = await client.query('SELECT id FROM campaigns WHERE title = $1', [campaignTitle]);
        if (campRes.rows.length === 0) {
            return res.status(404).json({ error: 'Campaign not found.' });
        }
        const campaignId = campRes.rows[0].id;

        // --- THE FIX IS HERE: Using the correct 'full_name' column ---
        await client.query(
            'INSERT INTO registrations (campaign_id, full_name, email, phone) VALUES ($1, $2, $3, $4)',
            [campaignId, fullName, email, phone]
        );

        await client.query(
            'UPDATE campaigns SET volunteers_registered = volunteers_registered + 1 WHERE id = $1',
            [campaignId]
        );

        await client.query('COMMIT');
        res.status(201).json({ message: `Thank you, ${fullName}, for registering!` });

    } catch (error) {
        await client.query('ROLLBACK');
        
        if (error.code === '23505') { 
            return res.status(409).json({ error: 'You have already registered for this event with this email address.' });
        }
        
        console.error('Registration Error:', error);
        res.status(500).json({ error: 'An internal server error occurred.' });

    } finally {
        client.release();
    }
});

app.post('/api/payment/order', async (req, res) => {
    const { amount } = req.body;
    const options = { amount: amount * 100, currency: "INR", receipt: `receipt_order_${new Date().getTime()}` };
    try {
        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (error) { res.status(500).json({ error: 'Could not create payment order.' }); }
});

// Protected Routes
app.post('/api/upload', authenticateToken, upload.single('coverImageFile'), (req, res) => {
    if (!req.file) { return res.status(400).json({ error: 'No file uploaded.' }); }
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ filePath: fileUrl });
});

app.post('/api/upload-gallery', authenticateToken, upload.array('galleryImages', 5), (req, res) => {
    if (!req.files || req.files.length === 0) { return res.status(400).json({ error: 'No files uploaded.' }); }
    const fileUrls = req.files.map(file => `${req.protocol}://${req.get('host')}/uploads/${file.filename}`);
    res.json({ filePaths: fileUrls });
});

app.post('/api/campaigns', authenticateToken, async (req, res) => {
    const { userId } = req.user;
    const { campaignTitle, description, short_summary, cover_image_url, city, type, event_date } = req.body;
    try {
        const ngoResult = await pool.query('SELECT id FROM ngos WHERE user_id = $1', [userId]);
        if (ngoResult.rows.length === 0) { return res.status(404).json({ error: 'Associated NGO not found.' }); }
        const ngoId = ngoResult.rows[0].id;
        const query = `
            INSERT INTO campaigns (ngo_id, title, description, short_summary, cover_image_url, city, type, event_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;`;
        const result = await pool.query(query, [ngoId, campaignTitle, description, short_summary, cover_image_url, city, type, event_date]);
        const newCampaign = result.rows[0];
        newCampaign.ngo = req.user.ngoName;
        res.status(201).json(newCampaign);
    } catch (error) { res.status(500).json({ error: 'Internal server error' }); }
});

app.get('/api/my-campaigns', authenticateToken, async (req, res) => {
    const { userId } = req.user;
    try {
        const ngoResult = await pool.query('SELECT id FROM ngos WHERE user_id = $1', [userId]);
        if (ngoResult.rows.length === 0) { return res.status(404).json({ error: 'Associated NGO not found.' }); }
        const ngoId = ngoResult.rows[0].id;
        const campaignsResult = await pool.query('SELECT * FROM campaigns WHERE ngo_id = $1 ORDER BY event_date ASC', [ngoId]);
        const allCampaigns = campaignsResult.rows.map(c => ({...c, ngo: req.user.ngoName}));
        const now = new Date();
        const upcoming = allCampaigns.filter(c => new Date(c.event_date) >= now);
        const conducted = allCampaigns.filter(c => new Date(c.event_date) < now);
        res.json({ upcoming, conducted });
    } catch (error) { res.status(500).json({ error: 'Internal server error' }); }
});

app.put('/api/campaigns/:id/report', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { userId } = req.user;
    const { impact_report, gallery_images } = req.body;
    try {
        const ngoResult = await pool.query('SELECT id FROM ngos WHERE user_id = $1', [userId]);
        if (ngoResult.rows.length === 0) return res.status(403).json({ error: 'Forbidden' });
        const ngoId = ngoResult.rows[0].id;
        const result = await pool.query(
            `UPDATE campaigns SET impact_report = $1, gallery_images = $2 WHERE id = $3 AND ngo_id = $4 RETURNING *`,
            [impact_report, gallery_images, id, ngoId]
        );
        if (result.rows.length === 0) { return res.status(404).json({ error: 'Campaign not found or you do not have permission.' }); }
        res.json(result.rows[0]);
    } catch (error) { res.status(500).json({ error: 'Internal server error' }); }
});

app.put('/api/campaigns/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { userId } = req.user;
    const { title, description, short_summary, cover_image_url, city, type, event_date } = req.body;
    try {
        const ngoResult = await pool.query('SELECT id FROM ngos WHERE user_id = $1', [userId]);
        if (ngoResult.rows.length === 0) return res.status(403).json({ error: 'Forbidden' });
        const ngoId = ngoResult.rows[0].id;
        const result = await pool.query(
            `UPDATE campaigns SET title = $1, description = $2, short_summary = $3, cover_image_url = $4, city = $5, type = $6, event_date = $7
             WHERE id = $8 AND ngo_id = $9 RETURNING *`,
            [title, description, short_summary, cover_image_url, city, type, event_date, id, ngoId]
        );
        if (result.rows.length === 0) { return res.status(404).json({ error: 'Campaign not found or you do not have permission.' }); }
        res.json(result.rows[0]);
    } catch (error) { res.status(500).json({ error: 'Internal server error' }); }
});

app.delete('/api/campaigns/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { userId } = req.user;
    try {
        const ngoResult = await pool.query('SELECT id FROM ngos WHERE user_id = $1', [userId]);
        if (ngoResult.rows.length === 0) return res.status(403).json({ error: 'Forbidden' });
        const ngoId = ngoResult.rows[0].id;
        const result = await pool.query('DELETE FROM campaigns WHERE id = $1 AND ngo_id = $2', [id, ngoId]);
        if (result.rowCount === 0) { return res.status(404).json({ error: 'Campaign not found or you do not have permission.' }); }
        res.status(204).send();
    } catch (error) { res.status(500).json({ error: 'Internal server error' }); }
});

// --- SMS REMINDER SCHEDULER ---
// This runs every day at 9:00 AM server time.
cron.schedule('0 9 * * *', async () => {
    console.log('Running daily check for event reminders...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    const tomorrowStr = `${year}-${month}-${day}`;

    try {
        const query = `
            SELECT r.full_name, r.phone, c.title as campaign_title
            FROM registrations r
            JOIN campaigns c ON r.campaign_id = c.id
            WHERE c.event_date::date = $1;
        `;
        const { rows } = await pool.query(query, [tomorrowStr]);

        if (rows.length === 0) {
            console.log('No reminders to send today.');
            return;
        }

        console.log(`Sending ${rows.length} reminders...`);
        for (const registration of rows) {
            if (registration.phone) {
                const message = `Hi ${registration.full_name}, this is a reminder for the event "${registration.campaign_title}" happening tomorrow. We look forward to seeing you! - Traahi`;
                try {
                    await twilioClient.messages.create({
                        body: message,
                        from: process.env.TWILIO_PHONE_NUMBER,
                        to: registration.phone // NOTE: Twilio requires the E.164 format, e.g., +919876543210
                    });
                    console.log(`Reminder sent to ${registration.phone}`);
                } catch (smsError) {
                    console.error(`Failed to send SMS to ${registration.phone}:`, smsError.message);
                }
            }
        }
    } catch (error) {
        console.error('Error fetching registrations for reminders:', error);
    }
});


// --- START SERVER ---
app.listen(port, () => {
    console.log(`Traahi backend server is running on http://localhost:${port}`);
});


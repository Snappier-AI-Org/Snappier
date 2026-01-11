/**
 * WhatsApp Web.js Service
 * 
 * This is a standalone Express server that wraps whatsapp-web.js.
 * Run this service separately from your main Next.js app.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a new folder: mkdir whatsapp-service && cd whatsapp-service
 * 2. Run: npm init -y
 * 3. Install dependencies: npm install whatsapp-web.js qrcode-terminal express cors
 * 4. Copy this file to the folder
 * 5. Run: node whatsapp-service.js
 * 6. Scan the QR code with your WhatsApp mobile app
 * 
 * ENVIRONMENT VARIABLES:
 * - PORT: The port to run the service on (default: 3001)
 * 
 * API ENDPOINTS:
 * - GET /status - Check if WhatsApp is connected
 * - GET /qr - Get QR code for authentication (if not authenticated)
 * - POST /send-message - Send a message
 *   Body: { chatId: "1234567890@c.us", message: "Hello!" }
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

let qrCodeData = null;
let isReady = false;
let clientInfo = null;

// Initialize WhatsApp client with LocalAuth for session persistence
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth'
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

// QR Code event - displayed in terminal and stored for API access
client.on('qr', (qr) => {
    console.log('\n📱 Scan this QR code with WhatsApp:');
    qrcode.generate(qr, { small: true });
    qrCodeData = qr;
    isReady = false;
});

// Ready event - client is authenticated and ready
client.on('ready', () => {
    console.log('\n✅ WhatsApp client is ready!');
    clientInfo = client.info;
    console.log(`📞 Connected as: ${clientInfo.pushname} (${clientInfo.wid.user})`);
    qrCodeData = null;
    isReady = true;
});

// Authentication success
client.on('authenticated', () => {
    console.log('🔐 Authentication successful!');
});

// Authentication failure
client.on('auth_failure', (msg) => {
    console.error('❌ Authentication failed:', msg);
    isReady = false;
});

// Disconnected
client.on('disconnected', (reason) => {
    console.log('⚠️ Client disconnected:', reason);
    isReady = false;
    qrCodeData = null;
});

// Message received (for debugging)
client.on('message', (msg) => {
    console.log(`📩 Message from ${msg.from}: ${msg.body.substring(0, 50)}...`);
});

// API Routes

// Health check and status
app.get('/status', (req, res) => {
    res.json({
        ready: isReady,
        authenticated: isReady,
        needsQR: !isReady && qrCodeData !== null,
        clientInfo: clientInfo ? {
            name: clientInfo.pushname,
            phone: clientInfo.wid.user
        } : null
    });
});

// Get QR code for authentication
app.get('/qr', (req, res) => {
    if (isReady) {
        res.json({
            success: true,
            message: 'Already authenticated',
            needsQR: false
        });
    } else if (qrCodeData) {
        res.json({
            success: true,
            qrCode: qrCodeData,
            needsQR: true,
            message: 'Scan this QR code with WhatsApp'
        });
    } else {
        res.json({
            success: false,
            message: 'QR code not yet available, please wait...',
            needsQR: true
        });
    }
});

// Send message endpoint
app.post('/send-message', async (req, res) => {
    try {
        const { chatId, message } = req.body;

        if (!chatId || !message) {
            return res.status(400).json({
                success: false,
                error: 'Missing chatId or message in request body'
            });
        }

        if (!isReady) {
            return res.status(503).json({
                success: false,
                error: 'WhatsApp client is not ready. Please authenticate first.',
                needsQR: qrCodeData !== null
            });
        }

        console.log(`📤 Sending message to ${chatId}...`);
        
        const result = await client.sendMessage(chatId, message);
        
        console.log(`✅ Message sent successfully! ID: ${result.id.id}`);
        
        res.json({
            success: true,
            messageId: result.id.id,
            timestamp: result.timestamp,
            to: chatId
        });
    } catch (error) {
        console.error('❌ Error sending message:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to send message'
        });
    }
});

// Send media endpoint
app.post('/send-media', async (req, res) => {
    try {
        const { chatId, mediaUrl, caption } = req.body;

        if (!chatId || !mediaUrl) {
            return res.status(400).json({
                success: false,
                error: 'Missing chatId or mediaUrl in request body'
            });
        }

        if (!isReady) {
            return res.status(503).json({
                success: false,
                error: 'WhatsApp client is not ready. Please authenticate first.'
            });
        }

        const { MessageMedia } = require('whatsapp-web.js');
        const media = await MessageMedia.fromUrl(mediaUrl);
        
        const result = await client.sendMessage(chatId, media, { caption });
        
        res.json({
            success: true,
            messageId: result.id.id,
            timestamp: result.timestamp,
            to: chatId
        });
    } catch (error) {
        console.error('❌ Error sending media:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to send media'
        });
    }
});

// Start the server and initialize WhatsApp client
app.listen(PORT, () => {
    console.log(`\n🚀 WhatsApp Service running on http://localhost:${PORT}`);
    console.log('📋 Endpoints:');
    console.log(`   GET  /status       - Check connection status`);
    console.log(`   GET  /qr           - Get QR code for auth`);
    console.log(`   POST /send-message - Send a message`);
    console.log(`   POST /send-media   - Send media with caption`);
    console.log('\n🔄 Initializing WhatsApp client...');
    client.initialize();
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n👋 Shutting down...');
    await client.destroy();
    process.exit(0);
});

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// Database setup
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    db.serialize(() => {
        // Users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL
        )`);

        // Drop existing media table if it exists
        db.run(`DROP TABLE IF EXISTS media`);

        // Create new media table with updated schema
        db.run(`CREATE TABLE media (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            type TEXT NOT NULL,
            event_name TEXT NOT NULL,
            remarks TEXT,
            upload_date TEXT NOT NULL,
            tags TEXT,
            user_id INTEGER,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`);

        console.log('Database tables initialized successfully');
    });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|mp4|mov/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Invalid file type!'));
    }
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Routes
// Auth routes
app.post('/api/register', async (req, res) => {
    const { username, password, role } = req.body;

    // Validate input
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    // Only allow school registration
    if (role !== 'school') {
        return res.status(400).json({ error: 'Only school registration is allowed' });
    }

    try {
        // Check if username already exists
        db.get('SELECT id FROM users WHERE username = ?', [username], async (err, user) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            if (user) {
                return res.status(400).json({ error: 'Username already exists' });
            }

            // Hash password
            const bcrypt = require('bcryptjs');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Insert new user
            db.run(
                'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                [username, hashedPassword, role],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Failed to create user' });
                    }
                    res.status(201).json({ message: 'User registered successfully' });
                }
            );
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Compare password
            const bcrypt = require('bcryptjs');
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Generate JWT token
            const token = jwt.sign(
                { id: user.id, username: user.username, role: user.role },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '24h' }
            );

            res.json({
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role
                }
            });
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Media routes
app.post('/api/upload', authenticateToken, upload.array('files', 10), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
    }

    const { eventName, remarks, tags } = req.body;
    const uploadDate = new Date().toISOString();
    const userId = req.user.id;

    try {
        const insertPromises = req.files.map(file => {
            return new Promise((resolve, reject) => {
                db.run(
                    'INSERT INTO media (filename, type, event_name, remarks, upload_date, tags, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [
                        file.filename,
                        path.extname(file.originalname).toLowerCase(),
                        eventName,
                        remarks,
                        uploadDate,
                        tags,
                        userId
                    ],
                    function(err) {
                        if (err) reject(err);
                        else resolve({ id: this.lastID, filename: file.filename });
                    }
                );
            });
        });

        const results = await Promise.all(insertPromises);
        res.json(results);
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to save media information' });
    }
});

app.get('/api/media', authenticateToken, (req, res) => {
    const { eventName, sortBy = 'date', order = 'desc', limit } = req.query;
    let query = 'SELECT * FROM media WHERE user_id = ?';
    let params = [req.user.id];

    if (eventName) {
        query += ' AND event_name = ?';
        params.push(eventName);
    }

    // Add sorting
    switch (sortBy) {
        case 'date':
            query += ' ORDER BY upload_date ' + order;
            break;
        case 'name':
            query += ' ORDER BY filename ' + order;
            break;
        case 'event':
            query += ' ORDER BY event_name ' + order;
            break;
    }

    // Add limit if specified
    if (limit) {
        query += ' LIMIT ?';
        params.push(parseInt(limit));
    }

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get user stats
app.get('/api/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get total files count and unique events count
        const statsPromise = new Promise((resolve, reject) => {
            db.get(
                `SELECT 
                    COUNT(*) as totalFiles,
                    COUNT(DISTINCT event_name) as totalEvents
                FROM media 
                WHERE user_id = ?`,
                [userId],
                (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                }
            );
        });

        // Calculate total size of files
        const calculateTotalSize = async () => {
            const files = await new Promise((resolve, reject) => {
                db.all('SELECT filename FROM media WHERE user_id = ?', [userId], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });

            let totalSize = 0;
            for (const file of files) {
                try {
                    const stats = fs.statSync(path.join(uploadsDir, file.filename));
                    totalSize += stats.size;
                } catch (error) {
                    console.error(`Error reading file size for ${file.filename}:`, error);
                }
            }
            return totalSize;
        };

        // Get recent events (last 5)
        const recentEventsPromise = new Promise((resolve, reject) => {
            db.all(
                `SELECT DISTINCT event_name, MAX(upload_date) as last_upload
                FROM media 
                WHERE user_id = ?
                GROUP BY event_name
                ORDER BY last_upload DESC
                LIMIT 5`,
                [userId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });

        // Get file type distribution
        const fileTypesPromise = new Promise((resolve, reject) => {
            db.all(
                `SELECT type, COUNT(*) as count
                FROM media 
                WHERE user_id = ?
                GROUP BY type`,
                [userId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });

        const [stats, totalSize, recentEvents, fileTypes] = await Promise.all([
            statsPromise,
            calculateTotalSize(),
            recentEventsPromise,
            fileTypesPromise
        ]);

        // Convert total size to appropriate unit
        const formatSize = (bytes) => {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        res.json({
            totalFiles: stats.totalFiles,
            totalEvents: stats.totalEvents,
            totalSize: formatSize(totalSize),
            totalSizeBytes: totalSize,
            recentEvents,
            fileTypes
        });
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// Get unique events for the user
app.get('/api/events', authenticateToken, (req, res) => {
    const userId = req.user.id;
    
    db.all(
        `SELECT 
            event_name,
            COUNT(*) as mediaCount,
            MAX(upload_date) as lastUpload
        FROM media 
        WHERE user_id = ?
        GROUP BY event_name
        ORDER BY lastUpload DESC`,
        [userId],
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows);
        }
    );
});

// Add this new endpoint for event suggestions
app.get('/api/events/suggestions', authenticateToken, (req, res) => {
    const { query } = req.query;
    const userId = req.user.id;

    // Get unique event names from user's media
    const sql = `
        SELECT DISTINCT event_name 
        FROM media 
        WHERE user_id = ? 
        AND event_name LIKE ? 
        ORDER BY upload_date DESC 
        LIMIT 5
    `;

    db.all(sql, [userId, `%${query}%`], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows.map(row => row.event_name));
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 
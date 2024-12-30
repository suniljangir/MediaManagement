const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const archiver = require('archiver');
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

// Add admin credentials check
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

// Initialize database tables
function initializeDatabase() {
    db.serialize(() => {
        // Users table with additional fields
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('admin', 'school')),
            school_name TEXT,
            address TEXT,
            contact_person TEXT,
            phone TEXT,
            email TEXT,
            banned INTEGER DEFAULT 0 CHECK (banned IN (0, 1))
        )`, (err) => {
            if (err) {
                console.error('Error creating users table:', err);
            } else {
                console.log('Users table initialized successfully');
            }
        });

        // Media table with updated schema
        db.run(`CREATE TABLE IF NOT EXISTS media (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            type TEXT NOT NULL,
            event_name TEXT NOT NULL,
            remarks TEXT,
            upload_date TEXT NOT NULL,
            tags TEXT,
            user_id INTEGER,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`, (err) => {
            if (err) {
                console.error('Error creating media table:', err);
            } else {
                console.log('Media table initialized successfully');
            }
        });

        // Add missing columns to users table if they don't exist
        db.all("PRAGMA table_info(users)", [], (err, columns) => {
            if (err) {
                console.error('Error checking table columns:', err);
                return;
            }

            const columnNames = columns.map(col => col.name);
            const missingColumns = [
                { name: 'school_name', type: 'TEXT' },
                { name: 'address', type: 'TEXT' },
                { name: 'contact_person', type: 'TEXT' },
                { name: 'phone', type: 'TEXT' },
                { name: 'email', type: 'TEXT' },
                { name: 'banned', type: 'INTEGER DEFAULT 0' }
            ];

            missingColumns.forEach(column => {
                if (!columnNames.includes(column.name)) {
                    db.run(`ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`, (err) => {
                        if (err) {
                            console.error(`Error adding column ${column.name}:`, err);
                        } else {
                            console.log(`Added column ${column.name} to users table`);
                        }
                    });
                }
            });
        });

        console.log('Database initialization completed');
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
        // Check for admin login
        if (username === ADMIN_USERNAME) {
            if (password === ADMIN_PASSWORD) {
                const token = jwt.sign(
                    { id: 0, username: ADMIN_USERNAME, role: 'admin' },
                    process.env.JWT_SECRET || 'your-secret-key',
                    { expiresIn: '24h' }
                );
                return res.json({
                    token,
                    user: {
                        id: 0,
                        username: ADMIN_USERNAME,
                        role: 'admin'
                    }
                });
            }
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Regular user login
        db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Check if user is banned
            if (user.banned) {
                return res.status(403).json({ error: 'Your account has been banned by the administrator' });
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
app.post('/api/upload', authenticateToken, async (req, res, next) => {
    // Check if user is banned
    try {
        const user = await new Promise((resolve, reject) => {
            db.get('SELECT banned FROM users WHERE id = ?', [req.user.id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (user && user.banned) {
            return res.status(403).json({ error: 'Your account has been banned by the administrator' });
        }

        next();
    } catch (error) {
        console.error('Error checking ban status:', error);
        return res.status(500).json({ error: 'Server error' });
    }
}, upload.array('files', 10), async (req, res) => {
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

// Profile routes
app.get('/api/profile', authenticateToken, (req, res) => {
  const userId = req.user.id;
  
  db.get(
    `SELECT username FROM users WHERE id = ?`,
    [userId],
    (err, user) => {
      if (err) {
        console.error('Error fetching profile:', err);
        return res.status(500).json({ error: 'Failed to fetch profile' });
      }
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({
        username: user.username,
        schoolName: '',
        address: '',
        contactPerson: '',
        phone: '',
        email: ''
      });
    }
  );
});

app.put('/api/profile', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { schoolName, address, contactPerson, phone, email } = req.body;

  db.run(
    `UPDATE users SET 
    school_name = ?, 
    address = ?, 
    contact_person = ?, 
    phone = ?, 
    email = ? 
    WHERE id = ?`,
    [schoolName, address, contactPerson, phone, email, userId],
    function(err) {
      if (err) {
        console.error('Error updating profile:', err);
        return res.status(500).json({ error: 'Failed to update profile' });
      }
      res.json({ message: 'Profile updated successfully' });
    }
  );
});

app.put('/api/profile/password', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  try {
    // Get user's current password
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT password FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // Verify current password
    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedPassword, userId],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// Add admin routes
app.get('/api/admin/schools', authenticateToken, (req, res) => {
    // Check if user is admin
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    // Add error logging
    db.all(
        `SELECT id, username, role, school_name, address, contact_person, phone, email, banned
        FROM users 
        WHERE role = 'school'
        ORDER BY username ASC`,
        [],
        (err, schools) => {
            if (err) {
                console.error('Database error in /api/admin/schools:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            // If no schools found, return empty array instead of error
            if (!schools) {
                return res.json([]);
            }
            
            res.json(schools);
        }
    );
});

app.put('/api/admin/schools/:id/ban', authenticateToken, (req, res) => {
    // Check if user is admin
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { banned } = req.body;

    db.run(
        'UPDATE users SET banned = ? WHERE id = ? AND role = "school"',
        [banned ? 1 : 0, id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'School not found' });
            }
            res.json({ message: `School ${banned ? 'banned' : 'unbanned'} successfully` });
        }
    );
});

app.get('/api/admin/stats', authenticateToken, async (req, res) => {
    // Check if user is admin
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        // Get total users count
        const usersPromise = new Promise((resolve, reject) => {
            db.get(
                'SELECT COUNT(*) as total FROM users WHERE role = "school"',
                (err, result) => {
                    if (err) reject(err);
                    else resolve(result.total);
                }
            );
        });

        // Get total files and events count
        const statsPromise = new Promise((resolve, reject) => {
            db.get(
                `SELECT 
                    COUNT(*) as totalFiles,
                    COUNT(DISTINCT event_name) as totalEvents,
                    COUNT(DISTINCT user_id) as activeSchools
                FROM media`,
                (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                }
            );
        });

        // Calculate total size of all files
        const calculateTotalSize = async () => {
            const files = await new Promise((resolve, reject) => {
                db.all('SELECT filename FROM media', (err, rows) => {
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

        const [totalUsers, stats, totalSize] = await Promise.all([
            usersPromise,
            statsPromise,
            calculateTotalSize()
        ]);

        // Format size
        const formatSize = (bytes) => {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        res.json({
            totalUsers,
            totalFiles: stats.totalFiles,
            totalEvents: stats.totalEvents,
            activeSchools: stats.activeSchools,
            totalSize: formatSize(totalSize),
            totalSizeBytes: totalSize
        });
    } catch (error) {
        console.error('Error getting admin stats:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// Admin media routes
app.get('/api/admin/media', authenticateToken, (req, res) => {
    // Check if user is admin
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    db.all(
        `SELECT m.*, u.username as school_name
        FROM media m
        LEFT JOIN users u ON m.user_id = u.id
        ORDER BY m.upload_date DESC`,
        (err, media) => {
            if (err) {
                console.error('Database error in /api/admin/media:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json(media);
        }
    );
});

app.post('/api/admin/media/download', authenticateToken, async (req, res) => {
    // Check if user is admin
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const { files } = req.body;
    if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: 'No files specified' });
    }

    try {
        // Get file information from database
        const fileInfos = await new Promise((resolve, reject) => {
            const placeholders = files.map(() => '?').join(',');
            db.all(
                `SELECT filename FROM media WHERE id IN (${placeholders})`,
                files,
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });

        // Create zip file
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        // Set response headers
        res.attachment('media-files.zip');
        archive.pipe(res);

        // Add files to archive
        fileInfos.forEach(file => {
            const filePath = path.join(uploadsDir, file.filename);
            if (fs.existsSync(filePath)) {
                archive.file(filePath, { name: file.filename });
            }
        });

        // Finalize archive
        await archive.finalize();
    } catch (error) {
        console.error('Error creating zip file:', error);
        res.status(500).json({ error: 'Failed to create zip file' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 
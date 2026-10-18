require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Disable aggressive caching for HTML, JS and JSON so mobile browsers always get latest updates
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
});

// Serve static files
app.use(express.static(__dirname, {
    etag: false,
    maxAge: 0
}));

// Explicitly serve index.html for the root route to fix "Not Found" on some cloud environments
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mufc_academy';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Failed to connect to MongoDB', err));

// Mongoose Schema & Model for global app state
const AppDataSchema = new mongoose.Schema({
    players: { type: Array, default: [] },
    pendingUsers: { type: Array, default: [] },
    messages: { type: Array, default: [] },
    matches: { type: Array, default: [] },
    practiceSession: { type: Object, default: {} },
    attendance: { type: Array, default: [] },
    academyStudents: { type: Array, default: [] },
    academyAttendance: { type: Array, default: [] },
    academyPayments: { type: Array, default: [] },
    coaches: { type: Array, default: [] },
    academyAccounts: { type: Array, default: [] },
    academyAdmins: { type: Array, default: [] }
}, { minimize: false });

const AppData = mongoose.model('AppData', AppDataSchema);

// Helper to get or create the single data document
async function getAppData() {
    let data = await AppData.findOne();
    if (!data) {
        data = await AppData.create({
            players: [],
            pendingUsers: [],
            messages: [],
            matches: [],
            practiceSession: {},
            attendance: [],
            academyStudents: [],
            academyAttendance: [],
            academyPayments: [],
            coaches: [],
            academyAccounts: [],
            academyAdmins: [
                { username: 'pmnoushu010', password: 'Aamir@12345$', type: 'super' },
                { username: 'mufcacademy', password: 'admin@12345', type: 'main' },
                { username: 'academyadmin', password: 'admin', type: 'normal' },
                { username: 'shanu410', password: 'MUFC@difa03', type: 'super' }
            ]
        });
    }
    return data;
}

// REST APIs

// 1. Get entire state (used for initial load)
app.get('/api/data', async (req, res) => {
    try {
        const data = await getAppData();
        // Server-side safety cleanup: if students were deleted, remove any orphaned attendance or payment records
        if (data.academyStudents && Array.isArray(data.academyStudents) && data.academyStudents.length > 0) {
            const validIds = new Set([
                ...data.academyStudents.map(s => String(s.id)),
                ...(data.coaches || []).map(c => String(c.id || c.mobile))
            ]);
            let modified = false;
            if (data.academyAttendance && Array.isArray(data.academyAttendance)) {
                const cleanAtt = data.academyAttendance.filter(a => a && a.studentId && validIds.has(String(a.studentId)));
                if (cleanAtt.length !== data.academyAttendance.length) {
                    data.academyAttendance = cleanAtt;
                    data.markModified('academyAttendance');
                    modified = true;
                }
            }
            if (data.academyPayments && Array.isArray(data.academyPayments)) {
                const cleanPay = data.academyPayments.filter(p => p && p.studentId && validIds.has(String(p.studentId)));
                if (cleanPay.length !== data.academyPayments.length) {
                    data.academyPayments = cleanPay;
                    data.markModified('academyPayments');
                    modified = true;
                }
            }
            if (modified) {
                await data.save();
            }
        }
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// 2. Fallback Save entire state (legacy support for app.js while refactoring)
app.post('/api/data', async (req, res) => {
    try {
        await AppData.updateOne({}, { $set: req.body });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// Granular Sync Endpoint to prevent race conditions
app.post('/api/sync', async (req, res) => {
    try {
        const { action, payload } = req.body;
        let data = await getAppData();
        
        switch (action) {
            case 'ADD_MESSAGE':
                data.messages.push(payload);
                data.markModified('messages');
                break;
            case 'ADD_ATTENDANCE':
                data.attendance.push(payload);
                data.markModified('attendance');
                break;
            case 'UPDATE_ATTENDANCE_STATUS':
                const attIdx = data.attendance.findIndex(a => a.id === payload.id);
                if (attIdx !== -1) {
                    data.attendance[attIdx].status = payload.status;
                    if(payload.approvedAt) data.attendance[attIdx].approvedAt = payload.approvedAt;
                    data.markModified('attendance');
                }
                break;
            case 'TOGGLE_ATTENDANCE':
                let existing = data.attendance.find(a => a.matchId === payload.sessionId && (a.playerId == payload.playerId || a.playerName === payload.playerName));
                if (!existing) {
                    data.attendance.push({
                        id: 'att_' + Date.now(),
                        matchId: payload.sessionId,
                        type: payload.sessionId === data.practiceSession.id ? 'practice' : 'match',
                        playerId: payload.playerId,
                        playerName: payload.playerName,
                        status: 'Approved',
                        requestedAt: 'Manual (Admin)',
                        approvedAt: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
                    });
                } else {
                    existing.status = existing.status === 'Approved' ? 'Declined' : 'Approved';
                    existing.approvedAt = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
                }
                data.markModified('attendance');
                break;
            case 'ADD_PENDING_USER':
                data.pendingUsers.push(payload);
                data.markModified('pendingUsers');
                break;
            case 'APPROVE_USER':
                const userIdx = data.pendingUsers.findIndex(u => u.id === payload.id || u.mobile === payload.id);
                if (userIdx !== -1) {
                    const user = data.pendingUsers[userIdx];
                    if (user.role === 'coach') {
                        data.coaches.push(user);
                        data.markModified('coaches');
                    } else {
                        data.players.push(user);
                        data.markModified('players');
                    }
                    data.pendingUsers.splice(userIdx, 1);
                    data.markModified('pendingUsers');
                }
                break;
            case 'DECLINE_USER':
                const decIdx = data.pendingUsers.findIndex(u => u.id === payload.id || u.mobile === payload.id);
                if (decIdx !== -1) {
                    data.pendingUsers.splice(decIdx, 1);
                    data.markModified('pendingUsers');
                }
                break;
            case 'UPDATE_PRACTICE':
                data.practiceSession = payload;
                data.markModified('practiceSession');
                break;
            case 'ADD_ACADEMY_STUDENT':
                data.academyStudents.push(payload);
                data.markModified('academyStudents');
                break;
            case 'DELETE_ACADEMY_STUDENT':
                const targetStudentId = String(payload.id);
                data.academyStudents = data.academyStudents.filter(s => String(s.id) !== targetStudentId);
                if (data.academyAttendance) {
                    data.academyAttendance = data.academyAttendance.filter(a => String(a.studentId) !== targetStudentId);
                }
                if (data.academyPayments) {
                    data.academyPayments = data.academyPayments.filter(p => String(p.studentId) !== targetStudentId);
                }
                await AppData.updateOne({}, {
                    $set: {
                        academyStudents: data.academyStudents,
                        academyAttendance: data.academyAttendance,
                        academyPayments: data.academyPayments
                    }
                });
                return res.json({ success: true, state: data });
            case 'ADD_ACADEMY_PAYMENT':
                data.academyPayments.push(payload);
                data.markModified('academyPayments');
                break;
            case 'ADD_ACADEMY_ATTENDANCE':
                data.academyAttendance.push(payload);
                data.markModified('academyAttendance');
                break;
            case 'ADD_ACADEMY_ACCOUNT':
                data.academyAccounts.push(payload);
                data.markModified('academyAccounts');
                break;
            case 'DELETE_ACADEMY_ACCOUNT':
                data.academyAccounts = data.academyAccounts.filter(a => a.id !== payload.id);
                data.markModified('academyAccounts');
                break;
            case 'ADD_ACADEMY_USER':
                data.academyAdmins.push(payload);
                data.markModified('academyAdmins');
                break;
            case 'DELETE_ACADEMY_USER':
                data.academyAdmins = data.academyAdmins.filter(u => u.username !== payload.username);
                data.markModified('academyAdmins');
                break;
            case 'UPDATE_PLAYER':
                const pIdx = data.players.findIndex(p => p.id === payload.id);
                if(pIdx !== -1) {
                    data.players[pIdx] = payload;
                    data.markModified('players');
                }
                break;
            default:
                return res.status(400).json({ error: 'Unknown action' });
        }
        
        await data.save();
        res.json({ success: true, state: data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to sync data' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`MUFC Server running on http://localhost:${PORT}`);
});

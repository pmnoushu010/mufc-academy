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

// Serve static files
app.use(express.static(__dirname));

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
            players: [
                { id: 1, name: "Marcus Rashford", number: 10, email: "marcus@mufc.com", password: "password", dob: "1997-10-31" },
                { id: 2, name: "Bruno Fernandes", number: 8, email: "bruno@mufc.com", password: "password", dob: "1994-09-08" }
            ],
            pendingUsers: [],
            messages: [
                { sender: "Marcus Rashford", text: "Coach, I will be 10 mins late to training.", time: "10:30 AM" },
                { sender: "Admin", to: "Marcus Rashford", text: "No problem Marcus, see you soon.", time: "10:32 AM" }
            ],
            matches: [
                { id: "m1", title: "vs City FC (Premier League)", date: "2026-09-02", time: "18:00", location: "Old Trafford", isUpcoming: true },
                { id: "m2", title: "vs Arsenal FC (Cup Semi-Final)", date: "2026-09-08", time: "20:00", location: "Emirates Stadium", isUpcoming: true },
                { id: "m3", title: "vs Chelsea FC (League Match)", date: "2026-08-25", time: "16:30", location: "Stamford Bridge", isUpcoming: false }
            ],
            practiceSession: {
                id: "practice_1",
                title: "Tactical Drills & Fitness Training",
                day: "Wednesday",
                date: "2026-09-03",
                time: "18:00 - 20:00",
                location: "Carrington Training Pitch 2",
                notes: "Bring full training kit, boots & water bottle."
            },
            attendance: [
                { id: "att_p1", matchId: "practice_1", type: "practice", playerId: 1, playerName: "Marcus Rashford", status: "Approved", requestedAt: "09:15 AM" },
                { id: "att_1", matchId: "m1", type: "match", playerId: 1, playerName: "Marcus Rashford", status: "Approved", requestedAt: "10:30 AM" },
                { id: "att_2", matchId: "m3", type: "match", playerId: 1, playerName: "Marcus Rashford", status: "Approved", requestedAt: "15:00 PM" },
                { id: "att_3", matchId: "m3", type: "match", playerId: 2, playerName: "Bruno Fernandes", status: "Approved", requestedAt: "15:00 PM" }
            ],
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
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// 2. Fallback Save entire state (legacy support for app.js while refactoring)
app.post('/api/data', async (req, res) => {
    try {
        let data = await getAppData();
        Object.assign(data, req.body);
        await data.save();
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
                data.academyStudents = data.academyStudents.filter(s => s.id !== payload.id);
                data.markModified('academyStudents');
                break;
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

// Global State
let currentRole = null; // 'admin' or 'player'
let currentUser = null;
let currentAdminChatUser = null;

let players = [];
let pendingUsers = [];
let messages = [];
let matches = [];
let practiceSession = {};
let attendance = [];
let academyStudents = [];
let academyAttendance = [];
let academyPayments = [];
let coaches = [];
let academyAccounts = [];
let academyAdmins = [];

async function initData() {
    try {
        const response = await fetch('/api/data');
        if (response.ok) {
            const data = await response.json();
            
            players = data.players && data.players.length ? data.players : [
                { id: 1, name: "Marcus Rashford", number: 10, email: "marcus@mufc.com", password: "password", dob: "1997-10-31" },
                { id: 2, name: "Bruno Fernandes", number: 8, email: "bruno@mufc.com", password: "password", dob: "1994-09-08" }
            ];
            pendingUsers = data.pendingUsers || [];
            messages = data.messages && data.messages.length ? data.messages : [
                { sender: "Marcus Rashford", text: "Coach, I will be 10 mins late to training.", time: "10:30 AM" },
                { sender: "Admin", to: "Marcus Rashford", text: "No problem Marcus, see you soon.", time: "10:32 AM" }
            ];
            matches = data.matches && data.matches.length ? data.matches : [
                { id: "m1", title: "vs City FC (Premier League)", date: "2026-09-02", time: "18:00", location: "Old Trafford", isUpcoming: true },
                { id: "m2", title: "vs Arsenal FC (Cup Semi-Final)", date: "2026-09-08", time: "20:00", location: "Emirates Stadium", isUpcoming: true },
                { id: "m3", title: "vs Chelsea FC (League Match)", date: "2026-08-25", time: "16:30", location: "Stamford Bridge", isUpcoming: false }
            ];
            practiceSession = data.practiceSession && data.practiceSession.id ? data.practiceSession : {
                id: "practice_1",
                title: "Tactical Drills & Fitness Training",
                day: "Wednesday",
                date: "2026-09-03",
                time: "18:00 - 20:00",
                location: "Carrington Training Pitch 2",
                notes: "Bring full training kit, boots & water bottle."
            };
            attendance = data.attendance && data.attendance.length ? data.attendance : [
                { id: "att_p1", matchId: "practice_1", type: "practice", playerId: 1, playerName: "Marcus Rashford", status: "Approved", requestedAt: "09:15 AM" },
                { id: "att_1", matchId: "m1", type: "match", playerId: 1, playerName: "Marcus Rashford", status: "Approved", requestedAt: "10:30 AM" },
                { id: "att_2", matchId: "m3", type: "match", playerId: 1, playerName: "Marcus Rashford", status: "Approved", requestedAt: "15:00 PM" },
                { id: "att_3", matchId: "m3", type: "match", playerId: 2, playerName: "Bruno Fernandes", status: "Approved", requestedAt: "15:00 PM" }
            ];
            academyStudents = data.academyStudents || [];
            academyAttendance = data.academyAttendance || [];
            academyPayments = data.academyPayments || [];
            coaches = data.coaches || [];
            academyAccounts = data.academyAccounts || [];
            
            academyAdmins = data.academyAdmins && data.academyAdmins.length ? data.academyAdmins : [
                { username: 'pmnoushu010', password: 'Aamir@12345$', type: 'super' },
                { username: 'mufcacademy', password: 'admin@12345', type: 'main' },
                { username: 'academyadmin', password: 'admin', type: 'normal' },
                { username: 'shanu410', password: 'MUFC@difa03', type: 'super' }
            ];

            let needSave = false;
            if (!data.players || !data.players.length) needSave = true;
            
            // Rename existing admin if needed
            let oldAdmin = academyAdmins.find(a => a.username === 'pmnoushu010@gmail.com');
            if (oldAdmin) {
                oldAdmin.username = 'pmnoushu010';
                needSave = true;
            }
            
            // Ensure the new super admin is added even if data was loaded from backend
            if (!academyAdmins.some(a => a.username === 'shanu410')) {
                academyAdmins.push({ username: 'shanu410', password: 'MUFC@difa03', type: 'super' });
                needSave = true;
            }

            if (needSave) {
                saveData();
            }
        }
    } catch (e) {
        console.error("Failed to load data from backend:", e);
        if (window.location.protocol === 'file:') {
            alert("Warning: You opened this app directly from a file (index.html). The data you added cannot be loaded or saved this way.\n\nPlease run 'start_server.bat' and open http://localhost:3000 in your browser to see your data.");
        } else {
            alert("Warning: Could not connect to the server to load data. Please ensure 'start_server.bat' is running.");
        }
    }
}

initData();

function saveData() {
    const dataToSave = {
        players, pendingUsers, messages, matches, practiceSession, 
        attendance, academyStudents, academyAttendance, academyPayments, coaches, academyAccounts, academyAdmins
    };
    fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave)
    }).catch(e => {
        console.error("Failed to save data:", e);
        alert("Failed to save data. Please make sure 'start_server.bat' is running.");
    });
}

// Real-time syncing for multiple concurrent users
setInterval(async () => {
    if (!currentRole) return; // Don't poll if not logged in
    try {
        const response = await fetch('/api/data');
        if (response.ok) {
            const data = await response.json();
            
            // Only update globals if data exists to prevent overwriting with empty
            if(data.players) players = data.players;
            if(data.pendingUsers) pendingUsers = data.pendingUsers;
            if(data.messages) messages = data.messages;
            if(data.matches) matches = data.matches;
            if(data.practiceSession) practiceSession = data.practiceSession;
            if(data.attendance) attendance = data.attendance;
            if(data.academyStudents) academyStudents = data.academyStudents;
            if(data.academyAttendance) academyAttendance = data.academyAttendance;
            if(data.academyPayments) academyPayments = data.academyPayments;
            if(data.coaches) coaches = data.coaches;
            if(data.academyAccounts) academyAccounts = data.academyAccounts;
            if(data.academyAdmins) academyAdmins = data.academyAdmins;

            // Re-render current active view to show changes from other users
            const activeView = document.querySelector('.view.active');
            if (activeView) {
                // Prevent re-rendering if the user is currently typing in an input or textarea
                const activeEl = document.activeElement;
                const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
                
                if (!isTyping) {
                    const viewId = activeView.id.replace('view-', '');
                    if(viewId === 'admin-dashboard') renderAdminDashboard();
                    else if(viewId === 'admin-messages') renderAdminMessages();
                    else if(viewId === 'admin-approvals') renderPendingApprovals();
                    else if(viewId === 'admin-attendance') renderAdminAttendance();
                    else if(viewId === 'admin-players') renderPlayers();
                    else if(viewId === 'player-dashboard') renderPlayerDashboard();
                    else if(viewId === 'player-messages') renderPlayerChat();
                    else if(viewId === 'academy-admin') renderAcademyStudents();
                    else if(viewId === 'academy-attendance') renderAcademyAttendance();
                    else if(viewId === 'academy-payments') renderAcademyPayments();
                    else if(viewId === 'academy-reports') renderAcademyReports();
                    else if(viewId === 'academy-accounts') renderAcademyAccounts();
                    else if(viewId === 'academy-users') renderAcademyUsers();
                }
                
                // Also update chat if open
                if (document.getElementById('admin-chat-view') && document.getElementById('admin-chat-view').style.display === 'block') {
                    renderAdminChatThread();
                }
            }
        }
    } catch (e) {
        console.error("Polling failed:", e);
    }
}, 5000);

// UI Screen Management
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    document.getElementById(screenId).style.display = 'flex';
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            resolve(null);
            return;
        }
        
        // If not an image, just read as data URL normally
        if (!file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 400;
                const MAX_HEIGHT = 400;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                // Compress to JPEG with 0.7 quality to save space
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = () => reject(new Error("Failed to load image"));
            img.src = e.target.result;
        };
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

function toggleRegRole() {
    const role = document.querySelector('input[name="reg-role"]:checked').value;
    const isCoach = role === 'coach';
    
    document.getElementById('group-reg-dob').style.display = isCoach ? 'none' : 'block';
    document.getElementById('group-reg-pic').style.display = isCoach ? 'none' : 'block';
    document.getElementById('group-reg-email').style.display = isCoach ? 'none' : 'block';
    document.getElementById('group-reg-id').style.display = isCoach ? 'none' : 'block';
    document.getElementById('group-reg-mobile').style.display = isCoach ? 'block' : 'none';
    
    const regBtn = document.getElementById('reg-submit-btn');
    if (regBtn) regBtn.disabled = true;
}

async function handleRegistration() {
    const role = document.querySelector('input[name="reg-role"]:checked') ? document.querySelector('input[name="reg-role"]:checked').value : 'student';
    const name = document.getElementById('reg-name').value.trim();
    const pass = document.getElementById('reg-pass').value.trim();
    const countryCode = document.getElementById('reg-country-code').value;
    const whatsapp = document.getElementById('reg-whatsapp').value.trim();
    
    let id = '', dob = '', email = '', picBase64 = null, mobile = '';

    if (role === 'student') {
        id = document.getElementById('reg-id').value.trim();
        dob = document.getElementById('reg-dob').value;
        email = document.getElementById('reg-email').value.trim();
        const picFile = document.getElementById('reg-pic').files[0];
        picBase64 = picFile ? await fileToBase64(picFile) : null;

        if(!id || !name || !dob || !email || !whatsapp || !pass) {
            return alert("Please fill all required fields to register.");
        }

        const alreadyExists = players.some(p => p.id.toString() === id || p.email.toLowerCase() === email.toLowerCase()) ||
                              pendingUsers.some(p => p.id && p.id.toString() === id || (p.email && p.email.toLowerCase() === email.toLowerCase()));
        if(alreadyExists) {
            return alert("A user with this ID Number or Email is already registered or pending approval.");
        }
    } else {
        mobile = document.getElementById('reg-mobile').value.trim();
        id = mobile;

        if(!name || !mobile || !whatsapp || !pass) {
            return alert("Please fill Name, Mobile Number, WhatsApp Number, and Password to register as a coach.");
        }

        const alreadyExists = coaches.some(c => c.mobile === mobile) ||
                              pendingUsers.some(p => p.mobile === mobile);
        if(alreadyExists) {
            return alert("A coach with this Mobile Number is already registered or pending approval.");
        }
    }

    const fullWhatsapp = whatsapp ? `${countryCode} ${whatsapp}` : '';

    const newUser = { role: role, id: id, name: name, dob: dob, email: email, password: pass, pic: picBase64, whatsapp: fullWhatsapp, mobile: mobile };
    pendingUsers.push(newUser);
    saveData();
    
    alert("Registration submitted! Please wait for admin to grant access.");
    showScreen('login-screen');
    
    // Clear inputs
    document.querySelectorAll('#register-screen input').forEach(i => {
        if(i.type !== 'radio') i.value = '';
    });
}

function handleLogin() {
    const loginId = document.getElementById('login-id').value.trim();
    const loginPass = document.getElementById('login-pass').value.trim();

    if(!loginId || !loginPass) return alert("Please enter credentials.");

    // Admin check
    if(loginId === 'admin' && loginPass === 'admin') {
        return performLogin('admin', null);
    }
    
    // Academy Admin dynamic check
    const academyAdminUser = academyAdmins.find(u => u.username === loginId && u.password === loginPass);
    if(academyAdminUser) {
        return performLogin('academyAdmin', { id: academyAdminUser.username, type: academyAdminUser.type });
    }

    // Coach check
    const coach = coaches.find(c => c.mobile === loginId && c.password === loginPass);
    if(coach) {
        return performLogin('coach', coach);
    }

    // Player check
    const player = players.find(p => (p.id.toString() === loginId || p.email === loginId) && p.password === loginPass);
    if(player) {
        return performLogin('player', player);
    }

    // Pending check
    const isPending = pendingUsers.some(p => (p.id && p.id.toString() === loginId || p.email === loginId || p.mobile === loginId) && p.password === loginPass);
    if(isPending) {
        return alert("Your account is still pending admin approval.");
    }

    alert("Invalid credentials.");
}

function performLogin(role, user) {
    currentRole = role;
    currentUser = user;
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('app-screen').style.display = 'flex';
    
    // Set username display
    let displayUserName = "";
    if (role === 'admin') displayUserName = "Admin";
    else if (role === 'academyAdmin') displayUserName = user.id.split('@')[0];
    else if (role === 'coach') displayUserName = user.name;
    else if (role === 'player') displayUserName = user.name;
    
    const headerUserName = document.getElementById('header-user-name');
    if (headerUserName) {
        headerUserName.innerText = displayUserName;
    }
    
    if(role === 'admin') {
        document.querySelector('.profile-pic').style.backgroundImage = "none";
        document.getElementById('header-title').innerText = "Admin Portal";
        document.getElementById('admin-nav').style.display = 'flex';
        document.getElementById('player-nav').style.display = 'none';
        
        switchView('admin-dashboard');
        renderAdminDashboard();
        renderPlayers();
        renderPendingApprovals();
        renderAdminAttendance();
        renderAdminMessages();
    } else if(role === 'academyAdmin') {
        document.querySelector('.profile-pic').style.backgroundImage = "none";
        document.getElementById('header-title').innerText = "Academy Portal";
        document.getElementById('admin-nav').style.display = 'none';
        document.getElementById('player-nav').style.display = 'none';
        document.getElementById('academy-nav').style.display = 'flex';
        document.querySelectorAll('#academy-nav .nav-item').forEach(item => {
            if (item.getAttribute('onclick').includes('academy-users')) {
                item.style.display = (user && user.type === 'super') ? 'flex' : 'none';
            } else if (item.getAttribute('onclick').includes('academy-accounts')) {
                item.style.display = (user && (user.type === 'main' || user.type === 'super')) ? 'flex' : 'none';
            } else {
                item.style.display = 'flex';
            }
        });
        
        switchView('academy-admin');
        renderAcademyStudents();
    } else if(role === 'coach') {
        document.querySelector('.profile-pic').style.backgroundImage = currentUser.pic ? `url('${currentUser.pic}')` : "none";
        document.getElementById('header-title').innerText = "Coach Portal";
        document.getElementById('admin-nav').style.display = 'none';
        document.getElementById('player-nav').style.display = 'none';
        document.getElementById('academy-nav').style.display = 'flex';
        
        // Hide other academy nav items
        document.querySelectorAll('#academy-nav .nav-item').forEach(item => {
            if (item.innerText.includes('Attendance')) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
        
        switchView('academy-attendance');
        renderAcademyAttendance();
    } else {
        document.querySelector('.profile-pic').style.backgroundImage = currentUser.pic ? `url('${currentUser.pic}')` : "none";
        document.getElementById('header-title').innerText = "Player Portal";
        document.getElementById('current-player-name').innerText = user.name.split(' ')[0];
        document.getElementById('admin-nav').style.display = 'none';
        document.getElementById('academy-nav').style.display = 'none';
        document.getElementById('player-nav').style.display = 'flex';
        
        switchView('player-dashboard');
        renderPlayerDashboard();
    }
}

function logout() {
    currentRole = null;
    currentUser = null;
    document.getElementById('app-screen').style.display = 'none';
    showScreen('login-screen');
    // Clear login inputs
    document.getElementById('login-id').value = '';
    document.getElementById('login-pass').value = '';
}

// Navigation
function switchView(viewId, event) {
    if(event) event.preventDefault();
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(`view-${viewId}`);
    if(target) target.classList.add('active');
    
    // Update nav icons
    const navId = currentRole === 'admin' ? 'admin-nav' : (currentRole === 'academyAdmin' ? 'academy-nav' : 'player-nav');
    document.querySelectorAll(`#${navId} .nav-item`).forEach(n => n.classList.remove('active'));
    if(event) {
        event.currentTarget.classList.add('active');
    }

    if(viewId === 'admin-dashboard') {
        renderAdminDashboard();
    } else if(viewId === 'admin-messages') {
        closeAdminChat();
        renderAdminMessages();
    } else if(viewId === 'admin-approvals') {
        renderPendingApprovals();
    } else if(viewId === 'admin-attendance') {
        renderAdminAttendance();
    } else if(viewId === 'admin-players') {
        renderPlayers();
    } else if(viewId === 'player-dashboard') {
        renderPlayerDashboard();
    } else if(viewId === 'player-messages') {
        renderPlayerChat();
    } else if(viewId === 'academy-admin') {
        renderAcademyStudents();
    } else if(viewId === 'academy-attendance') {
        renderAcademyAttendance();
    } else if(viewId === 'academy-payments') {
        renderAcademyPayments();
    } else if(viewId === 'academy-reports') {
        renderAcademyReports();
    } else if(viewId === 'academy-accounts') {
        renderAcademyAccounts();
    } else if(viewId === 'academy-users') {
        renderAcademyUsers();
    }
}

// --- ADMIN LOGIC ---
function showEditPracticeModal() {
    document.getElementById('practice-input-title').value = practiceSession.title || 'Tactical Drills & Fitness Training';
    document.getElementById('practice-input-day').value = practiceSession.day || 'Wednesday';
    document.getElementById('practice-input-date').value = practiceSession.date || '2026-09-03';
    document.getElementById('practice-input-time').value = practiceSession.time || '18:00 - 20:00';
    document.getElementById('practice-input-location').value = practiceSession.location || 'Carrington Training Pitch 2';
    document.getElementById('practice-input-notes').value = practiceSession.notes || '';
    document.getElementById('edit-practice-modal').classList.add('active');
}

function savePracticeSchedule() {
    const title = document.getElementById('practice-input-title').value.trim();
    const day = document.getElementById('practice-input-day').value;
    const date = document.getElementById('practice-input-date').value;
    const time = document.getElementById('practice-input-time').value.trim();
    const location = document.getElementById('practice-input-location').value.trim();
    const notes = document.getElementById('practice-input-notes').value.trim();

    if(!title || !date || !time || !location) {
        return alert("Please fill all required practice details (Title, Date, Time, Ground Location).");
    }

    practiceSession = {
        id: "practice_1",
        title: title,
        day: day || 'Wednesday',
        date: date,
        time: time,
        location: location,
        notes: notes || 'Bring training kit & boots.'
    };

    saveData();
    closeModal();
    renderAdminDashboard();
    renderAdminAttendance();
    alert("Practice schedule updated successfully! All registered players will see the updated day, date, time, and ground location.");
}

function renderAdminDashboard() {
    const totalPlayersElem = document.getElementById('stat-total-players');
    if (totalPlayersElem) totalPlayersElem.innerText = players.length;

    const pendingElem = document.getElementById('stat-pending');
    if (pendingElem) pendingElem.innerText = pendingUsers.length;
    
    // Count pending check-in requests (both practice & matches)
    const pendingAttCount = attendance.filter(a => a.status === 'Requested').length;
    const statPendingAtt = document.getElementById('stat-pending-attendance');
    if (statPendingAtt) statPendingAtt.innerText = pendingAttCount;

    // Practice session preview
    const practiceDateElem = document.getElementById('admin-practice-datetime-preview');
    if (practiceDateElem) practiceDateElem.innerText = `${practiceSession.day}, ${practiceSession.date} • ${practiceSession.time.split('-')[0].trim()}`;

    const practiceTitleElem = document.getElementById('admin-practice-title-preview');
    if (practiceTitleElem) practiceTitleElem.innerText = practiceSession.title;

    const practiceLocElem = document.getElementById('admin-practice-location-preview');
    if (practiceLocElem) practiceLocElem.innerText = practiceSession.location;

    const nextSessionHeader = document.getElementById('admin-next-session-text');
    if (nextSessionHeader) nextSessionHeader.innerText = `Next Practice: ${practiceSession.day} at ${practiceSession.time.split('-')[0].trim()}`;

    const practicePresentCount = attendance.filter(a => a.matchId === practiceSession.id && a.status === 'Approved').length;
    const practicePresentElem = document.getElementById('admin-practice-present-count');
    if (practicePresentElem) practicePresentElem.innerText = practicePresentCount;

    // Next match presence count
    const nextMatchPresent = attendance.filter(a => a.matchId === 'm1' && a.status === 'Approved').length;
    const nextMatchCountElem = document.getElementById('admin-match-present-count');
    if (nextMatchCountElem) nextMatchCountElem.innerText = nextMatchPresent;
}

let currentAttendanceTab = 'mark';

function switchAttendanceTab(tabName) {
    currentAttendanceTab = tabName;
    const markBtn = document.getElementById('tab-btn-mark');
    const summaryBtn = document.getElementById('tab-btn-summary');
    const markTab = document.getElementById('admin-attendance-mark-tab');
    const summaryTab = document.getElementById('admin-attendance-summary-tab');

    if (tabName === 'mark') {
        if(markBtn) markBtn.classList.add('active');
        if(summaryBtn) summaryBtn.classList.remove('active');
        if(markTab) markTab.style.display = 'block';
        if(summaryTab) summaryTab.style.display = 'none';
    } else {
        if(markBtn) markBtn.classList.remove('active');
        if(summaryBtn) summaryBtn.classList.add('active');
        if(markTab) markTab.style.display = 'none';
        if(summaryTab) summaryTab.style.display = 'block';
    }
    renderAdminAttendance();
}

function renderAdminAttendance() {
    renderAdminDashboard();
    
    // 1. Render Mark Attendance List
    const markList = document.getElementById('admin-attendance-mark-list');
    
    if (markList) {
        if (players.length === 0) {
            markList.innerHTML = "<p style='color:#9ca3af; text-align:center; padding: 25px 0;'>No players registered yet.</p>";
        } else {
            markList.innerHTML = players.map(player => {
                const totalSessionSlots = matches.length + 1;
                const playerApprovedCount = attendance.filter(a => (a.playerId == player.id || a.playerName === player.name) && a.status === 'Approved').length;
                const rate = Math.min(100, Math.round((playerApprovedCount / totalSessionSlots) * 100));

                const pracAtt = attendance.find(a => a.matchId === practiceSession.id && (a.playerId == player.id || a.playerName === player.name) && a.status === 'Approved');
                const matchAtt = attendance.find(a => a.matchId === 'm1' && (a.playerId == player.id || a.playerName === player.name) && a.status === 'Approved');

                const pracStyle = pracAtt ? 'background: #10b981; border-color: #10b981; color: #fff;' : '';
                const pracIcon = pracAtt ? 'fa-check' : 'fa-plus';
                const pracBtnClass = pracAtt ? 'btn-primary' : 'btn-secondary';

                const matchStyle = matchAtt ? 'background: #10b981; border-color: #10b981; color: #fff;' : '';
                const matchIcon = matchAtt ? 'fa-check' : 'fa-plus';
                const matchBtnClass = matchAtt ? 'btn-primary' : 'btn-secondary';

                return `
                    <div class="user-card" style="padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 8px;">
                        <div style="display: flex; align-items: center; gap: 12px; flex: 1; overflow: hidden;">
                            <div class="user-avatar" style="width: 36px; height: 36px; font-size: 0.9rem; flex-shrink: 0; ${player.pic ? `background-image: url('${player.pic}'); background-size: cover; background-position: center;` : ''}">${player.pic ? '' : '<i class="fa-solid fa-user"></i>'}</div>
                            <div style="overflow: hidden;">
                                <h4 style="margin: 0; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(player.name)}</h4>
                                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
                                    <span style="color: var(--primary);">#${player.number || '-'}</span> • ${playerApprovedCount}/${totalSessionSlots} Sessions (${rate}%)
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 6px; flex-shrink: 0;">
                            <button class="${pracBtnClass}" onclick="togglePlayerAttendance('${player.id}', '${practiceSession.id}')" style="padding: 6px 10px; font-size: 0.75rem; ${pracStyle}" title="Toggle Practice Attendance">
                                <i class="fa-solid ${pracIcon}"></i> Prac
                            </button>
                            <button class="${matchBtnClass}" onclick="togglePlayerAttendance('${player.id}', 'm1')" style="padding: 6px 10px; font-size: 0.75rem; ${matchStyle}" title="Toggle Match Attendance">
                                <i class="fa-solid ${matchIcon}"></i> Match
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // 2. Render Squad Summary
    const summaryList = document.getElementById('admin-attendance-summary-list');
    if (summaryList) {
        let totalAttendedCount = 0;
        const totalSessionSlots = matches.length + 1; // matches + 1 practice session
        let possibleAttendances = players.length * totalSessionSlots;

        const playerStats = players.map(p => {
            const playerApprovedCount = attendance.filter(a => (a.playerId == p.id || a.playerName === p.name) && a.status === 'Approved').length;
            totalAttendedCount += playerApprovedCount;
            const rate = Math.min(100, Math.round((playerApprovedCount / totalSessionSlots) * 100));
            
            // Status for next practice
            const practiceAtt = attendance.find(a => a.matchId === practiceSession.id && (a.playerId == p.id || a.playerName === p.name));
            let practiceStatus = practiceAtt ? practiceAtt.status : 'none';

            // Status for next match (m1)
            const matchAtt = attendance.find(a => a.matchId === 'm1' && (a.playerId == p.id || a.playerName === p.name));
            let matchStatus = matchAtt ? matchAtt.status : 'none';

            return {
                player: p,
                attendedCount: playerApprovedCount,
                rate: rate,
                practiceStatus: practiceStatus,
                matchStatus: matchStatus
            };
        });

        // Update squad rate
        const squadRate = possibleAttendances > 0 ? Math.round((totalAttendedCount / possibleAttendances) * 100) : 88;
        const squadRateElem = document.getElementById('admin-squad-attendance-rate');
        if(squadRateElem) squadRateElem.innerText = squadRate + '%';

        const totalMatchesElem = document.getElementById('admin-total-matches-count');
        if(totalMatchesElem) totalMatchesElem.innerText = totalSessionSlots;

        const squadPresentPractice = attendance.filter(a => a.matchId === practiceSession.id && a.status === 'Approved').length;
        const presentTodayElem = document.getElementById('admin-squad-present-today');
        if(presentTodayElem) presentTodayElem.innerText = squadPresentPractice;

        summaryList.innerHTML = playerStats.map(stat => {
            let practicePill = `<span class="attendance-pill absent" style="font-size:0.7rem;"><i class="fa-solid fa-person-running"></i> Prac: Absent</span>`;
            if (stat.practiceStatus === 'Approved') {
                practicePill = `<span class="attendance-pill present" style="font-size:0.7rem;"><i class="fa-solid fa-person-running"></i> Prac: Present</span>`;
            } else if (stat.practiceStatus === 'Requested') {
                practicePill = `<span class="attendance-pill pending" style="font-size:0.7rem;"><i class="fa-solid fa-person-running"></i> Prac: Pending</span>`;
            }

            let matchPill = `<span class="attendance-pill absent" style="font-size:0.7rem;"><i class="fa-solid fa-futbol"></i> Match: Absent</span>`;
            if (stat.matchStatus === 'Approved') {
                matchPill = `<span class="attendance-pill present" style="font-size:0.7rem;"><i class="fa-solid fa-futbol"></i> Match: Present</span>`;
            } else if (stat.matchStatus === 'Requested') {
                matchPill = `<span class="attendance-pill pending" style="font-size:0.7rem;"><i class="fa-solid fa-futbol"></i> Match: Pending</span>`;
            }

            return `
                <div class="attendance-summary-card" style="flex-direction: column; align-items: stretch; gap: 8px;">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div class="user-avatar" style="width: 38px; height: 38px; font-size: 0.95rem; ${stat.player.pic ? `background-image: url('${stat.player.pic}'); background-size: cover; background-position: center;` : ''}">${stat.player.pic ? '' : '<i class="fa-solid fa-user"></i>'}</div>
                            <div>
                                <div style="font-weight: 600; font-size: 0.95rem; color: #fff;">${escapeHtml(stat.player.name)} <span style="color: var(--primary); font-size: 0.8rem;">#${stat.player.number || '-'}</span></div>
                                <div style="font-size: 0.75rem; color: var(--text-muted);">${stat.attendedCount} of ${totalSessionSlots} Sessions Attended (${stat.rate}%)</div>
                            </div>
                        </div>
                        <span class="user-role-badge">${stat.rate}% Rate</span>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.06);">
                        <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                            ${practicePill}
                            ${matchPill}
                        </div>
                        <div style="display: flex; gap: 4px;">
                            <button class="btn-secondary" onclick="togglePlayerAttendance('${stat.player.id}', '${practiceSession.id}')" style="padding: 4px 8px; font-size: 0.7rem; border-radius: 6px;" title="Toggle Practice Attendance">
                                <i class="fa-solid fa-person-running"></i> Toggle
                            </button>
                            <button class="btn-secondary" onclick="togglePlayerAttendance('${stat.player.id}', 'm1')" style="padding: 4px 8px; font-size: 0.7rem; border-radius: 6px;" title="Toggle Match Attendance">
                                <i class="fa-solid fa-futbol"></i> Toggle
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

function approveMatchAttendance(attId) {
    const att = attendance.find(a => a.id === attId);
    if(att) {
        att.status = 'Approved';
        att.approvedAt = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        saveData();
        renderAdminAttendance();
        alert(`Presence approved for ${att.playerName}! Attendance marked on both portals.`);
    }
}

function declineMatchAttendance(attId) {
    const att = attendance.find(a => a.id === attId);
    if(att) {
        att.status = 'Declined';
        saveData();
        renderAdminAttendance();
    }
}

function togglePlayerAttendance(playerId, sessionId) {
    const player = players.find(p => p.id.toString() === playerId.toString());
    if(!player) return;

    let att = attendance.find(a => a.matchId === sessionId && (a.playerId.toString() === playerId.toString() || a.playerName === player.name));
    if(!att) {
        att = {
            id: 'att_' + Date.now(),
            matchId: sessionId,
            type: sessionId === practiceSession.id ? 'practice' : 'match',
            playerId: player.id,
            playerName: player.name,
            status: 'Approved',
            requestedAt: 'Manual (Admin)',
            approvedAt: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
        };
        attendance.push(att);
    } else {
        if(att.status === 'Approved') {
            att.status = 'Declined';
        } else {
            att.status = 'Approved';
            att.approvedAt = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        }
    }
    saveData();
    renderAdminAttendance();
}

function renderAdminMessages() {
    const list = document.getElementById('admin-message-list');
    if (!list) return;
    
    // Gather all users who have sent or received messages from Admin, plus all registered players
    const userNames = new Set();
    messages.forEach(m => {
        if(m.sender && m.sender !== 'Admin') userNames.add(m.sender);
        if(m.to && m.to !== 'Admin') userNames.add(m.to);
    });
    players.forEach(p => userNames.add(p.name));

    const conversations = Array.from(userNames).map(name => {
        const userMsgs = messages.filter(m => 
            (m.sender === name && m.to === 'Admin') || 
            (m.sender === 'Admin' && m.to === name)
        );
        const lastMsg = userMsgs.length > 0 ? userMsgs[userMsgs.length - 1] : null;
        return {
            name: name,
            lastMsg: lastMsg,
            count: userMsgs.length
        };
    });

    // Sort by most recent message
    conversations.sort((a, b) => {
        if (a.lastMsg && !b.lastMsg) return -1;
        if (!a.lastMsg && b.lastMsg) return 1;
        return 0;
    });

    const activeChatsCount = conversations.filter(c => c.count > 0).length;
    const statElem = document.getElementById('stat-unread-msgs');
    if (statElem) statElem.innerText = activeChatsCount;

    if (conversations.length === 0) {
        list.innerHTML = "<p style='color:#9ca3af; text-align:center; padding: 25px 0;'>No messages yet.</p>";
        return;
    }

    list.innerHTML = conversations.map(c => {
        const msgPlayer = players.find(p => p.name === c.name);
        const avatarStyle = msgPlayer && msgPlayer.pic ? `background-image: url('${msgPlayer.pic}'); background-size: cover; background-position: center;` : '';
        return `
        <div class="msg-item" onclick="openAdminChat('${escapeHtml(c.name).replace(/'/g, "\\'")}')">
            <div class="msg-item-top">
                <div class="msg-sender-info">
                    <div class="msg-sender-avatar" style="${avatarStyle}">${msgPlayer && msgPlayer.pic ? '' : '<i class="fa-solid fa-user"></i>'}</div>
                    <div>
                        <div class="msg-sender-name">${escapeHtml(c.name)}</div>
                        <div class="msg-time">${c.lastMsg ? c.lastMsg.time : 'No messages'}</div>
                    </div>
                </div>
                <i class="fa-solid fa-comment-dots" style="color: var(--primary); font-size: 1.1rem;"></i>
            </div>
            <div class="msg-preview">
                ${c.lastMsg ? (c.lastMsg.sender === 'Admin' ? '<strong>You: </strong>' : '') + escapeHtml(c.lastMsg.text) : '<span style="color: #6b7280; font-style: italic;">Tap to start a conversation</span>'}
            </div>
            <div class="msg-reply-badge">
                <i class="fa-solid fa-reply"></i> Click to view & reply
            </div>
        </div>
    `}).join('');
}

function openAdminChat(userName) {
    currentAdminChatUser = userName;
    document.getElementById('admin-inbox-view').style.display = 'none';
    document.getElementById('admin-chat-view').style.display = 'block';
    document.getElementById('admin-chat-recipient-name').innerText = userName;
    renderAdminChatThread();
    setTimeout(() => {
        const input = document.getElementById('admin-msg-input');
        if(input) input.focus();
    }, 100);
}

function closeAdminChat() {
    currentAdminChatUser = null;
    const inboxView = document.getElementById('admin-inbox-view');
    const chatView = document.getElementById('admin-chat-view');
    if (inboxView) inboxView.style.display = 'block';
    if (chatView) chatView.style.display = 'none';
    renderAdminMessages();
}

function renderAdminChatThread() {
    if(!currentAdminChatUser) return;
    const container = document.getElementById('admin-chat-container');
    if(!container) return;
    
    // Filter messages between Admin and currentAdminChatUser
    const thread = messages.filter(m => 
        (m.sender === currentAdminChatUser && m.to === "Admin") ||
        (m.sender === "Admin" && m.to === currentAdminChatUser)
    );
    
    if(thread.length === 0) {
        container.innerHTML = `<p style='color:#9ca3af; text-align:center; margin-top: 30px; font-size: 0.85rem;'>No messages yet with ${escapeHtml(currentAdminChatUser)}.<br>Send a response below!</p>`;
    } else {
        container.innerHTML = thread.map(m => {
            const isMe = m.sender === 'Admin';
            return `
                <div class="chat-bubble ${isMe ? 'sent' : 'received'}">
                    ${escapeHtml(m.text)}
                    <span class="chat-time">${m.time}</span>
                </div>
            `;
        }).join('');
    }
    
    container.scrollTop = container.scrollHeight;
}

function sendAdminMessage() {
    if(!currentAdminChatUser) return;
    const input = document.getElementById('admin-msg-input');
    const text = input.value.trim();
    if(!text) return;
    
    const now = new Date();
    const timeStr = now.getHours() + ":" + (now.getMinutes()<10?'0':'') + now.getMinutes();

    messages.push({
        sender: "Admin",
        to: currentAdminChatUser,
        text: text,
        time: timeStr
    });
    
    saveData();
    input.value = '';
    renderAdminChatThread();
}

function handleAdminChatKey(event) {
    if (event.key === 'Enter') {
        sendAdminMessage();
    }
}

function handlePlayerChatKey(event) {
    if (event.key === 'Enter') {
        sendPlayerMessage();
    }
}

// --- PLAYER LOGIC ---
function renderPlayerDashboard() {
    if(!currentUser) return;
    
    document.getElementById('current-player-name').innerText = currentUser.name.split(' ')[0];

    // Calculate player's attendance numbers (practice + matches)
    const totalSessionSlots = matches.length + 1;
    const approvedSessions = attendance.filter(a => (a.playerId == currentUser.id || a.playerName === currentUser.name) && a.status === 'Approved');
    const attendedCount = approvedSessions.length;
    const rate = Math.min(100, Math.round((attendedCount / totalSessionSlots) * 100));

    const rateElem = document.getElementById('player-attendance-rate');
    if(rateElem) rateElem.innerText = rate + '%';

    const matchesElem = document.getElementById('player-matches-played');
    if(matchesElem) matchesElem.innerText = attendedCount;

    // Update Welcome session text
    const nextSessionWelcome = document.getElementById('player-next-session-text');
    if(nextSessionWelcome) nextSessionWelcome.innerText = `Next Practice: ${practiceSession.day} at ${practiceSession.time.split('-')[0].trim()}`;

    // 1. Render Practice Session Card
    const practiceCard = document.getElementById('player-next-practice-card');
    if(practiceCard) {
        const myPracticeAtt = attendance.find(a => a.matchId === practiceSession.id && (a.playerId == currentUser.id || a.playerName === currentUser.name));
        
        let pracActionArea = `
            <div class="attendance-status-badge pending" style="background: rgba(100, 116, 139, 0.2); color: #94a3b8; border-color: rgba(100, 116, 139, 0.4);">
                <i class="fa-solid fa-minus"></i> Attendance not marked yet
            </div>
        `;

        if(myPracticeAtt) {
            if(myPracticeAtt.status === 'Requested') {
                pracActionArea = `
                    <div class="attendance-status-badge pending">
                        <i class="fa-solid fa-clock"></i> Practice Presence Requested • Pending Coach Approval
                    </div>
                `;
            } else if(myPracticeAtt.status === 'Approved') {
                pracActionArea = `
                    <div class="attendance-status-badge approved">
                        <i class="fa-solid fa-circle-check"></i> Confirmed Present for Practice (Approved)
                    </div>
                `;
            } else if(myPracticeAtt.status === 'Declined') {
                pracActionArea = `
                    <div class="attendance-status-badge declined">
                        <i class="fa-solid fa-circle-xmark"></i> Marked Absent / Unavailable for Practice
                    </div>
                `;
            }
        }

        practiceCard.innerHTML = `
            <div class="match-card-header">
                <span class="match-badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8;"><i class="fa-solid fa-person-running"></i> Practice Session</span>
                <span style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(practiceSession.day)}, ${escapeHtml(practiceSession.date)} • ${escapeHtml(practiceSession.time)}</span>
            </div>
            <div class="match-title">${escapeHtml(practiceSession.title)}</div>
            <div class="match-meta" style="flex-direction: column; gap: 6px; margin-bottom: 14px;">
                <span><i class="fa-solid fa-location-dot" style="color: #38bdf8;"></i> Ground: <strong style="color: #fff; margin-left: 4px;">${escapeHtml(practiceSession.location)}</strong></span>
                <span><i class="fa-solid fa-clipboard-check" style="color: var(--text-muted);"></i> Notes: ${escapeHtml(practiceSession.notes || 'Full training kit required')}</span>
            </div>
            ${pracActionArea}
        `;
    }

    // 2. Render Next Match Card
    const nextMatch = matches[0];
    const nextMatchCard = document.getElementById('player-next-match-card');
    if(nextMatchCard) {
        const myAtt = attendance.find(a => a.matchId === nextMatch.id && (a.playerId == currentUser.id || a.playerName === currentUser.name));
        
        let actionArea = `
            <div class="attendance-status-badge pending" style="background: rgba(100, 116, 139, 0.2); color: #94a3b8; border-color: rgba(100, 116, 139, 0.4);">
                <i class="fa-solid fa-minus"></i> Attendance not marked yet
            </div>
        `;

        if(myAtt) {
            if(myAtt.status === 'Requested') {
                actionArea = `
                    <div class="attendance-status-badge pending">
                        <i class="fa-solid fa-clock"></i> Match Presence Requested • Pending Coach Approval
                    </div>
                `;
            } else if(myAtt.status === 'Approved') {
                actionArea = `
                    <div class="attendance-status-badge approved">
                        <i class="fa-solid fa-circle-check"></i> Present Confirmed for Match!
                    </div>
                `;
            } else if(myAtt.status === 'Declined') {
                actionArea = `
                    <div class="attendance-status-badge declined">
                        <i class="fa-solid fa-circle-xmark"></i> Marked Absent / Unavailable
                    </div>
                `;
            }
        }

        nextMatchCard.innerHTML = `
            <div class="match-card-header">
                <span class="match-badge"><i class="fa-solid fa-futbol"></i> Next Match</span>
                <span style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(nextMatch.date)} • ${escapeHtml(nextMatch.time)}</span>
            </div>
            <div class="match-title">${escapeHtml(nextMatch.title)}</div>
            <div class="match-meta">
                <span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(nextMatch.location)}</span>
                <span><i class="fa-solid fa-shirt"></i> Jersey #${currentUser.number || '10'}</span>
            </div>
            ${actionArea}
        `;
    }

    // Render Scheduled Matches & Practice List with Performance
    const matchesList = document.getElementById('player-matches-list');
    if(matchesList) {
        const allSessions = [practiceSession, ...matches];
        matchesList.innerHTML = allSessions.map(m => {
            const mAtt = attendance.find(a => a.matchId === m.id && (a.playerId == currentUser.id || a.playerName === currentUser.name));
            let pill = `<span class="attendance-pill" style="color: #94a3b8; border-color: rgba(148, 163, 184, 0.3); background: rgba(148, 163, 184, 0.1);"><i class="fa-solid fa-minus"></i> Not Marked</span>`;
            let performanceHtml = '';
            
            if(mAtt) {
                if(mAtt.status === 'Approved') {
                    pill = `<span class="attendance-pill present"><i class="fa-solid fa-check"></i> Present</span>`;
                    
                    const goals = mAtt.goals || 0;
                    const perf = mAtt.performance ? mAtt.performance.charAt(0).toUpperCase() + mAtt.performance.slice(1) : 'Not Rated';
                    
                    performanceHtml = `
                        <div style="margin-top: 10px; display: flex; gap: 10px; font-size: 0.8rem;">
                            <span style="background: rgba(16, 185, 129, 0.1); color: var(--primary); padding: 4px 8px; border-radius: 6px;"><i class="fa-solid fa-futbol"></i> Goals: ${goals}</span>
                            <span style="background: rgba(56, 189, 248, 0.1); color: #38bdf8; padding: 4px 8px; border-radius: 6px;"><i class="fa-solid fa-chart-line"></i> ${perf}</span>
                        </div>
                    `;
                } else if(mAtt.status === 'Requested') {
                    pill = `<span class="attendance-pill pending"><i class="fa-solid fa-clock"></i> Pending</span>`;
                } else if(mAtt.status === 'Declined') {
                    pill = `<span class="attendance-pill absent"><i class="fa-solid fa-xmark"></i> Absent</span>`;
                }
            }
            
            const isMatch = m.id.toString().startsWith('m');
            const icon = isMatch ? 'fa-futbol' : 'fa-person-running';

            return `
                <div class="player-item" style="cursor: default; flex-direction: column; align-items: stretch; gap: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; gap: 12px; align-items: center;">
                            <div class="player-photo" style="background: #1e293b; color: var(--primary);"><i class="fa-solid ${icon}"></i></div>
                            <div class="player-info">
                                <h4>${escapeHtml(m.title)}</h4>
                                <p>${escapeHtml(m.date)} • ${escapeHtml(m.location)}</p>
                            </div>
                        </div>
                        <div>${pill}</div>
                    </div>
                    ${performanceHtml}
                </div>
            `;
        }).join('');
    }
}



function renderPlayerChat() {
    const container = document.getElementById('player-chat-container');
    if(!container) return;
    
    // Filter messages related to Current User
    const name = currentUser ? currentUser.name : "Marcus Rashford";
    const chat = messages.filter(m => 
        (m.sender === name && m.to === "Admin") || 
        (m.sender === "Admin" && m.to === name)
    );
    
    if(chat.length === 0) {
        container.innerHTML = `<p style='color:#9ca3af; text-align:center; margin-top: 30px; font-size: 0.85rem;'>Need help or have questions for the coach?<br>Send a message below!</p>`;
    } else {
        container.innerHTML = chat.map(m => {
            const isMe = m.sender === name;
            return `
                <div class="chat-bubble ${isMe ? 'sent' : 'received'}">
                    ${escapeHtml(m.text)}
                    <span class="chat-time">${m.time}</span>
                </div>
            `;
        }).join('');
    }
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

function sendPlayerMessage() {
    const input = document.getElementById('player-msg-input');
    const text = input.value.trim();
    if(!text) return;
    
    const now = new Date();
    const timeStr = now.getHours() + ":" + (now.getMinutes()<10?'0':'') + now.getMinutes();

    const name = currentUser ? currentUser.name : "Marcus Rashford";
    messages.push({
        sender: name,
        to: "Admin",
        text: text,
        time: timeStr
    });
    
    saveData();
    input.value = '';
    renderPlayerChat();
}

// Modal Logic
function showAddPlayerModal() { document.getElementById('add-player-modal').classList.add('active'); }
function closeModal() {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
}

async function addPlayer() {
    const id = document.getElementById('new-player-id').value.trim();
    const name = document.getElementById('new-player-name').value.trim();
    const dob = document.getElementById('new-player-dob').value;
    const email = document.getElementById('new-player-email').value.trim();
    const pass = document.getElementById('new-player-pass').value.trim();
    const num = document.getElementById('new-player-number').value.trim();
    
    const countryCode = document.getElementById('new-player-country').value;
    const whatsapp = document.getElementById('new-player-whatsapp').value.trim();

    if(!id || !name || !dob || !email || !whatsapp || !pass || !num) {
        return alert("Please fill all required fields.");
    }

    const alreadyExists = players.some(p => p.id.toString() === id || p.email.toLowerCase() === email.toLowerCase());
    if (alreadyExists) {
        return alert("A user with this ID Number or Email already exists.");
    }

    const picFile = document.getElementById('new-player-pic').files[0];
    const picBase64 = picFile ? await fileToBase64(picFile) : null;


    const fullWhatsapp = whatsapp ? `${countryCode} ${whatsapp}` : '';

    players.push({
        id: id,
        name: name,
        dob: dob || '2000-01-01',
        email: email,
        password: pass,
        number: num ? parseInt(num) : Math.floor(Math.random() * 99) + 1,
        pic: picBase64,
        whatsapp: fullWhatsapp
    });

    saveData();
    renderPlayers();
    closeModal();

    // Reset fields
    document.getElementById('new-player-id').value = '';
    document.getElementById('new-player-name').value = '';
    document.getElementById('new-player-dob').value = '';
    document.getElementById('new-player-email').value = '';
    document.getElementById('new-player-pass').value = '';
    document.getElementById('new-player-number').value = '';
}

function escapeHtml(unsafe) {
    if(!unsafe) return '';
    return unsafe
         .toString()
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function renderPendingApprovals() {
    const list = document.getElementById('approval-list');
    if(!list) return;
    
    if(pendingUsers.length === 0) {
        list.innerHTML = "<p style='color:#9ca3af; text-align:center; padding: 25px 0;'>No pending approvals.</p>";
        return;
    }
    
    list.innerHTML = pendingUsers.map((p, index) => `
        <div class="user-card" style="padding: 12px; margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-weight: 600; color: #fff;">${escapeHtml(p.name)}</div>
                <div style="font-size: 0.8rem; color: #f59e0b;">Pending</div>
            </div>
            <div style="font-size: 0.8rem; color: #9ca3af; margin-top: 5px;">${p.role === 'coach' ? 'Coach | Mobile: ' + escapeHtml(p.mobile) : 'Student | ID: ' + escapeHtml(p.id) + ' | Email: ' + escapeHtml(p.email)}</div>
            <div style="display: flex; gap: 8px; margin-top: 10px;">
                <button class="btn-primary" style="flex:1; padding: 6px;" onclick="approveUser(${index})">Approve</button>
                <button class="btn-secondary" style="flex:1; padding: 6px; border-color: #ef4444; color: #ef4444;" onclick="rejectUser(${index})">Reject</button>
            </div>
        </div>
    `).join('');
}

function approveUser(index) {
    const user = pendingUsers[index];
    if (user.role === 'coach') {
        coaches.push(user);
    } else {
        user.number = Math.floor(Math.random() * 99) + 1; // Assign random number
        players.push(user);
    }
    pendingUsers.splice(index, 1);
    saveData();
    renderPendingApprovals();
    renderPlayers();
    renderAdminDashboard();
}

function rejectUser(index) {
    pendingUsers.splice(index, 1);
    saveData();
    renderPendingApprovals();
    renderAdminDashboard();
}

function renderPlayers() {
    const list = document.getElementById('player-list');
    if(!list) return;
    
    if(players.length === 0) {
        list.innerHTML = "<p style='color:#9ca3af; text-align:center; padding: 25px 0;'>No players registered.</p>";
        return;
    }
    
    list.innerHTML = players.map(p => {
        const avatarStyleP = p.pic ? `background-image: url('${p.pic}'); background-size: cover; background-position: center; background-color: transparent;` : 'background: #1e3a8a; color: #10b981;';
        return `
        <div class="player-item" onclick="openPlayerManagement('${p.id}')">
            <div class="player-photo" style="${avatarStyleP}">${p.pic ? '' : '<i class="fa-solid fa-user"></i>'}</div>
            <div class="player-info">
                <h4>${escapeHtml(p.name)}</h4>
                <p><i class="fa-solid fa-envelope"></i> ${escapeHtml(p.email)}</p>
            </div>
            <div class="jersey-badge">#${p.number}</div>
        </div>
    `}).join('');
}

function openPlayerManagement(playerId) {
    const player = players.find(p => p.id.toString() === playerId.toString());
    if(!player) return;
    
    const modalBody = document.getElementById('player-management-modal-body');
    if(!modalBody) return;
    
    // Construct sessions list
    const allSessions = [practiceSession, ...matches];
    const sessionsHtml = allSessions.map(session => {
        const att = attendance.find(a => a.matchId === session.id && (a.playerId.toString() === player.id.toString() || a.playerName === player.name));
        const isPresent = att && att.status === 'Approved';
        const goals = att && att.goals !== undefined ? att.goals : 0;
        const perf = att && att.performance ? att.performance : 'average';
        const isMatch = session.id.startsWith('m');
        
        return `
            <div class="modal-detail-card" style="flex-direction: column; align-items: stretch; gap: 10px; margin-bottom: 12px; background: #111827;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-weight: 600; color: #fff;">${escapeHtml(session.title)}</div>
                    <div style="font-size: 0.75rem; color: #9ca3af;">${isMatch ? 'Match' : 'Practice'}</div>
                </div>
                <div style="font-size: 0.8rem; color: #9ca3af;">${escapeHtml(session.date)}</div>
                
                <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 5px;">
                    <span style="font-size: 0.85rem; color: #f3f4f6;">Attendance:</span>
                    <button class="btn-${isPresent ? 'primary' : 'secondary'}" style="padding: 4px 10px; font-size: 0.8rem;" onclick="toggleAttAndReload('${player.id}', '${session.id}')">
                        ${isPresent ? '<i class="fa-solid fa-check"></i> Present' : '<i class="fa-solid fa-xmark"></i> Absent'}
                    </button>
                </div>
                
                ${isPresent ? `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 5px;">
                    <div class="form-group" style="margin-bottom: 0;">
                        <label style="font-size: 0.75rem;">Goals</label>
                        <input type="number" id="goals-${player.id}-${session.id}" value="${goals}" style="padding: 6px; font-size: 0.9rem;" min="0">
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label style="font-size: 0.75rem;">Performance</label>
                        <select id="perf-${player.id}-${session.id}" style="width: 100%; padding: 7px; background: #0b1121; border: 1px solid #374151; color: #fff; border-radius: 8px;">
                            <option value="average" ${perf === 'average' ? 'selected' : ''}>Average</option>
                            <option value="medium" ${perf === 'medium' ? 'selected' : ''}>Medium</option>
                            <option value="outstanding" ${perf === 'outstanding' ? 'selected' : ''}>Outstanding</option>
                        </select>
                    </div>
                </div>
                <button class="btn-secondary w-100" style="margin-top: 8px; padding: 6px; font-size: 0.8rem;" onclick="savePlayerPerformance('${player.id}', '${session.id}')">
                    <i class="fa-solid fa-save"></i> Save Performance
                </button>
                ` : ''}
            </div>
        `;
    }).join('');
    
    const avatarStyleM = player.pic ? `background-image: url('${player.pic}'); background-size: cover; background-position: center;` : '';
    modalBody.innerHTML = `
        <div class="modal-user-profile" style="margin-bottom: 15px; padding-bottom: 15px;">
            <div class="modal-user-avatar" style="${avatarStyleM}">${player.pic ? '' : '<i class="fa-solid fa-user"></i>'}</div>
            <h3>${escapeHtml(player.name)}</h3>
            <span class="jersey-badge">#${player.number}</span>
            <button class="btn-secondary btn-sm" style="margin-top: 10px;" onclick="openProfileModal('${player.id}')"><i class="fa-solid fa-pen"></i> Edit Profile</button>
        </div>
        <h4 style="margin-bottom: 10px; color: #fff;">Sessions & Performance</h4>
        <div style="max-height: 400px; overflow-y: auto; padding-right: 5px;">
            ${sessionsHtml}
        </div>
    `;
    
    document.getElementById('player-management-modal').classList.add('active');
}

function toggleAttAndReload(playerId, sessionId) {
    togglePlayerAttendance(playerId, sessionId);
    openPlayerManagement(playerId);
}

function savePlayerPerformance(playerId, sessionId) {
    const goalsInput = document.getElementById(`goals-${playerId}-${sessionId}`);
    const perfSelect = document.getElementById(`perf-${playerId}-${sessionId}`);
    
    if(!goalsInput || !perfSelect) return;
    
    const goals = parseInt(goalsInput.value) || 0;
    const perf = perfSelect.value;
    
    const player = players.find(p => p.id.toString() === playerId.toString());
    if(!player) return;
    
    let att = attendance.find(a => a.matchId === sessionId && (a.playerId.toString() === playerId.toString() || a.playerName === player.name));
    if(att) {
        att.goals = goals;
        att.performance = perf;
        saveData();
        alert('Performance saved!');
    }
}

function openProfileModal(playerId = null) {
    let userToEdit = null;
    let isAdminEditingPlayer = false;
    
    if (playerId && typeof playerId === 'string') {
        userToEdit = players.find(p => p.id.toString() === playerId.toString());
        isAdminEditingPlayer = true;
    } else {
        userToEdit = currentUser;
    }
    
    if (currentRole === 'admin' && !isAdminEditingPlayer) {
        document.getElementById('edit-profile-name').value = 'Admin';
        document.getElementById('edit-profile-email').value = 'admin@mufc.com';
        document.getElementById('edit-profile-pass').value = 'admin';
        document.getElementById('edit-profile-name').disabled = true;
        document.getElementById('edit-profile-email').disabled = true;
        document.getElementById('edit-profile-pass').disabled = true;
        document.getElementById('edit-profile-pic').disabled = true;
        document.getElementById('edit-profile-country').disabled = true;
        document.getElementById('edit-profile-whatsapp').disabled = true;
        document.getElementById('edit-profile-whatsapp').value = '';
        document.getElementById('save-profile-btn').style.display = 'none';
        document.getElementById('edit-profile-modal').dataset.editingId = 'admin';
    } else if (userToEdit) {
        document.getElementById('edit-profile-name').value = userToEdit.name;
        document.getElementById('edit-profile-email').value = userToEdit.email;
        document.getElementById('edit-profile-pass').value = userToEdit.password;
        document.getElementById('edit-profile-name').disabled = false;
        document.getElementById('edit-profile-email').disabled = false;
        document.getElementById('edit-profile-pass').disabled = false;
        document.getElementById('edit-profile-pic').disabled = false;
        document.getElementById('edit-profile-country').disabled = false;
        document.getElementById('edit-profile-whatsapp').disabled = false;
        
        if (userToEdit.whatsapp) {
            const parts = userToEdit.whatsapp.split(' ');
            document.getElementById('edit-profile-country').value = parts[0] || '+91';
            document.getElementById('edit-profile-whatsapp').value = parts.slice(1).join(' ') || '';
        } else {
            document.getElementById('edit-profile-whatsapp').value = '';
        }

        document.getElementById('save-profile-btn').style.display = 'flex';
        document.getElementById('edit-profile-modal').dataset.editingId = userToEdit.id;
    }
    
    if (currentRole === 'admin' && isAdminEditingPlayer) {
        document.getElementById('logout-btn-profile').style.display = 'none';
    } else {
        document.getElementById('logout-btn-profile').style.display = 'flex';
    }
    
    document.getElementById('edit-profile-pic').value = '';
    document.getElementById('edit-profile-modal').classList.add('active');
}

async function saveProfile() {
    const editingId = document.getElementById('edit-profile-modal').dataset.editingId;
    if (editingId === 'admin') return;
    
    const userToEdit = players.find(p => p.id.toString() === editingId.toString());
    if(!userToEdit) return;
    
    const name = document.getElementById('edit-profile-name').value.trim();
    const email = document.getElementById('edit-profile-email').value.trim();
    const pass = document.getElementById('edit-profile-pass').value.trim();
    
    const countryCode = document.getElementById('edit-profile-country').value;
    const whatsapp = document.getElementById('edit-profile-whatsapp').value.trim();
    
    if(!name || !email || !whatsapp || !pass) {
        return alert("Please fill all required fields");
    }
    
    const oldName = userToEdit.name;
    const picFile = document.getElementById('edit-profile-pic').files[0];
    if (picFile) {
        userToEdit.pic = await fileToBase64(picFile);
    }
    
    userToEdit.whatsapp = whatsapp ? `${countryCode} ${whatsapp}` : '';
    
    userToEdit.name = name;
    userToEdit.email = email;
    userToEdit.password = pass;
    
    if (oldName !== name) {
        messages.forEach(m => {
            if(m.sender === oldName) m.sender = name;
            if(m.to === oldName) m.to = name;
        });
        attendance.forEach(a => {
            if(a.playerName === oldName) a.playerName = name;
        });
    }
    
    saveData();
    closeModal();
    
    if (currentUser && currentUser.id.toString() === userToEdit.id.toString()) {
        document.getElementById('current-player-name').innerText = currentUser.name.split(' ')[0];
        document.querySelector('.profile-pic').style.backgroundImage = currentUser.pic ? `url('${currentUser.pic}')` : "none";
        if(currentRole === 'player') {
            renderPlayerDashboard();
        }
    }
    
    if (currentRole === 'admin') {
        renderPlayers();
        renderAdminAttendance();
        renderAdminDashboard();
        renderAdminMessages();
        openPlayerManagement(userToEdit.id);
    }
    
    alert("Profile updated successfully!");
}

document.addEventListener('DOMContentLoaded', () => {
    const regInputs = ['reg-id', 'reg-name', 'reg-dob', 'reg-email', 'reg-whatsapp', 'reg-pass'];
    const coachRegInputs = ['reg-name', 'reg-mobile', 'reg-whatsapp', 'reg-pass'];
    const regBtn = document.getElementById('reg-submit-btn');

    function checkRegForm() {
        if(!regBtn) return;
        const role = document.querySelector('input[name="reg-role"]:checked') ? document.querySelector('input[name="reg-role"]:checked').value : 'student';
        const inputsToCheck = role === 'coach' ? coachRegInputs : regInputs;
        
        const allFilled = inputsToCheck.every(id => {
            const el = document.getElementById(id);
            return el && el.value.trim() !== '';
        });
        regBtn.disabled = !allFilled;
    }

    [...regInputs, 'reg-mobile'].forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.addEventListener('input', checkRegForm);
            el.addEventListener('change', checkRegForm);
        }
    });
    
    document.querySelectorAll('input[name="reg-role"]').forEach(el => {
        el.addEventListener('change', checkRegForm);
    });
});

// ================= ACADEMY ADMIN LOGIC =================

function toggleAcademyRole() {
    const roleRadio = document.querySelector('input[name="new-acad-role"]:checked');
    const role = roleRadio ? roleRadio.value : 'student';
    const isCoach = role === 'coach';
    
    document.getElementById('group-acad-father').style.display = isCoach ? 'none' : 'block';
    document.getElementById('group-acad-id').style.display = isCoach ? 'none' : 'block';
    document.getElementById('group-acad-dob').style.display = isCoach ? 'none' : 'block';
    document.getElementById('group-acad-join').style.display = isCoach ? 'none' : 'block';
    document.getElementById('group-acad-pic').style.display = isCoach ? 'none' : 'block';
    
    const modalTitle = document.getElementById('modal-title-add-member');
    if (modalTitle) modalTitle.innerText = isCoach ? 'Add Coach' : 'Add Academy Student';
    
    const nameLabel = document.getElementById('label-acad-name');
    if (nameLabel) nameLabel.innerText = isCoach ? 'Coach Name' : 'Student Name';
    
    const btnReg = document.getElementById('btn-add-acad-student');
    if (btnReg) btnReg.innerText = isCoach ? 'Register Coach' : 'Register Student';
}

function showAddAcademyStudentModal() {
    document.getElementById('add-academy-student-modal').classList.add('active');
}

function calculateAge(dobString) {
    if (!dobString) return '';
    const dob = new Date(dobString);
    const diff_ms = Date.now() - dob.getTime();
    const age_dt = new Date(diff_ms); 
    return Math.abs(age_dt.getUTCFullYear() - 1970);
}

async function addAcademyStudent() {
    const roleRadio = document.querySelector('input[name="new-acad-role"]:checked');
    const role = roleRadio ? roleRadio.value : 'student';
    
    const name = document.getElementById('new-acad-student-name').value.trim();
    const contact = document.getElementById('new-acad-contact').value.trim();
    const whatsappCode = document.getElementById('new-acad-whatsapp-code').value;
    const whatsappNum = document.getElementById('new-acad-whatsapp').value.trim();
    
    if (role === 'coach') {
        if(!name || !contact || !whatsappNum) {
            return alert("Please fill Name, Contact Number, and WhatsApp Number.");
        }
        
        const alreadyExists = academyStudents.some(s => s.id === contact);
        if(alreadyExists) {
            return alert("A coach with this Mobile Number already exists.");
        }
        
        academyStudents.push({
            id: contact,
            name: name,
            fatherName: '-',
            dob: '-',
            age: '-',
            contact: contact,
            whatsapp: `${whatsappCode} ${whatsappNum}`,
            joinDate: new Date().toISOString().split('T')[0],
            pic: null,
            role: 'coach'
        });
        
        saveData();
        closeModal();
        renderAcademyStudents();
        alert("Coach registered successfully!");
    } else {
        const fatherName = document.getElementById('new-acad-father-name').value.trim();
        const idNum = document.getElementById('new-acad-id').value.trim();
        const dob = document.getElementById('new-acad-dob').value;
        const joinDate = document.getElementById('new-acad-join-date').value;
        
        if(!name || !fatherName || !idNum || !dob || !contact || !whatsappNum || !joinDate) {
            return alert("Please fill all required fields.");
        }
        
        const alreadyExists = academyStudents.some(s => s.id === idNum);
        if(alreadyExists) {
            return alert("A student with this ID already exists.");
        }
        
        const picFile = document.getElementById('new-acad-pic').files[0];
        const picBase64 = picFile ? await fileToBase64(picFile) : null;
        
        academyStudents.push({
            id: idNum,
            name: name,
            fatherName: fatherName,
            dob: dob,
            age: calculateAge(dob),
            contact: contact,
            whatsapp: `${whatsappCode} ${whatsappNum}`,
            joinDate: joinDate,
            pic: picBase64,
            role: 'student'
        });
        
        saveData();
        closeModal();
        renderAcademyStudents();
        alert("Academy Student registered successfully!");
    }
    
    // Clear inputs
    document.querySelectorAll('#add-academy-student-modal input').forEach(i => {
        if(i.type !== 'button' && i.type !== 'radio') i.value = '';
    });
}

function renderAcademyStudents() {
    const list = document.getElementById('academy-student-list');
    if(!list) return;
    
    list.innerHTML = '';
    
    if(academyStudents.length === 0) {
        list.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No students registered yet.</p>';
        return;
    }
    
    academyStudents.forEach(student => {
        const totalAttended = calculateTotalAttended(student.id);
        const div = document.createElement('div');
        div.className = 'player-card';
        div.style.cursor = 'pointer';
        div.onclick = () => openAcademyStudentDetails(student.id);
        
        div.innerHTML = `
            <div class="player-info">
                <div class="profile-pic" style="${student.pic ? `background-image: url('${student.pic}');` : ''}"></div>
                <div>
                    <h3 style="font-size: 1.1rem; color: ${student.role === 'coach' ? '#3b82f6' : '#fff'};">${escapeHtml(student.name)} ${student.role === 'coach' ? '<span style="font-size: 0.75rem; background: rgba(59,130,246,0.2); color: #3b82f6; padding: 2px 6px; border-radius: 4px; margin-left: 6px; vertical-align: middle;">Coach</span>' : ''}</h3>
                    <p style="font-size: 0.85rem; color: var(--text-muted);">Total Attended: ${totalAttended} Days</p>
                </div>
            </div>
        `;
        list.appendChild(div);
    });
}

function calculateTotalAttended(studentId) {
    return academyAttendance.filter(a => a.studentId === studentId && a.status === 'Present').length;
}

let currentAcademyStudentId = null;

function openAcademyStudentDetails(id) {
    const student = academyStudents.find(s => s.id === id);
    if(!student) return;
    
    document.getElementById('view-acad-pic').style.backgroundImage = student.pic ? `url('${student.pic}')` : "none";
    
    const nameEl = document.getElementById('view-acad-name');
    if (student.role === 'coach') {
        nameEl.innerHTML = `${escapeHtml(student.name)} <span style="font-size: 0.8rem; background: rgba(59,130,246,0.2); color: #3b82f6; padding: 2px 6px; border-radius: 4px; margin-left: 6px; vertical-align: middle;">Coach</span>`;
        nameEl.style.color = '#3b82f6';
    } else {
        nameEl.innerText = student.name;
        nameEl.style.color = '';
    }
    
    document.getElementById('view-acad-id').innerText = student.id;
    document.getElementById('view-acad-father').innerText = student.fatherName;
    document.getElementById('view-acad-age').innerText = student.age;
    document.getElementById('view-acad-dob').innerText = student.dob;
    document.getElementById('view-acad-contact').innerText = student.contact;
    document.getElementById('view-acad-whatsapp').innerText = student.whatsapp;
    document.getElementById('view-acad-joined').innerText = student.joinDate;
    document.getElementById('view-acad-attended').innerText = calculateTotalAttended(student.id) + " Days";
    
    document.getElementById('view-academy-student-modal').classList.add('active');
    currentAcademyStudentId = id;
}

function openEditAcademyStudentModal() {
    const student = academyStudents.find(s => s.id === currentAcademyStudentId);
    if(!student) return;
    
    // Close the view modal first
    document.getElementById('view-academy-student-modal').classList.remove('active');
    
    // Populate the edit modal
    document.getElementById('edit-acad-student-name').value = student.name;
    document.getElementById('edit-acad-father-name').value = student.fatherName;
    document.getElementById('edit-acad-id').value = student.id;
    document.getElementById('edit-acad-dob').value = student.dob;
    document.getElementById('edit-acad-contact').value = student.contact;
    document.getElementById('edit-acad-join-date').value = student.joinDate;
    
    const parts = student.whatsapp.split(' ');
    if(parts.length > 1) {
        document.getElementById('edit-acad-whatsapp-code').value = parts[0];
        document.getElementById('edit-acad-whatsapp').value = parts.slice(1).join(' ');
    } else {
        document.getElementById('edit-acad-whatsapp').value = student.whatsapp;
    }
    
    // Reset the file input
    document.getElementById('edit-acad-pic').value = '';
    
    document.getElementById('edit-academy-student-modal').classList.add('active');
}

async function updateAcademyStudent() {
    const student = academyStudents.find(s => s.id === currentAcademyStudentId);
    if(!student) return;
    
    const name = document.getElementById('edit-acad-student-name').value.trim();
    const fatherName = document.getElementById('edit-acad-father-name').value.trim();
    const dob = document.getElementById('edit-acad-dob').value;
    const contact = document.getElementById('edit-acad-contact').value.trim();
    const whatsappCode = document.getElementById('edit-acad-whatsapp-code').value;
    const whatsappNum = document.getElementById('edit-acad-whatsapp').value.trim();
    const joinDate = document.getElementById('edit-acad-join-date').value;
    
    if(!name || !fatherName || !dob || !contact || !whatsappNum || !joinDate) {
        return alert("Please fill all required fields.");
    }
    
    const picFile = document.getElementById('edit-acad-pic').files[0];
    let picBase64 = student.pic;
    if(picFile) {
        picBase64 = await fileToBase64(picFile);
    }
    
    student.name = name;
    student.fatherName = fatherName;
    student.dob = dob;
    student.age = calculateAge(dob);
    student.contact = contact;
    student.whatsapp = `${whatsappCode} ${whatsappNum}`;
    student.joinDate = joinDate;
    student.pic = picBase64;
    
    saveData();
    closeModal();
    renderAcademyStudents();
    alert("Academy Student profile updated successfully!");
}

async function deleteAcademyStudent() {
    if (!currentAcademyStudentId) return;
    const student = academyStudents.find(s => s.id === currentAcademyStudentId);
    if (!student) return;

    if (confirm(`Are you sure you want to delete ${student.name}? This cannot be undone.`)) {
        academyStudents = academyStudents.filter(s => s.id !== currentAcademyStudentId);
        await saveData();
        closeModal();
        renderAcademyStudents();
        renderAcademyReports();
    }
}

function openAttendanceHistoryModal() {
    const list = document.getElementById('attendance-history-list');
    list.innerHTML = '';
    
    const dateStats = {};
    academyAttendance.forEach(a => {
        if(a.status === 'Present') {
            if(!dateStats[a.date]) dateStats[a.date] = 0;
            dateStats[a.date]++;
        }
    });
    
    const dates = Object.keys(dateStats).sort((a, b) => new Date(b) - new Date(a)); // sort descending
    
    if(dates.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">No attendance recorded yet.</p>';
    } else {
        dates.forEach(date => {
            const div = document.createElement('div');
            div.className = 'match-card';
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.style.marginBottom = '10px';
            div.style.padding = '15px';
            
            div.innerHTML = `
                <div style="font-weight: bold; font-size: 1.1rem;">${date}</div>
                <div class="match-badge" style="background: rgba(16, 185, 129, 0.2); color: #10b981; font-size: 0.9rem;">
                    ${dateStats[date]} Present
                </div>
            `;
            list.appendChild(div);
        });
    }
    
    document.getElementById('attendance-history-modal').classList.add('active');
}

// ================= ACADEMY ATTENDANCE LOGIC =================

function getAcademyAttendanceForDate(dateStr, studentId) {
    return academyAttendance.find(a => a.date === dateStr && a.studentId === studentId);
}

function renderAcademyAttendance() {
    const list = document.getElementById('academy-attendance-list');
    if(!list) return;
    
    let dateStr = document.getElementById('academy-attendance-date').value;
    if(!dateStr) {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('academy-attendance-date').value = today;
        dateStr = today;
    }
    
    list.innerHTML = '';
    
    if(academyStudents.length === 0) {
        list.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No students registered yet.</p>';
        document.getElementById('academy-total-strength').innerText = '0 / 0';
        return;
    }
    
    let presentCount = 0;
    
    const searchInput = document.getElementById('academy-attendance-search');
    const searchQuery = searchInput ? searchInput.value.toLowerCase() : '';
    const filteredStudents = academyStudents.filter(s => s.name.toLowerCase().includes(searchQuery));
    
    filteredStudents.sort((a, b) => {
        let ageA = parseInt(a.age);
        if (isNaN(ageA)) ageA = 999;
        let ageB = parseInt(b.age);
        if (isNaN(ageB)) ageB = 999;
        return ageA - ageB;
    });

    filteredStudents.forEach(student => {
        const record = getAcademyAttendanceForDate(dateStr, student.id);
        const isPresent = record && record.status === 'Present';
        if(isPresent) presentCount++;
        
        // Check payment for the month (YYYY-MM format extracted from dateStr)
        const monthStr = dateStr.substring(0, 7);
        const payment = getAcademyPaymentForMonth(monthStr, student.id);
        const isPaid = payment && payment.status === 'Paid';
        const hasAttended = academyAttendance.some(a => a.studentId === student.id && a.date.startsWith(monthStr) && a.status === 'Present');
        const nameColor = student.role === 'coach' ? '#3b82f6' : (hasAttended ? (isPaid ? '#10b981' : '#ef4444') : '#fff');
        const amount = payment ? payment.amount || payment.paid || '' : '';
        
        const div = document.createElement('div');
        div.className = 'player-card';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'space-between';
        div.style.padding = '12px 20px';
        div.style.gap = '20px';
        
        div.innerHTML = `
            <div class="player-info" style="display: flex; align-items: center; gap: 15px; min-width: 200px;">
                <div class="profile-pic" style="min-width: 45px; height: 45px; ${student.pic ? `background-image: url('${student.pic}');` : ''}"></div>
                <div style="overflow: hidden;">
                    <h3 style="font-size: 1.1rem; color: ${nameColor}; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${escapeHtml(student.name)} ${student.role === 'coach' ? '<span style="font-size: 0.75rem; background: rgba(59,130,246,0.2); color: #3b82f6; padding: 2px 6px; border-radius: 4px; margin-left: 4px; vertical-align: middle;">Coach</span>' : (student.age && student.age !== '-' ? `<span style="font-size: 0.85rem; color: var(--text-muted); font-weight: normal; margin-left: 4px;">(${student.age} Yrs)</span>` : '')} ${isPaid ? '<i class="fa-solid fa-circle-check" style="font-size: 0.85rem; margin-left: 4px;"></i>' : ''}</h3>
                    <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 2px;">ID: ${escapeHtml(student.id)}</p>
                </div>
            </div>
            
            <div style="display: flex; align-items: center; gap: 15px; flex: 1; justify-content: flex-end;">
                <div style="display: flex; gap: 8px;">
                    <button class="btn-primary" style="padding: 8px 12px; border-radius: 8px; font-size: 0.85rem; font-weight: bold; display: flex; align-items: center; gap: 6px; ${isPresent ? 'background: #10b981; color: white; border-color: #10b981;' : 'opacity: 0.5; background: #374151; border-color: #374151; color: #9ca3af;'}" onclick="markAcademyAttendance('${student.id}', '${dateStr}', 'Present')">
                        <i class="fa-solid fa-check"></i> Present
                    </button>
                    <button class="btn-secondary" style="padding: 8px 12px; border-radius: 8px; font-size: 0.85rem; font-weight: bold; display: flex; align-items: center; gap: 6px; ${!isPresent ? 'background: #ef4444; color: white; border-color: #ef4444;' : 'opacity: 0.5; background: #374151; border-color: #374151; color: #9ca3af;'}" onclick="markAcademyAttendance('${student.id}', '${dateStr}', 'Absent')">
                        <i class="fa-solid fa-xmark"></i> Absent
                    </button>
                </div>
                
                <input type="text" maxlength="25" value="${escapeHtml(student.remarks || '')}" placeholder="Remarks (Max 25)" style="width: 250px; padding: 8px; border-radius: 8px; background: rgba(15, 23, 42, 0.8); color: white; border: 1px solid #374151; font-size: 0.85rem;" onchange="updateAcademyRemark('${student.id}', this.value)">
                
                <div style="width: 1px; height: 30px; background: #374151; margin: 0 5px;"></div>
                
                ${student.role === 'coach' ? '' : `
                <div style="display: flex; gap: 8px; align-items: center;">
                    <input type="number" id="attendance-fee-${student.id}" value="${amount}" placeholder="SAR" style="width: 80px; padding: 8px; border-radius: 8px; background: rgba(15, 23, 42, 0.8); color: white; border: 1px solid #374151; text-align: center; font-weight: bold; font-size: 0.85rem;" oninput="handleFeeInput(this, '${student.id}', '${monthStr}')">
                    <button id="pay-btn-${student.id}" class="btn-primary" style="padding: 8px 12px; border-radius: 8px; font-size: 0.85rem; font-weight: bold; display: flex; align-items: center; gap: 6px; ${isPaid ? 'background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3); opacity: 1;' : (amount > 0 ? 'background: #3b82f6; color: white; border: 1px solid #3b82f6; opacity: 1;' : 'background: #374151; color: #9ca3af; border: 1px solid #374151; opacity: 0.5;')}" onclick="togglePaymentStatusFromAttendance('${student.id}', '${monthStr}')" ${(!isPaid && (!amount || amount <= 0)) || isPaid ? 'disabled' : ''}>
                        <i class="fa-solid fa-wallet"></i> ${isPaid ? 'Paid' : 'Pay'}
                    </button>
                </div>
                `}
            </div>
        `;
        list.appendChild(div);
    });
    
    document.getElementById('academy-total-strength').innerText = `${presentCount} / ${academyStudents.length}`;
}

function markAcademyAttendance(studentId, dateStr, status) {
    let record = academyAttendance.find(a => a.date === dateStr && a.studentId === studentId);
    if(record) {
        record.status = status;
    } else {
        academyAttendance.push({ date: dateStr, studentId: studentId, status: status });
    }
    saveData();
    renderAcademyAttendance();
}

// ================= ACADEMY PAYMENTS LOGIC =================

function getAcademyPaymentForMonth(monthStr, studentId) {
    return academyPayments.find(p => p.month === monthStr && p.studentId === studentId);
}

function renderAcademyPayments() {
    const list = document.getElementById('academy-payment-list');
    if(!list) return;
    
    let monthStr = document.getElementById('academy-payment-month').value;
    if(!monthStr) {
        const today = new Date();
        monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        document.getElementById('academy-payment-month').value = monthStr;
    }
    
    list.innerHTML = '';
    
    const searchInput = document.getElementById('academy-payment-search');
    const searchQuery = searchInput ? searchInput.value.toLowerCase() : '';
    
    const filterSelect = document.getElementById('academy-payment-filter');
    const filterStatus = filterSelect ? filterSelect.value : 'all';

    let studentsToRender = academyStudents.filter(s => {
        if (s.role === 'coach') return false;
        
        if (searchQuery && !s.name.toLowerCase().includes(searchQuery)) return false;
        
        if (filterStatus !== 'all') {
            const payment = getAcademyPaymentForMonth(monthStr, s.id);
            const isPaid = payment && payment.status === 'Paid';
            if (filterStatus === 'paid' && !isPaid) return false;
            if (filterStatus === 'unpaid' && isPaid) return false;
        }
        
        return true;
    });
    
    studentsToRender.sort((a, b) => {
        let ageA = parseInt(a.age);
        if (isNaN(ageA)) ageA = 999;
        let ageB = parseInt(b.age);
        if (isNaN(ageB)) ageB = 999;
        return ageA - ageB;
    });
    
    if(studentsToRender.length === 0) {
        list.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No students registered yet.</p>';
        return;
    }
    
    let totalAmount = 0;
    
    studentsToRender.forEach(student => {
        const payment = getAcademyPaymentForMonth(monthStr, student.id);
        const amount = payment ? payment.amount || payment.paid || '' : '';
        const isPaid = payment && payment.status === 'Paid';
        const hasAttended = academyAttendance.some(a => a.studentId === student.id && a.date.startsWith(monthStr) && a.status === 'Present');
        
        if (isPaid) {
            totalAmount += parseFloat(amount) || 0;
        }

        // Format month nicely (e.g. "September 2026")
        const dateObj = new Date(monthStr + '-01');
        const readableMonth = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });

        let messageText = '';
        const addressee = student.fatherName || 'Parent';
        if (!hasAttended) {
            messageText = `Your child, ${student.name}, was absent for the month of ${readableMonth}. We hope he is doing well.\n\nIf there is anything you'd like to discuss or share with us, please feel free to reach out to us.\n\nSincere regards,\nMUFC Soccer Academy`;
        } else if (isPaid) {
            messageText = `Dear ${addressee},\n\nWe are pleased to confirm that we have received the academy fee payment for ${readableMonth} for your child, ${student.name}.\n\nThank you for your prompt payment!\n\nBest regards,\nMUFC Academy`;
        } else {
            messageText = `Dear ${addressee},\n\nThis is a gentle reminder that the academy fee payment for ${readableMonth} for your child, ${student.name}, is currently pending.\n\nPlease arrange to complete the payment at your earliest convenience. Thank you!\n\nBest regards,\nMUFC Academy`;
        }
        const encodedMessage = encodeURIComponent(messageText);

        const div = document.createElement('div');
        div.className = 'player-card';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'space-between';
        div.style.padding = '12px 20px';
        div.style.gap = '20px';
        
        div.innerHTML = `
            <div class="player-info" style="display: flex; align-items: center; gap: 15px; min-width: 250px;">
                <div class="profile-pic" style="min-width: 45px; height: 45px; ${student.pic ? `background-image: url('${student.pic}');` : ''}"></div>
                <div style="overflow: hidden;">
                    <h3 style="font-size: 1.1rem; color: ${hasAttended ? (isPaid ? '#10b981' : '#ef4444') : '#fff'}; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${escapeHtml(student.name)} ${student.age ? `<span style="font-size: 0.85rem; color: var(--text-muted); font-weight: normal; margin-left: 4px;">(${student.age} Yrs)</span>` : ''}</h3>
                    <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 2px;">ID: ${escapeHtml(student.id)}</p>
                </div>
            </div>
            
            <div style="display: flex; align-items: center; gap: 15px; flex: 1; justify-content: flex-end;">
                <input type="text" maxlength="25" value="${escapeHtml(student.remarks || '')}" placeholder="No remarks" style="width: 250px; padding: 8px; border-radius: 8px; background: rgba(15, 23, 42, 0.5); color: #9ca3af; border: 1px solid #374151; font-size: 0.85rem;" readonly>
                
                <div style="width: 1px; height: 30px; background: #374151; margin: 0 5px;"></div>
                
                <div style="color: #fff; font-size: 1.1rem; font-weight: bold; background: rgba(255,255,255,0.05); padding: 4px 10px; border-radius: 8px; display: flex; align-items: center; justify-content: center; width: 85px; gap: 4px;">
                    ${amount ? amount : '0'} <span style="font-size: 0.75rem; color: var(--text-muted);">SAR</span>
                </div>
                <div style="padding: 8px 12px; font-size: 0.85rem; border-radius: 8px; font-weight: bold; width: 90px; text-align: center; display: flex; align-items: center; justify-content: center; gap: 6px; ${isPaid ? 'background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3);' : 'background: rgba(148, 163, 184, 0.1); color: #94a3b8; border: 1px solid rgba(148,163,184,0.2);'}">
                    <i class="fa-solid ${isPaid ? 'fa-check-circle' : 'fa-minus-circle'}"></i> ${isPaid ? 'Paid' : 'Unpaid'}
                </div>
                ${student.whatsapp ? `<a href="https://wa.me/${student.whatsapp.replace(/\D/g, '')}?text=${encodedMessage}" target="_blank" class="btn-primary" style="display: flex; align-items: center; background: #25D366; border-color: #25D366; color: white; text-decoration: none; padding: 8px 15px; border-radius: 8px; font-size: 0.85rem; font-weight: bold; gap: 6px; transition: 0.2s;"><i class="fa-brands fa-whatsapp" style="font-size: 1.1rem;"></i> Message</a>` : ''}
            </div>
        `;
        list.appendChild(div);
    });
    
    const totalEl = document.getElementById('academy-payment-total');
    if (totalEl) totalEl.innerText = totalAmount;
}

function updateFeeAmount(studentId, monthStr, amountVal) {
    let payment = getAcademyPaymentForMonth(monthStr, studentId);
    const amount = parseFloat(amountVal);
    
    if(payment) {
        payment.amount = amount;
        payment.paid = amount;
    } else {
        academyPayments.push({
            month: monthStr,
            studentId: studentId,
            amount: amount,
            paid: amount,
            status: 'Unpaid'
        });
    }
    saveData();
}

function togglePaymentStatus(studentId, monthStr) {
    let payment = getAcademyPaymentForMonth(monthStr, studentId);
    
    if(payment) {
        payment.status = payment.status === 'Paid' ? 'Unpaid' : 'Paid';
    } else {
        academyPayments.push({
            month: monthStr,
            studentId: studentId,
            amount: 0,
            paid: 0,
            status: 'Paid'
        });
    }
    saveData();
    renderAcademyPayments();
    if(document.getElementById('view-academy-accounts').classList.contains('active')) renderAcademyAccounts();
}

function handleFeeInput(inputElem, studentId, monthStr) {
    const val = parseFloat(inputElem.value);
    const amount = isNaN(val) ? 0 : val;
    let payment = getAcademyPaymentForMonth(monthStr, studentId);
    let isPaid = payment && payment.status === 'Paid';
    
    if (isPaid && amount <= 0) {
        payment.status = 'Unpaid';
        payment.amount = 0;
        payment.paid = 0;
        isPaid = false;
        saveData();
        if(document.getElementById('view-academy-accounts').classList.contains('active')) renderAcademyAccounts();
    } else if (isPaid && amount > 0) {
        payment.amount = amount;
        payment.paid = amount;
        saveData();
    }
    
    const btn = document.getElementById(`pay-btn-${studentId}`);
    if (btn) {
        const isPayActive = !isPaid && amount > 0;
        const isDisabled = (!isPaid && amount <= 0) || isPaid;
        
        const currentState = btn.getAttribute('data-state');
        let newState = isPaid ? 'paid' : (isPayActive ? 'active' : 'inactive');
        
        if (currentState !== newState) {
            btn.setAttribute('data-state', newState);
            btn.disabled = isDisabled;
            
            if (isPaid) {
                btn.innerHTML = `<i class="fa-solid fa-wallet"></i> Paid`;
                btn.style.background = 'rgba(16, 185, 129, 0.15)';
                btn.style.color = '#10b981';
                btn.style.border = '1px solid rgba(16,185,129,0.3)';
                btn.style.opacity = '1';
            } else if (isPayActive) {
                btn.innerHTML = `<i class="fa-solid fa-wallet"></i> Pay`;
                btn.style.background = '#3b82f6';
                btn.style.color = 'white';
                btn.style.border = '1px solid #3b82f6';
                btn.style.opacity = '1';
            } else {
                btn.innerHTML = `<i class="fa-solid fa-wallet"></i> Pay`;
                btn.style.background = '#374151';
                btn.style.color = '#9ca3af';
                btn.style.border = '1px solid #374151';
                btn.style.opacity = '0.5';
            }
        }
    }
}

function togglePaymentStatusFromAttendance(studentId, monthStr) {
    const feeInput = document.getElementById(`attendance-fee-${studentId}`);
    const amount = feeInput && feeInput.value ? parseFloat(feeInput.value) : 0;
    
    if (amount <= 0) return;
    
    let payment = getAcademyPaymentForMonth(monthStr, studentId);
    if(payment) {
        if (payment.status !== 'Paid') {
            payment.status = 'Paid';
            payment.amount = amount;
            payment.paid = amount;
        }
    } else {
        academyPayments.push({
            month: monthStr,
            studentId: studentId,
            amount: amount,
            paid: amount,
            status: 'Paid'
        });
    }
    saveData();
    renderAcademyAttendance();
    if(document.getElementById('view-academy-accounts').classList.contains('active')) renderAcademyAccounts();
}

function updateAcademyRemark(studentId, value) {
    const student = academyStudents.find(s => s.id === studentId);
    if (student) {
        student.remarks = value;
        saveData();
    }
}

// ================= ACADEMY REPORTS & EXCEL LOGIC =================

function renderAcademyReports() {
    const table = document.getElementById('academy-report-table');
    if(!table) return;
    
    let monthStr = document.getElementById('academy-report-month').value;
    if(!monthStr) {
        const today = new Date();
        monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        document.getElementById('academy-report-month').value = monthStr;
    }
    
    const [year, month] = monthStr.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    const activeDays = [];
    for(let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month - 1, d);
        if (dateObj.getDay() === 5 || dateObj.getDay() === 6) { // 5 is Friday, 6 is Saturday
            activeDays.push(d);
        }
    }

    let thead = `
        <thead>
            <tr style="border-bottom: 2px solid #374151; background: rgba(15, 23, 42, 0.5);">
                <th style="padding: 12px; font-weight: 600;">Student Name</th>
                <th style="padding: 12px; font-weight: 600;">ID</th>
                <th style="padding: 12px; font-weight: 600; text-align: center;">Total Present</th>
                <th style="padding: 12px; font-weight: 600; text-align: center;">Total Absent</th>
                <th style="padding: 12px; font-weight: 600; text-align: center;">Payment</th>
    `;
    activeDays.forEach(d => {
        const fullDate = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        thead += `<th style="padding: 12px; font-weight: 600; text-align: center; white-space: nowrap;">${fullDate}</th>`;
    });
    thead += `</tr></thead>`;
    
    let tbody = `<tbody>`;
    
    const studentsToRender = [...academyStudents];
    
    studentsToRender.sort((a, b) => {
        let ageA = parseInt(a.age);
        if (isNaN(ageA)) ageA = 999;
        let ageB = parseInt(b.age);
        if (isNaN(ageB)) ageB = 999;
        return ageA - ageB;
    });
    
    if(studentsToRender.length === 0) {
        tbody += `<tr><td colspan="${5 + activeDays.length}" style="padding: 20px; text-align: center; color: var(--text-muted);">No students registered.</td></tr>`;
    } else {
        studentsToRender.forEach(student => {
            const payment = getAcademyPaymentForMonth(monthStr, student.id);
            const isPaid = payment && payment.status === 'Paid';
            const payText = student.role === 'coach' ? `<span style="color: #9ca3af;">N/A</span>` : (isPaid ? `<span style="color: #10b981;">Paid (${payment.amount || 0})</span>` : `<span style="color: #ef4444;">Unpaid</span>`);
            
            let totalPresent = 0;
            let totalAbsent = 0;
            let daysHtml = '';
            
            activeDays.forEach(d => {
                const dateStr = `${monthStr}-${String(d).padStart(2, '0')}`;
                const record = getAcademyAttendanceForDate(dateStr, student.id);
                let dayStatus = '-';
                let color = '#9ca3af';
                
                if(record) {
                    if(record.status === 'Present') {
                        dayStatus = 'P';
                        color = '#10b981';
                        totalPresent++;
                    } else if(record.status === 'Absent') {
                        dayStatus = 'A';
                        color = '#ef4444';
                        totalAbsent++;
                    }
                }
                daysHtml += `<td style="padding: 12px; text-align: center; color: ${color}; font-weight: bold;">${dayStatus}</td>`;
            });
            
            tbody += `
                <tr style="border-bottom: 1px solid #374151;">
                    <td style="padding: 12px; color: ${student.role === 'coach' ? '#3b82f6' : 'inherit'}; font-weight: ${student.role === 'coach' ? 'bold' : 'normal'};">${escapeHtml(student.name)} ${student.role === 'coach' ? '<span style="font-size: 0.75rem; background: rgba(59,130,246,0.2); color: #3b82f6; padding: 2px 6px; border-radius: 4px; margin-left: 4px; vertical-align: middle;">Coach</span>' : ''}</td>
                    <td style="padding: 12px;">${escapeHtml(student.id)}</td>
                    <td style="padding: 12px; text-align: center; color: #10b981;">${totalPresent}</td>
                    <td style="padding: 12px; text-align: center; color: #ef4444;">${totalAbsent}</td>
                    <td style="padding: 12px; text-align: center;">${payText}</td>
                    ${daysHtml}
                </tr>
            `;
        });
    }
    
    tbody += `</tbody>`;
    table.innerHTML = thead + tbody;
}

function exportAcademyReportToExcel() {
    if (typeof XLSX === 'undefined') {
        alert("Excel export library is still loading or failed to load.");
        return;
    }
    
    const table = document.getElementById('academy-report-table');
    if(!table) return;
    
    const monthStr = document.getElementById('academy-report-month').value || 'Report';
    
    const wb = XLSX.utils.table_to_book(table, {sheet: "Academy Report"});
    XLSX.writeFile(wb, `MUFC_Academy_Report_${monthStr}.xlsx`);
}

// ================= ACADEMY ACCOUNTS LOGIC =================

function renderAcademyAccounts() {
    const list = document.getElementById('academy-accounts-list');
    if (!list) return;

    let monthStr = document.getElementById('academy-account-month').value;
    if (!monthStr) {
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        monthStr = `${y}-${m}`;
        document.getElementById('academy-account-month').value = monthStr;
    }

    list.innerHTML = '';
    
    let totalIncome = 0;
    let totalExpense = 0;
    
    let totalFees = 0;
    academyPayments.forEach(payment => {
        if (payment.month === monthStr && payment.status === 'Paid') {
            totalFees += parseFloat(payment.amount) || 0;
        }
    });

    if (totalFees > 0) {
        totalIncome += totalFees;
        list.innerHTML += `
            <div class="player-card" style="display: flex; align-items: center; padding: 12px 20px; border-radius: 8px; margin-bottom: 8px; background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2);">
                <div style="width: 120px; color: var(--text-muted); font-size: 0.85rem;">${monthStr}-Auto</div>
                <div style="flex: 1; min-width: 200px; color: #fff; font-weight: bold;">
                    <i class="fa-solid fa-graduation-cap" style="color: #10b981; margin-right: 8px;"></i>Student Fee Collections
                </div>
                <div style="width: 120px; text-align: right; color: #10b981; font-weight: bold;">${totalFees} SAR</div>
                <div style="width: 120px; text-align: right; color: #ef4444;">-</div>
                <div style="width: 60px; text-align: center;"><i class="fa-solid fa-lock" style="color: var(--text-muted);" title="Auto-calculated"></i></div>
            </div>
        `;
    }

    const monthEntries = academyAccounts.filter(acc => acc.date.startsWith(monthStr)).sort((a,b) => new Date(a.date) - new Date(b.date));
    
    if (monthEntries.length === 0 && totalFees === 0) {
        list.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No transactions found for this month.</p>';
    }

    monthEntries.forEach(entry => {
        const amount = parseFloat(entry.amount) || 0;
        if (entry.type === 'income') {
            totalIncome += amount;
        } else {
            totalExpense += amount;
        }

        const isInc = entry.type === 'income';
        list.innerHTML += `
            <div class="player-card" style="display: flex; align-items: center; padding: 12px 20px; border-radius: 8px; margin-bottom: 8px; background: rgba(15, 23, 42, 0.8); border: 1px solid #374151;">
                <div style="width: 120px; color: var(--text-muted); font-size: 0.85rem;">${escapeHtml(entry.date)}</div>
                <div style="flex: 1; min-width: 200px; color: #fff;">${escapeHtml(entry.description)}</div>
                <div style="width: 120px; text-align: right; color: #10b981; font-weight: bold;">${isInc ? amount + ' SAR' : '-'}</div>
                <div style="width: 120px; text-align: right; color: #ef4444; font-weight: bold;">${!isInc ? amount + ' SAR' : '-'}</div>
                <div style="width: 60px; text-align: center;">
                    <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.75rem; border-color: #ef4444; color: #ef4444;" onclick="deleteAccountEntry('${entry.id}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });

    const netBalance = totalIncome - totalExpense;
    
    const incEl = document.getElementById('account-total-income');
    const expEl = document.getElementById('account-total-expense');
    const balEl = document.getElementById('account-net-balance');
    
    if(incEl) incEl.innerText = totalIncome + ' SAR';
    if(expEl) expEl.innerText = totalExpense + ' SAR';
    if(balEl) {
        balEl.innerText = netBalance + ' SAR';
        balEl.style.color = netBalance < 0 ? '#ef4444' : '#38bdf8';
    }
}

function addAccountEntry() {
    const date = document.getElementById('acc-input-date').value;
    const desc = document.getElementById('acc-input-desc').value.trim();
    const amount = document.getElementById('acc-input-amount').value;
    const type = document.getElementById('acc-input-type').value;

    if (!date || !desc || !amount) {
        return alert("Please fill all fields (Date, Description, Amount) to add an entry.");
    }

    academyAccounts.push({
        id: 'acc_' + Date.now(),
        date: date,
        description: desc,
        amount: parseFloat(amount),
        type: type
    });

    saveData();
    renderAcademyAccounts();
    
    document.getElementById('acc-input-desc').value = '';
    document.getElementById('acc-input-amount').value = '';
}

function deleteAccountEntry(id) {
    if(!confirm("Are you sure you want to delete this transaction?")) return;
    academyAccounts = academyAccounts.filter(a => a.id !== id);
    saveData();
    renderAcademyAccounts();
}

function exportAcademyAccountsToExcel() {
    if (typeof XLSX === 'undefined') {
        alert("Excel export library is still loading or failed to load.");
        return;
    }

    let monthStr = document.getElementById('academy-account-month').value;
    if (!monthStr) {
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        monthStr = `${y}-${m}`;
    }

    const data = [
        ["Date", "Description", "Income (SAR)", "Expense (SAR)"]
    ];

    let totalIncome = 0;
    let totalExpense = 0;

    let totalFees = 0;
    academyPayments.forEach(payment => {
        if (payment.month === monthStr && payment.status === 'Paid') {
            totalFees += parseFloat(payment.amount) || 0;
        }
    });

    if (totalFees > 0) {
        totalIncome += totalFees;
        data.push([
            `${monthStr}-Auto`,
            "Student Fee Collections",
            totalFees,
            ""
        ]);
    }

    const monthEntries = academyAccounts.filter(acc => acc.date.startsWith(monthStr)).sort((a,b) => new Date(a.date) - new Date(b.date));

    monthEntries.forEach(entry => {
        const amount = parseFloat(entry.amount) || 0;
        if (entry.type === 'income') {
            totalIncome += amount;
            data.push([entry.date, entry.description, amount, ""]);
        } else {
            totalExpense += amount;
            data.push([entry.date, entry.description, "", amount]);
        }
    });

    data.push([]);
    data.push(["", "Total Income", totalIncome, ""]);
    data.push(["", "Total Expense", "", totalExpense]);
    data.push(["", "Net Balance", totalIncome - totalExpense, ""]);

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Account Statement");
    
    XLSX.writeFile(wb, `MUFC_Account_Statement_${monthStr}.xlsx`);
}

// ================= ACADEMY USERS LOGIC =================

function renderAcademyUsers() {
    const list = document.getElementById('academy-users-list');
    if (!list) return;

    list.innerHTML = '';
    
    academyAdmins.forEach(admin => {
        const isSuper = admin.type === 'super';
        const typeLabel = admin.type === 'super' ? 'Super Admin' : (admin.type === 'main' ? 'Main User' : 'Normal User');
        const color = admin.type === 'super' ? '#8b5cf6' : (admin.type === 'main' ? '#10b981' : '#38bdf8');
        
        list.innerHTML += `
            <div class="player-card" style="display: flex; align-items: center; padding: 12px 20px; border-radius: 8px; margin-bottom: 8px; background: rgba(15, 23, 42, 0.8); border: 1px solid #374151;">
                <div style="flex: 2; min-width: 200px; color: #fff; font-weight: bold;">
                    <i class="fa-solid ${isSuper ? 'fa-crown' : 'fa-user'}" style="color: ${color}; margin-right: 8px;"></i>${escapeHtml(admin.username)}
                </div>
                <div style="flex: 2; min-width: 200px; color: var(--text-muted); font-family: monospace;">
                    ${isSuper ? '••••••••' : escapeHtml(admin.password)}
                </div>
                <div style="width: 150px; font-weight: bold; color: ${color};">
                    ${typeLabel}
                </div>
                <div style="width: 80px; text-align: center;">
                    ${isSuper ? '<i class="fa-solid fa-lock" style="color: var(--text-muted);" title="Cannot delete Super Admin"></i>' : 
                    `<button class="btn-secondary" style="padding: 4px 8px; font-size: 0.75rem; border-color: #ef4444; color: #ef4444;" onclick="deleteAcademyUser('${admin.username}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>`}
                </div>
            </div>
        `;
    });
}

function addAcademyUser() {
    const username = document.getElementById('admin-input-user').value.trim();
    const pass = document.getElementById('admin-input-pass').value.trim();
    const type = document.getElementById('admin-input-type').value;

    if (!username || !pass) {
        return alert("Please enter both Username and Password.");
    }

    if (academyAdmins.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        return alert("A user with this Username already exists.");
    }

    academyAdmins.push({
        username: username,
        password: pass,
        type: type
    });

    saveData();
    renderAcademyUsers();
    
    document.getElementById('admin-input-user').value = '';
    document.getElementById('admin-input-pass').value = '';
}

function deleteAcademyUser(username) {
    if(!confirm(`Are you sure you want to delete the user "${username}"? They will instantly lose access.`)) return;
    academyAdmins = academyAdmins.filter(a => a.username !== username);
    saveData();
    renderAcademyUsers();
}

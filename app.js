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
let coachSalaries = [];
let closedAccountMonths = [];

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
            coachSalaries = data.coachSalaries || [];
            closedAccountMonths = data.closedAccountMonths || [];
            
            academyAdmins = data.academyAdmins && data.academyAdmins.length ? data.academyAdmins : [
                { username: 'pmnoushu010', password: 'Shanumon@12345$$', type: 'super' },
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

            // Update pmnoushu010 password if it's the old one
            let pmnoushuAdmin = academyAdmins.find(a => a.username === 'pmnoushu010');
            if (pmnoushuAdmin && pmnoushuAdmin.password !== 'Shanumon@12345$$') {
                pmnoushuAdmin.password = 'Shanumon@12345$$';
                needSave = true;
            }
            
            // Ensure the new super admin is added even if data was loaded from backend
            if (!academyAdmins.some(a => a.username === 'shanu410')) {
                academyAdmins.push({ username: 'shanu410', password: 'MUFC@difa03', type: 'super' });
                needSave = true;
            }

            // Clean up any orphaned attendance/payment records from deleted students & heal bloated payment history
            if (sanitizeAcademyData(false)) {
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
        attendance, academyStudents, academyAttendance, academyPayments, coaches, academyAccounts, academyAdmins, coachSalaries,
        closedAccountMonths
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
            if(data.coachSalaries) coachSalaries = data.coachSalaries;
            if(data.closedAccountMonths) closedAccountMonths = data.closedAccountMonths;

            sanitizeAcademyData(false);

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
                    else if(viewId === 'academy-coach-attendance') renderAcademyCoachAttendance();
                    else if(viewId === 'academy-coach-salaries') renderAcademyCoachSalaries();
                    else if(viewId === 'academy-payments') renderAcademyPayments();
                    else if(viewId === 'academy-reports') renderAcademyReports();
                    else if(viewId === 'academy-accounts') renderAcademyAccounts();
                    else if(viewId === 'academy-users') renderAcademyUsers();
                    else if(viewId === 'academy-categorise-list') renderAcademyCategoriseList();
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

function generate10DigitID() {
    let newId;
    let isUnique = false;
    while (!isUnique) {
        newId = Math.floor(1000000000 + Math.random() * 9000000000).toString();
        const existsInPlayers = players.some(p => p.id && p.id.toString() === newId);
        const existsInPending = pendingUsers.some(p => p.id && p.id.toString() === newId);
        const existsInAcademy = typeof academyStudents !== 'undefined' && academyStudents.some(s => s.id && s.id.toString() === newId);
        if (!existsInPlayers && !existsInPending && !existsInAcademy) {
            isUnique = true;
        }
    }
    return newId;
}

async function handleRegistration() {
    const role = document.querySelector('input[name="reg-role"]:checked') ? document.querySelector('input[name="reg-role"]:checked').value : 'student';
    const name = document.getElementById('reg-name').value.trim();
    const pass = document.getElementById('reg-pass').value.trim();
    const countryCode = document.getElementById('reg-country-code').value;
    const whatsapp = document.getElementById('reg-whatsapp').value.trim();
    
    let id = '', dob = '', email = '', picBase64 = null, mobile = '';

    if (role === 'student') {
        id = generate10DigitID();
        dob = document.getElementById('reg-dob').value;
        email = document.getElementById('reg-email').value.trim();
        const picFile = document.getElementById('reg-pic').files[0];
        picBase64 = picFile ? await fileToBase64(picFile) : null;

        if(!name || !dob || !email || !whatsapp || !pass) {
            return alert("Please fill all required fields to register.");
        }

        const alreadyExists = players.some(p => p.email.toLowerCase() === email.toLowerCase()) ||
                              pendingUsers.some(p => p.email && p.email.toLowerCase() === email.toLowerCase());
        if(alreadyExists) {
            return alert("A user with this Email is already registered or pending approval.");
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
    
    alert(`Registration submitted!${role === 'student' ? ' Your ID Number is: ' + id : ''}\nPlease wait for admin to grant access.`);
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
    const coach = coaches.find(c => (c.mobile === loginId || String(c.id) === loginId || (c.name && c.name.toLowerCase() === loginId.toLowerCase())) && c.password === loginPass);
    if(coach) {
        return performLogin('coach', coach);
    }
    const academyCoach = (academyStudents || []).find(s => s.role === 'coach' && (String(s.id) === loginId || s.contact === loginId || s.mobile === loginId || (s.name && s.name.toLowerCase() === loginId.toLowerCase())) && s.password && s.password === loginPass);
    if(academyCoach) {
        return performLogin('coach', academyCoach);
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
        const isAttendanceOnly = (user && (user.type === 'attendance' || user.type === 'coach'));
        document.querySelector('.profile-pic').style.backgroundImage = "none";
        document.getElementById('header-title').innerText = isAttendanceOnly ? "Coach Portal" : "Academy Portal";
        document.getElementById('admin-nav').style.display = 'none';
        document.getElementById('player-nav').style.display = 'none';
        document.getElementById('academy-nav').style.display = 'flex';
        document.querySelectorAll('#academy-nav .nav-item').forEach(item => {
            const onclick = item.getAttribute('onclick') || '';
            if (isAttendanceOnly) {
                // Coach / Attendance Only: strictly show Student Attendance AND Categorise List
                const isAllowed = (onclick.includes('academy-attendance') && !onclick.includes('academy-coach-attendance')) ||
                                  onclick.includes('academy-categorise-list');
                item.style.display = isAllowed ? 'flex' : 'none';
            } else if (onclick.includes('academy-categorise-list')) {
                item.style.display = 'flex';
            } else if (onclick.includes('academy-users')) {
                // Access only for super admin (rolled back from main user and normal user)
                item.style.display = (user && user.type === 'super') ? 'flex' : 'none';
            } else if (onclick.includes('academy-dashboard')) {
                // Granted to normal user and all admins!
                item.style.display = 'flex';
            } else if (onclick.includes('academy-coach-attendance')) {
                item.style.display = 'flex';
            } else if (onclick.includes('academy-pnl')) {
                item.style.display = (user && (user.type === 'main' || user.type === 'super')) ? 'flex' : 'none';
            } else if (onclick.includes('academy-approvals')) {
                item.style.display = (user && user.type === 'super') ? 'flex' : 'none';
            } else if (onclick.includes('academy-accounts') || onclick.includes('academy-coach-salaries')) {
                item.style.display = (user && (user.type === 'main' || user.type === 'super')) ? 'flex' : 'none';
            } else {
                item.style.display = 'flex';
            }
        });
        
        if (isAttendanceOnly) {
            switchView('academy-attendance');
            renderAcademyAttendance();
        } else {
            switchView('academy-admin');
            renderAcademyStudents();
        }
    } else if(role === 'coach') {
        document.querySelector('.profile-pic').style.backgroundImage = currentUser.pic ? `url('${currentUser.pic}')` : "none";
        document.getElementById('header-title').innerText = "Coach Portal";
        document.getElementById('admin-nav').style.display = 'none';
        document.getElementById('player-nav').style.display = 'none';
        document.getElementById('academy-nav').style.display = 'flex';
        
        // Hide other academy nav items - ONLY show Student Attendance & Categorise List
        document.querySelectorAll('#academy-nav .nav-item').forEach(item => {
            const onclick = item.getAttribute('onclick') || '';
            const isAllowed = (onclick.includes('academy-attendance') && !onclick.includes('academy-coach-attendance')) ||
                              onclick.includes('academy-categorise-list');
            if (isAllowed) {
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

    // Restriction for Coach / Attendance Only users: allow academy-attendance and academy-categorise-list
    const isAttendanceOnly = (currentRole === 'coach') || (currentUser && (currentUser.type === 'attendance' || currentUser.type === 'coach'));
    if (isAttendanceOnly && viewId !== 'academy-attendance' && viewId !== 'academy-categorise-list') {
        viewId = 'academy-attendance';
    }

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(`view-${viewId}`);
    if(target) target.classList.add('active');
    
    // Update nav icons
    const navId = currentRole === 'admin' ? 'admin-nav' : ((currentRole === 'academyAdmin' || currentRole === 'coach') ? 'academy-nav' : 'player-nav');
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
    } else if(viewId === 'academy-dashboard') {
        renderAcademyDashboard();
    } else if(viewId === 'academy-admin') {
        renderAcademyStudents();
    } else if(viewId === 'academy-attendance') {
        renderAcademyAttendance();
    } else if(viewId === 'academy-coach-attendance') {
        renderAcademyCoachAttendance();
    } else if(viewId === 'academy-coach-salaries') {
        renderAcademyCoachSalaries();
    } else if(viewId === 'academy-payments') {
        renderAcademyPayments();
    } else if(viewId === 'academy-reports') {
        renderAcademyReports();
    } else if(viewId === 'academy-accounts') {
        renderAcademyAccounts();
    } else if(viewId === 'academy-users') {
        if (!currentUser || currentUser.type !== 'super') {
            return switchView('academy-admin');
        }
        renderAcademyUsers();
    } else if(viewId === 'academy-pnl') {
        renderPnL();
    } else if(viewId === 'academy-approvals') {
        renderAcademyApprovals();
    } else if(viewId === 'academy-categorise-list') {
        renderAcademyCategoriseList();
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
    const regInputs = ['reg-name', 'reg-dob', 'reg-email', 'reg-whatsapp', 'reg-pass'];
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
        const idNum = generate10DigitID();
        const dob = document.getElementById('new-acad-dob').value;
        const joinDate = document.getElementById('new-acad-join-date').value;
        
        if(!name || !fatherName || !dob || !contact || !whatsappNum || !joinDate) {
            return alert("Please fill all required fields.");
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
        alert(`Academy Student registered successfully! Assigned ID: ${idNum}`);
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
    
    const searchInput = document.getElementById('academy-student-search');
    const searchQuery = searchInput ? searchInput.value.toLowerCase() : '';
    
    let studentsToRender = academyStudents.filter(s => {
        if (searchQuery && !s.name.toLowerCase().includes(searchQuery)) return false;
        return true;
    });
    
    // Sort by age ascending (youngest to oldest)
    studentsToRender.sort((a, b) => {
        const ageA = parseInt(a.age) || 999; // Put missing ages at the end
        const ageB = parseInt(b.age) || 999;
        return ageA - ageB;
    });
    
    if(studentsToRender.length === 0) {
        list.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No students found.</p>';
        return;
    }
    
    studentsToRender.forEach(student => {
        const totalAttended = calculateTotalAttended(student.id);
        const div = document.createElement('div');
        div.className = 'player-card';
        div.style.cursor = 'pointer';
        div.onclick = () => openAcademyStudentDetails(student.id);
        
        const initial = student.name ? student.name.trim().charAt(0).toUpperCase() : 'S';
        const avatarStyle = student.pic 
            ? `background-image: url('${student.pic}');` 
            : `background: linear-gradient(135deg, #1e3a8a, #2563eb);`;
            
        const nameColor = student.role === 'coach' 
            ? '#38bdf8' 
            : (student.gender === 'Female' ? '#ec4899' : '#ffffff');
            
        div.innerHTML = `
            <div class="player-info">
                <div class="profile-pic" style="${avatarStyle}">
                    ${student.pic ? '' : initial}
                </div>
                <div style="flex: 1; min-width: 0;">
                    <h3 style="color: ${nameColor};">
                        <span>${escapeHtml(student.name)}</span>
                        ${student.age ? `<span class="player-age-badge">${student.age} Yrs</span>` : ''}
                        ${student.role === 'coach' ? '<span style="font-size: 0.8rem; background: rgba(59,130,246,0.2); color: #3b82f6; padding: 2px 8px; border-radius: 6px; font-weight: 600;">Coach</span>' : ''}
                        ${student.pendingDeletion ? '<span style="font-size: 0.8rem; background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 2px 8px; border-radius: 6px; font-weight: 600;">Pending Deletion</span>' : ''}
                    </h3>
                    <p>
                        <span class="player-meta-item"><i class="fa-solid fa-id-badge" style="color: #ef4444;"></i>ID: <strong>${escapeHtml(student.id)}</strong></span>
                        ${student.role !== 'coach' ? `<span class="player-meta-item"><i class="fa-solid fa-user-group" style="color: #38bdf8;"></i>Parent: <strong>${escapeHtml(student.fatherName || 'N/A')}</strong></span>` : ''}
                        <span class="player-meta-item attendance"><i class="fa-solid fa-calendar-check" style="color: #10b981;"></i>Total Attended: <strong>${totalAttended} Days</strong></span>
                    </p>
                </div>
            </div>
            <div class="player-card-action">
                <span>View Details</span>
                <i class="fa-solid fa-chevron-right" style="font-size: 0.85rem;"></i>
            </div>
        `;
        list.appendChild(div);
    });
}

function calculateTotalAttended(studentId) {
    return academyAttendance.filter(a => a.studentId === studentId && a.status === 'Present').length;
}

async function exportStudentsToExcel() {
    const btn = document.getElementById('btn-export-students-excel');
    const originalBtnHtml = btn ? btn.innerHTML : '';
    
    try {
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Exporting...</span>`;
        }

        // 1. Ensure students are loaded
        let studentsList = (typeof academyStudents !== 'undefined' && Array.isArray(academyStudents)) ? [...academyStudents] : [];
        if (studentsList.length === 0) {
            try {
                const res = await fetch('/api/data');
                const data = await res.json();
                if (data && Array.isArray(data.academyStudents)) {
                    academyStudents = data.academyStudents;
                    studentsList = [...academyStudents];
                    if (data.academyAttendance) academyAttendance = data.academyAttendance;
                }
            } catch (e) {
                console.warn('Could not fetch latest students for export:', e);
            }
        }

        if (studentsList.length === 0) {
            alert('No student records found in the database to export.');
            return;
        }

        // 2. Sort students (youngest to oldest by age, then by name)
        studentsList.sort((a, b) => {
            const ageA = parseInt(a.age) || 999;
            const ageB = parseInt(b.age) || 999;
            if (ageA !== ageB) return ageA - ageB;
            return (a.name || '').localeCompare(b.name || '');
        });

        const todayStr = new Date().toISOString().split('T')[0];
        const dateFormatted = new Date().toLocaleDateString('en-GB', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
        });
        const filename = `MUFC_Academy_Students_Database_${todayStr}.xlsx`;

        // 3. Primary Export Engine: ExcelJS (Rich table with styled borders, header colors, auto-fit columns)
        if (typeof ExcelJS !== 'undefined') {
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'MUFC Academy Portal';
            workbook.created = new Date();
            
            const worksheet = workbook.addWorksheet('Students Database', {
                views: [{ showGridLines: true }],
                pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 }
            });

            // Column widths
            worksheet.columns = [
                { key: 'srNo', width: 9 },
                { key: 'id', width: 18 },
                { key: 'name', width: 28 },
                { key: 'fatherName', width: 26 },
                { key: 'dob', width: 16 },
                { key: 'age', width: 10 },
                { key: 'gender', width: 12 },
                { key: 'contact', width: 22 },
                { key: 'whatsapp', width: 22 },
                { key: 'joinDate', width: 16 },
                { key: 'attended', width: 16 },
                { key: 'status', width: 16 }
            ];

            // Row 1: Title Banner
            const titleRow = worksheet.addRow(['MUFC ACADEMY - OFFICIAL STUDENTS DATABASE']);
            worksheet.mergeCells('A1:L1');
            titleRow.height = 36;
            const titleCell = titleRow.getCell(1);
            titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
            titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
            titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

            // Row 2: Subtitle Info Banner
            const subTitleRow = worksheet.addRow([`Report Generated: ${dateFormatted}   |   Total Registered Students: ${studentsList.length}`]);
            worksheet.mergeCells('A2:L2');
            subTitleRow.height = 22;
            const subCell = subTitleRow.getCell(1);
            subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FFCBD5E1' } };
            subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
            subCell.alignment = { horizontal: 'center', vertical: 'middle' };

            // Row 3: Blank Spacing Row
            const blankRow = worksheet.addRow([]);
            blankRow.height = 8;

            // Row 4: Column Headers
            const headers = [
                'Sr. No.',
                'Student ID',
                'Student Name',
                'Parent Name',
                'Date of Birth',
                'Age',
                'Gender',
                'Mobile Number',
                'WhatsApp Number',
                'Joining Date',
                'Total Attended',
                'Status'
            ];
            const headerRow = worksheet.addRow(headers);
            headerRow.height = 28;

            const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF991B1B' } }; // MUFC Crimson Red
            const headerFont = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
            const headerBorder = {
                top: { style: 'medium', color: { argb: 'FF1E293B' } },
                left: { style: 'thin', color: { argb: 'FF7F1D1D' } },
                bottom: { style: 'medium', color: { argb: 'FF1E293B' } },
                right: { style: 'thin', color: { argb: 'FF7F1D1D' } }
            };

            headerRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
                cell.fill = headerFill;
                cell.font = headerFont;
                cell.border = headerBorder;
                cell.alignment = {
                    horizontal: (colNum === 3 || colNum === 4) ? 'left' : 'center',
                    vertical: 'middle'
                };
            });

            // Rows 5+: Student Data Rows with Full Table Borders & Subtle Zebra Striping
            const dataCellBorder = {
                top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
            };

            studentsList.forEach((s, idx) => {
                const totalAttended = typeof calculateTotalAttended === 'function' ? calculateTotalAttended(s.id) : 0;
                const statusText = s.pendingDeletion ? 'Pending Deletion' : (s.role === 'coach' ? 'Coach' : 'Active');
                
                const row = worksheet.addRow([
                    idx + 1,
                    String(s.id || ''),
                    s.name || '-',
                    s.fatherName || '-',
                    s.dob || '-',
                    s.age ? `${s.age} Yrs` : '-',
                    s.gender || 'Male',
                    String(s.contact || '-'),
                    String(s.whatsapp || '-'),
                    s.joinDate || '-',
                    `${totalAttended} Days`,
                    statusText
                ]);

                row.height = 23;
                const isEven = (idx % 2 === 0);
                const rowFill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' }
                };

                row.eachCell({ includeEmpty: true }, (cell, colNum) => {
                    cell.fill = rowFill;
                    cell.border = dataCellBorder;
                    cell.font = {
                        name: 'Calibri',
                        size: 10.5,
                        color: { argb: (colNum === 3) ? 'FF0F172A' : 'FF334155' },
                        bold: (colNum === 1 || colNum === 3)
                    };
                    cell.alignment = {
                        horizontal: (colNum === 3 || colNum === 4) ? 'left' : 'center',
                        vertical: 'middle'
                    };
                    // Treat ID and phone numbers as text explicitly so leading zeros/plus signs are preserved
                    if (colNum === 2 || colNum === 8 || colNum === 9) {
                        cell.numFmt = '@';
                    }
                });
            });

            // Summary Footer Row
            const summaryRowNumber = worksheet.rowCount + 1;
            const summaryRow = worksheet.addRow([
                'TOTAL',
                '',
                `Total Students: ${studentsList.length}`,
                '', '', '', '', '', '', '', '', ''
            ]);
            worksheet.mergeCells(`A${summaryRowNumber}:B${summaryRowNumber}`);
            summaryRow.height = 25;

            const summaryBorder = {
                top: { style: 'medium', color: { argb: 'FF94A3B8' } },
                left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                bottom: { style: 'medium', color: { argb: 'FF94A3B8' } },
                right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
            };

            summaryRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
                cell.border = summaryBorder;
                cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF0F172A' } };
                cell.alignment = {
                    horizontal: (colNum === 3) ? 'left' : 'center',
                    vertical: 'middle'
                };
            });

            // Download file
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { 
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

        } else if (typeof XLSX !== 'undefined') {
            // Secondary Fallback: SheetJS
            const aoa = [
                ['MUFC ACADEMY - OFFICIAL STUDENTS DATABASE'],
                [`Generated: ${dateFormatted} | Total Students: ${studentsList.length}`],
                [],
                [
                    'Sr. No.',
                    'Student ID',
                    'Student Name',
                    'Parent Name',
                    'Date of Birth',
                    'Age',
                    'Gender',
                    'Mobile Number',
                    'WhatsApp Number',
                    'Joining Date',
                    'Total Attended',
                    'Status'
                ]
            ];

            studentsList.forEach((s, idx) => {
                const totalAttended = typeof calculateTotalAttended === 'function' ? calculateTotalAttended(s.id) : 0;
                const statusText = s.pendingDeletion ? 'Pending Deletion' : (s.role === 'coach' ? 'Coach' : 'Active');
                aoa.push([
                    idx + 1,
                    String(s.id || ''),
                    s.name || '-',
                    s.fatherName || '-',
                    s.dob || '-',
                    s.age ? `${s.age} Yrs` : '-',
                    s.gender || 'Male',
                    String(s.contact || '-'),
                    String(s.whatsapp || '-'),
                    s.joinDate || '-',
                    `${totalAttended} Days`,
                    statusText
                ]);
            });

            aoa.push([]);
            aoa.push(['TOTAL', '', `Total Students: ${studentsList.length}`]);

            const ws = XLSX.utils.aoa_to_sheet(aoa);
            ws['!cols'] = [
                { wch: 9 }, { wch: 18 }, { wch: 28 }, { wch: 26 }, { wch: 16 },
                { wch: 10 }, { wch: 12 }, { wch: 22 }, { wch: 22 }, { wch: 16 },
                { wch: 16 }, { wch: 16 }
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Students Database');
            XLSX.writeFile(wb, filename);

        } else {
            alert('Excel export library is loading. Please check your internet connection and try again.');
        }

    } catch (err) {
        console.error('Export to Excel error:', err);
        alert('An error occurred while generating Excel file: ' + err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalBtnHtml;
        }
    }
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
        nameEl.style.color = (student.gender === 'Female') ? '#ec4899' : '';
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
    const student = academyStudents.find(s => String(s.id) === String(currentAcademyStudentId));
    if (!student) return;

    if (currentUser && currentUser.type !== 'super') {
        if (confirm(`You do not have permission to delete this student directly. Do you want to request deletion approval from the Super Admin?`)) {
            student.pendingDeletion = true;
            student.pendingDeletionBy = currentUser.username || currentUser.id;
            saveData();
            closeModal();
            renderAcademyStudents();
            alert("Deletion request sent to Super Admin.");
        }
        return;
    }

    if (!confirm(`Are you sure you want to PERMANENTLY delete "${student.name}" (ID: ${student.id}) from the database? This cannot be undone.`)) {
        return;
    }

    const studentIdToDelete = String(student.id);

    try {
        const response = await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'DELETE_ACADEMY_STUDENT',
                payload: { id: studentIdToDelete }
            })
        });

        if (!response.ok) {
            throw new Error(`Server returned status ${response.status}`);
        }

        const resData = await response.json();
        if (resData && resData.success === false) {
            throw new Error(resData.error || "Server failed to delete student");
        }

        // Successfully deleted from database, now update in-memory arrays
        academyStudents = academyStudents.filter(s => String(s.id) !== studentIdToDelete);
        if (typeof academyAttendance !== 'undefined' && Array.isArray(academyAttendance)) {
            academyAttendance = academyAttendance.filter(a => String(a.studentId) !== studentIdToDelete);
        }
        if (typeof academyPayments !== 'undefined' && Array.isArray(academyPayments)) {
            academyPayments = academyPayments.filter(p => String(p.studentId) !== studentIdToDelete);
        }

        closeModal();
        renderAcademyStudents();
        if (typeof renderAcademyReports === 'function') renderAcademyReports();
        if (typeof renderAcademyDashboard === 'function') renderAcademyDashboard();
        if (typeof renderAcademyAttendance === 'function') renderAcademyAttendance();
        alert(`Student "${student.name}" has been permanently deleted from the database.`);
    } catch (err) {
        console.error("Failed to delete student from database:", err);
        alert(`Error deleting student from database: ${err.message}. Please try again.`);
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

function getAllCoaches() {
    const list = [];
    const seen = new Set();
    
    // 1. Coaches registered inside academyStudents
    (academyStudents || []).forEach(s => {
        if (s && s.role === 'coach') {
            const key = String(s.contact || s.id || s.mobile || s.name).trim().toLowerCase();
            if (key && !seen.has(key)) {
                seen.add(key);
                list.push({
                    id: String(s.id || s.contact),
                    name: s.name,
                    mobile: s.contact || s.mobile || s.id,
                    whatsapp: s.whatsapp || '',
                    remarks: s.remarks || '',
                    pic: s.pic || null,
                    salary: parseFloat(s.salary || s.monthlySalary || 0) || 0,
                    source: 'academy'
                });
            }
        }
    });
    
    // 2. Coaches registered online in coaches array
    (coaches || []).forEach(c => {
        if (c) {
            const key = String(c.mobile || c.id || c.name).trim().toLowerCase();
            if (key && !seen.has(key)) {
                seen.add(key);
                list.push({
                    id: String(c.id || c.mobile),
                    name: c.name,
                    mobile: c.mobile || c.id,
                    whatsapp: c.whatsapp || '',
                    remarks: c.remarks || '',
                    pic: c.pic || null,
                    salary: parseFloat(c.salary || c.monthlySalary || 0) || 0,
                    source: 'online'
                });
            } else if (key) {
                const existing = list.find(item => String(item.mobile || item.id).trim().toLowerCase() === key);
                if (existing) {
                    if (!existing.pic && c.pic) existing.pic = c.pic;
                    if (!existing.whatsapp && c.whatsapp) existing.whatsapp = c.whatsapp;
                    if (!existing.salary && (c.salary || c.monthlySalary)) existing.salary = parseFloat(c.salary || c.monthlySalary || 0) || 0;
                }
            }
        }
    });
    
    return list;
}

function sanitizeAcademyData(triggerSave = true) {
    if (!Array.isArray(academyStudents) || academyStudents.length === 0) return false;
    const activeStudentIds = new Set(academyStudents.map(s => String(s.id)));
    const activeCoachIds = new Set(getAllCoaches().map(c => String(c.id)));
    const allValidIds = new Set([...activeStudentIds, ...activeCoachIds]);
    let changed = false;

    // 1. Remove orphaned attendance records for students or coaches who no longer exist
    if (Array.isArray(academyAttendance)) {
        const origAttLen = academyAttendance.length;
        academyAttendance = academyAttendance.filter(a => a && a.studentId && allValidIds.has(String(a.studentId)));
        if (academyAttendance.length !== origAttLen) {
            changed = true;
        }
    }

    // 2. Remove orphaned payments for students who no longer exist
    if (Array.isArray(academyPayments)) {
        const origPayLen = academyPayments.length;
        academyPayments = academyPayments.filter(p => p && p.studentId && activeStudentIds.has(String(p.studentId)));
        if (academyPayments.length !== origPayLen) {
            changed = true;
        }
    }

    // 3. Fix bloated payment history / desynchronized payments (e.g. duplicate pushes on edit)
    if (Array.isArray(academyPayments)) {
        academyPayments.forEach(p => {
            if (!p) return;
            const amt = parseFloat(p.amount) || parseFloat(p.paid) || 0;
            if (p.status !== 'Paid' && p.status !== 'paid') {
                if (p.history && p.history.length > 0) {
                    p.history = [];
                    changed = true;
                }
            } else if (p.history && Array.isArray(p.history) && p.history.length > 0) {
                const histSum = p.history.reduce((sum, h) => sum + (parseFloat(h.amount) || 0), 0);
                if (histSum > amt) {
                    p.history = [{ date: p.date || new Date().toISOString().split('T')[0], amount: amt }];
                    changed = true;
                }
            }
        });
    }

    if (changed && triggerSave) {
        saveData();
    }
    return changed;
}

function calculateCollectedForDate(dateStr) {
    let todayCollected = 0;
    const activeStudentIds = new Set((academyStudents || []).map(s => String(s.id)));

    (academyPayments || []).forEach(p => {
        if (!p) return;
        if (p.status !== 'Paid' && p.status !== 'paid') return;
        if (!activeStudentIds.has(String(p.studentId))) return;

        const totalPaid = parseFloat(p.amount) || parseFloat(p.paid) || 0;
        if (totalPaid <= 0) return;

        if (p.history && Array.isArray(p.history) && p.history.length > 0) {
            const histSum = p.history.reduce((sum, h) => sum + (parseFloat(h.amount) || 0), 0);
            if (histSum > totalPaid) {
                p.history = [{ date: p.date || dateStr, amount: totalPaid }];
            }

            let dateSum = 0;
            p.history.forEach(h => {
                if (h.date === dateStr) {
                    dateSum += parseFloat(h.amount) || 0;
                }
            });
            todayCollected += Math.min(dateSum, totalPaid);
        } else if (p.date === dateStr) {
            todayCollected += totalPaid;
        }
    });

    return todayCollected;
}

function updateTodayCollectedBadge() {
    const collectedEl = document.getElementById('academy-today-collected');
    if (!collectedEl) return;
    const datePicker = document.getElementById('academy-attendance-date');
    const dateStr = datePicker && datePicker.value ? datePicker.value : new Date().toISOString().split('T')[0];
    collectedEl.innerText = calculateCollectedForDate(dateStr);
}

function getAcademyAttendanceForDate(dateStr, studentId) {
    return academyAttendance.find(a => a.date === dateStr && String(a.studentId) === String(studentId));
}

function renderAcademyAttendance() {
    const list = document.getElementById('academy-attendance-list');
    if(!list) return;
    
    const isAttendanceOnly = (currentRole === 'coach') || (currentUser && (currentUser.type === 'attendance' || currentUser.type === 'coach'));
    
    // Toggle collected card visibility
    const collectedCard = document.getElementById('academy-collected-today-card');
    const strengthCard = document.getElementById('academy-strength-card');
    if (collectedCard) {
        collectedCard.style.display = isAttendanceOnly ? 'none' : 'block';
    }
    if (strengthCard) {
        strengthCard.style.borderRight = isAttendanceOnly ? 'none' : '1px solid rgba(255,255,255,0.1)';
    }

    let dateStr = document.getElementById('academy-attendance-date').value;
    if(!dateStr) {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('academy-attendance-date').value = today;
        dateStr = today;
    }
    
    list.innerHTML = '';
    
    // Filter genuine students only (exclude coaches so they do not show under student attendance)
    const genuineStudents = academyStudents.filter(s => s.role !== 'coach');
    
    if(genuineStudents.length === 0) {
        list.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No students registered yet.</p>';
        document.getElementById('academy-total-strength').innerText = '0 / 0';
        return;
    }
    
    // Accurate total strength for today across all registered students (independent of search query)
    const totalPresentToday = genuineStudents.filter(s => {
        const r = getAcademyAttendanceForDate(dateStr, s.id);
        return r && r.status === 'Present';
    }).length;
    document.getElementById('academy-total-strength').innerText = `${totalPresentToday} / ${genuineStudents.length}`;
    
    // Calculate total collected for this specific date (only for managers/admins)
    if (!isAttendanceOnly) {
        updateTodayCollectedBadge();
    }
    
    const searchInput = document.getElementById('academy-attendance-search');
    const searchQuery = searchInput ? searchInput.value.toLowerCase() : '';
    const filteredStudents = genuineStudents.filter(s => s.name.toLowerCase().includes(searchQuery));
    
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
        
        // Check payment for the month (YYYY-MM format extracted from dateStr)
        const monthStr = dateStr.substring(0, 7);
        const payment = getAcademyPaymentForMonth(monthStr, student.id);
        const isPaid = payment && payment.status === 'Paid';
        const hasAttended = academyAttendance.some(a => a.studentId === student.id && a.date.startsWith(monthStr) && a.status === 'Present');
        
        // When attendance only, hide payment indicator colors and paid checkmarks
        const nameColor = isAttendanceOnly 
            ? (student.gender === 'Female' ? '#ec4899' : '#fff')
            : (hasAttended ? (isPaid ? '#10b981' : '#ef4444') : (student.gender === 'Female' ? '#ec4899' : '#fff'));
        const paidCheckmark = (!isAttendanceOnly && isPaid) ? '<i class="fa-solid fa-circle-check" style="font-size: 0.95rem; color: #10b981; margin-left: 6px;"></i>' : '';
        const amount = payment ? payment.amount || payment.paid || '' : '';
        
        const initial = student.name ? student.name.trim().charAt(0).toUpperCase() : 'S';
        const avatarStyle = student.pic 
            ? `background-image: url('${student.pic}');` 
            : `background: linear-gradient(135deg, #1e3a8a, #2563eb);`;

        const paymentControlsHtml = isAttendanceOnly ? '' : `
            <div style="width: 1px; height: 30px; background: #374151; margin: 0 5px;"></div>
            
            <div style="display: flex; gap: 8px; align-items: center;">
                <input type="number" id="attendance-fee-${student.id}" value="${amount}" placeholder="SAR" style="width: 90px; padding: 10px; border-radius: 10px; background: rgba(15, 23, 42, 0.8); color: white; border: 1px solid #374151; text-align: center; font-weight: bold; font-size: 0.95rem;" oninput="handleFeeInput(this, '${student.id}', '${monthStr}')">
                <button id="pay-btn-${student.id}" class="btn-primary" style="padding: 10px 16px; border-radius: 10px; font-size: 0.95rem; font-weight: 600; display: flex; align-items: center; gap: 6px; ${isPaid ? 'background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3); opacity: 1;' : (amount > 0 ? 'background: #3b82f6; color: white; border: 1px solid #3b82f6; opacity: 1;' : 'background: #374151; color: #9ca3af; border: 1px solid #374151; opacity: 0.5;')}" onclick="togglePaymentStatusFromAttendance('${student.id}', '${monthStr}')" ${(!isPaid && (!amount || amount <= 0)) || isPaid ? 'disabled' : ''}>
                    <i class="fa-solid fa-wallet"></i> ${isPaid ? 'Paid' : 'Pay'}
                </button>
            </div>
        `;

        const div = document.createElement('div');
        div.className = 'player-card';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'space-between';
        div.style.padding = '16px 22px';
        div.style.gap = '20px';
        
        div.innerHTML = `
            <div class="player-info" style="display: flex; align-items: center; gap: 16px; min-width: 240px;">
                <div class="profile-pic" style="min-width: 50px; height: 50px; ${avatarStyle}">
                    ${student.pic ? '' : initial}
                </div>
                <div style="overflow: hidden;">
                    <h3 style="font-size: 1.25rem; font-weight: 600; color: ${nameColor}; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${escapeHtml(student.name)} ${(student.age && student.age !== '-' ? `<span class="player-age-badge" style="margin-left: 6px;">${student.age} Yrs</span>` : '')} ${paidCheckmark}</h3>
                    <p style="font-size: 0.95rem; color: var(--text-muted); margin-top: 3px;">ID: <strong style="color: #f1f5f9;">${escapeHtml(student.id)}</strong> | Parent: <strong style="color: #f1f5f9;">${escapeHtml(student.fatherName || 'N/A')}</strong></p>
                </div>
            </div>
            
            <div style="display: flex; align-items: center; gap: 14px; flex: 1; justify-content: flex-end;">
                <div style="display: flex; gap: 8px;">
                    <button class="btn-primary" style="padding: 10px 16px; border-radius: 10px; font-size: 0.95rem; font-weight: 600; display: flex; align-items: center; gap: 6px; ${isPresent ? 'background: #10b981; color: white; border-color: #10b981;' : 'opacity: 0.6; background: #374151; border-color: #374151; color: #9ca3af;'}" onclick="markAcademyAttendance('${student.id}', '${dateStr}', 'Present')">
                        <i class="fa-solid fa-check"></i> Present
                    </button>
                    <button class="btn-secondary" style="padding: 10px 16px; border-radius: 10px; font-size: 0.95rem; font-weight: 600; display: flex; align-items: center; gap: 6px; ${!isPresent ? 'background: #ef4444; color: white; border-color: #ef4444;' : 'opacity: 0.6; background: #374151; border-color: #374151; color: #9ca3af;'}" onclick="markAcademyAttendance('${student.id}', '${dateStr}', 'Absent')">
                        <i class="fa-solid fa-xmark"></i> Absent
                    </button>
                </div>
                
                <input type="text" maxlength="25" value="${escapeHtml(student.remarks || '')}" placeholder="Remarks (Max 25)" style="width: ${isAttendanceOnly ? '320px' : '250px'}; padding: 10px 14px; border-radius: 10px; background: rgba(15, 23, 42, 0.8); color: white; border: 1px solid #374151; font-size: 0.95rem;" onchange="updateAcademyRemark('${student.id}', this.value)">
                
                ${paymentControlsHtml}
            </div>
        `;
        list.appendChild(div);
    });
}

// ================= COACH ATTENDANCE LOGIC =================

function getAcademyCoachAttendanceForDate(dateStr, coachId) {
    return academyAttendance.find(a => a.date === dateStr && String(a.studentId) === String(coachId));
}

function markAcademyCoachAttendance(coachId, dateStr, status) {
    const coachIdStr = String(coachId);
    let record = academyAttendance.find(a => a.date === dateStr && String(a.studentId) === coachIdStr);
    if(record) {
        record.status = status;
        record.role = 'coach';
    } else {
        academyAttendance.push({ date: dateStr, studentId: coachIdStr, status: status, role: 'coach' });
    }
    
    // Auto-update accounts entry if coach salary was already recorded for this month
    const monthStr = dateStr.substring(0, 7);
    const expectedAccId = `acc_csal_${coachIdStr}_${monthStr}`;
    const accEntry = (academyAccounts || []).find(a => a.id === expectedAccId);
    if (accEntry) {
        const coachObj = getAllCoaches().find(c => String(c.id) === coachIdStr);
        if (coachObj) {
            const calc = calculateCoachSalaryDetails(coachObj, monthStr);
            accEntry.amount = calc.netSalary;
            accEntry.description = `Coach Salary: ${coachObj.name} (${monthStr}) [${calc.presentCount}/${calc.totalWorkingDays} days, ${calc.leaveDays} leave]`;
        }
    }

    saveData();
    renderAcademyCoachAttendance();
    const salView = document.getElementById('view-academy-coach-salaries');
    if (salView && salView.classList.contains('active')) {
        renderAcademyCoachSalaries();
    }
    const accView = document.getElementById('view-academy-accounts');
    if (accView && accView.classList.contains('active')) {
        renderAcademyAccounts();
    }
}

function updateAcademyCoachRemark(coachId, value) {
    const coachIdStr = String(coachId);
    (academyStudents || []).forEach(s => {
        if (s.role === 'coach' && (String(s.id) === coachIdStr || String(s.contact) === coachIdStr)) {
            s.remarks = value;
        }
    });
    (coaches || []).forEach(c => {
        if (String(c.id) === coachIdStr || String(c.mobile) === coachIdStr) {
            c.remarks = value;
        }
    });
    saveData();
}

function renderAcademyCoachAttendance() {
    const list = document.getElementById('academy-coach-attendance-list');
    if(!list) return;
    
    let dateStr = document.getElementById('academy-coach-attendance-date').value;
    if(!dateStr) {
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('academy-coach-attendance-date');
        if (dateInput) dateInput.value = today;
        dateStr = today;
    }
    
    list.innerHTML = '';
    
    const allCoaches = getAllCoaches();
    
    if(allCoaches.length === 0) {
        list.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 25px;">No coaches registered yet.</p>';
        const totalEl = document.getElementById('academy-coach-total-strength');
        if (totalEl) totalEl.innerText = '0 / 0';
        const regEl = document.getElementById('academy-coach-total-registered');
        if (regEl) regEl.innerText = '0 Coaches';
        return;
    }
    
    const searchInput = document.getElementById('academy-coach-attendance-search');
    const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const filteredCoaches = allCoaches.filter(c => 
        (c.name && c.name.toLowerCase().includes(searchQuery)) || 
        (c.mobile && c.mobile.includes(searchQuery))
    );
    
    const totalPresentCoaches = allCoaches.filter(c => {
        const r = getAcademyCoachAttendanceForDate(dateStr, c.id);
        return r && r.status === 'Present';
    }).length;
    
    const strengthEl = document.getElementById('academy-coach-total-strength');
    if (strengthEl) strengthEl.innerText = `${totalPresentCoaches} / ${allCoaches.length}`;
    
    const registeredEl = document.getElementById('academy-coach-total-registered');
    if (registeredEl) registeredEl.innerText = `${allCoaches.length} Coaches`;

    if (filteredCoaches.length === 0) {
        list.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 25px;">No coaches match "${escapeHtml(searchQuery)}".</p>`;
        return;
    }

    filteredCoaches.forEach(coach => {
        const record = getAcademyCoachAttendanceForDate(dateStr, coach.id);
        const isPresent = record && record.status === 'Present';
        const initial = coach.name ? coach.name.trim().charAt(0).toUpperCase() : 'C';
        const avatarStyle = coach.pic 
            ? `background-image: url('${coach.pic}'); background-size: cover; background-position: center;` 
            : `background: linear-gradient(135deg, #1e3a8a, #2563eb);`;

        const div = document.createElement('div');
        div.className = 'player-card';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'space-between';
        div.style.padding = '16px 22px';
        div.style.gap = '20px';
        
        div.innerHTML = `
            <div class="player-info" style="display: flex; align-items: center; gap: 16px; min-width: 260px;">
                <div class="profile-pic" style="min-width: 50px; height: 50px; border-radius: 50%; ${avatarStyle}">
                    ${coach.pic ? '' : initial}
                </div>
                <div style="overflow: hidden;">
                    <h3 style="font-size: 1.25rem; font-weight: 600; color: #3b82f6; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; margin: 0;">
                        ${escapeHtml(coach.name)}
                        <span style="font-size: 0.8rem; background: rgba(59,130,246,0.2); color: #3b82f6; padding: 2px 8px; border-radius: 6px; margin-left: 6px; vertical-align: middle;">Coach</span>
                        ${isPresent ? '<i class="fa-solid fa-circle-check" style="font-size: 0.95rem; color: #10b981; margin-left: 6px;" title="Present Today"></i>' : ''}
                    </h3>
                    <p style="font-size: 0.95rem; color: var(--text-muted); margin-top: 4px;">
                        Mobile: <strong style="color: #f1f5f9;">${escapeHtml(coach.mobile || coach.id)}</strong>
                        ${coach.whatsapp ? ` | WhatsApp: <strong style="color: #22c55e;">${escapeHtml(coach.whatsapp)}</strong>` : ''}
                    </p>
                </div>
            </div>
            
            <div style="display: flex; align-items: center; gap: 14px; flex: 1; justify-content: flex-end;">
                <div style="display: flex; gap: 8px;">
                    <button class="btn-primary" style="padding: 10px 18px; border-radius: 10px; font-size: 0.95rem; font-weight: 600; display: flex; align-items: center; gap: 6px; ${isPresent ? 'background: #10b981; color: white; border-color: #10b981;' : 'opacity: 0.6; background: #374151; border-color: #374151; color: #9ca3af;'}" onclick="markAcademyCoachAttendance('${escapeHtml(coach.id)}', '${dateStr}', 'Present')">
                        <i class="fa-solid fa-check"></i> Present
                    </button>
                    <button class="btn-secondary" style="padding: 10px 18px; border-radius: 10px; font-size: 0.95rem; font-weight: 600; display: flex; align-items: center; gap: 6px; ${!isPresent ? 'background: #ef4444; color: white; border-color: #ef4444;' : 'opacity: 0.6; background: #374151; border-color: #374151; color: #9ca3af;'}" onclick="markAcademyCoachAttendance('${escapeHtml(coach.id)}', '${dateStr}', 'Absent')">
                        <i class="fa-solid fa-xmark"></i> Absent
                    </button>
                </div>
                
                <input type="text" maxlength="25" value="${escapeHtml(coach.remarks || '')}" placeholder="Remarks (Max 25)" style="width: 250px; padding: 10px 14px; border-radius: 10px; background: rgba(15, 23, 42, 0.8); color: white; border: 1px solid #374151; font-size: 0.95rem;" onchange="updateAcademyCoachRemark('${escapeHtml(coach.id)}', this.value)">
            </div>
        `;
        list.appendChild(div);
    });
}

// ================= COACH MONTHLY SALARY & EXPENSE LOGIC =================

function getWorkingDaysForMonth(monthStr) {
    if (!monthStr) {
        const today = new Date();
        monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    }
    const parts = monthStr.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // 0-indexed in JS
    
    const workingDays = [];
    const date = new Date(year, month, 1);
    
    while (date.getMonth() === month) {
        const dayOfWeek = date.getDay(); // 0: Sun, 5: Fri, 6: Sat
        if (dayOfWeek === 5 || dayOfWeek === 6) {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            workingDays.push({
                dateStr: `${y}-${m}-${d}`,
                dayName: dayOfWeek === 5 ? 'Friday' : 'Saturday',
                dayNum: date.getDate()
            });
        }
        date.setDate(date.getDate() + 1);
    }
    return workingDays;
}

function calculateCoachSalaryDetails(coach, monthStr) {
    const workingDays = getWorkingDaysForMonth(monthStr);
    const totalWorkingDays = workingDays.length;
    const coachIdStr = String(coach.id);
    
    // Constant monthly base salary for this coach
    const baseSalary = parseFloat(coach.salary || coach.monthlySalary || 0) || 0;
    
    // Confirmed formula: oneday salary = salary (constant) / no. of fridays and saturdays
    const dailyRate = totalWorkingDays > 0 ? (baseSalary / totalWorkingDays) : 0;
    
    // Attendance on working days
    let presentCount = 0;
    let absentCount = 0;
    let unmarkedCount = 0;
    const workingDaysDetails = [];
    
    workingDays.forEach(w => {
        const record = getAcademyCoachAttendanceForDate(w.dateStr, coachIdStr);
        let status = 'Unmarked';
        if (record && record.status === 'Present') {
            status = 'Present';
            presentCount++;
        } else if (record && record.status === 'Absent') {
            status = 'Absent';
            absentCount++;
        } else {
            unmarkedCount++;
        }
        workingDaysDetails.push({
            date: w.dateStr,
            dayName: w.dayName,
            status: status
        });
    });
    
    // Check if salary record has custom leave adjustment, else use marked absentCount
    const salaryRecord = (coachSalaries || []).find(cs => String(cs.coachId) === coachIdStr && cs.month === monthStr);
    const leaveDays = (salaryRecord && typeof salaryRecord.leaveDays === 'number') 
        ? salaryRecord.leaveDays 
        : absentCount;
        
    const deduction = Math.round((leaveDays * dailyRate) * 100) / 100;
    const netSalary = Math.max(0, Math.round((baseSalary - deduction) * 100) / 100);
    
    // Check if recorded as expense in academyAccounts
    const expectedAccId = `acc_csal_${coachIdStr}_${monthStr}`;
    const accountEntry = (academyAccounts || []).find(a => 
        a.id === expectedAccId || 
        (a.category === 'Coach Salary' && String(a.coachId) === coachIdStr && a.month === monthStr)
    );
    const isPaid = !!accountEntry || (salaryRecord && salaryRecord.status === 'Paid');
    
    return {
        coach,
        month: monthStr,
        baseSalary,
        totalWorkingDays,
        presentCount,
        absentCount,
        unmarkedCount,
        leaveDays,
        dailyRate: Math.round(dailyRate * 100) / 100,
        deduction,
        netSalary,
        workingDaysDetails,
        isPaid,
        accountEntry
    };
}

function renderAcademyCoachSalaries() {
    const list = document.getElementById('academy-coach-salaries-list');
    if (!list) return;
    
    let monthInput = document.getElementById('academy-salary-month');
    let monthStr = monthInput ? monthInput.value : '';
    if (!monthStr) {
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        monthStr = `${y}-${m}`;
        if (monthInput) monthInput.value = monthStr;
    }
    
    const workingDays = getWorkingDaysForMonth(monthStr);
    const totalWorkingDays = workingDays.length;
    const fridayCount = workingDays.filter(w => w.dayName === 'Friday').length;
    const saturdayCount = workingDays.filter(w => w.dayName === 'Saturday').length;
    
    const countBadge = document.getElementById('policy-month-days-count');
    if (countBadge) {
        countBadge.innerText = `${totalWorkingDays} days (${fridayCount} Fri, ${saturdayCount} Sat)`;
    }
    
    const allCoaches = getAllCoaches();
    
    if (allCoaches.length === 0) {
        list.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 30px;">No registered coaches found.</p>';
        const baseEl = document.getElementById('stat-salary-total-base');
        if (baseEl) baseEl.innerText = '0 SAR';
        const workEl = document.getElementById('stat-salary-working-days');
        if (workEl) workEl.innerText = `${totalWorkingDays} Days`;
        const dedEl = document.getElementById('stat-salary-total-deductions');
        if (dedEl) dedEl.innerText = '0 SAR';
        const netEl = document.getElementById('stat-salary-net-payable');
        if (netEl) netEl.innerText = '0 SAR';
        return;
    }
    
    // Calculate stats for all coaches
    let totalBase = 0;
    let totalDeductions = 0;
    let totalNetPayable = 0;
    let totalLeaves = 0;
    
    const coachCalculations = allCoaches.map(coach => {
        const calc = calculateCoachSalaryDetails(coach, monthStr);
        totalBase += calc.baseSalary;
        totalDeductions += calc.deduction;
        totalNetPayable += calc.netSalary;
        totalLeaves += calc.leaveDays;
        return calc;
    });
    
    const baseEl = document.getElementById('stat-salary-total-base');
    if (baseEl) baseEl.innerText = `${Math.round(totalBase)} SAR`;
    
    const workEl = document.getElementById('stat-salary-working-days');
    if (workEl) workEl.innerText = `${totalWorkingDays} Days`;
    const breakEl = document.getElementById('stat-salary-working-breakdown');
    if (breakEl) breakEl.innerText = `${fridayCount} Fri, ${saturdayCount} Sat in ${monthStr}`;
    
    const dedEl = document.getElementById('stat-salary-total-deductions');
    if (dedEl) dedEl.innerText = `${Math.round(totalDeductions)} SAR`;
    const leavesEl = document.getElementById('stat-salary-total-leaves-count');
    if (leavesEl) leavesEl.innerText = `Total Deductions (${totalLeaves} coach leaves)`;
    
    const netEl = document.getElementById('stat-salary-net-payable');
    if (netEl) netEl.innerText = `${Math.round(totalNetPayable)} SAR`;
    
    // Filtering and Search
    const searchInput = document.getElementById('academy-salary-search');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const statusFilter = document.getElementById('academy-salary-status-filter') ? document.getElementById('academy-salary-status-filter').value : 'all';
    
    const filtered = coachCalculations.filter(item => {
        const nameMatch = item.coach.name && item.coach.name.toLowerCase().includes(query);
        const mobileMatch = item.coach.mobile && item.coach.mobile.includes(query);
        const matchesQuery = !query || nameMatch || mobileMatch;
        
        let matchesStatus = true;
        if (statusFilter === 'paid') matchesStatus = item.isPaid;
        else if (statusFilter === 'unpaid') matchesStatus = !item.isPaid;
        
        return matchesQuery && matchesStatus;
    });
    
    list.innerHTML = '';
    
    if (filtered.length === 0) {
        list.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 30px;">No coaches match your search criteria.</p>`;
        return;
    }
    
    filtered.forEach(calc => {
        const coach = calc.coach;
        const initial = coach.name ? coach.name.trim().charAt(0).toUpperCase() : 'C';
        const avatarStyle = coach.pic 
            ? `background-image: url('${coach.pic}'); background-size: cover; background-position: center;` 
            : `background: linear-gradient(135deg, #1e3a8a, #2563eb);`;
            
        const card = document.createElement('div');
        card.className = 'player-card';
        card.style.display = 'flex';
        card.style.alignItems = 'center';
        card.style.justifyContent = 'space-between';
        card.style.padding = '18px 24px';
        card.style.gap = '20px';
        card.style.flexWrap = 'wrap';
        card.style.border = calc.isPaid ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid #374151';
        card.style.background = calc.isPaid ? 'rgba(16, 185, 129, 0.04)' : 'rgba(15, 23, 42, 0.8)';
        
        card.innerHTML = `
            <!-- Left: Coach Profile -->
            <div style="display: flex; align-items: center; gap: 16px; min-width: 250px;">
                <div class="profile-pic" style="min-width: 52px; height: 52px; border-radius: 50%; ${avatarStyle}">
                    ${coach.pic ? '' : initial}
                </div>
                <div>
                    <h3 style="font-size: 1.25rem; font-weight: 600; color: #fff; margin: 0; display: flex; align-items: center; gap: 8px;">
                        ${escapeHtml(coach.name)}
                        <span style="font-size: 0.75rem; background: rgba(59,130,246,0.2); color: #38bdf8; padding: 2px 8px; border-radius: 6px;">Coach</span>
                        ${calc.isPaid ? '<i class="fa-solid fa-circle-check" style="color: #10b981; font-size: 0.95rem;" title="Salary reflected in Accounts"></i>' : ''}
                    </h3>
                    <p style="font-size: 0.9rem; color: var(--text-muted); margin-top: 4px;">
                        Mobile: <strong style="color: #f1f5f9;">${escapeHtml(coach.mobile || coach.id)}</strong>
                        ${coach.whatsapp ? ` | WA: <strong style="color: #22c55e;">${escapeHtml(coach.whatsapp)}</strong>` : ''}
                    </p>
                </div>
            </div>
            
            <!-- Middle 1: Base Monthly Salary Input -->
            <div style="display: flex; flex-direction: column; gap: 5px; min-width: 140px;">
                <label style="font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Monthly Salary</label>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <input type="number" min="0" step="50" value="${calc.baseSalary || ''}" placeholder="0" 
                        class="form-input" 
                        style="width: 110px; padding: 8px 12px; font-weight: 700; text-align: center; border-radius: 8px; background: rgba(15,23,42,0.9); color: #38bdf8; font-size: 1.05rem; border: 1px solid #374151;" 
                        onchange="updateCoachBaseSalary('${escapeHtml(coach.id)}', this.value)"
                        title="Enter constant monthly salary">
                    <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">SAR</span>
                </div>
            </div>
            
            <!-- Middle 2: Attendance on Working Days & Leave Adjustment -->
            <div style="display: flex; flex-direction: column; gap: 5px; min-width: 210px;">
                <label style="font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">
                    Working Days (${calc.totalWorkingDays} Fri/Sat)
                </label>
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <span style="font-size: 0.85rem; background: rgba(16, 185, 129, 0.15); color: #10b981; padding: 4px 8px; border-radius: 6px; font-weight: 600;" title="Present working days">
                        <i class="fa-solid fa-check"></i> ${calc.presentCount} Pres
                    </span>
                    <span style="font-size: 0.85rem; background: rgba(239, 68, 68, 0.15); color: #ef4444; padding: 4px 8px; border-radius: 6px; font-weight: 600;" title="Absent working days (Leaves)">
                        <i class="fa-solid fa-xmark"></i> ${calc.leaveDays} Leaves
                    </span>
                    <button class="btn-secondary" style="padding: 4px 9px; font-size: 0.8rem; border-radius: 6px; gap: 5px;" onclick="openCoachAttendanceModal('${escapeHtml(coach.id)}', '${monthStr}')" title="View & mark working day dates">
                        <i class="fa-solid fa-calendar-days"></i> Dates
                    </button>
                </div>
            </div>
            
            <!-- Middle 3: Daily Rate & Deduction Formula Breakdown -->
            <div style="display: flex; flex-direction: column; gap: 4px; min-width: 170px;">
                <div style="font-size: 0.82rem; color: var(--text-muted);">
                    1-Day: <strong style="color: #fff;">${calc.dailyRate} SAR</strong>
                </div>
                <div style="font-size: 0.82rem; color: #ef4444;">
                    Deduction: <strong>-${calc.deduction} SAR</strong>
                </div>
                <div style="font-size: 1.15rem; font-weight: 700; color: #10b981; margin-top: 2px;">
                    Net: ${calc.netSalary} SAR
                </div>
            </div>
            
            <!-- Right: Status and Action Buttons -->
            <div style="display: flex; align-items: center; gap: 10px; min-width: 190px; justify-content: flex-end;">
                ${calc.isPaid ? `
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
                        <span style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3); padding: 6px 12px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
                            <i class="fa-solid fa-circle-check"></i> Reflected in Accounts
                        </span>
                        <button class="btn-secondary" style="padding: 5px 10px; font-size: 0.8rem; border-color: #ef4444; color: #ef4444; border-radius: 6px;" onclick="removeCoachSalaryFromAccounts('${escapeHtml(coach.id)}', '${monthStr}')" title="Remove salary expense from Accounts">
                            <i class="fa-solid fa-rotate-left"></i> Remove Expense
                        </button>
                    </div>
                ` : `
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
                        <span style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245,158,11,0.3); padding: 4px 10px; border-radius: 6px; font-size: 0.82rem; font-weight: 600;">
                            <i class="fa-solid fa-clock"></i> Pending
                        </span>
                        <button class="btn-primary" style="padding: 8px 16px; border-radius: 8px; font-size: 0.88rem; background: #10b981; border-color: #10b981; display: flex; align-items: center; gap: 6px;" onclick="postCoachSalaryToAccounts('${escapeHtml(coach.id)}', '${monthStr}')" ${calc.baseSalary <= 0 ? 'disabled' : ''}>
                            <i class="fa-solid fa-file-invoice-dollar"></i> Add as Expense
                        </button>
                    </div>
                `}
            </div>
        `;
        list.appendChild(card);
    });
}

function updateCoachBaseSalary(coachId, value) {
    const val = parseFloat(value) || 0;
    const coachIdStr = String(coachId);
    
    (academyStudents || []).forEach(s => {
        if (s.role === 'coach' && (String(s.id) === coachIdStr || String(s.contact) === coachIdStr || String(s.mobile) === coachIdStr)) {
            s.salary = val;
            s.monthlySalary = val;
        }
    });
    
    (coaches || []).forEach(c => {
        if (String(c.id) === coachIdStr || String(c.mobile) === coachIdStr) {
            c.salary = val;
            c.monthlySalary = val;
        }
    });
    
    const monthInput = document.getElementById('academy-salary-month');
    const monthStr = monthInput ? monthInput.value : '';
    if (monthStr) {
        let rec = (coachSalaries || []).find(cs => String(cs.coachId) === coachIdStr && cs.month === monthStr);
        if (rec) rec.baseSalary = val;
        
        // If already recorded in academyAccounts, update the amount & description automatically!
        const expectedAccId = `acc_csal_${coachIdStr}_${monthStr}`;
        const accEntry = (academyAccounts || []).find(a => a.id === expectedAccId);
        if (accEntry) {
            if (isAccountMonthClosed(monthStr) && (!currentUser || currentUser.type !== 'super')) {
                alert(`Notice: Accounts for ${monthStr} are closed. Coach base salary updated, but closed accounts statement cannot be modified by main users.`);
            } else {
                const coachObj = getAllCoaches().find(c => String(c.id) === coachIdStr);
                if (coachObj) {
                    const calc = calculateCoachSalaryDetails(coachObj, monthStr);
                    accEntry.amount = calc.netSalary;
                    accEntry.description = `Coach Salary: ${coachObj.name} (${monthStr}) [${calc.presentCount}/${calc.totalWorkingDays} days, ${calc.leaveDays} leave]`;
                }
            }
        }
    }
    
    saveData();
    renderAcademyCoachSalaries();
    if (document.getElementById('view-academy-accounts') && document.getElementById('view-academy-accounts').classList.contains('active')) {
        renderAcademyAccounts();
    }
}

function updateCoachLeaveDays(coachId, monthStr, value) {
    const val = parseInt(value);
    if (isNaN(val) || val < 0) return;
    const coachIdStr = String(coachId);
    
    let rec = (coachSalaries || []).find(cs => String(cs.coachId) === coachIdStr && cs.month === monthStr);
    if (!rec) {
        rec = { coachId: coachIdStr, month: monthStr };
        coachSalaries.push(rec);
    }
    rec.leaveDays = val;
    
    // Auto-sync account entry if recorded
    const expectedAccId = `acc_csal_${coachIdStr}_${monthStr}`;
    const accEntry = (academyAccounts || []).find(a => a.id === expectedAccId);
    if (accEntry) {
        if (isAccountMonthClosed(monthStr) && (!currentUser || currentUser.type !== 'super')) {
            alert(`Notice: Accounts for ${monthStr} are closed. Coach leave days updated, but closed accounts statement cannot be modified by main users.`);
        } else {
            const coachObj = getAllCoaches().find(c => String(c.id) === coachIdStr);
            if (coachObj) {
                const calc = calculateCoachSalaryDetails(coachObj, monthStr);
                accEntry.amount = calc.netSalary;
                accEntry.description = `Coach Salary: ${coachObj.name} (${monthStr}) [${calc.presentCount}/${calc.totalWorkingDays} days, ${calc.leaveDays} leave]`;
            }
        }
    }
    
    saveData();
    renderAcademyCoachSalaries();
    if (document.getElementById('view-academy-accounts') && document.getElementById('view-academy-accounts').classList.contains('active')) {
        renderAcademyAccounts();
    }
}

function postCoachSalaryToAccounts(coachId, monthStr) {
    if (isAccountMonthClosed(monthStr) && (!currentUser || currentUser.type !== 'super')) {
        return alert(`Accounts for ${monthStr} are closed. Only Super Admin can modify or post salaries to closed accounts.`);
    }

    const allCoaches = getAllCoaches();
    const coach = allCoaches.find(c => String(c.id) === String(coachId));
    if (!coach) return alert("Coach not found.");
    
    const calc = calculateCoachSalaryDetails(coach, monthStr);
    if (calc.baseSalary <= 0) {
        return alert(`Please set a monthly salary for ${coach.name} first.`);
    }
    
    const expectedAccId = `acc_csal_${coach.id}_${monthStr}`;
    
    // Remove any previous duplicate entry for this coach and month
    academyAccounts = (academyAccounts || []).filter(a => 
        a.id !== expectedAccId && 
        !(a.category === 'Coach Salary' && String(a.coachId) === String(coach.id) && a.month === monthStr)
    );
    
    const today = new Date().toISOString().split('T')[0];
    const dateStr = today.startsWith(monthStr) ? today : `${monthStr}-28`;
    
    academyAccounts.push({
        id: expectedAccId,
        date: dateStr,
        description: `Coach Salary: ${coach.name} (${monthStr}) [${calc.presentCount}/${calc.totalWorkingDays} days, ${calc.leaveDays} leave]`,
        amount: calc.netSalary,
        type: 'expense',
        category: 'Coach Salary',
        coachId: String(coach.id),
        month: monthStr
    });
    
    let rec = (coachSalaries || []).find(cs => String(cs.coachId) === String(coach.id) && cs.month === monthStr);
    if (!rec) {
        rec = { coachId: String(coach.id), month: monthStr };
        coachSalaries.push(rec);
    }
    rec.status = 'Paid';
    rec.netSalary = calc.netSalary;
    rec.baseSalary = calc.baseSalary;
    rec.leaveDays = calc.leaveDays;
    rec.paidDate = dateStr;
    
    saveData();
    renderAcademyCoachSalaries();
    if (document.getElementById('view-academy-accounts') && document.getElementById('view-academy-accounts').classList.contains('active')) {
        renderAcademyAccounts();
    }
    alert(`Salary for ${coach.name} (${calc.netSalary} SAR) has been recorded in the Accounts tab as an Expense.`);
}

function removeCoachSalaryFromAccounts(coachId, monthStr) {
    if (isAccountMonthClosed(monthStr) && (!currentUser || currentUser.type !== 'super')) {
        return alert(`Accounts for ${monthStr} are closed. Only Super Admin can remove salaries from closed accounts.`);
    }

    if (!confirm("Are you sure you want to remove this salary expense from Accounts?")) return;
    
    const expectedAccId = `acc_csal_${coachId}_${monthStr}`;
    academyAccounts = (academyAccounts || []).filter(a => 
        a.id !== expectedAccId && 
        !(a.category === 'Coach Salary' && String(a.coachId) === String(coachId) && a.month === monthStr)
    );
    
    const rec = (coachSalaries || []).find(cs => String(cs.coachId) === String(coachId) && cs.month === monthStr);
    if (rec) {
        rec.status = 'Pending';
    }
    
    saveData();
    renderAcademyCoachSalaries();
    if (document.getElementById('view-academy-accounts') && document.getElementById('view-academy-accounts').classList.contains('active')) {
        renderAcademyAccounts();
    }
}

function syncAllCoachSalariesToAccounts() {
    const monthInput = document.getElementById('academy-salary-month');
    const monthStr = monthInput ? monthInput.value : '';
    if (!monthStr) return alert("Please select a valid month.");

    if (isAccountMonthClosed(monthStr) && (!currentUser || currentUser.type !== 'super')) {
        return alert(`Accounts for ${monthStr} are closed. Only Super Admin can sync salaries to closed accounts.`);
    }
    
    const allCoaches = getAllCoaches();
    let count = 0;
    
    allCoaches.forEach(coach => {
        const calc = calculateCoachSalaryDetails(coach, monthStr);
        if (calc.baseSalary > 0) {
            const expectedAccId = `acc_csal_${coach.id}_${monthStr}`;
            academyAccounts = (academyAccounts || []).filter(a => 
                a.id !== expectedAccId && 
                !(a.category === 'Coach Salary' && String(a.coachId) === String(coach.id) && a.month === monthStr)
            );
            
            const today = new Date().toISOString().split('T')[0];
            const dateStr = today.startsWith(monthStr) ? today : `${monthStr}-28`;
            
            academyAccounts.push({
                id: expectedAccId,
                date: dateStr,
                description: `Coach Salary: ${coach.name} (${monthStr}) [${calc.presentCount}/${calc.totalWorkingDays} days, ${calc.leaveDays} leave]`,
                amount: calc.netSalary,
                type: 'expense',
                category: 'Coach Salary',
                coachId: String(coach.id),
                month: monthStr
            });
            
            let rec = (coachSalaries || []).find(cs => String(cs.coachId) === String(coach.id) && cs.month === monthStr);
            if (!rec) {
                rec = { coachId: String(coach.id), month: monthStr };
                coachSalaries.push(rec);
            }
            rec.status = 'Paid';
            rec.netSalary = calc.netSalary;
            rec.baseSalary = calc.baseSalary;
            rec.leaveDays = calc.leaveDays;
            rec.paidDate = dateStr;
            count++;
        }
    });
    
    saveData();
    renderAcademyCoachSalaries();
    if (document.getElementById('view-academy-accounts') && document.getElementById('view-academy-accounts').classList.contains('active')) {
        renderAcademyAccounts();
    }
    alert(`Successfully synced ${count} coach salaries to the Accounts tab as Expenses for ${monthStr}!`);
}

function openCoachAttendanceModal(coachId, monthStr) {
    const allCoaches = getAllCoaches();
    const coach = allCoaches.find(c => String(c.id) === String(coachId));
    if (!coach) return alert("Coach not found.");
    
    const calc = calculateCoachSalaryDetails(coach, monthStr);
    
    document.getElementById('cwd-modal-title').innerText = `${coach.name} - Attendance`;
    document.getElementById('cwd-modal-subtitle').innerText = `Working Days in ${monthStr} (${calc.totalWorkingDays} Fridays & Saturdays)`;
    
    const list = document.getElementById('cwd-modal-list');
    list.innerHTML = '';
    
    calc.workingDaysDetails.forEach(w => {
        const isPresent = w.status === 'Present';
        const isAbsent = w.status === 'Absent';
        
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';
        row.style.padding = '10px 16px';
        row.style.background = 'rgba(15, 23, 42, 0.7)';
        row.style.borderRadius = '10px';
        row.style.border = '1px solid #374151';
        
        row.innerHTML = `
            <div>
                <strong style="color: #fff; font-size: 0.95rem;">${escapeHtml(w.date)}</strong>
                <span style="font-size: 0.8rem; color: #38bdf8; margin-left: 8px; background: rgba(56,189,248,0.15); padding: 2px 8px; border-radius: 6px;">${escapeHtml(w.dayName)}</span>
            </div>
            <div style="display: flex; gap: 8px;">
                <button class="btn-primary" style="padding: 6px 12px; font-size: 0.82rem; border-radius: 6px; ${isPresent ? 'background: #10b981; border-color: #10b981;' : 'opacity: 0.5; background: #374151; border-color: #374151;'}" onclick="toggleModalCoachAttendance('${escapeHtml(coach.id)}', '${w.date}', 'Present', '${monthStr}')">
                    <i class="fa-solid fa-check"></i> Present
                </button>
                <button class="btn-secondary" style="padding: 6px 12px; font-size: 0.82rem; border-radius: 6px; ${isAbsent ? 'background: #ef4444; border-color: #ef4444; color: #fff;' : 'opacity: 0.5; background: #374151; border-color: #374151; color: #9ca3af;'}" onclick="toggleModalCoachAttendance('${escapeHtml(coach.id)}', '${w.date}', 'Absent', '${monthStr}')">
                    <i class="fa-solid fa-xmark"></i> Absent
                </button>
            </div>
        `;
        list.appendChild(row);
    });
    
    document.getElementById('cwd-modal-summary').innerHTML = `
        <strong>${calc.presentCount}</strong> Present | <strong style="color: #ef4444;">${calc.leaveDays}</strong> Leaves | Deduction: <strong style="color: #ef4444;">-${calc.deduction} SAR</strong>
    `;
    
    document.getElementById('coach-working-days-modal').classList.add('active');
}

function toggleModalCoachAttendance(coachId, dateStr, status, monthStr) {
    markAcademyCoachAttendance(coachId, dateStr, status);
    openCoachAttendanceModal(coachId, monthStr);
}

function exportCoachSalariesToExcel() {
    if (typeof XLSX === 'undefined') {
        alert("Excel export library is still loading or failed to load.");
        return;
    }
    
    const monthInput = document.getElementById('academy-salary-month');
    const monthStr = monthInput ? monthInput.value : '';
    const workingDays = getWorkingDaysForMonth(monthStr);
    const allCoaches = getAllCoaches();
    
    const data = [
        [`MUFC Academy - Coach Payroll (${monthStr})`],
        [`Working Days Policy: Fridays & Saturdays (${workingDays.length} working days)`],
        [`Daily Rate Formula: Monthly Salary ÷ Working Days (Leaves Deduction = Leaves × Daily Rate)`],
        [],
        ["Coach Name", "Mobile", "Base Salary (SAR)", "Working Days", "Present Days", "Leave Days", "1-Day Salary (SAR)", "Deduction (SAR)", "Net Payable (SAR)", "Accounts Status"]
    ];
    
    let totalBase = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    
    allCoaches.forEach(coach => {
        const calc = calculateCoachSalaryDetails(coach, monthStr);
        totalBase += calc.baseSalary;
        totalDeductions += calc.deduction;
        totalNet += calc.netSalary;
        
        data.push([
            coach.name,
            coach.mobile || coach.id,
            calc.baseSalary,
            calc.totalWorkingDays,
            calc.presentCount,
            calc.leaveDays,
            calc.dailyRate,
            calc.deduction,
            calc.netSalary,
            calc.isPaid ? "Reflected in Accounts" : "Pending"
        ]);
    });
    
    data.push([]);
    data.push(["TOTALS", "", totalBase, "", "", "", "", totalDeductions, totalNet, ""]);
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Coach Salaries");
    
    XLSX.writeFile(wb, `MUFC_Coach_Salaries_${monthStr}.xlsx`);
}

function markAcademyAttendance(studentId, dateStr, status) {
    let coachName = 'Admin';
    let coachId = 'admin';
    
    if (currentRole === 'coach' && currentUser) {
        coachName = currentUser.name || currentUser.mobile || 'Coach';
        coachId = currentUser.id || currentUser.mobile || 'coach';
    } else if (currentUser && (currentUser.type === 'attendance' || currentUser.type === 'coach')) {
        coachName = currentUser.id || currentUser.username || 'Coach';
        coachId = currentUser.id || currentUser.username || 'coach';
    } else if (currentUser && currentUser.id) {
        coachName = currentUser.id;
        coachId = currentUser.id;
    }

    let record = academyAttendance.find(a => a.date === dateStr && a.studentId === studentId);
    if(record) {
        record.status = status;
        record.markedBy = coachName;
        record.coachId = coachId;
        record.markedAt = new Date().toISOString();
    } else {
        academyAttendance.push({ 
            date: dateStr, 
            studentId: studentId, 
            status: status,
            markedBy: coachName,
            coachId: coachId,
            markedAt: new Date().toISOString()
        });
    }
    
    // Also record practicing coach on the student object
    const student = (academyStudents || []).find(s => s.id === studentId);
    if (student) {
        student.assignedCoach = coachName;
    }

    saveData();
    renderAcademyAttendance();
    
    const catView = document.getElementById('view-academy-categorise-list');
    if (catView && catView.classList.contains('active')) {
        renderAcademyCategoriseList();
    }
}

// ================= ACADEMY CATEGORISE LIST LOGIC =================

function getAllAcademyCoachProfiles() {
    const list = [];
    const seen = new Set();
    
    // 1. Coaches from academyAdmins (type === 'attendance' or type === 'coach')
    (academyAdmins || []).forEach(a => {
        if (a && (a.type === 'attendance' || a.type === 'coach')) {
            const key = a.username.trim().toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                list.push({
                    id: a.username,
                    name: a.username,
                    mobile: a.username,
                    type: 'attendance_user'
                });
            }
        }
    });

    // 2. Coaches from coaches array and academyStudents (role === 'coach')
    if (typeof getAllCoaches === 'function') {
        getAllCoaches().forEach(c => {
            const key = String(c.name || c.id || c.mobile).trim().toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                list.push(c);
            }
        });
    }

    // 3. Any coach names found in student.assignedCoach or academyAttendance.markedBy
    (academyStudents || []).forEach(s => {
        if (s && s.assignedCoach && s.assignedCoach !== 'Admin' && s.assignedCoach !== 'Unassigned') {
            const key = s.assignedCoach.trim().toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                list.push({
                    id: s.assignedCoach,
                    name: s.assignedCoach,
                    mobile: '',
                    type: 'assigned'
                });
            }
        }
    });

    (academyAttendance || []).forEach(a => {
        if (a && a.markedBy && a.markedBy !== 'Admin' && a.markedBy !== 'Unassigned') {
            const key = a.markedBy.trim().toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                list.push({
                    id: a.markedBy,
                    name: a.markedBy,
                    mobile: '',
                    type: 'marked_by'
                });
            }
        }
    });

    return list;
}

function renderAcademyCategoriseList() {
    const container = document.getElementById('academy-categorise-container');
    if (!container) return;

    let dateInput = document.getElementById('categorise-list-date');
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    const selectedDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
    
    const modeSelect = document.getElementById('categorise-mode-select');
    const mode = modeSelect ? modeSelect.value : 'daily'; // 'daily' or 'all'

    const searchInput = document.getElementById('categorise-list-search');
    const searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';

    const genuineStudents = (academyStudents || []).filter(s => s.role !== 'coach');

    // Get all known coach profiles
    const coachProfiles = getAllAcademyCoachProfiles();

    // Map: coachName -> Array of student entries
    const coachMap = new Map();

    // Initialize all known coaches in map
    coachProfiles.forEach(c => {
        coachMap.set(c.name, {
            profile: c,
            students: []
        });
    });

    // Special category for unassigned / marked by admin / other
    const unassignedGroup = [];
    const adminGroup = [];

    let totalPracticingCount = 0;
    let presentCountTotal = 0;

    genuineStudents.forEach(student => {
        // Search filter
        if (searchQuery) {
            const matchName = (student.name || '').toLowerCase().includes(searchQuery);
            const matchParent = (student.fatherName || '').toLowerCase().includes(searchQuery);
            const matchId = String(student.id || '').toLowerCase().includes(searchQuery);
            const matchCoach = (student.assignedCoach || '').toLowerCase().includes(searchQuery);
            if (!matchName && !matchParent && !matchId && !matchCoach) {
                return;
            }
        }

        const attRecord = getAcademyAttendanceForDate(selectedDate, student.id);
        const isPresent = attRecord && attRecord.status === 'Present';
        const isAbsent = attRecord && attRecord.status === 'Absent';
        
        let targetCoachName = null;

        if (mode === 'daily') {
            // In daily mode: group strictly by who marked attendance on that date
            if (attRecord && attRecord.markedBy && attRecord.markedBy !== 'Admin') {
                targetCoachName = attRecord.markedBy;
            } else if (attRecord && attRecord.markedBy === 'Admin') {
                targetCoachName = 'Admin';
            } else if (attRecord && attRecord.status) {
                targetCoachName = student.assignedCoach || 'Marked (Coach not specified)';
            } else {
                targetCoachName = 'Unassigned'; // Not marked on this date
            }
        } else {
            // In all mode: group by assigned coach
            targetCoachName = student.assignedCoach || 'Unassigned';
        }

        const studentEntry = {
            student: student,
            attRecord: attRecord,
            status: isPresent ? 'Present' : (isAbsent ? 'Absent' : 'Not Marked')
        };

        if (isPresent) presentCountTotal++;

        if (targetCoachName === 'Admin') {
            adminGroup.push(studentEntry);
            totalPracticingCount++;
        } else if (targetCoachName && targetCoachName !== 'Unassigned') {
            let existingKey = null;
            for (let k of coachMap.keys()) {
                if (k.toLowerCase() === targetCoachName.toLowerCase()) {
                    existingKey = k;
                    break;
                }
            }

            if (!existingKey) {
                coachMap.set(targetCoachName, {
                    profile: { name: targetCoachName, mobile: '' },
                    students: []
                });
                existingKey = targetCoachName;
            }

            coachMap.get(existingKey).students.push(studentEntry);
            totalPracticingCount++;
        } else {
            unassignedGroup.push(studentEntry);
        }
    });

    // Update KPI stats cards
    let activeCoachesCount = 0;
    coachMap.forEach(grp => {
        if (grp.students.length > 0) activeCoachesCount++;
    });

    const totalStudentsCount = mode === 'daily' ? totalPracticingCount : genuineStudents.length;
    const avgPerCoach = activeCoachesCount > 0 ? (totalStudentsCount / activeCoachesCount).toFixed(1) : 0;

    const totalCoachesEl = document.getElementById('cat-stat-total-coaches');
    const totalStudentsEl = document.getElementById('cat-stat-total-students');
    const presentEl = document.getElementById('cat-stat-present');
    const avgEl = document.getElementById('cat-stat-avg');

    if (totalCoachesEl) totalCoachesEl.innerText = activeCoachesCount;
    if (totalStudentsEl) totalStudentsEl.innerText = totalStudentsCount;
    if (presentEl) presentEl.innerText = presentCountTotal;
    if (avgEl) avgEl.innerText = avgPerCoach;

    // Render HTML
    let html = '';
    const isAdminUser = currentUser && (currentUser.type === 'super' || currentUser.type === 'main' || currentUser.type === 'normal');

    // Sort coaches with most students first
    const sortedCoachKeys = Array.from(coachMap.keys()).sort((a, b) => {
        const countA = coachMap.get(a).students.length;
        const countB = coachMap.get(b).students.length;
        return countB - countA;
    });

    sortedCoachKeys.forEach(coachName => {
        const group = coachMap.get(coachName);
        const studentsList = group.students;
        
        // Hide empty coaches in daily mode or search
        if (studentsList.length === 0 && (mode === 'daily' || searchQuery)) {
            return;
        }

        html += renderCoachBlock(coachName, studentsList, coachName, isAdminUser, coachProfiles, group.profile ? group.profile.mobile : '', mode, selectedDate);
    });

    // Admin Group (if any marked by admin)
    if (adminGroup.length > 0) {
        html += renderCoachBlock('Marked by Admin / Management', adminGroup, 'Admin', isAdminUser, coachProfiles, '', mode, selectedDate);
    }

    // Unassigned Group (students not marked on this date or not assigned to a coach)
    if (unassignedGroup.length > 0) {
        const unassignedTitle = mode === 'daily' ? `Not Marked on ${selectedDate}` : 'Unassigned / Not Marked Under Coach';
        html += renderCoachBlock(unassignedTitle, unassignedGroup, 'Unassigned', isAdminUser, coachProfiles, '', mode, selectedDate);
    }

    if (totalStudentsCount === 0 && unassignedGroup.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 40px; font-size: 1.1rem;">No students found for the selected date or search filter.</p>';
        return;
    }

    container.innerHTML = html;
}

function renderCoachBlock(coachTitle, studentEntries, coachKey, isAdminUser, allCoachProfiles, coachContact, mode, selectedDate) {
    if (!studentEntries || studentEntries.length === 0) return '';
    
    const presentCount = studentEntries.filter(s => s.status === 'Present').length;
    const absentCount = studentEntries.filter(s => s.status === 'Absent').length;
    const notMarkedCount = studentEntries.filter(s => s.status === 'Not Marked').length;
    const isUnassigned = coachKey === 'Unassigned';
    const isAdmin = coachKey === 'Admin';

    const headerColor = isUnassigned ? '#94a3b8' : (isAdmin ? '#eab308' : '#38bdf8');
    const badgeColor = isUnassigned ? 'rgba(148, 163, 184, 0.15)' : (isAdmin ? 'rgba(234, 179, 8, 0.15)' : 'rgba(56, 189, 248, 0.15)');

    let subtitleText = '';
    if (isUnassigned) {
        subtitleText = (mode === 'daily') ? `Students with no attendance marked for ${selectedDate}` : 'Students not yet assigned to an individual coach';
    } else if (isAdmin) {
        subtitleText = (mode === 'daily') ? `Marked directly by Management / Admin on ${selectedDate}` : 'Marked by Management / Super Admin';
    } else {
        subtitleText = (mode === 'daily') ? `Date: <strong style="color: #38bdf8;">${selectedDate}</strong> • Marked by Coach: <strong style="color: #fff;">${escapeHtml(coachTitle)}</strong>` : (coachContact ? `<i class="fa-solid fa-phone" style="font-size: 0.75rem;"></i> ${escapeHtml(coachContact)}` : 'Assigned Students Roster');
    }

    let rowsHtml = '';
    studentEntries.forEach((item, sIdx) => {
        const s = item.student;
        const statusBadge = item.status === 'Present'
            ? '<span style="font-size: 0.8rem; background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); padding: 4px 10px; border-radius: 6px; font-weight: 600;"><i class="fa-solid fa-check"></i> Present</span>'
            : (item.status === 'Absent'
                ? '<span style="font-size: 0.8rem; background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 4px 10px; border-radius: 6px; font-weight: 600;"><i class="fa-solid fa-xmark"></i> Absent</span>'
                : '<span style="font-size: 0.8rem; background: rgba(148, 163, 184, 0.15); color: #94a3b8; padding: 4px 10px; border-radius: 6px; font-weight: 600;">Not Marked</span>');

        // Detailed marked by & time
        let markedByDetail = '';
        if (item.attRecord && item.attRecord.markedBy && !isUnassigned) {
            markedByDetail += `<div style="font-size: 0.73rem; color: #38bdf8; margin-top: 3px;"><i class="fa-solid fa-user-check" style="font-size: 0.68rem;"></i> By: ${escapeHtml(item.attRecord.markedBy)}</div>`;
        }
        if (item.attRecord && item.attRecord.markedAt) {
            try {
                const timeStr = new Date(item.attRecord.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                markedByDetail += `<div style="font-size: 0.70rem; color: #94a3b8;"><i class="fa-regular fa-clock" style="font-size: 0.65rem;"></i> ${timeStr}</div>`;
            } catch(e) {}
        }

        const initial = s.name ? s.name.trim().charAt(0).toUpperCase() : 'S';
        const avatarStyle = s.pic ? `background-image: url('${s.pic}');` : `background: linear-gradient(135deg, #1e3a8a, #2563eb);`;

        let assignDropdown = '';
        if (isAdminUser) {
            let coachOptions = `<option value="">Select Coach</option>`;
            allCoachProfiles.forEach(cp => {
                const isSel = (s.assignedCoach === cp.name || coachKey === cp.name) ? 'selected' : '';
                coachOptions += `<option value="${escapeHtml(cp.name)}" ${isSel}>${escapeHtml(cp.name)}</option>`;
            });
            assignDropdown = `
                <td style="padding: 10px 16px; text-align: center;">
                    <select class="form-select" style="padding: 5px 8px; font-size: 0.82rem; background: rgba(15, 23, 42, 0.8); color: white; border: 1px solid #374151; border-radius: 6px;" onchange="assignStudentToCoach('${s.id}', this.value)">
                        ${coachOptions}
                    </select>
                </td>
            `;
        }

        rowsHtml += `
            <tr style="border-bottom: 1px solid #374151; transition: background 0.2s;">
                <td style="padding: 12px 16px; text-align: center; color: var(--text-muted); font-weight: 600;">${sIdx + 1}</td>
                <td style="padding: 12px 16px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="profile-pic" style="width: 32px; height: 32px; min-width: 32px; border-radius: 50%; font-size: 0.8rem; ${avatarStyle}">
                            ${s.pic ? '' : initial}
                        </div>
                        <span style="font-weight: 600; color: #fff;">${escapeHtml(s.name)}</span>
                    </div>
                </td>
                <td style="padding: 12px 16px; text-align: center; color: var(--text-muted);">${s.age ? `${s.age} Yrs` : '-'}</td>
                <td style="padding: 12px 16px; font-family: monospace; color: #cbd5e1;">${escapeHtml(s.id)}</td>
                <td style="padding: 12px 16px; color: var(--text-muted);">${escapeHtml(s.fatherName || '-')}</td>
                <td style="padding: 12px 16px; color: var(--text-muted);">${escapeHtml(s.contact || s.whatsapp || '-')}</td>
                <td style="padding: 12px 16px; text-align: center;">${statusBadge}${markedByDetail}</td>
                <td style="padding: 12px 16px; color: var(--text-muted); font-size: 0.88rem;">${escapeHtml(s.remarks || '-')}</td>
                ${assignDropdown}
            </tr>
        `;
    });

    return `
        <div class="coach-category-block" style="background: var(--bg-card); border-radius: 16px; border: 1px solid #374151; margin-bottom: 24px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.25);">
            <div style="padding: 16px 22px; background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95)); border-bottom: 1px solid #374151; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                <div style="display: flex; align-items: center; gap: 14px;">
                    <div class="profile-pic" style="width: 44px; height: 44px; border-radius: 50%; background: ${isUnassigned ? '#475569' : (isAdmin ? '#854d0e' : '#1d4ed8')}; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.15rem; color: #fff;">
                        ${isUnassigned ? '<i class="fa-solid fa-question"></i>' : (isAdmin ? '<i class="fa-solid fa-shield-halved"></i>' : coachTitle.trim().charAt(0).toUpperCase())}
                    </div>
                    <div>
                        <h3 style="font-size: 1.25rem; font-weight: 700; color: ${headerColor}; margin: 0; display: flex; align-items: center; gap: 8px;">
                            <span>${escapeHtml(coachTitle)}</span>
                            <span style="font-size: 0.75rem; background: ${badgeColor}; color: ${headerColor}; padding: 2px 8px; border-radius: 6px; font-weight: 600;">${isUnassigned ? 'General' : (isAdmin ? 'Admin' : 'Coach')}</span>
                        </h3>
                        <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 3px;">
                            ${subtitleText}
                        </p>
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                    <span style="font-size: 0.95rem; font-weight: 700; background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); padding: 6px 14px; border-radius: 8px;">
                        <i class="fa-solid fa-users"></i> ${studentEntries.length} Students
                    </span>
                    <span style="font-size: 0.85rem; font-weight: 600; background: rgba(56, 189, 248, 0.15); color: #38bdf8; padding: 6px 12px; border-radius: 8px;">
                        <i class="fa-solid fa-check"></i> ${presentCount} Present
                    </span>
                    ${absentCount > 0 ? `
                    <span style="font-size: 0.85rem; font-weight: 600; background: rgba(239, 68, 68, 0.15); color: #ef4444; padding: 6px 12px; border-radius: 8px;">
                        <i class="fa-solid fa-xmark"></i> ${absentCount} Absent
                    </span>
                    ` : ''}
                    ${notMarkedCount > 0 ? `
                    <span style="font-size: 0.85rem; font-weight: 600; background: rgba(148, 163, 184, 0.15); color: #94a3b8; padding: 6px 12px; border-radius: 8px;">
                        ${notMarkedCount} Not Marked
                    </span>
                    ` : ''}
                </div>
            </div>

            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.92rem; color: #fff;">
                    <thead>
                        <tr style="background: rgba(15, 23, 42, 0.6); border-bottom: 1px solid #374151; color: var(--text-muted); font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.5px;">
                            <th style="padding: 12px 16px; width: 50px; text-align: center;">#</th>
                            <th style="padding: 12px 16px;">Student Name</th>
                            <th style="padding: 12px 16px; width: 80px; text-align: center;">Age</th>
                            <th style="padding: 12px 16px; width: 140px;">Student ID</th>
                            <th style="padding: 12px 16px;">Parent Name</th>
                            <th style="padding: 12px 16px;">Mobile</th>
                            <th style="padding: 12px 16px; text-align: center; width: 140px;">Today Status</th>
                            <th style="padding: 12px 16px;">Remarks</th>
                            ${isAdminUser ? '<th style="padding: 12px 16px; text-align: center; width: 140px;">Assign Coach</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function assignStudentToCoach(studentId, coachName) {
    const student = (academyStudents || []).find(s => s.id === studentId);
    if (!student) return;
    student.assignedCoach = coachName || '';
    saveData();
    renderAcademyCategoriseList();
}

async function exportCategoriseListToExcel() {
    try {
        let dateInput = document.getElementById('categorise-list-date');
        const selectedDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
        const modeSelect = document.getElementById('categorise-mode-select');
        const mode = modeSelect ? modeSelect.value : 'daily';

        const genuineStudents = (academyStudents || []).filter(s => s.role !== 'coach');
        const coachProfiles = getAllAcademyCoachProfiles();

        // Build groups
        const coachMap = new Map();
        coachProfiles.forEach(c => coachMap.set(c.name, []));
        const adminGroup = [];
        const unassignedGroup = [];

        genuineStudents.forEach(student => {
            const attRecord = getAcademyAttendanceForDate(selectedDate, student.id);
            const isPresent = attRecord && attRecord.status === 'Present';
            const isAbsent = attRecord && attRecord.status === 'Absent';
            const status = isPresent ? 'Present' : (isAbsent ? 'Absent' : 'Not Marked');
            
            let targetCoach = null;
            if (mode === 'daily') {
                if (attRecord && attRecord.markedBy && attRecord.markedBy !== 'Admin') targetCoach = attRecord.markedBy;
                else if (attRecord && attRecord.markedBy === 'Admin') targetCoach = 'Admin';
                else if (attRecord && attRecord.status) targetCoach = student.assignedCoach || 'Marked (Coach not specified)';
                else targetCoach = 'Unassigned';
            } else {
                targetCoach = student.assignedCoach || 'Unassigned';
            }

            const item = { student, status, attRecord };
            if (targetCoach === 'Admin') adminGroup.push(item);
            else if (targetCoach && targetCoach !== 'Unassigned') {
                if (!coachMap.has(targetCoach)) coachMap.set(targetCoach, []);
                coachMap.get(targetCoach).push(item);
            } else {
                unassignedGroup.push(item);
            }
        });

        const filename = `MUFC_Categorised_Students_${selectedDate}.xlsx`;

        if (typeof ExcelJS !== 'undefined') {
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'MUFC Academy';
            const worksheet = workbook.addWorksheet('Categorised List', {
                views: [{ showGridLines: true }]
            });

            worksheet.columns = [
                { key: 'coach', width: 22 },
                { key: 'srNo', width: 8 },
                { key: 'id', width: 17 },
                { key: 'name', width: 26 },
                { key: 'age', width: 10 },
                { key: 'parent', width: 24 },
                { key: 'mobile', width: 20 },
                { key: 'status', width: 15 },
                { key: 'remarks', width: 22 }
            ];

            // Title
            const titleRow = worksheet.addRow(['MUFC ACADEMY - CATEGORISED STUDENTS BY COACH']);
            worksheet.mergeCells('A1:I1');
            titleRow.height = 34;
            titleRow.getCell(1).font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
            titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
            titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

            // Subtitle
            const subRow = worksheet.addRow([`Report Date: ${selectedDate}   |   Mode: ${mode === 'daily' ? 'Daily Practice by Coach' : 'All Students by Coach'}`]);
            worksheet.mergeCells('A2:I2');
            subRow.height = 20;
            subRow.getCell(1).font = { name: 'Calibri', size: 9.5, italic: true, color: { argb: 'FFCBD5E1' } };
            subRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
            subRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

            worksheet.addRow([]).height = 6;

            const headerRow = worksheet.addRow(['Coach Name', 'Sr.', 'Student ID', 'Student Name', 'Age', 'Parent Name', 'Mobile Number', 'Status', 'Remarks']);
            headerRow.height = 26;
            headerRow.eachCell((c) => {
                c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF991B1B' } };
                c.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
                c.alignment = { horizontal: 'center', vertical: 'middle' };
                c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
            });

            const renderSectionToSheet = (title, items) => {
                if (!items || items.length === 0) return;
                
                // Coach subheader
                const subHead = worksheet.addRow([`COACH: ${title.toUpperCase()} (${items.length} Students)`, '', '', '', '', '', '', '', '']);
                const rowNum = subHead.number;
                worksheet.mergeCells(`A${rowNum}:I${rowNum}`);
                subHead.height = 24;
                subHead.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
                subHead.getCell(1).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF38BDF8' } };
                subHead.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };

                items.forEach((item, idx) => {
                    const s = item.student;
                    const r = worksheet.addRow([
                        title,
                        idx + 1,
                        String(s.id || ''),
                        s.name || '-',
                        s.age ? `${s.age} Yrs` : '-',
                        s.fatherName || '-',
                        String(s.contact || s.whatsapp || '-'),
                        item.status,
                        s.remarks || '-'
                    ]);
                    r.height = 21;
                    r.eachCell((cell, colNum) => {
                        cell.border = { top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }, left: { style: 'thin', color: { argb: 'FFCBD5E1' } }, right: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
                        cell.font = { name: 'Calibri', size: 10 };
                        cell.alignment = { horizontal: (colNum === 4 || colNum === 6) ? 'left' : 'center', vertical: 'middle' };
                        if (colNum === 3 || colNum === 7) cell.numFmt = '@';
                    });
                });
            };

            coachMap.forEach((items, cName) => {
                if (items.length > 0) renderSectionToSheet(cName, items);
            });
            if (adminGroup.length > 0) renderSectionToSheet('Marked by Admin', adminGroup);
            if (unassignedGroup.length > 0) renderSectionToSheet(mode === 'daily' ? `Not Marked on ${selectedDate}` : 'Unassigned Students', unassignedGroup);

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

        } else if (typeof XLSX !== 'undefined') {
            const aoa = [
                ['MUFC ACADEMY - CATEGORISED STUDENTS BY COACH'],
                [`Date: ${selectedDate} | Mode: ${mode}`],
                [],
                ['Coach Name', 'Sr.', 'Student ID', 'Student Name', 'Age', 'Parent Name', 'Mobile Number', 'Status', 'Remarks']
            ];

            const appendItems = (title, items) => {
                if (!items || items.length === 0) return;
                aoa.push([`--- COACH: ${title} (${items.length} Students) ---`]);
                items.forEach((item, idx) => {
                    const s = item.student;
                    aoa.push([
                        title,
                        idx + 1,
                        String(s.id || ''),
                        s.name || '-',
                        s.age ? `${s.age} Yrs` : '-',
                        s.fatherName || '-',
                        String(s.contact || s.whatsapp || '-'),
                        item.status,
                        s.remarks || '-'
                    ]);
                });
            };

            coachMap.forEach((items, cName) => appendItems(cName, items));
            if (adminGroup.length > 0) appendItems('Marked by Admin', adminGroup);
            if (unassignedGroup.length > 0) appendItems(mode === 'daily' ? `Not Marked on ${selectedDate}` : 'Unassigned', unassignedGroup);

            const ws = XLSX.utils.aoa_to_sheet(aoa);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Categorised List');
            XLSX.writeFile(wb, filename);
        }
    } catch (e) {
        console.error('Categorise export error:', e);
        alert('Error exporting categorised list: ' + e.message);
    }
}

// ================= ACADEMY PAYMENTS LOGIC =================

function getAcademyPaymentForMonth(monthStr, studentId) {
    return academyPayments.find(p => p.month === monthStr && p.studentId === studentId);
}

function getPaymentReceivedDate(payment, studentId, monthStr) {
    if (!payment || (payment.status !== 'Paid' && payment.status !== 'paid')) return null;
    if (payment.date) return payment.date;
    if (payment.paidDate) return payment.paidDate;
    if (payment.history && payment.history.length > 0) {
        const lastEntry = payment.history[payment.history.length - 1];
        if (lastEntry && lastEntry.date) return lastEntry.date;
    }
    // Fallback: Check attendance records for that student in that month
    const attRecord = academyAttendance.find(a => a.studentId === studentId && a.date && a.date.startsWith(monthStr) && a.status === 'Present');
    if (attRecord && attRecord.date) return attRecord.date;
    return null;
}

function formatPaymentDate(dateStr) {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        const dObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        if (!isNaN(dObj.getTime())) {
            const day = parts[2];
            const mon = dObj.toLocaleDateString('en-US', { month: 'short' });
            const yr = parts[0];
            return `${day} ${mon} ${yr}`;
        }
    }
    return dateStr;
}

function isMobileOrTabletDevice() {
    // 1. Any device that supports touch input is a phone or tablet!
    if ('ontouchstart' in window) return true;
    if (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) return true;
    if (navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 0) return true;

    // 2. Mobile or tablet user agents (iPhone, iPad, Android, etc.)
    const ua = (navigator.userAgent || navigator.vendor || window.opera || '').toLowerCase();
    if (/android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet|silk|kindle/i.test(ua)) return true;
    
    // 3. iPadOS 13+ (Safari reports as MacIntel, but has multi-touch points)
    if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true;

    // 4. Viewport size indicating mobile/tablet
    if (window.innerWidth <= 1024) return true;

    return false;
}

function getWhatsAppUrl(phone, encodedMessage) {
    const cleanPhone = (phone || '').replace(/\D/g, '');
    if (isMobileOrTabletDevice()) {
        // Deep link scheme directly invokes the installed WhatsApp app on mobile and tablet
        return `whatsapp://send?phone=${cleanPhone}&text=${encodedMessage}`;
    } else {
        // Direct WhatsApp Web for desktop/laptop browsers
        return `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;
    }
}

function openWhatsAppMessage(event, studentId, monthStr, phone, encodedMessage, btnElement) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    markWhatsappSent(studentId, monthStr, btnElement);

    const cleanPhone = (phone || '').replace(/\D/g, '');
    const isMobile = isMobileOrTabletDevice();

    if (isMobile) {
        // Direct deep link: opens installed WhatsApp app on phone/tablet
        window.location.href = `whatsapp://send?phone=${cleanPhone}&text=${encodedMessage}`;
    } else {
        // Desktop PC (mouse only): opens WhatsApp Web in new tab
        window.open(`https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`, '_blank');
    }
}

function markWhatsappSent(studentId, monthStr, btnElement) {
    if (btnElement) {
        btnElement.style.background = '#eab308';
        btnElement.style.borderColor = '#ca8a04';
        btnElement.style.color = '#0f172a';
        btnElement.title = 'WhatsApp message already sent. Click to open again.';
        btnElement.innerHTML = `<i class="fa-brands fa-whatsapp" style="font-size: 1.15rem; color: #0f172a;"></i> Sent`;
    }

    let payment = getAcademyPaymentForMonth(monthStr, studentId);
    if (!payment) {
        payment = {
            month: monthStr,
            studentId: studentId,
            amount: 0,
            paid: 0,
            status: 'Unpaid',
            whatsappSent: true,
            whatsappSentDate: new Date().toISOString()
        };
        academyPayments.push(payment);
    } else {
        payment.whatsappSent = true;
        payment.whatsappSentDate = new Date().toISOString();
    }
    
    try {
        localStorage.setItem(`wa_sent_${monthStr}_${studentId}`, 'true');
    } catch(e) {}
    
    saveData();
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
        const paymentA = getAcademyPaymentForMonth(monthStr, a.id);
        const isPaidA = paymentA && paymentA.status === 'Paid';
        const paymentB = getAcademyPaymentForMonth(monthStr, b.id);
        const isPaidB = paymentB && paymentB.status === 'Paid';

        // 1. Paid students on top
        if (isPaidA && !isPaidB) return -1;
        if (!isPaidA && isPaidB) return 1;

        // 2. Both are Paid: Order by most recent payment date first (newest to oldest)
        if (isPaidA && isPaidB) {
            const dateA = getPaymentReceivedDate(paymentA, a.id, monthStr) || '';
            const dateB = getPaymentReceivedDate(paymentB, b.id, monthStr) || '';
            if (dateA && dateB && dateA !== dateB) {
                return dateB.localeCompare(dateA);
            }
            if (dateA && !dateB) return -1;
            if (!dateA && dateB) return 1;
        }

        // 3. Secondary order: by age ascending, then alphabetically by name
        let ageA = parseInt(a.age);
        if (isNaN(ageA)) ageA = 999;
        let ageB = parseInt(b.age);
        if (isNaN(ageB)) ageB = 999;
        if (ageA !== ageB) return ageA - ageB;
        return (a.name || '').localeCompare(b.name || '');
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
        const isWaSent = (payment && (payment.whatsappSent || payment.whatsappSentDate)) || (localStorage.getItem(`wa_sent_${monthStr}_${student.id}`) === 'true');
        const hasAttended = academyAttendance.some(a => a.studentId === student.id && a.date.startsWith(monthStr) && a.status === 'Present');
        
        if (isPaid) {
            totalAmount += parseFloat(amount) || 0;
        }

        // Format month nicely (e.g. "September 2026")
        const dateObj = new Date(monthStr + '-01');
        const readableMonth = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });

        let messageText = '';
        const addressee = student.fatherName || 'Parent';
        const amountPaid = payment ? (parseFloat(payment.amount) || parseFloat(payment.paid) || 0) : 0;

        if (!hasAttended) {
            messageText = `Your child, ${student.name}, was absent for the month of ${readableMonth}. We hope he is doing well.\n\nIf there is anything you'd like to discuss or share with us, please feel free to reach out to us.\n\nSincere regards,\nMUFC Soccer Academy`;
        } else if (isPaid && amountPaid > 0 && amountPaid < 150) {
            const remaining = 150 - amountPaid;
            messageText = `Dear ${addressee},\n\nThis is a reminder that we have received a partial payment of ${amountPaid} SAR for the academy fee of ${readableMonth} for your child, ${student.name}.\n\nThe remaining balance is ${remaining} SAR. Please arrange to complete the payment at your earliest convenience. Thank you!\n\nBest regards,\nMUFC Academy`;
        } else if (isPaid) {
            messageText = `Dear ${addressee},\n\nWe have successfully received the academy fee payment of ${amountPaid} SAR for ${readableMonth} for your child, ${student.name}.\n\nThank you for your prompt payment!\n\nBest regards,\nMUFC Academy`;
        } else {
            messageText = `Dear ${addressee},\n\nThis is a gentle reminder that the academy fee payment of 150 SAR for ${readableMonth} for your child, ${student.name}, is currently pending.\n\nPlease arrange to complete the payment at your earliest convenience. Thank you!\n\nBest regards,\nMUFC Academy`;
        }
        const encodedMessage = encodeURIComponent(messageText);

        const div = document.createElement('div');
        div.className = 'player-card payment-player-card';
        
        const outstanding = hasAttended ? Math.max(0, 150 - amountPaid) : 0;
        
        let outstandingHtml = '';
        if (outstanding > 0) {
            outstandingHtml = `
                <div style="display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
                    <span style="color: #ef4444; font-weight: bold; font-size: 1rem;">${outstanding} SAR</span>
                    <button class="btn-primary" style="padding: 5px 12px; font-size: 0.85rem; border-radius: 8px;" onclick="payOutstanding('${student.id}', '${monthStr}', ${outstanding})" title="Pay Outstanding">Pay</button>
                </div>
            `;
        } else {
            outstandingHtml = `
                <span style="color: #10b981; font-weight: bold; font-size: 1rem;">0 SAR</span>
            `;
        }

        const initial = student.name ? student.name.trim().charAt(0).toUpperCase() : 'S';
        const avatarStyle = student.pic 
            ? `background-image: url('${student.pic}');` 
            : `background: linear-gradient(135deg, #1e3a8a, #2563eb);`;

        const rcvdDate = getPaymentReceivedDate(payment, student.id, monthStr);
        let rcvdDateHtml = '';
        if (isPaid && rcvdDate) {
            rcvdDateHtml = `
                <span class="payment-date-badge" title="Received on ${rcvdDate}" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 8px; font-size: 0.9rem; font-weight: 600; background: rgba(16, 185, 129, 0.12); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.25);">
                    <i class="fa-regular fa-calendar-check" style="font-size: 0.85rem; color: #10b981;"></i> ${formatPaymentDate(rcvdDate)}
                </span>
            `;
        } else if (isPaid) {
            rcvdDateHtml = `
                <span class="payment-date-badge" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 8px; font-size: 0.9rem; font-weight: 500; background: rgba(148, 163, 184, 0.1); color: #cbd5e1; border: 1px solid rgba(148, 163, 184, 0.2);">
                    <i class="fa-solid fa-check" style="font-size: 0.85rem; color: #10b981;"></i> Paid
                </span>
            `;
        } else {
            rcvdDateHtml = `
                <span style="color: var(--text-muted); font-size: 0.95rem; font-weight: 500;">-</span>
            `;
        }

        div.innerHTML = `
            <!-- Col 1: Student Name -->
            <div class="player-info" style="display: flex; align-items: center; gap: 14px; min-width: 0; overflow: hidden;">
                <div class="profile-pic" style="min-width: 50px; width: 50px; height: 50px; border-radius: 50%; ${avatarStyle}">
                    ${student.pic ? '' : initial}
                </div>
                <div style="min-width: 0; overflow: hidden;">
                    <h3 style="font-size: 1.18rem; font-weight: 600; color: ${hasAttended ? (isPaid ? '#10b981' : '#ef4444') : (student.gender === 'Female' ? '#ec4899' : '#fff')}; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; margin: 0;">${escapeHtml(student.name)} ${student.age ? `<span class="player-age-badge" style="margin-left: 6px;">${student.age} Yrs</span>` : ''}</h3>
                    <p style="font-size: 0.92rem; color: var(--text-muted); margin: 3px 0 0 0; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">ID: <strong style="color: #f1f5f9;">${escapeHtml(student.id)}</strong> | Parent: <strong style="color: #f1f5f9;">${escapeHtml(student.fatherName || 'N/A')}</strong></p>
                </div>
            </div>
            
            <!-- Col 2: Payment Rcvd Date -->
            <div style="text-align: center; display: flex; align-items: center; justify-content: center;">
                ${rcvdDateHtml}
            </div>
            
            <!-- Col 3: Outstanding -->
            <div style="text-align: center; display: flex; align-items: center; justify-content: center;">
                ${outstandingHtml}
            </div>
            
            <!-- Col 4: Amount -->
            <div style="text-align: center; display: flex; align-items: center; justify-content: center;">
                <div style="color: #fff; font-size: 1.15rem; font-weight: bold; background: rgba(255,255,255,0.06); padding: 6px 14px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; width: 85px; gap: 4px;">
                    ${amount ? amount : '0'} <span style="font-size: 0.78rem; color: var(--text-muted);">SAR</span>
                </div>
            </div>
            
            <!-- Col 5: Status -->
            <div style="text-align: center; display: flex; align-items: center; justify-content: center;">
                <div style="padding: 8px 12px; font-size: 0.92rem; border-radius: 10px; font-weight: 600; width: 95px; text-align: center; display: inline-flex; align-items: center; justify-content: center; gap: 6px; ${isPaid ? 'background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3);' : 'background: rgba(148, 163, 184, 0.1); color: #94a3b8; border: 1px solid rgba(148,163,184,0.2);'}">
                    <i class="fa-solid ${isPaid ? 'fa-check-circle' : 'fa-minus-circle'}"></i> ${isPaid ? 'Paid' : 'Unpaid'}
                </div>
            </div>
            
            <!-- Col 6: Action -->
            <div style="text-align: center; display: flex; align-items: center; justify-content: center;">
                ${student.whatsapp ? `<a href="${getWhatsAppUrl(student.whatsapp, encodedMessage)}" ${isMobileOrTabletDevice() ? '' : 'target="_blank"'} onclick="openWhatsAppMessage(event, '${student.id}', '${monthStr}', '${student.whatsapp.replace(/\D/g, '')}', '${encodedMessage}', this)" class="btn-primary" title="${isWaSent ? 'WhatsApp message already sent. Click to open again.' : 'Send WhatsApp Message'}" style="display: inline-flex; align-items: center; justify-content: center; width: 110px; ${isWaSent ? 'background: #eab308; border-color: #ca8a04; color: #0f172a;' : 'background: #25D366; border-color: #25D366; color: white;'} text-decoration: none; padding: 9px 12px; border-radius: 10px; font-size: 0.92rem; font-weight: 600; gap: 6px; transition: 0.2s;"><i class="fa-brands fa-whatsapp" style="font-size: 1.1rem; ${isWaSent ? 'color: #0f172a;' : ''}"></i> ${isWaSent ? 'Sent' : 'Message'}</a>` : ''}
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
    const exactDate = new Date().toISOString().split('T')[0];
    
    if(payment) {
        payment.status = payment.status === 'Paid' ? 'Unpaid' : 'Paid';
        if (payment.status === 'Paid') {
            payment.date = exactDate;
        } else {
            payment.date = null;
        }
    } else {
        academyPayments.push({
            month: monthStr,
            studentId: studentId,
            amount: 0,
            paid: 0,
            status: 'Paid',
            date: exactDate
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
    
    const datePicker = document.getElementById('academy-attendance-date');
    const exactDate = datePicker && datePicker.value ? datePicker.value : new Date().toISOString().split('T')[0];
    
    if (isPaid && amount <= 0) {
        payment.status = 'Unpaid';
        payment.amount = 0;
        payment.paid = 0;
        payment.history = [];
        isPaid = false;
        saveData();
        if(document.getElementById('view-academy-accounts').classList.contains('active')) renderAcademyAccounts();
    } else if (isPaid && amount > 0) {
        payment.amount = amount;
        payment.paid = amount;
        payment.history = [{ date: payment.date || exactDate, amount: amount }];
        saveData();
        if(document.getElementById('view-academy-accounts').classList.contains('active')) renderAcademyAccounts();
    }
    
    updateTodayCollectedBadge();
    
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
    
    const datePicker = document.getElementById('academy-attendance-date');
    const exactDate = datePicker && datePicker.value ? datePicker.value : new Date().toISOString().split('T')[0];
    
    let payment = getAcademyPaymentForMonth(monthStr, studentId);
    if(payment) {
        payment.status = 'Paid';
        payment.amount = amount;
        payment.paid = amount;
        payment.date = exactDate;
        payment.history = [{ date: exactDate, amount: amount }];
    } else {
        academyPayments.push({
            month: monthStr,
            studentId: studentId,
            amount: amount,
            paid: amount,
            status: 'Paid',
            date: exactDate,
            history: [{ date: exactDate, amount: amount }]
        });
    }
    saveData();
    renderAcademyAttendance();
    if(document.getElementById('view-academy-accounts').classList.contains('active')) renderAcademyAccounts();
    if(document.getElementById('view-academy-payments').classList.contains('active')) renderAcademyPayments();
}

function payOutstanding(studentId, monthStr, outstandingAmount) {
    if (!confirm(`Confirm paying outstanding balance of ${outstandingAmount} SAR?`)) return;
    
    const exactDate = new Date().toISOString().split('T')[0];
    
    let payment = getAcademyPaymentForMonth(monthStr, studentId);
    if (!payment) {
        academyPayments.push({
            month: monthStr,
            studentId: studentId,
            amount: outstandingAmount,
            paid: outstandingAmount,
            status: 'Paid',
            date: exactDate,
            history: [{ date: exactDate, amount: outstandingAmount }]
        });
    } else {
        const currentAmount = parseFloat(payment.amount) || parseFloat(payment.paid) || 0;
        const newTotal = currentAmount + outstandingAmount;
        payment.amount = newTotal;
        payment.paid = newTotal;
        payment.status = 'Paid';
        payment.date = exactDate;
        if (!payment.history) payment.history = [];
        payment.history.push({ date: exactDate, amount: outstandingAmount });
    }
    
    saveData();
    renderAcademyPayments();
    
    if(document.getElementById('view-academy-attendance').classList.contains('active')) renderAcademyAttendance();
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
            <tr style="border-bottom: 2px solid #374151; background: rgba(15, 23, 42, 0.7);">
                <th style="padding: 14px 16px; font-weight: 600; font-size: 0.95rem;">Student Name</th>
                <th style="padding: 14px 16px; font-weight: 600; font-size: 0.95rem; text-align: center;">Total Present</th>
                <th style="padding: 14px 16px; font-weight: 600; font-size: 0.95rem; text-align: center;">Total Absent</th>
                <th style="padding: 14px 16px; font-weight: 600; font-size: 0.95rem; text-align: center;">Payment</th>
    `;
    activeDays.forEach(d => {
        const fullDate = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        thead += `<th style="padding: 14px 16px; font-weight: 600; font-size: 0.95rem; text-align: center; white-space: nowrap;">${fullDate}</th>`;
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
        tbody += `<tr><td colspan="${5 + activeDays.length}" style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 1rem;">No students registered.</td></tr>`;
    } else {
        studentsToRender.forEach(student => {
            const payment = getAcademyPaymentForMonth(monthStr, student.id);
            const isPaid = payment && payment.status === 'Paid';
            const payText = student.role === 'coach' ? `<span style="color: #9ca3af;">N/A</span>` : (isPaid ? `<span style="color: #10b981; font-weight: 600;">Paid (${payment.amount || 0})</span>` : `<span style="color: #ef4444; font-weight: 600;">Unpaid</span>`);
            
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
                daysHtml += `<td style="padding: 14px 16px; font-size: 0.95rem; text-align: center; color: ${color}; font-weight: bold;">${dayStatus}</td>`;
            });
            
            tbody += `
                <tr style="border-bottom: 1px solid #374151;">
                    <td style="padding: 14px 16px; font-size: 0.95rem; color: ${student.role === 'coach' ? '#3b82f6' : 'inherit'}; font-weight: ${student.role === 'coach' ? 'bold' : 'normal'};">
                        <a href="#" onclick="viewStudentReportHistory('${student.id}'); return false;" style="color: inherit; text-decoration: underline; font-size: 1.02rem; font-weight: 600;">
                            ${escapeHtml(student.name)}
                        </a>
                        ${student.role === 'coach' ? '<span style="font-size: 0.8rem; background: rgba(59,130,246,0.2); color: #3b82f6; padding: 2px 6px; border-radius: 4px; margin-left: 4px; vertical-align: middle;">Coach</span>' : `<br><span style="font-size: 0.85rem; color: #94a3b8;">Parent: ${escapeHtml(student.fatherName || 'N/A')}</span>`}
                    </td>
                    <td style="padding: 14px 16px; font-size: 0.95rem; text-align: center; color: #10b981; font-weight: 600;">${totalPresent}</td>
                    <td style="padding: 14px 16px; font-size: 0.95rem; text-align: center; color: #ef4444; font-weight: 600;">${totalAbsent}</td>
                    <td style="padding: 14px 16px; font-size: 0.95rem; text-align: center;">${payText}</td>
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

function viewStudentReportHistory(studentId) {
    const student = academyStudents.find(s => s.id === studentId);
    if (!student) return;

    // Collect all unique months from attendance and payments
    const uniqueMonths = new Set();
    
    academyPayments.filter(p => p.studentId === studentId).forEach(p => uniqueMonths.add(p.month));
    
    academyAttendance.filter(a => a.studentId === studentId).forEach(a => {
        const dateParts = a.date.split('-');
        if (dateParts.length >= 2) {
            uniqueMonths.add(`${dateParts[0]}-${dateParts[1]}`);
        }
    });

    const sortedMonths = Array.from(uniqueMonths).sort();
    
    let html = '';
    let whatsappText = `*Complete History for ${student.name}*\n\n`;

    if (sortedMonths.length === 0) {
        html = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">No history found for this student.</p>';
        whatsappText += 'No history found.';
    } else {
        sortedMonths.forEach(month => {
            // Get Payment
            const payment = academyPayments.find(p => p.studentId === studentId && p.month === month);
            const isPaid = payment && payment.status === 'Paid';
            const paymentStatusText = student.role === 'coach' ? 'N/A' : (isPaid ? `Paid (${payment.amount})` : 'Unpaid');
            
            // Get Attendance
            let totalPresent = 0;
            let totalAbsent = 0;
            academyAttendance.filter(a => a.studentId === studentId && a.date.startsWith(month)).forEach(a => {
                if (a.status === 'Present') totalPresent++;
                if (a.status === 'Absent') totalAbsent++;
            });

            html += `
                <div style="background: rgba(15, 23, 42, 0.4); border: 1px solid #374151; border-radius: 8px; padding: 15px; margin-bottom: 10px;">
                    <h4 style="margin-top: 0; margin-bottom: 10px; color: var(--primary); font-size: 1.1rem;">${month}</h4>
                    <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                        <div style="flex: 1; min-width: 150px;">
                            <p style="margin: 0; font-size: 0.9rem; color: #9ca3af;">Payment Status</p>
                            <p style="margin: 5px 0 0 0; font-weight: bold; color: ${student.role === 'coach' ? '#9ca3af' : (isPaid ? '#10b981' : '#ef4444')};">${paymentStatusText}</p>
                        </div>
                        <div style="flex: 1; min-width: 150px;">
                            <p style="margin: 0; font-size: 0.9rem; color: #9ca3af;">Attendance</p>
                            <p style="margin: 5px 0 0 0; font-weight: bold;">
                                <span style="color: #10b981;">${totalPresent} Present</span> / 
                                <span style="color: #ef4444;">${totalAbsent} Absent</span>
                            </p>
                        </div>
                    </div>
                </div>
            `;
            
            whatsappText += `*Month:* ${month}\n`;
            whatsappText += `*Payment:* ${paymentStatusText}\n`;
            whatsappText += `*Attendance:* ${totalPresent} Present / ${totalAbsent} Absent\n\n`;
        });
    }

    document.getElementById('student-report-history-title').textContent = `Complete History - ${student.name}`;
    document.getElementById('student-report-history-content').innerHTML = html;
    
    const whatsappContainer = document.getElementById('student-report-history-whatsapp-container');
    whatsappContainer.innerHTML = '';
    
    // Screenshot Button
    const screenshotBtn = document.createElement('button');
    screenshotBtn.className = 'btn-secondary';
    screenshotBtn.style.cssText = 'display: inline-flex; align-items: center; gap: 6px; margin-right: 10px;';
    screenshotBtn.innerHTML = '<i class="fa-solid fa-camera"></i> Save Screenshot';
    screenshotBtn.onclick = () => {
        const content = document.getElementById('student-report-history-content');
        html2canvas(content, { backgroundColor: '#0f172a' }).then(canvas => {
            const link = document.createElement('a');
            link.download = `MUFC_Report_${student.name.replace(/\s+/g, '_')}.png`;
            link.href = canvas.toDataURL();
            link.click();
        });
    };
    whatsappContainer.appendChild(screenshotBtn);

    if (student.whatsapp) {
        const phone = student.whatsapp.replace(/\D/g, '');
        const encodedText = encodeURIComponent(whatsappText.trim());
        const waLink = document.createElement('a');
        waLink.href = getWhatsAppUrl(phone, encodedText);
        if (!isMobileOrTabletDevice()) {
            waLink.target = '_blank';
        }
        waLink.className = 'btn-primary';
        waLink.style.cssText = 'display: inline-flex; align-items: center; background: #25D366; border-color: #25D366; color: white; text-decoration: none; padding: 8px 15px; border-radius: 8px; font-size: 0.85rem; font-weight: bold; gap: 6px; transition: 0.2s;';
        waLink.innerHTML = '<i class="fa-brands fa-whatsapp" style="font-size: 1.1rem;"></i> Share via WhatsApp';
        whatsappContainer.appendChild(waLink);
    }

    document.getElementById('student-report-history-modal').classList.add('active');
}

// ================= ACADEMY ACCOUNTS LOGIC =================

function isAccountMonthClosed(monthOrDate) {
    if (!monthOrDate || !Array.isArray(closedAccountMonths)) return false;
    const targetMonth = monthOrDate.length >= 7 ? monthOrDate.substring(0, 7) : monthOrDate;
    return closedAccountMonths.some(m => {
        const mStr = typeof m === 'string' ? m : (m && m.month ? m.month : '');
        return mStr === targetMonth;
    });
}

function closeAccountMonth() {
    let monthStr = document.getElementById('academy-account-month').value;
    if (!monthStr) {
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        monthStr = `${y}-${m}`;
    }

    if (isAccountMonthClosed(monthStr)) {
        return alert(`Account for ${monthStr} is already closed.`);
    }

    const d = new Date(monthStr + '-01');
    const monthName = !isNaN(d) ? d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : monthStr;

    const confirmMsg = `Are you sure you want to CLOSE the accounts for ${monthName}?\n\nOnce closed:\n• Main users will NOT be able to add, edit, or delete transactions for this month.\n• Only Super Admin will have access to make changes.\n\nDo you want to proceed?`;
    if (!confirm(confirmMsg)) return;

    if (!Array.isArray(closedAccountMonths)) closedAccountMonths = [];
    closedAccountMonths.push({
        month: monthStr,
        closedAt: new Date().toISOString(),
        closedBy: currentUser ? (currentUser.id || currentUser.name || 'User') : 'Admin'
    });

    saveData();
    renderAcademyAccounts();
    alert(`Accounts for ${monthName} are now CLOSED.\nOnly Super Admin has access to modify transactions.`);
}

function reopenAccountMonth() {
    if (!currentUser || currentUser.type !== 'super') {
        return alert("Access denied. Only Super Admin can reopen closed accounts.");
    }

    let monthStr = document.getElementById('academy-account-month').value;
    if (!monthStr) return;

    if (!isAccountMonthClosed(monthStr)) {
        return alert(`Account for ${monthStr} is not closed.`);
    }

    const d = new Date(monthStr + '-01');
    const monthName = !isNaN(d) ? d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : monthStr;

    const confirmMsg = `Are you sure you want to REOPEN the accounts for ${monthName}?\n\nMain users will regain permission to add, edit, and delete transactions for this month.`;
    if (!confirm(confirmMsg)) return;

    closedAccountMonths = (closedAccountMonths || []).filter(m => {
        const mStr = typeof m === 'string' ? m : (m && m.month ? m.month : '');
        return mStr !== monthStr;
    });

    saveData();
    renderAcademyAccounts();
    alert(`Accounts for ${monthName} have been successfully REOPENED.`);
}

function openEditAccountModal(id) {
    const entry = (academyAccounts || []).find(a => a.id === id);
    if (!entry) return alert("Transaction not found.");

    const entryMonth = entry.month || (entry.date ? entry.date.substring(0, 7) : '');
    if (isAccountMonthClosed(entryMonth) && (!currentUser || currentUser.type !== 'super')) {
        return alert(`Accounts for ${entryMonth} are closed. Only Super Admin can edit transactions.`);
    }

    document.getElementById('edit-acc-id').value = entry.id;
    document.getElementById('edit-acc-date').value = entry.date || '';
    document.getElementById('edit-acc-desc').value = entry.description || '';
    document.getElementById('edit-acc-amount').value = entry.amount || '';
    document.getElementById('edit-acc-type').value = entry.type || 'expense';

    document.getElementById('edit-account-modal').classList.add('active');
}

function saveEditedAccountEntry() {
    const id = document.getElementById('edit-acc-id').value;
    const date = document.getElementById('edit-acc-date').value;
    const desc = document.getElementById('edit-acc-desc').value.trim();
    const amountVal = document.getElementById('edit-acc-amount').value;
    const type = document.getElementById('edit-acc-type').value;

    if (!id || !date || !desc || !amountVal) {
        return alert("Please fill all fields with valid data.");
    }
    const amount = parseFloat(amountVal);
    if (isNaN(amount) || amount < 0) {
        return alert("Please enter a valid amount.");
    }

    const entry = (academyAccounts || []).find(a => a.id === id);
    if (!entry) return alert("Transaction not found.");

    const originalMonth = entry.month || (entry.date ? entry.date.substring(0, 7) : '');
    const newMonth = date.substring(0, 7);

    if ((isAccountMonthClosed(originalMonth) || isAccountMonthClosed(newMonth)) && (!currentUser || currentUser.type !== 'super')) {
        return alert("Accounts for this month are closed. Only Super Admin can edit transactions.");
    }

    entry.date = date;
    entry.description = desc;
    entry.amount = amount;
    entry.type = type;

    saveData();
    closeModal();
    renderAcademyAccounts();
}

function handleAccountMonthChange() {
    const monthInput = document.getElementById('academy-account-month');
    const monthStr = monthInput ? monthInput.value : '';
    const dateInput = document.getElementById('acc-input-date');
    if (dateInput && monthStr) {
        const todayStr = new Date().toISOString().split('T')[0];
        dateInput.value = todayStr.startsWith(monthStr) ? todayStr : `${monthStr}-01`;
    }
    renderAcademyAccounts();
}

function handleAccountDateInputChange() {
    const dateInput = document.getElementById('acc-input-date');
    if (!dateInput || !dateInput.value) return;
    const entryMonth = dateInput.value.substring(0, 7);
    const monthPicker = document.getElementById('academy-account-month');
    if (monthPicker && monthPicker.value !== entryMonth) {
        monthPicker.value = entryMonth;
        renderAcademyAccounts();
    }
}

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

    // Only default the date input in Add form if it is currently empty
    const dateInput = document.getElementById('acc-input-date');
    if (dateInput && !dateInput.value) {
        const todayStr = new Date().toISOString().split('T')[0];
        dateInput.value = todayStr.startsWith(monthStr) ? todayStr : `${monthStr}-01`;
    }

    const isClosed = isAccountMonthClosed(monthStr);
    const isSuperAdmin = currentUser && currentUser.type === 'super';
    const canModify = !isClosed || isSuperAdmin;

    const d = new Date(monthStr + '-01');
    const formattedMonth = !isNaN(d) ? d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : monthStr;

    // 1. Update Status Container in Header
    const statusContainer = document.getElementById('academy-account-status-container');
    if (statusContainer) {
        if (!isClosed) {
            statusContainer.innerHTML = `
                <button class="btn-warning" id="btn-close-account" onclick="closeAccountMonth()" style="padding: 8px 14px; border-radius: 8px; font-weight: 600; font-size: 0.88rem; cursor: pointer; display: flex; align-items: center; gap: 7px; background: rgba(245, 158, 11, 0.18); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.4); transition: all 0.2s;" title="Close accounts for ${formattedMonth}">
                    <i class="fa-solid fa-lock"></i> Account Close
                </button>
            `;
        } else {
            let statusHtml = `
                <span style="background: rgba(239, 68, 68, 0.18); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.4); padding: 7px 12px; border-radius: 8px; font-size: 0.85rem; font-weight: 700; display: inline-flex; align-items: center; gap: 6px;">
                    <i class="fa-solid fa-lock"></i> Closed
                </span>
            `;
            if (isSuperAdmin) {
                statusHtml += `
                    <button class="btn-secondary" id="btn-reopen-account" onclick="reopenAccountMonth()" style="padding: 7px 12px; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; gap: 6px; border-color: #10b981; color: #10b981; background: rgba(16, 185, 129, 0.1);" title="Reopen accounts for ${formattedMonth}">
                        <i class="fa-solid fa-lock-open"></i> Reopen
                    </button>
                `;
            }
            statusContainer.innerHTML = statusHtml;
        }
    }

    // 2. Update Add Form Container & Month Closed Banner
    const bannerEl = document.getElementById('account-month-closed-banner');
    const formCard = document.getElementById('account-add-form-card');
    const adminTag = document.getElementById('account-form-admin-tag');

    if (bannerEl && formCard) {
        if (!isClosed) {
            bannerEl.style.display = 'none';
            formCard.style.display = 'block';
            if (adminTag) adminTag.style.display = 'none';
            document.querySelectorAll('#account-add-form-inputs input, #account-add-form-inputs select, #acc-btn-add').forEach(el => el.disabled = false);
        } else if (isClosed && !isSuperAdmin) {
            // Main user: locked out of adding/editing
            bannerEl.style.display = 'flex';
            bannerEl.innerHTML = `
                <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 16px; width: 100%;">
                    <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(239, 68, 68, 0.2); display: flex; align-items: center; justify-content: center; color: #ef4444; font-size: 1.3rem; flex-shrink: 0;">
                        <i class="fa-solid fa-lock"></i>
                    </div>
                    <div style="flex: 1;">
                        <div style="font-size: 1.05rem; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 8px;">
                            Account Closed for ${formattedMonth}
                            <span style="font-size: 0.75rem; background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 2px 8px; border-radius: 6px; font-weight: 600;">Locked</span>
                        </div>
                        <p style="margin: 4px 0 0 0; color: var(--text-muted); font-size: 0.88rem;">
                            Accounts for this month have been finalized and closed. Main users cannot add, edit, or delete transactions. If modifications are required, please contact Super Admin.
                        </p>
                    </div>
                </div>
            `;
            formCard.style.display = 'none';
        } else if (isClosed && isSuperAdmin) {
            // Super Admin: elevated access to add/edit
            bannerEl.style.display = 'none';
            formCard.style.display = 'block';
            if (adminTag) {
                adminTag.style.display = 'block';
                adminTag.innerHTML = `
                    <span style="background: rgba(139, 92, 246, 0.2); color: #c4b5fd; border: 1px solid rgba(139, 92, 246, 0.4); padding: 4px 10px; border-radius: 6px; font-size: 0.78rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="fa-solid fa-shield-halved"></i> Super Admin Override (Month Closed)
                    </span>
                `;
            }
            document.querySelectorAll('#account-add-form-inputs input, #account-add-form-inputs select, #acc-btn-add').forEach(el => el.disabled = false);
        }
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
            <div class="player-card" style="display: flex; align-items: center; padding: 15px 22px; border-radius: 12px; margin-bottom: 10px; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25);">
                <div style="width: 140px; color: var(--text-muted); font-size: 0.95rem; font-weight: 500;">${monthStr}-Auto</div>
                <div style="flex: 1; min-width: 200px; color: #fff; font-weight: 600; font-size: 1.05rem;">
                    <i class="fa-solid fa-graduation-cap" style="color: #10b981; margin-right: 10px;"></i>Student Fee Collections
                </div>
                <div style="width: 130px; text-align: right; color: #10b981; font-weight: 700; font-size: 1.05rem;">${totalFees} SAR</div>
                <div style="width: 130px; text-align: right; color: #ef4444; font-size: 1.05rem;">-</div>
                <div style="width: 90px; text-align: center;"><i class="fa-solid fa-lock" style="color: var(--text-muted); font-size: 1rem;" title="Auto-calculated from payments"></i></div>
            </div>
        `;
    }

    const monthEntries = academyAccounts.filter(acc => acc.date.startsWith(monthStr)).sort((a,b) => new Date(a.date) - new Date(b.date));
    
    if (monthEntries.length === 0 && totalFees === 0) {
        list.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 25px; font-size: 1rem;">No transactions found for this month.</p>';
    }

    monthEntries.forEach(entry => {
        const amount = parseFloat(entry.amount) || 0;
        if (entry.type === 'income') {
            totalIncome += amount;
        } else {
            totalExpense += amount;
        }

        const isInc = entry.type === 'income';
        const isCoachSalary = entry.category === 'Coach Salary' || (entry.description && entry.description.startsWith('Coach Salary'));
        const coachIcon = isCoachSalary ? '<i class="fa-solid fa-user-tie" style="color: #ef4444; margin-right: 8px;"></i>' : '';
        
        let actionButtonsHtml = '';
        if (canModify) {
            actionButtonsHtml = `
                <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
                    ${!isCoachSalary ? `
                    <button class="btn-secondary" style="padding: 6px 9px; font-size: 0.85rem; border-color: #38bdf8; color: #38bdf8;" onclick="openEditAccountModal('${entry.id}')" title="Edit Transaction">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>` : ''}
                    <button class="btn-secondary" style="padding: 6px 9px; font-size: 0.85rem; border-color: #ef4444; color: #ef4444;" onclick="deleteAccountEntry('${entry.id}')" title="Delete Transaction">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
        } else {
            actionButtonsHtml = `
                <i class="fa-solid fa-lock" style="color: #64748b; font-size: 1rem;" title="Account closed - Modifications restricted to Super Admin"></i>
            `;
        }

        list.innerHTML += `
            <div class="player-card" style="display: flex; align-items: center; padding: 15px 22px; border-radius: 12px; margin-bottom: 10px; background: rgba(15, 23, 42, 0.8); border: 1px solid ${isCoachSalary ? 'rgba(239, 68, 68, 0.35)' : '#374151'};">
                <div style="width: 140px; color: var(--text-muted); font-size: 0.95rem; font-weight: 500;">${escapeHtml(entry.date)}</div>
                <div style="flex: 1; min-width: 200px; color: #fff; font-size: 1.02rem;">
                    ${coachIcon}${escapeHtml(entry.description)}
                    ${isCoachSalary ? '<span style="font-size: 0.75rem; background: rgba(239, 68, 68, 0.15); color: #ef4444; padding: 2px 8px; border-radius: 6px; margin-left: 8px; font-weight: 600;">Coach Salary</span>' : ''}
                </div>
                <div style="width: 130px; text-align: right; color: #10b981; font-weight: 700; font-size: 1.05rem;">${isInc ? amount + ' SAR' : '-'}</div>
                <div style="width: 130px; text-align: right; color: #ef4444; font-weight: 700; font-size: 1.05rem;">${!isInc ? amount + ' SAR' : '-'}</div>
                <div style="width: 90px; text-align: center;">
                    ${actionButtonsHtml}
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

    const entryMonth = date.substring(0, 7);
    if (isAccountMonthClosed(entryMonth) && (!currentUser || currentUser.type !== 'super')) {
        return alert(`Accounts for ${entryMonth} are closed. Only Super Admin can add transactions for this month.`);
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
    const deletedEntry = (academyAccounts || []).find(a => a.id === id);
    if (!deletedEntry) return;

    const entryMonth = deletedEntry.month || (deletedEntry.date ? deletedEntry.date.substring(0, 7) : '');
    if (entryMonth && isAccountMonthClosed(entryMonth) && (!currentUser || currentUser.type !== 'super')) {
        return alert(`Accounts for ${entryMonth} are closed. Only Super Admin can delete transactions.`);
    }

    if(!confirm("Are you sure you want to delete this transaction?")) return;

    if (deletedEntry.category === 'Coach Salary' || (deletedEntry.description && deletedEntry.description.startsWith('Coach Salary'))) {
        const coachIdStr = String(deletedEntry.coachId || '');
        const monthStr = deletedEntry.month || (deletedEntry.date ? deletedEntry.date.substring(0, 7) : '');
        if (coachIdStr && monthStr) {
            let rec = (coachSalaries || []).find(cs => String(cs.coachId) === coachIdStr && cs.month === monthStr);
            if (rec) rec.status = 'Pending';
        }
    }
    academyAccounts = academyAccounts.filter(a => a.id !== id);
    saveData();
    renderAcademyAccounts();
    const salView = document.getElementById('view-academy-coach-salaries');
    if (salView && salView.classList.contains('active')) {
        renderAcademyCoachSalaries();
    }
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

    const isClosed = isAccountMonthClosed(monthStr);

    const data = [
        ["MUFC Academy - Account Statement", "", "", ""],
        ["Period", monthStr, "Status", isClosed ? "CLOSED" : "OPEN"],
        [],
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
    if (!currentUser || currentUser.type !== 'super') return;
    const list = document.getElementById('academy-users-list');
    if (!list) return;

    list.innerHTML = '';
    
    // Check if current user is super admin
    const canManageUsers = currentUser && currentUser.type === 'super';
    const formContainer = document.getElementById('academy-add-user-container');
    if (formContainer) {
        formContainer.style.display = canManageUsers ? 'block' : 'none';
    }
    
    academyAdmins.forEach(admin => {
        const isSuper = admin.type === 'super';
        const isAttendanceOnly = (admin.type === 'attendance' || admin.type === 'coach');
        const typeLabel = isSuper ? 'Super Admin' : (admin.type === 'main' ? 'Main User' : (isAttendanceOnly ? 'Coach (Attendance Only)' : 'Normal User'));
        const color = isSuper ? '#8b5cf6' : (admin.type === 'main' ? '#10b981' : (isAttendanceOnly ? '#f59e0b' : '#38bdf8'));
        const icon = isSuper ? 'fa-crown' : (isAttendanceOnly ? 'fa-clipboard-user' : 'fa-user');
        
        let actionHtml = '-';
        if (currentUser && currentUser.type === 'super' && !isSuper) {
            actionHtml = `
                <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.75rem; border-color: #ef4444; color: #ef4444;" onclick="deleteAcademyUser('${admin.username}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            `;
        } else if (isSuper) {
            actionHtml = `<i class="fa-solid fa-lock" style="color: var(--text-muted);" title="Protected Super Admin"></i>`;
        }

        list.innerHTML += `
            <div class="player-card" style="display: flex; align-items: center; padding: 12px 20px; border-radius: 8px; margin-bottom: 8px; background: rgba(15, 23, 42, 0.8); border: 1px solid #374151;">
                <div style="flex: 2; min-width: 200px; color: #fff; font-weight: bold;">
                    <i class="fa-solid ${icon}" style="color: ${color}; margin-right: 8px;"></i>${escapeHtml(admin.username)}
                </div>
                <div style="flex: 2; min-width: 200px; color: var(--text-muted); font-family: monospace;">
                    ${isSuper ? '••••••••' : escapeHtml(admin.password)}
                </div>
                <div style="width: 190px; font-weight: bold; color: ${color};">
                    ${typeLabel}
                </div>
                <div style="width: 80px; text-align: center;">
                    ${actionHtml}
                </div>
            </div>
        `;
    });

    // Populate Registered Coaches list
    const coachListEl = document.getElementById('academy-coaches-users-list');
    if (coachListEl) {
        coachListEl.innerHTML = '';
        const allCoaches = getAllCoaches();
        if (allCoaches.length === 0) {
            coachListEl.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No registered coaches found.</p>';
        } else {
            allCoaches.forEach(c => {
                const initial = c.name ? c.name.trim().charAt(0).toUpperCase() : 'C';
                const avatarStyle = c.pic ? `background-image: url('${c.pic}'); background-size: cover;` : `background: linear-gradient(135deg, #1e3a8a, #2563eb);`;
                const cleanPhone = (c.whatsapp || c.mobile || '').replace(/\D/g, '');
                const waLink = cleanPhone ? `<a href="https://wa.me/${cleanPhone}" target="_blank" style="color: #22c55e; font-weight: 600; text-decoration: none;"><i class="fa-brands fa-whatsapp"></i> Chat</a>` : '-';
                
                coachListEl.innerHTML += `
                    <div class="player-card" style="display: flex; align-items: center; padding: 12px 20px; border-radius: 8px; margin-bottom: 8px; background: rgba(15, 23, 42, 0.8); border: 1px solid #374151;">
                        <div style="flex: 2; min-width: 200px; display: flex; align-items: center; gap: 10px; color: #fff; font-weight: bold;">
                            <div class="profile-pic" style="min-width: 34px; width: 34px; height: 34px; font-size: 0.85rem; border-radius: 50%; ${avatarStyle}">
                                ${c.pic ? '' : initial}
                            </div>
                            <span>${escapeHtml(c.name)}</span>
                        </div>
                        <div style="flex: 2; min-width: 200px; color: #38bdf8; font-family: monospace; font-size: 0.95rem;">
                            ${escapeHtml(c.mobile || c.id)}
                        </div>
                        <div style="width: 150px; font-weight: bold; color: #3b82f6;">
                            <span style="font-size: 0.8rem; background: rgba(59,130,246,0.15); color: #3b82f6; padding: 2px 8px; border-radius: 6px;">Coach</span>
                            <span style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-top: 2px;">${c.source === 'online' ? 'Online Reg' : 'Academy'}</span>
                        </div>
                        <div style="width: 140px; text-align: center;">
                            ${waLink}
                        </div>
                    </div>
                `;
            });
        }
    }
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


// ================= ACADEMY PROFIT & LOSS LOGIC =================
function updatePnlSelectors() {
    const type = document.getElementById('pnl-type').value;
    document.getElementById('pnl-month-container').style.display = type === 'monthly' ? 'flex' : 'none';
    document.getElementById('pnl-quarter-container').style.display = type === 'quarterly' ? 'flex' : 'none';
    document.getElementById('pnl-year-container').style.display = type === 'yearly' ? 'flex' : 'none';
}

function getMonthsForPnlPeriod() {
    const type = document.getElementById('pnl-type').value;
    let months = [];
    if (type === 'monthly') {
        const val = document.getElementById('pnl-month').value;
        if (val) months.push(val); // format YYYY-MM
    } else if (type === 'quarterly') {
        const q = parseInt(document.getElementById('pnl-quarter-q').value);
        const y = document.getElementById('pnl-quarter-year').value;
        if (y) {
            const startMonth = (q - 1) * 3 + 1;
            for (let i = 0; i < 3; i++) {
                months.push(`${y}-${String(startMonth + i).padStart(2, '0')}`);
            }
        }
    } else if (type === 'yearly') {
        const y = document.getElementById('pnl-year').value;
        if (y) {
            for (let i = 1; i <= 12; i++) {
                months.push(`${y}-${String(i).padStart(2, '0')}`);
            }
        }
    }
    return months;
}

let lastPnlData = [];

function renderPnL() {
    const months = getMonthsForPnlPeriod();
    if (months.length === 0) return alert("Please select a valid period.");
    
    let totalIncome = 0;
    let totalExpense = 0;
    let totalReceivable = 0;
    
    let breakdownHTML = '';
    lastPnlData = [];
    
    months.forEach(monthStr => {
        // 1. Fee Income & Receivables
        let feeIncomeForMonth = 0;
        let receivableForMonth = 0;
        
        // Find students who attended this month
        let attendedStudents = new Set();
        academyAttendance.forEach(a => {
            if (a.date.startsWith(monthStr) && a.status === 'Present') {
                attendedStudents.add(a.studentId);
            }
        });
        
        // Calculate expected 150 vs paid
        attendedStudents.forEach(studentId => {
            const payment = getAcademyPaymentForMonth(monthStr, studentId);
            const amountPaid = payment ? (parseFloat(payment.amount) || parseFloat(payment.paid) || 0) : 0;
            const remaining = 150 - amountPaid;
            if (remaining > 0) {
                receivableForMonth += remaining;
            }
        });
        
        // For actual income, we sum all payments made for this month
        academyPayments.forEach(p => {
            if (p.month === monthStr) {
                const amt = parseFloat(p.amount) || parseFloat(p.paid) || 0;
                feeIncomeForMonth += amt;
            }
        });
        
        // 2. Additional Income & Expenses from Accounts Tab
        let otherIncomeForMonth = 0;
        let expensesForMonth = 0;
        
        academyAccounts.forEach(acc => {
            if (acc.date && acc.date.startsWith(monthStr)) {
                const amt = parseFloat(acc.amount) || 0;
                const type = (acc.type || '').toLowerCase();
                if (type === 'income') otherIncomeForMonth += amt;
                else if (type === 'expense') expensesForMonth += amt;
            }
        });
        
        const monthIncome = feeIncomeForMonth + otherIncomeForMonth;
        const monthProfit = monthIncome - expensesForMonth;
        
        totalIncome += monthIncome;
        totalExpense += expensesForMonth;
        totalReceivable += receivableForMonth;
        
        if (monthIncome > 0 || expensesForMonth > 0 || receivableForMonth > 0) {
            const dateObj = new Date(monthStr + '-01');
            const readableMonth = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
            
            lastPnlData.push({
                Month: readableMonth,
                "Fee Collections": feeIncomeForMonth,
                "Other Income": otherIncomeForMonth,
                "Total Income": monthIncome,
                "Total Expenses": expensesForMonth,
                "Net Profit": monthProfit,
                "Receivables": receivableForMonth
            });
            
            breakdownHTML += `
                <div style="background: rgba(30, 41, 59, 0.3); border: 1px solid rgba(255,255,255,0.05); padding: 15px; border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; margin-bottom: 8px;">
                        <strong style="color: #fff;">${readableMonth}</strong>
                        <strong style="color: ${monthProfit >= 0 ? '#10b981' : '#ef4444'};">Net: ${monthProfit} SAR</strong>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.85rem; color: var(--text-muted);">
                        <div>
                            <div>Fee Collections: <span style="color: #fff;">${feeIncomeForMonth} SAR</span></div>
                            <div>Other Income: <span style="color: #fff;">${otherIncomeForMonth} SAR</span></div>
                        </div>
                        <div>
                            <div>Expenses: <span style="color: #fff;">${expensesForMonth} SAR</span></div>
                            <div>Receivables (Outstanding): <span style="color: #f59e0b;">${receivableForMonth} SAR</span></div>
                        </div>
                    </div>
                </div>
            `;
        }
    });
    
    document.getElementById('pnl-total-income').innerHTML = totalIncome + ' <span style="font-size: 0.9rem; color: var(--text-muted);">SAR</span>';
    document.getElementById('pnl-total-expense').innerHTML = totalExpense + ' <span style="font-size: 0.9rem; color: var(--text-muted);">SAR</span>';
    
    const netProfit = totalIncome - totalExpense;
    const profitEl = document.getElementById('pnl-net-profit');
    profitEl.innerHTML = netProfit + ' <span style="font-size: 0.9rem; color: var(--text-muted);">SAR</span>';
    profitEl.style.color = netProfit >= 0 ? '#3b82f6' : '#ef4444';
    
    document.getElementById('pnl-total-receivable').innerHTML = totalReceivable + ' <span style="font-size: 0.9rem; color: var(--text-muted);">SAR</span>';
    
    const breakdownEl = document.getElementById('pnl-breakdown');
    if (breakdownHTML === '') {
        breakdownEl.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No financial data for the selected period.</p>';
    } else {
        breakdownEl.innerHTML = breakdownHTML;
    }
}

function exportPnL() {
    if (!lastPnlData || lastPnlData.length === 0) {
        return alert("No data to export. Please calculate first.");
    }
    
    let csvContent = "data:text/csv;charset=utf-8,";
    const headers = Object.keys(lastPnlData[0]);
    csvContent += headers.join(",") + "\n";
    
    lastPnlData.forEach(row => {
        const values = headers.map(h => row[h]);
        csvContent += values.join(",") + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `mufc_pnl_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


// ================= ACADEMY APPROVALS LOGIC =================
function renderAcademyApprovals() {
    const list = document.getElementById('academy-approvals-list');
    if(!list) return;
    list.innerHTML = '';
    
    const pendingStudents = academyStudents.filter(s => s.pendingDeletion === true);
    
    if(pendingStudents.length === 0) {
        list.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No pending deletion requests.</p>';
        return;
    }
    
    pendingStudents.forEach(student => {
        const div = document.createElement('div');
        div.className = 'player-card';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'space-between';
        div.style.padding = '16px 22px';
        
        const initial = student.name ? student.name.trim().charAt(0).toUpperCase() : 'S';
        const avatarStyle = student.pic 
            ? `background-image: url('${student.pic}');` 
            : `background: linear-gradient(135deg, #1e3a8a, #2563eb);`;

        div.innerHTML = `
            <div class="player-info" style="display: flex; align-items: center; gap: 16px;">
                <div class="profile-pic" style="min-width: 50px; height: 50px; ${avatarStyle}">
                    ${student.pic ? '' : initial}
                </div>
                <div>
                    <h3 style="font-size: 1.25rem; font-weight: 600; color: #fff; margin-bottom: 4px;">${escapeHtml(student.name)}</h3>
                    <p style="font-size: 0.95rem; color: var(--text-muted);">ID: <strong style="color: #f1f5f9;">${escapeHtml(student.id)}</strong> | Requested by: <span style="color: #fca5a5;">${escapeHtml(student.pendingDeletionBy || 'Unknown')}</span></p>
                </div>
            </div>
            <div style="display: flex; gap: 10px;">
                <button class="btn-primary" style="background: #ef4444; border-color: #ef4444; padding: 10px 18px; font-size: 0.95rem; font-weight: 600;" onclick="approveDeletion('${student.id}')"><i class="fa-solid fa-check"></i> Approve Delete</button>
                <button class="btn-secondary" style="padding: 10px 18px; font-size: 0.95rem; font-weight: 600;" onclick="rejectDeletion('${student.id}')"><i class="fa-solid fa-xmark"></i> Reject</button>
            </div>
        `;
        list.appendChild(div);
    });
}

function approveDeletion(id) {
    if(!confirm("Are you sure you want to PERMANENTLY delete this student?")) return;
    const studentIdStr = String(id);
    academyStudents = academyStudents.filter(s => String(s.id) !== studentIdStr);
    if (typeof academyAttendance !== 'undefined' && Array.isArray(academyAttendance)) {
        academyAttendance = academyAttendance.filter(a => String(a.studentId) !== studentIdStr);
    }
    if (typeof academyPayments !== 'undefined' && Array.isArray(academyPayments)) {
        academyPayments = academyPayments.filter(p => String(p.studentId) !== studentIdStr);
    }
    saveData();
    renderAcademyApprovals();
    renderAcademyStudents();
    renderAcademyReports();
    if (typeof renderAcademyDashboard === 'function') renderAcademyDashboard();
    if (typeof renderAcademyAttendance === 'function') renderAcademyAttendance();
    alert("Student deleted successfully.");
}

function rejectDeletion(id) {
    const student = academyStudents.find(s => s.id === id);
    if(student) {
        delete student.pendingDeletion;
        delete student.pendingDeletionBy;
        saveData();
        renderAcademyApprovals();
        renderAcademyStudents();
        alert("Deletion request rejected. The student has been restored.");
    }
}

let chartPnL = null;
let chartAge = null;
let chartAttendance = null;

function changeDashboardMonth(delta) {
    const picker = document.getElementById('dashboard-month-picker');
    let monthStr = picker ? picker.value : '';
    if (!monthStr) {
        const today = new Date();
        monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    }
    const [year, month] = monthStr.split('-').map(Number);
    const targetDate = new Date(year, month - 1 + delta, 1);
    const newMonthStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
    if (picker) picker.value = newMonthStr;
    renderAcademyDashboard();
}

function resetDashboardMonth() {
    const picker = document.getElementById('dashboard-month-picker');
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    if (picker) picker.value = currentMonthStr;
    renderAcademyDashboard();
}

const DASHBOARD_AGE_BRACKETS = [
    { id: 'under-6', label: 'Under 6', chartLabel: 'Under 6' },
    { id: '6-7', label: 'Between 6 to 7', chartLabel: '6 - 7 Yrs' },
    { id: '8-9', label: 'Between 8 to 9', chartLabel: '8 - 9 Yrs' },
    { id: '10-11', label: 'Between 10 to 11', chartLabel: '10 - 11 Yrs' },
    { id: '12-13', label: 'Between 12 to 13', chartLabel: '12 - 13 Yrs' },
    { id: '14-15', label: 'Between 14 to 15', chartLabel: '14 - 15 Yrs' },
    { id: '16-plus', label: '16 and Above', chartLabel: '16+ Yrs' }
];

function getStudentAgeCategoryId(student) {
    if (!student || student.role === 'coach') return null;
    if (!student.age || student.age === '-' || isNaN(parseInt(student.age))) {
        return 'unknown';
    }
    const age = parseInt(student.age);
    if (age < 6) return 'under-6';
    if (age >= 6 && age <= 7) return '6-7';
    if (age >= 8 && age <= 9) return '8-9';
    if (age >= 10 && age <= 11) return '10-11';
    if (age >= 12 && age <= 13) return '12-13';
    if (age >= 14 && age <= 15) return '14-15';
    if (age >= 16) return '16-plus';
    return 'unknown';
}

function renderAcademyDashboard() {
    if (chartPnL) chartPnL.destroy();
    if (chartAge) chartAge.destroy();
    if (chartAttendance) chartAttendance.destroy();
    
    // Determine selected month from calendar input
    const picker = document.getElementById('dashboard-month-picker');
    let monthStr = picker ? picker.value : '';
    if (!monthStr) {
        const today = new Date();
        monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        if (picker) picker.value = monthStr;
    }
    
    // Parse month date for human-readable title (e.g. "October 2026")
    const [selYear, selMonth] = monthStr.split('-').map(Number);
    const monthDateObj = new Date(selYear, selMonth - 1, 1);
    const monthDisplayName = monthDateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const monthShortName = monthDateObj.toLocaleString('en-US', { month: 'short' });

    // Update dynamic header labels
    const pnlMonthLabel = document.getElementById('dash-pnl-title-month');
    if (pnlMonthLabel) pnlMonthLabel.innerText = monthDisplayName;
    
    const attMonthLabel = document.getElementById('dash-att-title-month');
    if (attMonthLabel) attMonthLabel.innerText = monthDisplayName;

    // 1. Calculate P&L for Selected Month
    let totalIncome = 0;
    let totalExpense = 0;
    academyPayments.forEach(p => {
        if(p.month === monthStr && (p.status === 'Paid' || p.status === 'paid')) {
            totalIncome += parseFloat(p.amount) || parseFloat(p.paid) || 0;
        }
    });
    academyAccounts.forEach(acc => {
        if(acc.date && acc.date.startsWith(monthStr)) {
            const type = (acc.type || '').toLowerCase();
            if(type === 'income') totalIncome += parseFloat(acc.amount) || 0;
            if(type === 'expense') totalExpense += parseFloat(acc.amount) || 0;
        }
    });

    const netProfit = totalIncome - totalExpense;

    // 2. Calculate Attendance for Selected Month (Separated for Students and Coaches)
    const allCoachesList = typeof getAllCoaches === 'function' ? getAllCoaches() : [];
    const coachIdSet = new Set();
    allCoachesList.forEach(c => {
        if (c.id) coachIdSet.add(String(c.id).trim().toLowerCase());
        if (c.mobile) coachIdSet.add(String(c.mobile).trim().toLowerCase());
    });
    (academyStudents || []).forEach(s => {
        if (s.role === 'coach') {
            if (s.id) coachIdSet.add(String(s.id).trim().toLowerCase());
            if (s.contact) coachIdSet.add(String(s.contact).trim().toLowerCase());
            if (s.mobile) coachIdSet.add(String(s.mobile).trim().toLowerCase());
        }
    });

    const isCoachAttendanceRecord = (a) => {
        if (a.role === 'coach') return true;
        const sid = String(a.studentId || '').trim().toLowerCase();
        return coachIdSet.has(sid);
    };

    const activeStudentIds = new Set(
        academyStudents
            .filter(s => s.role !== 'coach' && !coachIdSet.has(String(s.id).trim().toLowerCase()))
            .map(s => String(s.id).trim().toLowerCase())
    );

    const studentDateStats = {};
    const coachDateStats = {};
    const dateStudentNames = {};
    const dateCoachNames = {};
    let monthStudentPresentCount = 0;
    let monthCoachPresentCount = 0;
    const allAttDatesSet = new Set();

    academyAttendance.forEach(a => {
        if (a.status === 'Present' && a.date && a.date.startsWith(monthStr)) {
            const sid = String(a.studentId || '').trim();
            const sidLower = sid.toLowerCase();

            if (isCoachAttendanceRecord(a)) {
                allAttDatesSet.add(a.date);
                coachDateStats[a.date] = (coachDateStats[a.date] || 0) + 1;
                monthCoachPresentCount++;
                if (!dateCoachNames[a.date]) dateCoachNames[a.date] = [];
                const coachObj = allCoachesList.find(c => 
                    String(c.id).trim().toLowerCase() === sidLower || 
                    String(c.mobile || '').trim().toLowerCase() === sidLower
                ) || (academyStudents || []).find(s => 
                    String(s.id).trim().toLowerCase() === sidLower ||
                    String(s.contact || '').trim().toLowerCase() === sidLower ||
                    String(s.mobile || '').trim().toLowerCase() === sidLower
                );
                dateCoachNames[a.date].push(coachObj ? coachObj.name : (a.name || sid));
            } else if (activeStudentIds.has(sidLower)) {
                allAttDatesSet.add(a.date);
                studentDateStats[a.date] = (studentDateStats[a.date] || 0) + 1;
                monthStudentPresentCount++;
                if (!dateStudentNames[a.date]) dateStudentNames[a.date] = [];
                const studentObj = (academyStudents || []).find(s => String(s.id).trim().toLowerCase() === sidLower);
                dateStudentNames[a.date].push(studentObj ? studentObj.name : (a.name || sid));
            }
        }
    });

    const monthTotalPresentCount = monthStudentPresentCount + monthCoachPresentCount;
    let attDates = Array.from(allAttDatesSet).sort();

    // 3. Update Monthly KPI Stat Cards
    const elIncome = document.getElementById('dash-stat-income');
    if (elIncome) elIncome.innerText = `${totalIncome.toLocaleString()} SAR`;

    const elExpense = document.getElementById('dash-stat-expense');
    if (elExpense) elExpense.innerText = `${totalExpense.toLocaleString()} SAR`;

    const elNet = document.getElementById('dash-stat-net');
    if (elNet) {
        const netSign = netProfit > 0 ? '+' : '';
        elNet.innerText = `${netSign}${netProfit.toLocaleString()} SAR`;
        elNet.style.color = netProfit >= 0 ? '#10b981' : '#ef4444';
    }

    const elAtt = document.getElementById('dash-stat-attendance');
    if (elAtt) {
        elAtt.innerHTML = `
            <div style="display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;">
                <span style="font-size: 1.25rem; font-weight: 700; color: #f87171;">${monthStudentPresentCount} <span style="font-size: 0.72rem; font-weight: 500; color: #94a3b8;">Students</span></span>
                <span style="font-size: 0.95rem; color: #64748b;">+</span>
                <span style="font-size: 1.25rem; font-weight: 700; color: #38bdf8;">${monthCoachPresentCount} <span style="font-size: 0.72rem; font-weight: 500; color: #94a3b8;">Coaches</span></span>
            </div>
            <div style="font-size: 0.74rem; color: #94a3b8; margin-top: 3px; font-weight: 500;">Total: ${monthTotalPresentCount} Check-ins</div>
        `;
    }

    // 4. Render P&L Donut Chart for Selected Month
    const hasData = (totalIncome > 0 || totalExpense > 0);
    const pnlData = hasData ? [totalIncome, totalExpense] : [1];
    const pnlLabels = hasData ? ['Income', 'Expense'] : ['No Transactions'];
    const pnlColors = hasData ? ['#10b981', '#ef4444'] : ['#334155'];
    const pnlHoverColors = hasData ? ['#059669', '#dc2626'] : ['#475569'];

    // Center text plugin for doughnut chart
    const donutCenterTextPlugin = {
        id: 'donutCenterText',
        beforeDraw(chart) {
            const { ctx, chartArea } = chart;
            if (!chartArea) return;
            const centerX = (chartArea.left + chartArea.right) / 2;
            const centerY = (chartArea.top + chartArea.bottom) / 2;
            
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const sign = netProfit > 0 ? '+' : '';
            const netStr = `${sign}${netProfit.toLocaleString()} SAR`;
            
            ctx.font = "600 11px 'Outfit', sans-serif";
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('NET BALANCE', centerX, centerY - 11);
            
            ctx.font = "700 16px 'Outfit', sans-serif";
            ctx.fillStyle = netProfit > 0 ? '#10b981' : (netProfit < 0 ? '#ef4444' : '#e2e8f0');
            ctx.fillText(netStr, centerX, centerY + 12);
            ctx.restore();
        }
    };

    const ctxPnL = document.getElementById('chart-pnl');
    if(ctxPnL) {
        chartPnL = new Chart(ctxPnL, {
            type: 'doughnut',
            data: {
                labels: pnlLabels,
                datasets: [{
                    data: pnlData,
                    backgroundColor: pnlColors,
                    hoverBackgroundColor: pnlHoverColors,
                    borderColor: '#1f2937',
                    borderWidth: 3,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#e2e8f0',
                            font: { size: 13, family: "'Outfit', sans-serif", weight: '600' },
                            padding: 16,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if (!hasData) return ` No transactions for ${monthDisplayName}`;
                                const val = context.parsed || 0;
                                return ` ${context.label}: ${val.toLocaleString()} SAR`;
                            }
                        }
                    }
                }
            },
            plugins: [donutCenterTextPlugin]
        });
    }

    // Populate P&L Breakdown below Donut Chart
    const pnlBreakdownEl = document.getElementById('dashboard-pnl-breakdown');
    if (pnlBreakdownEl) {
        let feeIncome = 0;
        academyPayments.forEach(p => {
            if(p.month === monthStr && (p.status === 'Paid' || p.status === 'paid')) {
                feeIncome += parseFloat(p.amount) || parseFloat(p.paid) || 0;
            }
        });
        let otherIncome = 0;
        let otherExpense = 0;
        academyAccounts.forEach(acc => {
            if(acc.date && acc.date.startsWith(monthStr)) {
                const type = (acc.type || '').toLowerCase();
                if(type === 'income') otherIncome += parseFloat(acc.amount) || 0;
                if(type === 'expense') otherExpense += parseFloat(acc.amount) || 0;
            }
        });

        pnlBreakdownEl.innerHTML = `
            <div class="pnl-breakdown-row">
                <span class="pnl-breakdown-label"><i class="fa-solid fa-graduation-cap" style="color: #10b981;"></i> Student Fees</span>
                <span class="pnl-breakdown-val" style="color: #10b981;">${feeIncome.toLocaleString()} SAR</span>
            </div>
            <div class="pnl-breakdown-row">
                <span class="pnl-breakdown-label"><i class="fa-solid fa-money-bill-transfer" style="color: #38bdf8;"></i> Other Income</span>
                <span class="pnl-breakdown-val" style="color: #38bdf8;">${otherIncome.toLocaleString()} SAR</span>
            </div>
            <div class="pnl-breakdown-row">
                <span class="pnl-breakdown-label"><i class="fa-solid fa-receipt" style="color: #ef4444;"></i> Expenses</span>
                <span class="pnl-breakdown-val" style="color: #ef4444;">${otherExpense.toLocaleString()} SAR</span>
            </div>
        `;
    }

    // 5. Age Distribution (Bar chart and Dropdown by Age Brackets)
    const categoryCounts = {};
    DASHBOARD_AGE_BRACKETS.forEach(b => { categoryCounts[b.id] = 0; });
    let unknownAgeCount = 0;

    const nonCoachStudents = academyStudents.filter(s => s.role !== 'coach');
    nonCoachStudents.forEach(s => {
        const catId = getStudentAgeCategoryId(s);
        if (catId === 'unknown') {
            unknownAgeCount++;
        } else if (catId && categoryCounts.hasOwnProperty(catId)) {
            categoryCounts[catId]++;
        }
    });

    const activeBrackets = [...DASHBOARD_AGE_BRACKETS];
    if (unknownAgeCount > 0) {
        activeBrackets.push({ id: 'unknown', label: 'Unknown Age', chartLabel: 'Unknown' });
        categoryCounts['unknown'] = unknownAgeCount;
    }

    const ageLabels = activeBrackets.map(b => b.chartLabel);
    const ageData = activeBrackets.map(b => categoryCounts[b.id] || 0);
    const maxAgeCount = Math.max(...ageData, 0);

    // Number text plugin above each age bar
    const ageBarTextCountPlugin = {
        id: 'ageBarTextCount',
        afterDatasetsDraw(chart) {
            const { ctx } = chart;
            chart.data.datasets.forEach((dataset, datasetIndex) => {
                const meta = chart.getDatasetMeta(datasetIndex);
                if (!meta || !meta.data) return;
                
                meta.data.forEach((bar, index) => {
                    const count = dataset.data[index];
                    if (count > 0) {
                        ctx.save();
                        ctx.font = "bold 12px 'Outfit', sans-serif";
                        ctx.fillStyle = '#38bdf8';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'bottom';
                        ctx.fillText(`${count}`, bar.x, bar.y - 4);
                        ctx.restore();
                    }
                });
            });
        }
    };

    const ctxAge = document.getElementById('chart-age');
    if(ctxAge) {
        chartAge = new Chart(ctxAge, {
            type: 'bar',
            data: {
                labels: ageLabels,
                datasets: [{
                    label: 'Students',
                    data: ageData,
                    backgroundColor: '#38bdf8',
                    hoverBackgroundColor: '#0284c7',
                    borderRadius: 6,
                    borderSkipped: false,
                    maxBarThickness: 45
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: { top: 22 }
                },
                onClick: (event, elements) => {
                    if (elements && elements.length > 0) {
                        const elementIndex = elements[0].index;
                        const bracket = activeBrackets[elementIndex];
                        if (bracket) {
                            const selectEl = document.getElementById('dashboard-age-select');
                            if (selectEl) {
                                selectEl.value = bracket.id;
                                renderDashboardAgeStudents();
                            }
                        }
                    }
                },
                scales: {
                    y: { 
                        beginAtZero: true, 
                        suggestedMax: Math.max(5, maxAgeCount + 4),
                        ticks: { color: '#9ca3af', stepSize: 5, precision: 0 },
                        grid: { color: 'rgba(255, 255, 255, 0.06)' }
                    },
                    x: { 
                        ticks: { color: '#9ca3af', font: { size: 12, family: "'Outfit', sans-serif" } },
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: (tooltipItems) => {
                                const idx = tooltipItems[0].dataIndex;
                                return activeBrackets[idx] ? activeBrackets[idx].label : '';
                            },
                            label: (context) => {
                                const count = context.parsed.y || 0;
                                return ` ${count} Student${count === 1 ? '' : 's'}`;
                            }
                        }
                    }
                }
            },
            plugins: [ageBarTextCountPlugin]
        });
    }

    // Populate Age Dropdown List
    const ageSelect = document.getElementById('dashboard-age-select');
    if (ageSelect) {
        const currentSelected = ageSelect.value || 'all';
        
        let optionsHtml = `<option value="all">All Ages (${nonCoachStudents.length} Students)</option>`;
        activeBrackets.forEach(b => {
            const count = categoryCounts[b.id] || 0;
            optionsHtml += `<option value="${b.id}">${b.label} (${count} Student${count === 1 ? '' : 's'})</option>`;
        });
        ageSelect.innerHTML = optionsHtml;
        
        const validValues = ['all', ...activeBrackets.map(b => b.id)];
        if (validValues.includes(currentSelected)) {
            ageSelect.value = currentSelected;
        } else {
            ageSelect.value = 'all';
        }
    }
    renderDashboardAgeStudents();


    // 6. Attendance History (Grouped Bar chart: Students in coral red, Coaches in sky blue)
    let attLabels = [];
    let attDataStudents = [];
    let attDataCoaches = [];
    if (attDates.length === 0) {
        attLabels = [`No Sessions in ${monthShortName}`];
        attDataStudents = [0];
        attDataCoaches = [0];
    } else {
        attLabels = attDates.map(d => {
            const parts = d.split('-');
            if(parts.length === 3) {
                const dObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                const dayName = dObj.toLocaleDateString('en-US', { weekday: 'short' });
                return `${dayName}, ${monthShortName} ${parts[2]}`;
            }
            return d;
        });
        attDataStudents = attDates.map(d => studentDateStats[d] || 0);
        attDataCoaches = attDates.map(d => coachDateStats[d] || 0);
    }
    
    const maxAtt = Math.max(...attDataStudents, ...attDataCoaches, 0);
    const suggestedMaxY = Math.max(8, Math.ceil((maxAtt + 8) / 5) * 5);

    // Custom plugin to display the exact text count directly on top of each bar
    const attendanceBarTextCountPlugin = {
        id: 'attendanceBarTextCount',
        afterDatasetsDraw(chart) {
            if (attDates.length === 0) return;
            const { ctx } = chart;
            chart.data.datasets.forEach((dataset, datasetIndex) => {
                const meta = chart.getDatasetMeta(datasetIndex);
                if (!meta || !meta.data) return;
                const isCoachDataset = (dataset.label === 'Coaches');
                const borderColor = isCoachDataset ? '#38bdf8' : '#f87171';
                const textColor = isCoachDataset ? '#7dd3fc' : '#fca5a5';
                const typeLabel = isCoachDataset ? 'Coaches' : 'Students';
                
                meta.data.forEach((bar, index) => {
                    const count = dataset.data[index];
                    if (count > 0) {
                        ctx.save();
                        const text = `${count} ${typeLabel}`;
                        ctx.font = "bold 11px 'Outfit', sans-serif";
                        const textWidth = ctx.measureText(text).width;
                        const pillW = textWidth + 14;
                        const pillH = 22;
                        const pillX = bar.x - pillW / 2;
                        const pillY = Math.max(6, bar.y - pillH - 5);

                        // Pill background
                        ctx.fillStyle = '#0f172a';
                        ctx.beginPath();
                        if (ctx.roundRect) {
                            ctx.roundRect(pillX, pillY, pillW, pillH, 5);
                        } else {
                            ctx.rect(pillX, pillY, pillW, pillH);
                        }
                        ctx.fill();

                        // Pill colored border
                        ctx.strokeStyle = borderColor;
                        ctx.lineWidth = 1.5;
                        ctx.stroke();

                        // Count text
                        ctx.fillStyle = textColor;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(text, bar.x, pillY + pillH / 2);
                        ctx.restore();
                    }
                });
            });
        }
    };

    const ctxAtt = document.getElementById('chart-attendance');
    if(ctxAtt) {
        chartAttendance = new Chart(ctxAtt, {
            type: 'bar',
            data: {
                labels: attLabels,
                datasets: [
                    {
                        label: 'Students',
                        data: attDataStudents,
                        backgroundColor: '#f87171',
                        hoverBackgroundColor: '#ef4444',
                        borderRadius: 6,
                        borderSkipped: false,
                        maxBarThickness: 42,
                        barPercentage: 0.75,
                        categoryPercentage: 0.6
                    },
                    {
                        label: 'Coaches',
                        data: attDataCoaches,
                        backgroundColor: '#38bdf8',
                        hoverBackgroundColor: '#0284c7',
                        borderRadius: 6,
                        borderSkipped: false,
                        maxBarThickness: 42,
                        barPercentage: 0.75,
                        categoryPercentage: 0.6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 32,
                        left: 12,
                        right: 12,
                        bottom: 4
                    }
                },
                scales: {
                    y: { 
                        beginAtZero: true, 
                        suggestedMax: suggestedMaxY,
                        ticks: { color: '#9ca3af', stepSize: 5, precision: 0 },
                        grid: { color: 'rgba(255, 255, 255, 0.08)' }
                    },
                    x: { 
                        ticks: { 
                            color: '#ffffff', 
                            font: { size: 12, weight: '600', family: "'Outfit', sans-serif" } 
                        },
                        grid: { display: false }
                    }
                },
                plugins: { 
                    legend: { 
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: {
                            color: '#e2e8f0',
                            font: { size: 12, family: "'Outfit', sans-serif", weight: '600' },
                            padding: 14,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            boxWidth: 8
                        }
                    },
                    tooltip: {
                        backgroundColor: '#0f172a',
                        titleColor: '#ffffff',
                        borderColor: 'rgba(255, 255, 255, 0.15)',
                        borderWidth: 1,
                        padding: 10,
                        callbacks: {
                            label: function(context) {
                                const val = context.parsed.y || 0;
                                return ` ${context.dataset.label}: ${val} present`;
                            },
                            footer: function(tooltipItems) {
                                let total = 0;
                                tooltipItems.forEach(item => {
                                    total += (item.parsed.y || 0);
                                });
                                return ` Combined Total: ${total} present`;
                            }
                        }
                    }
                }
            },
            plugins: [attendanceBarTextCountPlugin]
        });
    }

    // 7. Render Date-Wise Attendance Breakdown below the chart
    const breakdownEl = document.getElementById('dashboard-attendance-breakdown');
    if (breakdownEl) {
        if (attDates.length === 0) {
            breakdownEl.innerHTML = `
                <div style="text-align: center; color: var(--text-muted); padding: 18px 0; font-size: 0.92rem;">
                    <i class="fa-regular fa-calendar-xmark" style="font-size: 1.4rem; display: block; margin-bottom: 6px; opacity: 0.6;"></i>
                    No attendance sessions recorded for ${monthDisplayName}.
                </div>
            `;
        } else {
            const totalStudents = activeStudentIds.size;
            const totalCoaches = allCoachesList.length;
            let rowsHtml = '';
            
            attDates.forEach(d => {
                const sCount = studentDateStats[d] || 0;
                const cCount = coachDateStats[d] || 0;
                const totCount = sCount + cCount;
                const pct = totalStudents > 0 ? Math.round((sCount / totalStudents) * 100) : 0;
                
                const parts = d.split('-');
                let dateDisplay = d;
                let dayDisplay = '';
                if (parts.length === 3) {
                    const dObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                    dayDisplay = dObj.toLocaleDateString('en-US', { weekday: 'long' });
                    dateDisplay = `${parts[2]} ${dObj.toLocaleDateString('en-US', { month: 'short' })} ${parts[0]}`;
                }

                const sNames = dateStudentNames[d] || [];
                const cNames = dateCoachNames[d] || [];

                let coachChipsHtml = '';
                if (cNames.length > 0) {
                    coachChipsHtml = `
                        <div class="att-students-chips" style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">
                            <span style="font-size: 0.76rem; color: #38bdf8; font-weight: 600; margin-right: 4px;">
                                <i class="fa-solid fa-user-tie"></i> Coaches (${cNames.length}):
                            </span>
                            ${cNames.map(name => `<span class="att-coach-chip"><i class="fa-solid fa-user-tie" style="font-size: 0.7rem;"></i> ${escapeHtml(name)}</span>`).join('')}
                        </div>
                    `;
                }

                let studentsChipsHtml = '';
                if (sNames.length > 0) {
                    studentsChipsHtml = `
                        <div class="att-students-chips" style="margin-top: 6px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">
                            <span style="font-size: 0.76rem; color: #f87171; font-weight: 600; margin-right: 4px;">
                                <i class="fa-solid fa-graduation-cap"></i> Students (${sNames.length}):
                            </span>
                            ${sNames.map(name => `<span class="att-student-chip"><i class="fa-solid fa-user-check" style="font-size: 0.7rem;"></i> ${escapeHtml(name)}</span>`).join('')}
                        </div>
                    `;
                }

                rowsHtml += `
                    <div class="att-date-row">
                        <div style="width: 100%;">
                            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                                <div class="att-date-left">
                                    <div class="att-date-badge-cal">
                                        <i class="fa-regular fa-calendar"></i> ${parts[2]}
                                    </div>
                                    <div>
                                        <div class="att-date-title">${dayDisplay}, ${dateDisplay}</div>
                                        <div class="att-date-sub">
                                            ${sCount} of ${totalStudents} students attended (${pct}%) · ${cCount} of ${totalCoaches} coaches present
                                        </div>
                                    </div>
                                </div>
                                <div class="att-date-right" style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                                    <span class="att-student-pill">
                                        <i class="fa-solid fa-graduation-cap"></i> ${sCount} Students
                                    </span>
                                    <span class="att-coach-pill">
                                        <i class="fa-solid fa-user-tie"></i> ${cCount} Coaches
                                    </span>
                                    <span class="att-total-pill">
                                        <i class="fa-solid fa-users"></i> ${totCount} Total
                                    </span>
                                </div>
                            </div>
                            ${coachChipsHtml}
                            ${studentsChipsHtml}
                        </div>
                    </div>
                `;
            });

            breakdownEl.innerHTML = `
                <div class="dashboard-att-breakdown-title" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <span><i class="fa-solid fa-list-check" style="color: #f87171; margin-right: 6px;"></i> Date-Wise Session Breakdown (${attDates.length} session${attDates.length > 1 ? 's' : ''})</span>
                    <span style="font-size: 0.82rem; color: var(--text-muted); display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                        <span style="color: #f87171; font-weight: 600;"><i class="fa-solid fa-graduation-cap"></i> ${monthStudentPresentCount} Students</span>
                        <span style="color: #64748b;">|</span>
                        <span style="color: #38bdf8; font-weight: 600;"><i class="fa-solid fa-user-tie"></i> ${monthCoachPresentCount} Coaches</span>
                        <span style="color: #64748b;">|</span>
                        <span style="color: #e2e8f0; font-weight: 600;">Total: ${monthTotalPresentCount}</span>
                    </span>
                </div>
                <div class="dashboard-att-date-cards">
                    ${rowsHtml}
                </div>
            `;
        }
    }
}

function renderDashboardAgeStudents() {
    const selectEl = document.getElementById('dashboard-age-select');
    const listEl = document.getElementById('dashboard-age-students-list');
    const titleEl = document.getElementById('dashboard-age-list-title');
    const countEl = document.getElementById('dashboard-age-list-count');
    if (!listEl) return;

    const selectedCategory = selectEl ? selectEl.value : 'all';
    
    let filtered = academyStudents.filter(s => s.role !== 'coach');
    if (selectedCategory !== 'all') {
        filtered = filtered.filter(s => getStudentAgeCategoryId(s) === selectedCategory);
    }

    // Sort by age ascending, then alphabetically by name
    filtered.sort((a, b) => {
        const ageA = parseInt(a.age) || 999;
        const ageB = parseInt(b.age) || 999;
        if (ageA !== ageB) return ageA - ageB;
        return (a.name || '').localeCompare(b.name || '');
    });

    const activeBracket = DASHBOARD_AGE_BRACKETS.find(b => b.id === selectedCategory);
    let categoryLabel = 'All Ages';
    if (selectedCategory === 'unknown') {
        categoryLabel = 'Unknown Age';
    } else if (activeBracket) {
        categoryLabel = activeBracket.label;
    }

    if (titleEl) {
        titleEl.innerHTML = `<i class="fa-solid fa-users-viewfinder" style="color: #38bdf8;"></i> Students in <strong>${categoryLabel}</strong>`;
    }
    if (countEl) {
        countEl.innerText = `${filtered.length} Student${filtered.length === 1 ? '' : 's'}`;
    }

    if (filtered.length === 0) {
        listEl.innerHTML = `
            <div style="text-align: center; color: var(--text-muted); padding: 22px 0; font-size: 0.9rem;">
                <i class="fa-solid fa-user-slash" style="font-size: 1.4rem; display: block; margin-bottom: 6px; opacity: 0.5;"></i>
                No students found in ${categoryLabel} category.
            </div>
        `;
        return;
    }

    listEl.innerHTML = filtered.map(student => {
        const initial = student.name ? student.name.trim().charAt(0).toUpperCase() : 'S';
        const avatarStyle = student.pic 
            ? `background-image: url('${student.pic}');` 
            : `background: linear-gradient(135deg, #1e3a8a, #2563eb);`;
        const nameColor = (student.gender === 'Female') ? '#ec4899' : '#ffffff';
        const ageText = student.age && student.age !== '-' ? `${student.age} Yrs` : 'Age: -';

        return `
            <div class="age-student-row" onclick="openAcademyStudentDetails('${student.id}')" title="Click to view details for ${escapeHtml(student.name)}">
                <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
                    <div class="age-student-avatar" style="${avatarStyle}">
                        ${student.pic ? '' : initial}
                    </div>
                    <div style="min-width: 0;">
                        <div class="age-student-name" style="color: ${nameColor};">
                            ${escapeHtml(student.name)}
                        </div>
                        <div class="age-student-sub">
                            <span>ID: ${student.id || '-'}</span>
                            ${student.contact ? ` • <span>${student.contact}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="age-student-badge">${ageText}</span>
                    <i class="fa-solid fa-chevron-right" style="color: var(--text-muted); font-size: 0.75rem;"></i>
                </div>
            </div>
        `;
    }).join('');
}




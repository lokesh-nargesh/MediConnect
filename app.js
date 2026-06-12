// MediConnect Application Engine & State Controller

document.addEventListener("DOMContentLoaded", () => {
  // --- APPLICATION STATE ---
  let state = {
    isLoggedIn: localStorage.getItem("mediconnect_logged_in") === "true",
    currentUser: localStorage.getItem("mediconnect_user_id") || null,
    currentRole: localStorage.getItem("mediconnect_role") || "patient",
    currentView: "feed",
    activeChatUser: null,
    searchQuery: "",
    emergencyTimer: null,
    emergencyCountdownValue: 5,
    telemedActive: false,
    telemedTimer: null,
    telemedSeconds: 0,
    activeGroupId: "grp_diabetes",
    hydrationCount: window.MediConnectDB.users.patient.healthStats.hydration,
    stepsCount: window.MediConnectDB.users.patient.healthStats.steps,
    mobileCircleChatActive: false // tracks active chat pane view on mobile circle boards
  };

  // --- INITIALIZATION ---
  initTheme();
  renderQuickLoginCards();
  checkLoginSession();
  setupEventListeners();

  // --- PROFILE RETRIEVAL HELPER ---
  function getCurrentUserObject() {
    const userId = state.currentUser;
    if (!userId) return null;

    // Direct lookup
    if (window.MediConnectDB.users[userId]) {
      return window.MediConnectDB.users[userId];
    }
    // Preseeded fallbacks
    if (userId === "patient_john" && window.MediConnectDB.users.patient) return window.MediConnectDB.users.patient;
    if (userId === "doctor_sarah" && window.MediConnectDB.users.doctor) return window.MediConnectDB.users.doctor;
    if (userId === "staff_james" && window.MediConnectDB.users.staff) return window.MediConnectDB.users.staff;
    
    // Directory lookup fallback
    const dirUser = window.MediConnectDB.directory.find(u => u.id === userId);
    if (dirUser) {
      return {
        id: dirUser.id,
        role: dirUser.role,
        name: dirUser.name,
        avatar: dirUser.avatar,
        bio: dirUser.bio || "No profile bio available.",
        healthStats: { bloodPressure: "120/80 mmHg", heartRate: "72 bpm", bloodSugar: "95 mg/dL", steps: 0, hydration: 0 },
        badges: [],
        medicalHistory: [],
        prescriptions: [],
        labReports: [],
        timeline: [],
        specialization: dirUser.specialization || "General Medicine",
        credentials: dirUser.credentials || "MD",
        availability: "Mon-Fri - 09:00 AM to 05:00 PM",
        achievements: [],
        department: dirUser.department || "General Ward",
        shift: "Day Shift",
        emergencyContact: "+1 (555) 000-0000"
      };
    }
    return null;
  }

  // --- AUTHENTICATION & SESSIONS ---
  function checkLoginSession() {
    const loginPage = document.getElementById("loginPage");
    const appContainer = document.getElementById("appContainer");
    const globalAiBtn = document.getElementById("globalAiToggleBtn");
    const globalAiBox = document.getElementById("globalAiChatBox");

    if (state.isLoggedIn && state.currentUser) {
      loginPage.style.display = "none";
      appContainer.style.display = "grid";
      document.body.setAttribute("data-active-role", state.currentRole);
      
      // Show global AI floating toggle
      if (globalAiBtn) globalAiBtn.style.display = "flex";

      updateSidebarUserCard();
      renderSidebarNav();
      renderRightSidebarDirectory();
      navigateTo(state.currentView);
    } else {
      loginPage.style.display = "flex";
      appContainer.style.display = "none";
      document.body.removeAttribute("data-active-role");
      
      // Hide global AI chat components
      if (globalAiBtn) globalAiBtn.style.display = "none";
      if (globalAiBox) {
        globalAiBox.style.display = "none";
        globalAiBox.classList.add("collapsed");
      }

      // Cleanup active processes
      if (state.emergencyTimer) clearInterval(state.emergencyTimer);
      if (state.telemedTimer) clearInterval(state.telemedTimer);
      state.telemedActive = false;
      document.getElementById("telemedModalOverlay").style.display = "none";
      document.getElementById("emergencyModalOverlay").style.display = "none";
      document.getElementById("chatDockContainer").innerHTML = "";
    }
  }

  function renderQuickLoginCards() {
    const grid = document.getElementById("quickLoginCardsGrid");
    if (!grid) return;
    grid.innerHTML = "";

    const usersToShow = window.MediConnectDB.directory.slice(0, 6);

    usersToShow.forEach(user => {
      const card = document.createElement("div");
      card.className = "quick-login-card";
      card.setAttribute("data-uid", user.id);
      
      const roleText = user.role === "doctor" ? "Doctor" : (user.role === "staff" ? "Staff" : "Patient");
      
      card.innerHTML = `
        <img src="${user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80'}" alt="${roleText}">
        <h5>${user.name}</h5>
        <p>${roleText}</p>
      `;
      
      card.addEventListener("click", () => {
        login(user.id, user.role);
      });
      
      grid.appendChild(card);
    });
  }

  function login(userId, role) {
    state.isLoggedIn = true;
    state.currentUser = userId;
    state.currentRole = role;
    
    localStorage.setItem("mediconnect_logged_in", "true");
    localStorage.setItem("mediconnect_user_id", userId);
    localStorage.setItem("mediconnect_role", role);
    
    // Set default initial screen based on role permissions
    if (role === "staff") {
      state.currentView = "records_wards";
    } else if (role === "doctor") {
      state.currentView = "appointments";
    } else {
      state.currentView = "feed";
    }

    checkLoginSession();
    
    const userObj = getCurrentUserObject();
    showToastNotification(`Logged in as ${userObj?.name || userId}`);
  }

  function logout() {
    state.isLoggedIn = false;
    state.currentUser = null;
    state.currentRole = "patient";
    state.currentView = "feed";
    
    localStorage.removeItem("mediconnect_logged_in");
    localStorage.removeItem("mediconnect_user_id");
    localStorage.removeItem("mediconnect_role");
    
    checkLoginSession();
  }

  function registerNewUser(profile) {
    window.MediConnectDB.users[profile.id] = profile;
    
    window.MediConnectDB.directory.push({
      id: profile.id,
      name: profile.name,
      role: profile.role,
      specialization: profile.specialization || null,
      department: profile.department || null,
      avatar: profile.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80",
      online: false
    });
    
    window.saveMediConnectDB();
    renderQuickLoginCards();
  }

  // --- CORE ROUTER / NAVIGATION ---
  function navigateTo(viewId) {
    state.currentView = viewId;
    
    document.querySelectorAll(".sidebar-link").forEach(link => {
      if (link.getAttribute("data-view") === viewId) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });

    const mainContent = document.getElementById("mainContentArea");
    mainContent.innerHTML = "";

    switch (viewId) {
      case "feed":
        renderFeed(mainContent);
        break;
      case "profile":
        renderProfile(mainContent);
        break;
      case "groups":
        renderGroups(mainContent);
        break;
      case "appointments":
        renderAppointments(mainContent);
        break;
      case "records_wards":
        renderRecordsWards(mainContent);
        break;
      case "analytics":
        renderAnalytics(mainContent);
        break;
      case "ai_assistant":
        renderAIAssistant(mainContent);
        break;
      case "register_member":
        renderRegisterMember(mainContent);
        break;
      case "register_patient":
        renderRegisterPatient(mainContent);
        break;
      default:
        renderFeed(mainContent);
    }
  }

  // --- THEME / DARK MODE MANAGER ---
  function initTheme() {
    const isDark = localStorage.getItem("mediconnect_dark") === "true";
    if (isDark) {
      document.body.classList.add("dark-mode");
      const toggleIcon = document.getElementById("themeToggleBtn").querySelector("i");
      toggleIcon.className = "bx bx-sun";
    }
  }

  function toggleDarkMode() {
    const isDark = document.body.classList.toggle("dark-mode");
    localStorage.setItem("mediconnect_dark", isDark);
    const toggleIcon = document.getElementById("themeToggleBtn").querySelector("i");
    toggleIcon.className = isDark ? "bx bx-sun" : "bx bx-moon";
  }

  // --- USER PROFILE RENDER CONTROLS ---
  function updateSidebarUserCard() {
    const userObj = getCurrentUserObject();
    if (!userObj) return;
    document.getElementById("sidebarAvatar").src = userObj.avatar;
    document.getElementById("sidebarUserName").innerText = userObj.name;
    document.getElementById("sidebarUserRole").innerText = state.currentRole;
  }

  function renderSidebarNav() {
    const navContainer = document.getElementById("sidebarNavContainer");
    if (!navContainer) return;
    navContainer.innerHTML = "";

    const links = [
      { id: "feed", label: "Health Feed", icon: "bx bx-news", roles: ["patient", "doctor", "staff"] },
      { id: "profile", label: "My Profile", icon: "bx bx-user-circle", roles: ["patient", "doctor", "staff"] },
      { id: "groups", label: "Communities", icon: "bx bx-group", roles: ["patient", "doctor", "staff"] },
      { id: "appointments", label: "Clinic Appointments", icon: "bx bx-calendar-event", roles: ["patient", "doctor"] },
      { id: "records_wards", label: "Wards & Assets", icon: "bx bx-buildings", roles: ["doctor", "staff"] },
      { id: "analytics", label: "Hospital Dashboard", icon: "bx bx-bar-chart-alt-2", roles: ["staff"] },
      { id: "ai_assistant", label: "AI Health Assistant", icon: "bx bx-bot", roles: ["patient"] },
      
      { id: "register_member", label: "Register Member", icon: "bx bx-user-plus", roles: ["doctor"] },
      { id: "register_patient", label: "Register Patient", icon: "bx bx-user-plus", roles: ["staff"] }
    ];

    links.forEach(link => {
      if (link.roles.includes(state.currentRole)) {
        const li = document.createElement("li");
        li.innerHTML = `
          <a class="sidebar-link ${state.currentView === link.id ? 'active' : ''}" data-view="${link.id}">
            <div class="sidebar-link-content">
              <i class="${link.icon}"></i>
              <span>${link.label}</span>
            </div>
            ${link.id === "appointments" && state.currentRole === "doctor" ? `<span class="nav-badge">${getPendingAptsCount()}</span>` : ''}
          </a>
        `;
        li.querySelector("a").addEventListener("click", () => navigateTo(link.id));
        navContainer.appendChild(li);
      }
    });
  }

  function getPendingAptsCount() {
    return window.MediConnectDB.appointments.filter(a => a.status === "Scheduled").length;
  }

  // --- SOCIAL FEED RENDERER ---
  function renderFeed(container) {
    const userObj = getCurrentUserObject() || { avatar: "" };
    const creatorHTML = `
      <div class="glass-panel feed-creator post-card">
        <div class="feed-creator-top">
          <img src="${userObj.avatar}" class="feed-creator-avatar" alt="Avatar">
          <input type="text" id="postInput" class="feed-creator-input" placeholder="Share a health tip, announcement, or recovery story...">
        </div>
        <div class="feed-creator-actions">
          <div style="display: flex; gap: 8px;">
            <button class="creator-action-btn photo"><i class='bx bx-image-add'></i> Media</button>
            <select id="postTagSelector" class="form-control" style="padding: 4px 8px; font-size:12px; border-radius:12px;">
              <option value="Health Tip">💡 Health Tip</option>
              <option value="Hospital Announcement">🏥 Announcement</option>
              <option value="Recovery Story">🎉 Recovery Story</option>
            </select>
          </div>
          <button class="btn-primary" id="publishPostBtn">Publish</button>
        </div>
      </div>
    `;
    
    container.innerHTML = creatorHTML;

    let postsToRender = window.MediConnectDB.posts;
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      postsToRender = postsToRender.filter(p => 
        p.content.toLowerCase().includes(q) || 
        p.authorName.toLowerCase().includes(q) ||
        p.tag.toLowerCase().includes(q)
      );
    }

    const postsListContainer = document.createElement("div");
    postsListContainer.id = "postsListContainer";

    if (postsToRender.length === 0) {
      postsListContainer.innerHTML = `<p style="text-align: center; color: var(--text-secondary); margin-top:20px;">No posts found matching the query.</p>`;
    } else {
      postsToRender.forEach(post => {
        const card = document.createElement("div");
        card.className = "glass-panel post-card";
        
        let commentListHTML = post.comments.map(c => `
          <div class="comment-item">
            <div class="comment-bubble">
              <h5>${c.author}</h5>
              <p>${c.text}</p>
            </div>
          </div>
        `).join('');

        card.innerHTML = `
          <div class="post-header">
            <div class="post-author-info">
              <img src="${post.authorAvatar}" class="post-avatar" alt="Avatar">
              <div class="post-meta">
                <h4>${post.authorName}</h4>
                <p>${post.time}</p>
              </div>
            </div>
            <span class="post-badge">${post.tag}</span>
          </div>
          <div class="post-content">
            <p>${post.content}</p>
          </div>
          ${post.image ? `<img src="${post.image}" class="post-image" alt="Post graphic">` : ''}
          <div class="post-stats">
            <span>👍 <span class="likes-count-${post.id}">${post.likes}</span> Likes</span>
            <span>💬 ${post.comments.length} Comments</span>
          </div>
          <div class="post-actions">
            <button class="post-action-btn ${post.likedByUser ? 'liked' : ''}" data-post-id="${post.id}">
              <i class='bx bx-like'></i> Like
            </button>
            <button class="post-action-btn focus-comment"><i class='bx bx-comment'></i> Comment</button>
          </div>
          <div class="post-comments-section">
            <div class="comments-list">${commentListHTML}</div>
            <div class="comment-input-container">
              <img src="${userObj.avatar}" class="comment-avatar" alt="User">
              <input type="text" class="comment-input" placeholder="Write a comment..." data-post-id="${post.id}">
            </div>
          </div>
        `;

        card.querySelector(".post-action-btn[data-post-id]").addEventListener("click", (e) => {
          const btn = e.currentTarget;
          const postId = btn.getAttribute("data-post-id");
          toggleLike(postId, btn);
        });

        card.querySelector(".focus-comment").addEventListener("click", () => {
          card.querySelector(".comment-input").focus();
        });

        card.querySelector(".comment-input").addEventListener("keypress", (e) => {
          if (e.key === "Enter" && e.target.value.trim() !== "") {
            addComment(post.id, e.target.value);
            e.target.value = "";
          }
        });

        postsListContainer.appendChild(card);
      });
    }

    container.appendChild(postsListContainer);

    document.getElementById("publishPostBtn").addEventListener("click", () => {
      const postText = document.getElementById("postInput").value;
      const postTag = document.getElementById("postTagSelector").value;
      if (postText.trim() !== "") {
        publishPost(postText, postTag);
      }
    });
  }

  function publishPost(content, tag) {
    const userObj = getCurrentUserObject();
    if (!userObj) return;

    const newPost = {
      id: "post_" + (window.MediConnectDB.posts.length + 1),
      authorName: userObj.name,
      authorRole: state.currentRole,
      authorAvatar: userObj.avatar,
      time: "Just now",
      tag: tag,
      content: content,
      image: null,
      likes: 0,
      likedByUser: false,
      comments: []
    };
    
    window.MediConnectDB.posts.unshift(newPost);
    window.saveMediConnectDB();
    renderFeed(document.getElementById("mainContentArea"));
  }

  function toggleLike(postId, button) {
    const post = window.MediConnectDB.posts.find(p => p.id === postId);
    if (!post) return;

    if (post.likedByUser) {
      post.likes--;
      post.likedByUser = false;
      button.classList.remove("liked");
    } else {
      post.likes++;
      post.likedByUser = true;
      button.classList.add("liked");
    }

    window.saveMediConnectDB();
    document.querySelector(`.likes-count-${postId}`).innerText = post.likes;
  }

  function addComment(postId, commentText) {
    const post = window.MediConnectDB.posts.find(p => p.id === postId);
    if (!post) return;

    const userObj = getCurrentUserObject();
    if (!userObj) return;

    post.comments.push({
      author: userObj.name,
      text: commentText
    });

    window.saveMediConnectDB();
    navigateTo("feed");
  }

  // --- PROFILE VIEWER ---
  function renderProfile(container) {
    const userObj = getCurrentUserObject();
    if (!userObj) return;

    if (state.currentRole === "patient") {
      container.innerHTML = `
        <div class="glass-panel post-card" style="text-align: center; padding: 30px;">
          <img src="${userObj.avatar}" style="width: 110px; height: 110px; border-radius:50%; object-fit:cover; border: 4px solid var(--color-patient); box-shadow: var(--accent-glow);" alt="Avatar">
          <h2 style="margin-top:16px;">${userObj.name}</h2>
          <p style="color:var(--text-secondary); margin-bottom:12px;">Role: Patient</p>
          <p style="font-style: italic; max-width: 500px; margin: 0 auto;">"${userObj.bio}"</p>
        </div>

        <div class="glass-panel">
          <div class="panel-header">
            <h3 class="panel-title"><i class='bx bx-trophy' style="color:var(--color-warning);"></i> Health Gamification Tracker</h3>
          </div>
          <div class="patient-stats-grid" style="grid-template-columns: 1fr 1fr;">
            <div class="stat-card" style="display:flex; flex-direction:column; align-items:center; text-align:center;">
              <span class="stat-icon water"><i class='bx bx-water'></i></span>
              <div style="margin-top:8px;">
                <span class="stat-value" id="waterVal">${state.hydrationCount}/8 Cups</span>
                <p class="stat-label">Daily Hydration Goal</p>
              </div>
              <button class="btn-primary" id="addWaterBtn" style="margin-top:10px; padding: 4px 12px; font-size:12px;">💧 Drink 1 Cup</button>
            </div>
            <div class="stat-card" style="display:flex; flex-direction:column; align-items:center; text-align:center;">
              <span class="stat-icon steps"><i class='bx bx-walk'></i></span>
              <div style="margin-top:8px;">
                <span class="stat-value" id="stepsVal">${state.stepsCount.toLocaleString()} / 10,000</span>
                <p class="stat-label">Daily Walking Steps</p>
              </div>
              <button class="btn-primary" id="addStepsBtn" style="margin-top:10px; padding: 4px 12px; font-size:12px;">🏃 Walk 1,000 Steps</button>
            </div>
          </div>
          <h4 style="margin-bottom:8px;">Earned Achievements</h4>
          <div class="badge-rack" id="badgeRack">
            ${renderBadgesList()}
          </div>
        </div>

        <div class="patient-stats-grid">
          <div class="stat-card">
            <span class="stat-icon bp"><i class='bx bx-heart'></i></span>
            <div>
              <span class="stat-value">${userObj.healthStats.bloodPressure}</span>
              <p class="stat-label">Blood Pressure</p>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon hr"><i class='bx bx-pulse'></i></span>
            <div>
              <span class="stat-value">${userObj.healthStats.heartRate}</span>
              <p class="stat-label">Pulse Rate</p>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon sugar"><i class='bx bx-test-tube'></i></span>
            <div>
              <span class="stat-value">${userObj.healthStats.bloodSugar}</span>
              <p class="stat-label">Fasting Glucose</p>
            </div>
          </div>
        </div>

        <div class="responsive-grid-equal" style="margin-bottom: 20px;">
          <div class="glass-panel">
            <div class="panel-header">
              <h3 class="panel-title"><i class='bx bx-notepad'></i> Medical Diagnoses</h3>
            </div>
            <div class="data-table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Date Detected</th>
                    <th>Diagnosis</th>
                    <th>Severity</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${userObj.medicalHistory.map(h => `
                    <tr>
                      <td>${h.date}</td>
                      <td><strong>${h.condition}</strong></td>
                      <td>${h.severity}</td>
                      <td><span class="apt-status-badge completed" style="background-color:rgba(13,148,136,0.15); color:var(--color-patient);">${h.status}</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div class="glass-panel">
            <div class="panel-header">
              <h3 class="panel-title"><i class='bx bx-capsule'></i> Current Prescriptions</h3>
            </div>
            <div class="data-table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Dosage</th>
                    <th>Prescribing Doctor</th>
                    <th>Refills Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  ${userObj.prescriptions.map(p => `
                    <tr>
                      <td><strong>${p.medicine}</strong></td>
                      <td>${p.dosage}</td>
                      <td>${p.doctor}</td>
                      <td>${p.refills} Left</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="glass-panel">
          <div class="panel-header">
            <h3 class="panel-title"><i class='bx bx-history'></i> Health Milestones & Timeline</h3>
          </div>
          <div class="medical-timeline">
            ${userObj.timeline.map(e => `
              <div class="timeline-event">
                <span class="timeline-dot"></span>
                <div class="timeline-event-header">
                  <span>${e.date}</span>
                  <span style="text-transform: uppercase; font-size:9px; font-weight:700;">${e.type}</span>
                </div>
                <h4>${e.title}</h4>
                <p>${e.desc}</p>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      document.getElementById("addWaterBtn").addEventListener("click", () => {
        state.hydrationCount = Math.min(8, state.hydrationCount + 1);
        userObj.healthStats.hydration = state.hydrationCount;
        window.saveMediConnectDB();
        document.getElementById("waterVal").innerText = `${state.hydrationCount}/8 Cups`;
        checkGamificationBadges();
      });

      document.getElementById("addStepsBtn").addEventListener("click", () => {
        state.stepsCount += 1000;
        userObj.healthStats.steps = state.stepsCount;
        window.saveMediConnectDB();
        document.getElementById("stepsVal").innerText = `${state.stepsCount.toLocaleString()} / 10,000`;
        checkGamificationBadges();
      });

    } else if (state.currentRole === "doctor") {
      container.innerHTML = `
        <div class="glass-panel post-card" style="text-align: center; padding: 30px;">
          <img src="${userObj.avatar}" style="width: 110px; height: 110px; border-radius:50%; object-fit:cover; border: 4px solid var(--color-doctor); box-shadow: var(--accent-glow);" alt="Avatar">
          <h2 style="margin-top:16px;">${userObj.name}</h2>
          <p style="color:var(--text-secondary); margin-bottom:6px;"><strong>Specialization:</strong> ${userObj.specialization}</p>
          <p style="color:var(--text-secondary); margin-bottom:12px;"><strong>Credentials:</strong> ${userObj.credentials}</p>
          <p style="font-style: italic; max-width: 500px; margin: 0 auto;">"${userObj.bio}"</p>
        </div>

        <div class="glass-panel">
          <div class="panel-header">
            <h3 class="panel-title"><i class='bx bx-award'></i> Career Achievements & Publications</h3>
          </div>
          <ul style="padding-left:20px; display:flex; flex-direction:column; gap:10px; font-size:14px; line-height:1.5;">
            ${userObj.achievements.length > 0 ? userObj.achievements.map(a => `<li>${a}</li>`).join('') : `<li>No publications logged yet.</li>`}
          </ul>
        </div>

        <div class="glass-panel">
          <div class="panel-header">
            <h3 class="panel-title"><i class='bx bx-time'></i> Consulting & Availability Schedule</h3>
          </div>
          <div style="background-color:var(--bg-app); padding:16px; border-radius: var(--border-radius-md); font-size:14px;">
            <p><strong>Weekly Available Hours:</strong></p>
            <p style="margin-top:6px; color: var(--color-doctor); font-weight:700;">${userObj.availability}</p>
            <p style="margin-top:12px; font-size:12px; color:var(--text-secondary);">To adjust consulting slots, contact the central admin coordinator.</p>
          </div>
        </div>
      `;
    } else if (state.currentRole === "staff") {
      container.innerHTML = `
        <div class="glass-panel post-card" style="text-align: center; padding: 30px;">
          <img src="${userObj.avatar}" style="width: 110px; height: 110px; border-radius:50%; object-fit:cover; border: 4px solid var(--color-staff); box-shadow: var(--accent-glow);" alt="Avatar">
          <h2 style="margin-top:16px;">${userObj.name}</h2>
          <p style="color:var(--text-secondary); margin-bottom:6px;"><strong>Role:</strong> ${userObj.department}</p>
          <p style="color:var(--text-secondary); margin-bottom:12px;"><strong>Shift:</strong> ${userObj.shift}</p>
          <p style="font-style: italic; max-width: 500px; margin: 0 auto;">"${userObj.bio}"</p>
        </div>

        <div class="glass-panel">
          <div class="panel-header">
            <h3 class="panel-title"><i class='bx bx-phone-call'></i> Emergency Operational Dispatch</h3>
          </div>
          <div style="background-color:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); padding:16px; border-radius: var(--border-radius-md); font-size:14px;">
            <p><strong>Primary Dispatch Contact Hotline:</strong></p>
            <p style="margin-top:6px; color: var(--color-emergency); font-weight:800; font-size:18px;">${userObj.emergencyContact}</p>
            <p style="margin-top:12px; font-size:12px; color:var(--text-secondary);">This phone number remains active for ICU alerts, cardiac crashes, and external ambulance arrivals.</p>
          </div>
        </div>
      `;
    }
  }

  function renderBadgesList() {
    const userObj = getCurrentUserObject();
    if (!userObj || !userObj.badges) return "";
    return userObj.badges.map(b => `
      <div class="badge-item">
        <span class="badge-item-icon">${b.icon}</span>
        <div class="badge-details">
          <h5>${b.name}</h5>
          <p>${b.desc}</p>
        </div>
      </div>
    `).join('');
  }

  function checkGamificationBadges() {
    const userObj = getCurrentUserObject();
    if (!userObj || userObj.role !== "patient") return;

    const badges = userObj.badges;
    let newBadge = null;

    if (state.hydrationCount >= 8 && !badges.some(b => b.id === "water_master")) {
      newBadge = { id: "water_master", name: "Water Master", icon: "🐳", desc: "Successfully completed daily 8-cup goal" };
    }
    if (state.stepsCount >= 10000 && !badges.some(b => b.id === "steps_master")) {
      newBadge = { id: "steps_master", name: "Fitness Guru", icon: "🏆", desc: "Reached 10,000 steps goal" };
    }

    if (newBadge) {
      badges.push(newBadge);
      window.saveMediConnectDB();
      if (state.currentView === "profile") {
        document.getElementById("badgeRack").innerHTML = renderBadgesList();
      }
      showToastNotification(`🏆 Achievement Unlocked: ${newBadge.name}!`);
    }
  }

  function showToastNotification(message) {
    const toast = document.createElement("div");
    toast.style.position = "fixed";
    toast.style.bottom = "24px";
    toast.style.left = "24px";
    toast.style.backgroundColor = "var(--bg-card)";
    toast.style.border = "2px solid var(--color-success)";
    toast.style.padding = "12px 20px";
    toast.style.borderRadius = "var(--border-radius-lg)";
    toast.style.boxShadow = "var(--card-shadow)";
    toast.style.zIndex = "3000";
    toast.style.fontFamily = "var(--font-heading)";
    toast.style.fontSize = "14px";
    toast.style.fontWeight = "700";
    toast.style.color = "var(--text-primary)";
    toast.innerHTML = `<span style="margin-right:8px;">🎉</span> ${message}`;
    
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.5s ease";
      setTimeout(() => toast.remove(), 500);
    }, 4000);
  }

  // --- COMMUNITIES & GROUPS PANEL (WITH MOBILE ROUTING) ---
  function renderGroups(container) {
    const activeGroup = window.MediConnectDB.groups.find(g => g.id === state.activeGroupId) || window.MediConnectDB.groups[0];
    const userObj = getCurrentUserObject();
    const currentUserName = userObj ? userObj.name : "Anonymous";
    const isMobile = window.innerWidth <= 768;

    let groupCardsHTML = window.MediConnectDB.groups.map(g => `
      <div class="glass-panel group-select-card ${g.id === activeGroup.id ? 'active' : ''}" data-group-id="${g.id}" style="cursor:pointer; margin-bottom:12px; padding:12px; border-left: 4px solid ${g.id === activeGroup.id ? 'var(--color-primary)' : 'transparent'};">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:24px;">${g.avatar}</span>
          <div>
            <h4 style="font-size:14px;">${g.name}</h4>
            <p style="font-size:11px; color:var(--text-secondary);">${g.members} members</p>
          </div>
        </div>
      </div>
    `).join('');

    let chatMessagesHTML = activeGroup.messages.map(m => `
      <div style="display:flex; flex-direction:column; margin-bottom:10px; align-items: ${m.sender === currentUserName ? 'flex-end' : 'flex-start'};">
        <div style="font-size:10px; color:var(--text-secondary); margin-bottom:2px;">${m.sender} • ${m.time}</div>
        <div class="chat-bubble ${m.sender === currentUserName ? 'outgoing' : 'incoming'}" style="max-width:70%;">
          ${m.text}
        </div>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="groups-main-layout" id="groupsLayoutContainer">
        <!-- Circle list left pane -->
        <div id="groupListPane" class="${state.mobileCircleChatActive ? 'circle-list-hidden' : ''}" style="overflow-y:auto; padding-right:8px;">
          <h3 style="margin-bottom:12px; font-size:15px; text-transform:uppercase; color:var(--text-secondary);">Health Circles</h3>
          ${groupCardsHTML}
        </div>
        
        <!-- Discussion chat board right pane -->
        <div class="glass-panel ${!state.mobileCircleChatActive ? 'circle-chat-hidden' : 'circle-chat-full'}" id="groupChatPane" style="display:flex; flex-direction:column; height:100%;">
          <div class="panel-header" style="margin-bottom:10px;">
            <div>
              <h3 class="panel-title">
                ${isMobile ? `<i class='bx bx-left-arrow-alt' id="backToCircleListBtn" style="cursor:pointer; margin-right:8px; font-size:24px; vertical-align:middle;"></i>` : ''}
                ${activeGroup.avatar} ${activeGroup.name}
              </h3>
              <p style="font-size:12px; color:var(--text-secondary); margin-top:4px;">${activeGroup.description}</p>
            </div>
          </div>
          <div style="flex:1; overflow-y:auto; padding:12px; border:1px solid var(--border-color); border-radius: var(--border-radius-md); background-color:rgba(0,0,0,0.01);" id="groupChatContainer">
            ${chatMessagesHTML}
          </div>
          <div class="chat-box-input-container" style="padding:10px 0 0 0; border-top:none;">
            <input type="text" id="groupChatMsgInput" class="chat-box-input" placeholder="Post to the community board...">
            <button class="chat-box-send-btn" id="sendGroupMsgBtn"><i class='bx bxs-send'></i></button>
          </div>
        </div>
      </div>
    `;

    const gc = document.getElementById("groupChatContainer");
    if (gc) gc.scrollTop = gc.scrollHeight;

    // Mobile back button binding
    const backBtn = container.querySelector("#backToCircleListBtn");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        state.mobileCircleChatActive = false;
        renderGroups(container);
      });
    }

    container.querySelectorAll(".group-select-card").forEach(card => {
      card.addEventListener("click", () => {
        state.activeGroupId = card.getAttribute("data-group-id");
        state.mobileCircleChatActive = true; // maximize chat on mobile viewports
        renderGroups(container);
      });
    });

    const input = document.getElementById("groupChatMsgInput");
    const sendBtn = document.getElementById("sendGroupMsgBtn");

    const sendMessage = () => {
      if (input.value.trim() !== "") {
        activeGroup.messages.push({
          sender: currentUserName,
          time: "Just now",
          text: input.value
        });
        window.saveMediConnectDB();
        input.value = "";
        renderGroups(container);
      }
    };

    if (sendBtn) sendBtn.addEventListener("click", sendMessage);
    if (input) input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendMessage();
    });
  }

  // --- APPOINTMENTS SCHEDULER ---
  function renderAppointments(container) {
    const userObj = getCurrentUserObject();
    if (!userObj) return;

    if (state.currentRole === "patient") {
      let docsOptions = window.MediConnectDB.directory
        .filter(d => d.role === "doctor")
        .map(d => `<option value="${d.name}">${d.name} (${d.specialization})</option>`)
        .join('');

      let aptsRows = window.MediConnectDB.appointments
        .filter(a => a.patientName === userObj.name)
        .map(a => `
          <tr>
            <td><strong>${a.doctor}</strong></td>
            <td>${a.date}</td>
            <td>${a.time}</td>
            <td>${a.reason}</td>
            <td><span class="apt-status-badge ${a.status.toLowerCase()}">${a.status}</span></td>
          </tr>
        `).join('');

      container.innerHTML = `
        <div class="responsive-grid-split">
          <div class="glass-panel">
            <div class="panel-header">
              <h3 class="panel-title"><i class='bx bx-calendar-plus'></i> Schedule Appointment</h3>
            </div>
            <div class="form-group">
              <label for="aptDoctor">Select Consultant</label>
              <select id="aptDoctor" class="form-control">${docsOptions}</select>
            </div>
            <div class="form-group">
              <label for="aptDate">Preferred Date</label>
              <input type="date" id="aptDate" class="form-control" min="2026-06-08">
            </div>
            <div class="form-group">
              <label for="aptTime">Preferred Time Slot</label>
              <select id="aptTime" class="form-control">
                <option value="09:00 AM">09:00 AM</option>
                <option value="10:00 AM">10:00 AM</option>
                <option value="11:00 AM">11:00 AM</option>
                <option value="01:30 PM">01:30 PM</option>
                <option value="02:30 PM">02:30 PM</option>
                <option value="03:30 PM">03:30 PM</option>
              </select>
            </div>
            <div class="form-group">
              <label for="aptReason">Reason for Consultation</label>
              <input type="text" id="aptReason" class="form-control" placeholder="e.g. Checkup, Glucose spike">
            </div>
            <button class="btn-primary" id="bookAptBtn" style="width:100%; margin-top:12px;">Confirm Reservation</button>
          </div>

          <div class="glass-panel">
            <div class="panel-header">
              <h3 class="panel-title"><i class='bx bx-calendar'></i> My Scheduled Visits</h3>
            </div>
            <div class="data-table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${aptsRows || `<tr><td colspan="5" style="text-align:center; color:var(--text-secondary);">No scheduled appointments found.</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      document.getElementById("bookAptBtn").addEventListener("click", () => {
        const doctor = document.getElementById("aptDoctor").value;
        const date = document.getElementById("aptDate").value;
        const time = document.getElementById("aptTime").value;
        const reason = document.getElementById("aptReason").value;

        if (!date || !reason) {
          alert("Please fill in all the details.");
          return;
        }

        const newApt = {
          id: "apt_" + (window.MediConnectDB.appointments.length + 1),
          patientName: userObj.name,
          age: userObj.age || 45,
          doctor: doctor,
          date: date,
          time: time,
          reason: reason,
          status: "Scheduled"
        };

        window.MediConnectDB.appointments.push(newApt);
        window.saveMediConnectDB();
        showToastNotification("Appointment booked successfully!");
        renderAppointments(container);
        renderSidebarNav();
      });

    } else if (state.currentRole === "doctor") {
      let aptsRows = window.MediConnectDB.appointments
        .filter(a => a.doctor === userObj.name)
        .map(a => `
          <tr>
            <td><strong>${a.patientName}</strong></td>
            <td>${a.age}</td>
            <td>${a.date}</td>
            <td>${a.time}</td>
            <td>${a.reason}</td>
            <td><span class="apt-status-badge ${a.status.toLowerCase()}">${a.status}</span></td>
            <td>
              ${a.status === "Scheduled" ? `
                <button class="btn-primary complete-apt-btn" data-apt-id="${a.id}" style="padding:4px 8px; font-size:11px; background-color:var(--color-success);">Complete</button>
                <button class="btn-primary cancel-apt-btn" data-apt-id="${a.id}" style="padding:4px 8px; font-size:11px; background-color:var(--color-emergency); margin-left:4px;">Cancel</button>
              ` : '—'}
            </td>
          </tr>
        `).join('');

      container.innerHTML = `
        <div class="glass-panel" style="margin-bottom: 20px;">
          <div class="panel-header">
            <h3 class="panel-title"><i class='bx bx-calendar'></i> My Consultation Agenda</h3>
          </div>
          <div class="data-table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Patient Name</th>
                  <th>Age</th>
                  <th>Date</th>
                  <th>Time slot</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${aptsRows || `<tr><td colspan="7" style="text-align:center; color:var(--text-secondary);">No client appointments allocated.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>

        <div class="glass-panel">
          <div class="panel-header">
            <h3 class="panel-title"><i class='bx bx-notepad'></i> Quick Update Patient Diagnosis & Prescription</h3>
          </div>
          <div class="responsive-grid-equal">
            <div>
              <div class="form-group">
                <label>Select Patient</label>
                <select id="updatePatientSelect" class="form-control">
                  <option value="patient_john">John Doe (Active Record)</option>
                </select>
              </div>
              <div class="form-group">
                <label>Add Diagnostic Diagnosis</label>
                <input type="text" id="newDiagnosisInput" class="form-control" placeholder="e.g. Moderate Cholesterol">
              </div>
              <div class="form-group">
                <label>Diagnosis Severity</label>
                <select id="severitySelect" class="form-control">
                  <option value="Mild">Mild</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Severe">Severe</option>
                </select>
              </div>
              <button class="btn-primary" id="saveDiagnosisBtn" style="margin-top:8px;">Add Diagnosis Log</button>
            </div>
            
            <div>
              <div class="form-group">
                <label>Prescribe Medicine</label>
                <input type="text" id="rxMedicine" class="form-control" placeholder="e.g. Lipitor 10mg">
              </div>
              <div class="form-group">
                <label>Dosage & Instructions</label>
                <input type="text" id="rxDosage" class="form-control" placeholder="e.g. 1 tablet daily with dinner">
              </div>
              <div class="form-group">
                <label>Refills Allowed</label>
                <input type="number" id="rxRefills" class="form-control" value="2" min="0">
              </div>
              <button class="btn-primary" id="saveRxBtn" style="margin-top:8px;">Issue Prescription</button>
            </div>
          </div>
        </div>
      `;

      container.querySelectorAll(".complete-apt-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const aptId = btn.getAttribute("data-apt-id");
          const apt = window.MediConnectDB.appointments.find(a => a.id === aptId);
          if (apt) apt.status = "Completed";
          window.saveMediConnectDB();
          renderAppointments(container);
          renderSidebarNav();
        });
      });

      container.querySelectorAll(".cancel-apt-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const aptId = btn.getAttribute("data-apt-id");
          const apt = window.MediConnectDB.appointments.find(a => a.id === aptId);
          if (apt) apt.status = "Cancelled";
          window.saveMediConnectDB();
          renderAppointments(container);
          renderSidebarNav();
        });
      });

      document.getElementById("saveDiagnosisBtn").addEventListener("click", () => {
        const cond = document.getElementById("newDiagnosisInput").value;
        const sev = document.getElementById("severitySelect").value;
        if (!cond) return;

        window.MediConnectDB.users.patient.medicalHistory.unshift({
          date: new Date().toISOString().split("T")[0],
          condition: cond,
          severity: sev,
          status: "Managed"
        });

        window.MediConnectDB.users.patient.timeline.unshift({
          date: new Date().toISOString().split("T")[0],
          type: "visit",
          title: "Diagnosis Updated",
          desc: `Dr. Sarah Lin recorded a new diagnostic log: ${cond} (${sev}).`
        });

        window.saveMediConnectDB();
        showToastNotification("Diagnosis log recorded!");
        document.getElementById("newDiagnosisInput").value = "";
      });

      document.getElementById("saveRxBtn").addEventListener("click", () => {
        const med = document.getElementById("rxMedicine").value;
        const dos = document.getElementById("rxDosage").value;
        const ref = parseInt(document.getElementById("rxRefills").value) || 0;

        if (!med || !dos) return;

        window.MediConnectDB.users.patient.prescriptions.unshift({
          id: "rx_" + (window.MediConnectDB.users.patient.prescriptions.length + 1),
          medicine: med,
          dosage: dos,
          duration: "Ongoing",
          refills: ref,
          doctor: userObj.name,
          status: "Active"
        });

        window.MediConnectDB.users.patient.timeline.unshift({
          date: new Date().toISOString().split("T")[0],
          type: "visit",
          title: "Prescription Issued",
          desc: `Issued new prescription: ${med} (${dos}).`
        });

        window.saveMediConnectDB();
        showToastNotification("New prescription issued!");
        document.getElementById("rxMedicine").value = "";
        document.getElementById("rxDosage").value = "";
      });
    }
  }

  // --- HOSPITAL RECORDS / WARD BED ALLOCATION ---
  function renderRecordsWards(container) {
    const userObj = getCurrentUserObject();
    let doctorName = userObj ? userObj.name : "Dr. Sarah Lin";

    let wardsHTML = window.MediConnectDB.beds.map((w, idx) => {
      let percent = Math.round((w.occupied / w.total) * 100);
      let listBeds = w.details.map(b => `
        <div style="padding: 10px; background-color: var(--bg-app); border-radius: var(--border-radius-sm); border:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong>${b.bed}</strong>: ${b.patient} <span style="font-size:11px; color:var(--text-secondary);">(${b.condition})</span>
          </div>
          <div style="font-size:11px; color:var(--text-secondary);">Doctor: ${b.doctor}</div>
        </div>
      `).join('');

      return `
        <div class="glass-panel" style="margin-bottom:20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <h4>${w.ward}</h4>
            <span style="font-size:13px; font-weight:700;">${w.occupied}/${w.total} Beds (${percent}%)</span>
          </div>
          <div style="width:100%; height:8px; border-radius:4px; background-color:var(--border-color); overflow:hidden; margin-bottom:12px;">
            <div style="height:100%; width:${percent}%; background-color: ${percent > 80 ? 'var(--color-emergency)' : 'var(--color-primary)'};"></div>
          </div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${listBeds || `<p style="font-size:12px; color:var(--text-secondary);">No occupancy lists recorded.</p>`}
          </div>
          ${state.currentRole === "staff" ? `
            <button class="btn-primary allocate-bed-btn" data-ward-idx="${idx}" style="margin-top:12px; padding: 4px 10px; font-size:12px;">Allocate Bed</button>
          ` : ''}
        </div>
      `;
    }).join('');

    let pharmacyRows = window.MediConnectDB.pharmacy.map(p => `
      <tr>
        <td><strong>${p.name}</strong></td>
        <td>${p.category}</td>
        <td>${p.stock} ${p.unit}</td>
        <td>${p.location}</td>
        <td><span class="inventory-badge ${p.status.toLowerCase().replace(' ', '-')}">${p.status}</span></td>
        ${state.currentRole === "staff" ? `
          <td>
            <button class="btn-primary restock-btn" data-ph-id="${p.id}" style="padding: 4px 8px; font-size:11px;">Restock +100</button>
          </td>
        ` : ''}
      </tr>
    `).join('');

    container.innerHTML = `
      <div class="responsive-grid-records">
        <div>
          <h3 style="margin-bottom:12px; font-size:16px; text-transform:uppercase; color:var(--text-secondary);">Ward Bed Allocations</h3>
          ${wardsHTML}
        </div>

        <div class="glass-panel">
          <div class="panel-header">
            <h3 class="panel-title"><i class='bx bx-plus-medical'></i> Pharmacy & Medicine Catalog</h3>
          </div>
          <div class="data-table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th>Category</th>
                  <th>Stock Count</th>
                  <th>Shelving</th>
                  <th>Status</th>
                  ${state.currentRole === "staff" ? `<th>Control</th>` : ''}
                </tr>
              </thead>
              <tbody>
                ${pharmacyRows}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    container.querySelectorAll(".restock-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const phId = btn.getAttribute("data-ph-id");
        const med = window.MediConnectDB.pharmacy.find(p => p.id === phId);
        if (med) {
          med.stock += 100;
          med.status = med.stock > 100 ? "In Stock" : "Low Stock";
          window.saveMediConnectDB();
          showToastNotification(`Restocked ${med.name} by +100!`);
          renderRecordsWards(container);
        }
      });
    });

    container.querySelectorAll(".allocate-bed-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const wardIdx = parseInt(btn.getAttribute("data-ward-idx"));
        const ward = window.MediConnectDB.beds[wardIdx];

        if (ward.occupied >= ward.total) {
          alert("Ward is full!");
          return;
        }

        const patientName = prompt("Enter Patient Name:");
        if (!patientName) return;
        const condition = prompt("Enter Patient Condition:");

        ward.occupied++;
        const newBedNum = "Bed " + (ward.details.length + 1).toString().padStart(2, '0');
        ward.details.push({
          bed: newBedNum,
          patient: patientName,
          condition: condition || "General recovery",
          doctor: doctorName
        });

        window.saveMediConnectDB();
        showToastNotification(`Bed allocated for ${patientName} in ${ward.ward}!`);
        renderRecordsWards(container);
      });
    });
  }

  // --- MEMBER REGISTRATION DASHBOARDS ---
  function renderRegisterMember(container) {
    container.innerHTML = `
      <div class="glass-panel">
        <div class="panel-header">
          <h3 class="panel-title"><i class='bx bx-user-plus'></i> Register Hospital Member</h3>
        </div>
        <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px;">
          As a medical doctor, you have permissions to register new **Patients**, **Staff members**, and other **Doctors**.
        </p>

        <!-- Form Toggle Subtabs -->
        <div class="register-tabs">
          <button class="register-tab-btn active" data-reg-role="patient">Patient Onboarding</button>
          <button class="register-tab-btn" data-reg-role="doctor">Doctor Onboarding</button>
          <button class="register-tab-btn" data-reg-role="staff">Staff Onboarding</button>
        </div>

        <div id="registrationFormContainer">
          <!-- Rendered dynamically -->
        </div>
      </div>
    `;

    const formContainer = document.getElementById("registrationFormContainer");
    const tabs = container.querySelectorAll(".register-tab-btn");
    
    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        loadForm(tab.getAttribute("data-reg-role"), formContainer);
      });
    });

    loadForm("patient", formContainer);
  }

  function renderRegisterPatient(container) {
    container.innerHTML = `
      <div class="glass-panel">
        <div class="panel-header">
          <h3 class="panel-title"><i class='bx bx-user-plus'></i> Onboard New Patient</h3>
        </div>
        <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px;">
          As operational staff, you have permissions to register new patient profiles into the central repository.
        </p>
        <div id="registrationFormContainer">
          <!-- Load Patient form directly -->
        </div>
      </div>
    `;
    loadForm("patient", document.getElementById("registrationFormContainer"));
  }

  function loadForm(role, formContainer) {
    if (role === "patient") {
      formContainer.innerHTML = `
        <div class="responsive-grid-equal">
          <div class="form-group">
            <label>Patient Full Name</label>
            <input type="text" id="regPatName" class="form-control" placeholder="e.g. Robert Smith">
          </div>
          <div class="form-group">
            <label>Patient Username / ID</label>
            <input type="text" id="regPatUsername" class="form-control" placeholder="e.g. robert_smith">
          </div>
          <div class="form-group" style="grid-column: span 1;">
            <label>Initial Blood Pressure</label>
            <input type="text" id="regPatBP" class="form-control" value="120/80 mmHg">
          </div>
          <div class="form-group">
            <label>Initial Glucose (mg/dL)</label>
            <input type="text" id="regPatSugar" class="form-control" value="95 mg/dL">
          </div>
          <div class="form-group" style="grid-column: span 1;">
            <label>Primary Diagnosis (if any)</label>
            <input type="text" id="regPatDiagnosis" class="form-control" placeholder="e.g. Mild Hypertension">
          </div>
          <div class="form-group">
            <label>Profile Bio & Medical Notes</label>
            <input type="text" id="regPatBio" class="form-control" placeholder="Brief statement about health background.">
          </div>
        </div>
        <button class="btn-primary" id="submitRegBtn" style="margin-top:20px; width:100%; padding:10px;">Register Patient Profile</button>
      `;
    } else if (role === "doctor") {
      formContainer.innerHTML = `
        <div class="responsive-grid-equal">
          <div class="form-group">
            <label>Doctor Full Name</label>
            <input type="text" id="regDocFormName" class="form-control" placeholder="e.g. Dr. John Watson">
          </div>
          <div class="form-group">
            <label>Doctor Username / ID</label>
            <input type="text" id="regDocFormUsername" class="form-control" placeholder="e.g. dr_watson">
          </div>
          <div class="form-group">
            <label>Specialization Department</label>
            <input type="text" id="regDocFormSpecialty" class="form-control" placeholder="e.g. General Pediatrics">
          </div>
          <div class="form-group">
            <label>Medical Credentials</label>
            <input type="text" id="regDocFormCredentials" class="form-control" placeholder="e.g. MD, FACP">
          </div>
          <div class="form-group" style="grid-column: span 1;">
            <label>Doctor Bio</label>
            <input type="text" id="regDocFormBio" class="form-control" placeholder="Special interest in diagnostics.">
          </div>
        </div>
        <button class="btn-primary" id="submitRegBtn" style="margin-top:20px; width:100%; padding:10px;">Register Doctor Profile</button>
      `;
    } else if (role === "staff") {
      formContainer.innerHTML = `
        <div class="responsive-grid-equal">
          <div class="form-group">
            <label>Staff Full Name</label>
            <input type="text" id="regStaffFormName" class="form-control" placeholder="e.g. Clara Croft">
          </div>
          <div class="form-group">
            <label>Staff Username / ID</label>
            <input type="text" id="regStaffFormUsername" class="form-control" placeholder="e.g. staff_clara">
          </div>
          <div class="form-group">
            <label>Department / Assignment</label>
            <input type="text" id="regStaffFormDept" class="form-control" placeholder="e.g. Pharmacy Division">
          </div>
          <div class="form-group">
            <label>Shift Schedule</label>
            <input type="text" id="regStaffFormShift" class="form-control" value="Day Shift (08:00 AM - 05:00 PM)">
          </div>
          <div class="form-group" style="grid-column: span 1;">
            <label>Staff Bio</label>
            <input type="text" id="regStaffFormBio" class="form-control" placeholder="Experienced clinical operations manager.">
          </div>
        </div>
        <button class="btn-primary" id="submitRegBtn" style="margin-top:20px; width:100%; padding:10px;">Register Staff Profile</button>
      `;
    }

    document.getElementById("submitRegBtn").addEventListener("click", () => {
      handleOnboardingSubmission(role);
    });
  }

  function handleOnboardingSubmission(role) {
    if (role === "patient") {
      const name = document.getElementById("regPatName").value.trim();
      const username = document.getElementById("regPatUsername").value.trim().toLowerCase();
      const bio = document.getElementById("regPatBio").value.trim();
      const bp = document.getElementById("regPatBP").value;
      const sugar = document.getElementById("regPatSugar").value;
      const diag = document.getElementById("regPatDiagnosis").value.trim();

      if (!name || !username) {
        alert("Please enter Name and Username.");
        return;
      }

      if (window.MediConnectDB.directory.some(u => u.id === username)) {
        alert("Username already exists.");
        return;
      }

      const currentDocObj = getCurrentUserObject();
      const authorizedBy = currentDocObj ? currentDocObj.name : "Authorized Personnel";

      const newPatient = {
        id: username,
        role: "patient",
        name: name,
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80",
        bio: bio || "New patient registered into MediConnect.",
        healthStats: {
          bloodPressure: bp || "120/80 mmHg",
          heartRate: "72 bpm",
          bloodSugar: sugar || "95 mg/dL",
          steps: 0,
          hydration: 0
        },
        badges: [],
        medicalHistory: diag ? [{ date: new Date().toISOString().split("T")[0], condition: diag, severity: "Mild", status: "Managed" }] : [],
        prescriptions: [],
        labReports: [],
        timeline: [{ date: new Date().toISOString().split("T")[0], type: "visit", title: "Patient Registered", desc: "Profile added to database by " + authorizedBy }]
      };

      registerNewUser(newPatient);
      showToastNotification(`Registered Patient: ${name}`);
      
      if (state.currentRole === "doctor") {
        renderRegisterMember(document.getElementById("mainContentArea"));
      } else {
        renderRegisterPatient(document.getElementById("mainContentArea"));
      }

    } else if (role === "doctor") {
      const name = document.getElementById("regDocFormName").value.trim();
      const username = document.getElementById("regDocFormUsername").value.trim().toLowerCase();
      const specialty = document.getElementById("regDocFormSpecialty").value.trim();
      const credentials = document.getElementById("regDocFormCredentials").value.trim();
      const bio = document.getElementById("regDocFormBio").value.trim();

      if (!name || !username) {
        alert("Please enter Name and Username.");
        return;
      }

      if (window.MediConnectDB.directory.some(u => u.id === username)) {
        alert("Username already exists.");
        return;
      }

      const newDoctor = {
        id: username,
        role: "doctor",
        name: name,
        avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=150&h=150&q=80",
        bio: bio || "Consultant physician.",
        specialization: specialty || "General Medicine",
        credentials: credentials || "MD",
        availability: "Mon, Wed, Fri - 09:00 AM to 05:00 PM",
        achievements: ["Registered by " + getCurrentUserObject()?.name]
      };

      registerNewUser(newDoctor);
      showToastNotification(`Registered Doctor: ${name}`);
      renderRegisterMember(document.getElementById("mainContentArea"));

    } else if (role === "staff") {
      const name = document.getElementById("regStaffFormName").value.trim();
      const username = document.getElementById("regStaffFormUsername").value.trim().toLowerCase();
      const dept = document.getElementById("regStaffFormDept").value.trim();
      const shift = document.getElementById("regStaffFormShift").value;
      const bio = document.getElementById("regStaffFormBio").value.trim();

      if (!name || !username) {
        alert("Please enter Name and Username.");
        return;
      }

      if (window.MediConnectDB.directory.some(u => u.id === username)) {
        alert("Username already exists.");
        return;
      }

      const newStaff = {
        id: username,
        role: "staff",
        name: name,
        avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=150&h=150&q=80",
        bio: bio || "Operational staff member.",
        department: dept || "General Support",
        shift: shift || "Day Shift",
        emergencyContact: "+1 (555) 000-0000"
      };

      registerNewUser(newStaff);
      showToastNotification(`Registered Staff: ${name}`);
      renderRegisterMember(document.getElementById("mainContentArea"));
    }
  }

  // --- CLINICAL ANALYTICS DASHBOARD ---
  function renderAnalytics(container) {
    container.innerHTML = `
      <div class="glass-panel">
        <div class="panel-header">
          <h3 class="panel-title"><i class='bx bx-trending-up'></i> Hospital Operational Analytics</h3>
        </div>
        <p style="font-size:13px; color:var(--text-secondary); margin-bottom:20px;">
          Weekly aggregate charts showing patient registration spikes, bed allocation percentages, and satisfaction survey responses.
        </p>

        <div class="analytics-grid">
          <div>
            <h4 style="margin-bottom:12px; text-align:center;">Bed Occupancy Ratio by Ward</h4>
            <div class="chart-wrapper">
              <canvas id="occupancyChart"></canvas>
            </div>
          </div>
          <div>
            <h4 style="margin-bottom:12px; text-align:center;">Weekly Patient Registrations</h4>
            <div class="chart-wrapper">
              <canvas id="registrationsChart"></canvas>
            </div>
          </div>
        </div>
      </div>

      <div class="glass-panel">
        <div class="panel-header">
          <h3 class="panel-title"><i class='bx bx-pie-chart-alt'></i> Department Resource Utilization</h3>
        </div>
        <div class="patient-stats-grid">
          <div class="stat-card" style="justify-content:space-between;">
            <div>
              <span class="stat-value">82%</span>
              <p class="stat-label">Cardiology Efficiency</p>
            </div>
            <span class="stat-icon bp"><i class='bx bx-heart'></i></span>
          </div>
          <div class="stat-card" style="justify-content:space-between;">
            <div>
              <span class="stat-value">64%</span>
              <p class="stat-label">Pediatrics Efficiency</p>
            </div>
            <span class="stat-icon steps"><i class='bx bx-user'></i></span>
          </div>
          <div class="stat-card" style="justify-content:space-between;">
            <div>
              <span class="stat-value">91%</span>
              <p class="stat-label">ICU Operational Load</p>
            </div>
            <span class="stat-icon hr"><i class='bx bx-pulse'></i></span>
          </div>
        </div>
      </div>
    `;

    setTimeout(() => {
      renderDashboardCharts();
    }, 100);
  }

  function renderDashboardCharts() {
    const occCtx = document.getElementById("occupancyChart")?.getContext("2d");
    if (!occCtx) return;

    const wardLabels = window.MediConnectDB.beds.map(w => w.ward);
    const wardOccupied = window.MediConnectDB.beds.map(w => w.occupied);
    const wardTotal = window.MediConnectDB.beds.map(w => w.total - w.occupied);

    new Chart(occCtx, {
      type: 'bar',
      data: {
        labels: wardLabels,
        datasets: [
          {
            label: 'Occupied Beds',
            data: wardOccupied,
            backgroundColor: 'rgba(124, 58, 237, 0.7)',
            borderColor: 'rgb(124, 58, 237)',
            borderWidth: 1
          },
          {
            label: 'Available Beds',
            data: wardTotal,
            backgroundColor: 'rgba(24, 119, 242, 0.2)',
            borderColor: 'rgba(24, 119, 242, 0.4)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true },
          y: { stacked: true, beginAtZero: true }
        }
      }
    });

    const regCtx = document.getElementById("registrationsChart")?.getContext("2d");
    if (!regCtx) return;

    new Chart(regCtx, {
      type: 'line',
      data: {
        labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        datasets: [{
          label: 'Outpatients Registered',
          data: [120, 150, 180, 140, 190, 90, 70],
          fill: true,
          borderColor: 'rgb(24, 119, 242)',
          backgroundColor: 'rgba(24, 119, 242, 0.1)',
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }

  // --- AI HEALTH ASSISTANT PANEL (TAB SYNCED) ---
  function renderAIAssistant(container) {
    container.innerHTML = `
      <div class="glass-panel" style="padding: 24px;">
        <div class="panel-header">
          <h3 class="panel-title"><i class='bx bx-bot' style="color:var(--color-patient);"></i> AI-Powered Health Companion</h3>
        </div>
        <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px;">
          Ask general medical queries, check drug side effects, or test healthy tips. Connected to live API when configured.
        </p>

        <div class="ai-chat-container">
          <div class="ai-chat-header">
            <div class="ai-avatar"><i class='bx bx-brain' style="color:white;"></i></div>
            <div class="ai-info">
              <h4>MediBot Assistant</h4>
              <p>Online • Real-Time Streaming AI</p>
            </div>
          </div>
          <div class="ai-messages" id="aiTabChatWindow">
            <!-- Synced with global chat history -->
          </div>
          <div class="ai-input-container">
            <input type="text" id="aiTabChatMsgInput" class="chat-box-input" style="padding:10px 14px;" placeholder="Ask MediBot something...">
            <button class="chat-box-send-btn" id="sendAiTabMsgBtn" style="font-size: 20px;"><i class='bx bxs-send'></i></button>
          </div>
        </div>
      </div>
    `;

    const input = document.getElementById("aiTabChatMsgInput");
    const sendBtn = document.getElementById("sendAiTabMsgBtn");
    const chatWindow = document.getElementById("aiTabChatWindow");

    // Sync messages from global chat
    syncAITabChatWindow();

    const handleAITabMessage = () => {
      const q = input.value.trim();
      if (!q) return;
      
      input.value = "";
      // Process through shared AI engine (which updates both logs)
      processAIQuery(q, chatWindow);
    };

    if (sendBtn) sendBtn.addEventListener("click", handleAITabMessage);
    if (input) input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") handleAITabMessage();
    });
  }

  function syncAITabChatWindow() {
    const tabWindow = document.getElementById("aiTabChatWindow");
    const globalMsgs = document.getElementById("globalAiChatMsgs");
    if (tabWindow && globalMsgs) {
      tabWindow.innerHTML = globalMsgs.innerHTML;
      tabWindow.scrollTop = tabWindow.scrollHeight;
    }
  }

  // --- FLOATING DIRECT CHAT (RIGHT SIDEBAR DIRECTORY) ---
  function renderRightSidebarDirectory() {
    const list = document.getElementById("directoryListContainer");
    if (!list) return;

    list.innerHTML = "";
    const filteredDirectory = window.MediConnectDB.directory.filter(u => u.id !== state.currentUser);

    filteredDirectory.forEach(user => {
      const item = document.createElement("div");
      item.className = "directory-item";
      item.setAttribute("data-user-id", user.id);
      
      const roleBadge = user.role === "doctor" ? `Doc - ${user.specialization}` : (user.role === "staff" ? user.department : "Patient");

      item.innerHTML = `
        <div class="directory-user-info">
          <div class="directory-avatar-container">
            <img src="${user.avatar}" class="directory-avatar" alt="Avatar">
            <span class="directory-status ${user.online ? 'online' : 'offline'}"></span>
          </div>
          <div class="directory-details">
            <h5>${user.name}</h5>
            <p>${roleBadge}</p>
          </div>
        </div>
        <i class='bx bx-message-rounded-dots directory-chat-icon'></i>
      `;

      item.addEventListener("click", () => openDirectChat(user.id));
      list.appendChild(item);
    });
  }

  function openDirectChat(userId) {
    state.activeChatUser = userId;
    const chatUserObj = window.MediConnectDB.directory.find(u => u.id === userId);
    if (!chatUserObj) return;

    let chatPanel = document.getElementById(`floatingChat_${userId}`);
    
    if (!chatPanel) {
      document.querySelectorAll(".floating-chat-box").forEach(box => {
        if (!box.classList.contains("global-ai-chat-box")) box.remove();
      });

      chatPanel = document.createElement("div");
      chatPanel.className = "floating-chat-box";
      chatPanel.id = `floatingChat_${userId}`;
      
      chatPanel.innerHTML = `
        <div class="chat-box-header" id="chatHeader_${userId}">
          <div class="chat-header-user">
            <img src="${chatUserObj.avatar}" class="chat-header-avatar" alt="Avatar">
            <div class="chat-header-title">
              <h4>${chatUserObj.name}</h4>
              <p>${chatUserObj.online ? 'Online' : 'Offline'}</p>
            </div>
          </div>
          <div class="chat-box-actions">
            <i class='bx bx-video-recording' id="startTelemedBtn_${userId}" style="cursor:pointer;" title="Telemedicine Call"></i>
            <i class='bx bx-minus' id="collapseChat_${userId}" style="cursor:pointer;"></i>
            <i class='bx bx-x' id="closeChat_${userId}" style="cursor:pointer;"></i>
          </div>
        </div>
        <div class="chat-box-messages" id="chatMsgs_${userId}"></div>
        <div class="chat-box-input-container">
          <input type="text" class="chat-box-input" id="chatInput_${userId}" placeholder="Type secure message...">
          <button class="chat-box-send-btn" id="sendBtn_${userId}"><i class='bx bxs-send'></i></button>
        </div>
      `;

      document.getElementById("chatDockContainer").appendChild(chatPanel);

      document.getElementById(`closeChat_${userId}`).addEventListener("click", (e) => {
        e.stopPropagation();
        chatPanel.remove();
        state.activeChatUser = null;
      });

      document.getElementById(`collapseChat_${userId}`).addEventListener("click", (e) => {
        e.stopPropagation();
        chatPanel.classList.toggle("collapsed");
      });

      document.getElementById(`chatHeader_${userId}`).addEventListener("click", () => {
        chatPanel.classList.toggle("collapsed");
      });

      document.getElementById(`startTelemedBtn_${userId}`).addEventListener("click", (e) => {
        e.stopPropagation();
        triggerTelemedCall(chatUserObj.name, chatUserObj.avatar);
      });

      const input = document.getElementById(`chatInput_${userId}`);
      const sendBtn = document.getElementById(`sendBtn_${userId}`);

      const handleSend = () => {
        const text = input.value.trim();
        if (!text) return;
        sendDirectMessage(userId, text);
        input.value = "";
      };

      sendBtn.addEventListener("click", handleSend);
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") handleSend();
      });
    } else {
      chatPanel.classList.remove("collapsed");
    }

    renderDirectMessages(userId);
  }

  function renderDirectMessages(userId) {
    const msgContainer = document.getElementById(`chatMsgs_${userId}`);
    if (!msgContainer) return;

    const history = window.MediConnectDB.chats[userId] || [];
    
    msgContainer.innerHTML = history.map(m => {
      const isOutgoing = m.sender !== userId;
      return `
        <div class="chat-bubble ${isOutgoing ? 'outgoing' : 'incoming'}">
          ${m.text}
        </div>
      `;
    }).join('');

    msgContainer.scrollTop = msgContainer.scrollHeight;
  }

  function sendDirectMessage(userId, messageText) {
    if (!window.MediConnectDB.chats[userId]) {
      window.MediConnectDB.chats[userId] = [];
    }

    const currentUserName = getCurrentUserObject()?.name || "User";

    window.MediConnectDB.chats[userId].push({
      sender: state.currentUser,
      text: messageText,
      time: "Just now"
    });

    window.saveMediConnectDB();
    renderDirectMessages(userId);

    setTimeout(() => {
      let replyText = "Hello! I am currently assisting other patients. I will check your message logs shortly.";
      
      if (userId === "doctor_sarah") {
        if (messageText.toLowerCase().includes("blood pressure") || messageText.toLowerCase().includes("bp")) {
          replyText = "Hello John, I see your message about blood pressure. Ensure you read it in a rested state, and record it twice daily. If it stays below 130/80, you are doing great!";
        } else {
          replyText = "Thank you John, message received. Keep logging your daily stats, and I'll review them during our session.";
        }
      } else if (userId === "staff_james") {
        replyText = "Message received. If this is an emergency, please use the Emergency Alert button at the top of the interface immediately!";
      }

      window.MediConnectDB.chats[userId].push({
        sender: userId,
        text: replyText,
        time: "Just now"
      });

      window.saveMediConnectDB();
      renderDirectMessages(userId);
    }, 2000);
  }

  // --- REAL-TIME AI STREAM COMPONENT ---
  async function queryLiveAI(prompt) {
    const provider = localStorage.getItem("mediconnect_ai_provider") || "gemini";
    const apiKey = localStorage.getItem("mediconnect_ai_api_key") || "";

    if (!apiKey) {
      throw new Error("No API Key configured.");
    }

    if (provider === "gemini") {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: {
            parts: [{ text: "You are MediBot, a helpful, real-time AI clinical assistant for the MediConnect social hospital network. Provide concise, clear, and structured medical advice, health tips, or operational guidelines. Format your response nicely using HTML tags like <strong> or <br/> for line breaks, NOT raw markdown tags (no * or # symbols), because the custom text streamer parses HTML. If asked diagnostic or prescription changes, always advise consultation with Dr. Sarah Lin or clinical coordinators. If asked operational metrics, cite typical clinic values (e.g. ICU load is 91%)." }]
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Gemini API Error: Status ${response.status}`);
      }
      
      const data = await response.json();
      if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
        return data.candidates[0].content.parts[0].text;
      } else {
        throw new Error("Invalid response format from Gemini API.");
      }
    } else {
      // OpenAI completion API call
      const url = "https://api.openai.com/v1/chat/completions";
      const response = await fetch(url, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are MediBot, a helpful, real-time AI clinical assistant for the MediConnect social hospital network. Provide concise, clear, and structured medical advice, health tips, or operational guidelines. Format your response nicely using HTML tags like <strong> or <br/> for line breaks, NOT raw markdown, because the custom text streamer parses HTML. If asked diagnostic or prescription changes, always advise consultation with Dr. Sarah Lin or clinical coordinators. If asked operational metrics, cite typical clinic values (e.g. ICU load is 91%)." },
            { role: "user", content: prompt }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API Error: Status ${response.status}`);
      }

      const data = await response.json();
      if (data.choices && data.choices[0].message) {
        return data.choices[0].message.content;
      } else {
        throw new Error("Invalid response format from OpenAI.");
      }
    }
  }

  function streamText(element, htmlContent, scrollContainer, callback) {
    element.innerHTML = "";
    let currentHTML = "";
    
    // HTML Tag-aware tokenizer
    const tokens = [];
    let i = 0;
    while (i < htmlContent.length) {
      if (htmlContent[i] === '<') {
        let tag = "";
        while (i < htmlContent.length && htmlContent[i] !== '>') {
          tag += htmlContent[i];
          i++;
        }
        if (i < htmlContent.length) {
          tag += '>';
          i++;
        }
        tokens.push({ type: 'tag', content: tag });
      } else {
        tokens.push({ type: 'char', content: htmlContent[i] });
        i++;
      }
    }

    let tokenIndex = 0;
    function nextToken() {
      if (tokenIndex < tokens.length) {
        const t = tokens[tokenIndex];
        currentHTML += t.content;
        element.innerHTML = currentHTML;
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
        tokenIndex++;
        
        // Instant speed for tags, small delay for text characters
        const delay = t.type === 'tag' ? 0 : 10;
        setTimeout(nextToken, delay);
      } else {
        if (callback) callback();
      }
    }
    nextToken();
  }

  async function processAIQuery(queryText, messageContainer) {
    // Shared container scrolling
    const scrollContainer = messageContainer;
    
    // 1. Add User message bubble
    const userBubble = document.createElement("div");
    userBubble.className = "chat-bubble outgoing";
    userBubble.innerText = queryText;
    messageContainer.appendChild(userBubble);
    scrollContainer.scrollTop = scrollContainer.scrollHeight;

    // 2. Add bouncing Typing indicator bubble
    const typingBubble = document.createElement("div");
    typingBubble.className = "typing-bubble";
    typingBubble.id = "tempTypingBubble";
    typingBubble.innerHTML = `
      <span style="font-size:11px; color:var(--text-secondary); margin-right:4px;">MediBot is typing</span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    `;
    messageContainer.appendChild(typingBubble);
    scrollContainer.scrollTop = scrollContainer.scrollHeight;

    // Trigger sync if the tab view is open
    if (state.currentView === "ai_assistant") {
      syncAITabChatWindow();
    }

    // 3. Fetch reply
    let responseText = "";
    try {
      const apiKey = localStorage.getItem("mediconnect_ai_api_key");
      if (apiKey && apiKey.trim() !== "") {
        responseText = await queryLiveAI(queryText);
      } else {
        // Fallback local clinical replies database
        await new Promise(resolve => setTimeout(resolve, 1200)); // typing delay
        responseText = getAIResponseText(queryText);
      }
    } catch (e) {
      console.error("MediBot live API error:", e);
      await new Promise(resolve => setTimeout(resolve, 1000));
      responseText = `⚠️ <strong>API Error:</strong> ${e.message} <br/><br/>Please check your API key credentials inside the settings drawer. Falling back to offline advice: <br/>${getAIResponseText(queryText)}`;
    }

    // 4. Remove typing bubble
    const indicator = document.getElementById("tempTypingBubble");
    if (indicator) indicator.remove();

    // 5. Stream Bot reply bubble
    const botBubble = document.createElement("div");
    botBubble.className = "chat-bubble incoming";
    messageContainer.appendChild(botBubble);

    streamText(botBubble, responseText, scrollContainer, () => {
      // Sync on complete
      if (state.currentView === "ai_assistant") {
        syncAITabChatWindow();
      }
    });
  }

  function getAIResponseText(query) {
    const q = query.toLowerCase();
    
    if (q.includes("metformin")) {
      return "💊 <strong>Metformin</strong> is an oral antidiabetic medication commonly prescribed for Type 2 Diabetes to improve insulin sensitivity. <br/><br/><strong>Common Side Effects:</strong> Nausea, stomach upset, or mild diarrhea. Taking it with meals reduces these symptoms. <br/><strong>Note:</strong> Always monitor your renal/kidney functions regularly.";
    }
    if (q.includes("blood pressure") || q.includes("hypertension") || q.includes("lisinopril")) {
      return "❤️ <strong>Lisinopril</strong> is an ACE inhibitor used to treat hypertension (high blood pressure) and heart failure. <br/><br/><strong>Key parameters:</strong> Normal blood pressure is below 120/80 mmHg. <br/><strong>Caution:</strong> ACE inhibitors may cause a dry persistent cough. Contact Dr. Lin if this becomes severe.";
    }
    if (q.includes("diabetes") || q.includes("hba1c") || q.includes("sugar")) {
      return "🥗 <strong>Type 2 Diabetes Control:</strong> Your HbA1c target should generally be below 7.0%. <br/><br/><strong>General tips:</strong> Keep doing your 15-minute walks after meals. Focus on high-fiber greens (spinach, broccoli) and minimize processed carbs.";
    }
    if (q.includes("amoxicillin") || q.includes("antibiotic")) {
      return "💊 <strong>Amoxicillin</strong> is a penicillin antibiotic that fights bacteria. <br/><br/><strong>Operational Alert:</strong> Our pharmacy stock is currently <strong>Low (90 Capsules)</strong> on Shelf C-4. Restocking is scheduled for tomorrow.";
    }
    if (q.includes("bed") || q.includes("icu") || q.includes("ward")) {
      return "🛏️ <strong>Ward Status Alert:</strong> ICU occupancy load is currently <strong>91%</strong> (6/8 occupied). General Ward A has 15/20 beds occupied. Bed allocation logs can be managed under Wards & Assets.";
    }
    if (q.includes("hello") || q.includes("hi") || q.includes("hey")) {
      return "👋 Hello! I can help you decode prescriptions, check standard clinical terms, or retrieve hospital metrics. What is on your mind today?";
    }

    return "🤖 I have analyzed your query. While I can offer general health guidelines, for diagnostic concerns, please book a clinic evaluation with <strong>Dr. Sarah Lin</strong> via the <strong>Clinic Appointments</strong> tab or initiate a Telemedicine chat.";
  }

  // --- MOCK TELEMEDICINE FLOW ---
  function triggerTelemedCall(partnerName, partnerAvatar) {
    state.telemedActive = true;
    const overlay = document.getElementById("telemedModalOverlay");
    overlay.style.display = "flex";

    document.getElementById("telemedModalBody").innerHTML = `
      <div style="text-align:center;">
        <img src="${partnerAvatar}" style="width:100px; height:100px; border-radius:50%; object-fit:cover; margin-bottom:16px; animation: pulse-alert 1.5s infinite;" alt="Remote Avatar">
        <h3>Initiating Telehealth Session</h3>
        <p style="color:var(--text-secondary); margin-top:8px;">Calling ${partnerName}...</p>
        <div style="margin-top:24px; display:flex; gap:12px; justify-content:center;">
          <button class="btn-primary" id="telemedAcceptBtn" style="background-color:var(--color-success); border-radius:20px;">Accept Session</button>
          <button class="btn-primary" id="telemedRejectBtn" style="background-color:var(--color-emergency); border-radius:20px;">Cancel Call</button>
        </div>
      </div>
    `;

    document.getElementById("telemedAcceptBtn").addEventListener("click", () => {
      establishTelemedConnection(partnerName, partnerAvatar);
    });

    document.getElementById("telemedRejectBtn").addEventListener("click", () => {
      closeTelemedSession();
    });
  }

  function establishTelemedConnection(partnerName, partnerAvatar) {
    document.getElementById("telemedModalBody").innerHTML = `
      <h3>Consulting with ${partnerName}</h3>
      <p id="telemedCallTimer" style="color:var(--color-success); font-weight:700; margin-top:4px;">Call Duration: 00:00</p>
      
      <div class="telemed-screen">
        <img src="${partnerAvatar}" class="telemed-video-remote" alt="Remote video stream">
        <img src="${getCurrentUserObject()?.avatar}" class="telemed-video-local" alt="Local video stream">
        
        <div class="telemed-controls">
          <button class="telemed-btn mute" onclick="this.classList.toggle('active'); this.style.backgroundColor = this.classList.contains('active') ? '#ef4444' : 'rgba(255, 255, 255, 0.2)'"><i class='bx bx-microphone'></i></button>
          <button class="telemed-btn video-toggle" onclick="this.classList.toggle('active'); this.style.backgroundColor = this.classList.contains('active') ? '#ef4444' : 'rgba(255, 255, 255, 0.2)'"><i class='bx bx-video'></i></button>
          <button class="telemed-btn hangup" id="telemedHangUpBtn"><i class='bx bx-phone-off'></i></button>
        </div>
      </div>
    `;

    state.telemedSeconds = 0;
    state.telemedTimer = setInterval(() => {
      state.telemedSeconds++;
      const mins = Math.floor(state.telemedSeconds / 60).toString().padStart(2, '0');
      const secs = (state.telemedSeconds % 60).toString().padStart(2, '0');
      const timerEl = document.getElementById("telemedCallTimer");
      if (timerEl) timerEl.innerText = `Call Duration: ${mins}:${secs}`;
    }, 1000);

    document.getElementById("telemedHangUpBtn").addEventListener("click", () => {
      closeTelemedSession();
    });
  }

  function closeTelemedSession() {
    state.telemedActive = false;
    clearInterval(state.telemedTimer);
    document.getElementById("telemedModalOverlay").style.display = "none";
  }

  // --- EMERGENCY ALERT MECHANISM ---
  function playBeep(frequency, duration) {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioCtx.close();
      }, duration);
    } catch (e) {
      console.error("Audio beep synthesis error", e);
    }
  }

  function startEmergencyAlert() {
    state.emergencyCountdownValue = 5;
    const overlay = document.getElementById("emergencyModalOverlay");
    overlay.style.display = "flex";
    
    document.getElementById("emergencyModalBody").innerHTML = `
      <i class='bx bxs-error-circle emergency-icon'></i>
      <h2>EMERGENCY CRITICAL SYSTEM TRIGGERED</h2>
      <p style="margin-top:8px;">Sending patient bio-data telemetry & GPS logs to ER dispatch.</p>
      <div class="emergency-countdown" id="emergencyCount">5</div>
      <p style="color:var(--text-secondary);">Click Cancel if this was an accidental trigger.</p>
      <button class="btn-primary" id="cancelEmergencyBtn" style="background-color:var(--text-secondary); margin-top:20px;">Cancel Alert</button>
    `;

    playBeep(880, 200);

    state.emergencyTimer = setInterval(() => {
      state.emergencyCountdownValue--;
      const countEl = document.getElementById("emergencyCount");
      
      if (countEl) countEl.innerText = state.emergencyCountdownValue;
      playBeep(880, 150);

      if (state.emergencyCountdownValue <= 0) {
        clearInterval(state.emergencyTimer);
        confirmEmergencyAlertDispatch();
      }
    }, 1000);

    document.getElementById("cancelEmergencyBtn").addEventListener("click", () => {
      cancelEmergencyAlert();
    });
  }

  function cancelEmergencyAlert() {
    clearInterval(state.emergencyTimer);
    document.getElementById("emergencyModalOverlay").style.display = "none";
  }

  function confirmEmergencyAlertDispatch() {
    playBeep(1200, 500);
    const userObj = getCurrentUserObject() || { name: "Patient", healthStats: { bloodPressure: "120/80 mmHg", bloodSugar: "100 mg/dL" }};

    document.getElementById("emergencyModalBody").innerHTML = `
      <i class='bx bxs-shield-plus emergency-icon' style="color:var(--color-success); animation:none;"></i>
      <h2 style="color:var(--color-success);">DISPATCH SQUAD ENGAGED</h2>
      <p style="margin-top:12px; font-size:14px; line-height:1.5;">
        Medical dispatch confirmed. ICU bed allocated under **${userObj.name}**. Ambulance **UNIT-7** has left base with target ETA of **8 minutes**.
      </p>
      <div style="background-color:var(--bg-app); border:1px solid var(--border-color); padding:12px; margin-top:16px; border-radius: var(--border-radius-md); font-size:12px; text-align:left;">
        <p><strong>GPS coordinates:</strong> 37.7749° N, 122.4194° W</p>
        <p><strong>Bio-telemetry:</strong> BP ${userObj.healthStats?.bloodPressure || "120/80"} | Glucose ${userObj.healthStats?.bloodSugar || "100"}</p>
      </div>
      <button class="btn-primary" id="closeEmergencyConfirmationBtn" style="margin-top:20px;">Close Overlay</button>
    `;

    const icuWard = window.MediConnectDB.beds.find(w => w.ward.includes("ICU"));
    if (icuWard && icuWard.occupied < icuWard.total) {
      icuWard.occupied++;
      icuWard.details.push({
        bed: "Bed I-0" + (icuWard.details.length + 1),
        patient: `${userObj.name} (EMERGENCY)`,
        condition: "Cardiac / Glucose Crash",
        doctor: "Dr. Sarah Lin"
      });
      window.saveMediConnectDB();
    }

    document.getElementById("closeEmergencyConfirmationBtn").addEventListener("click", () => {
      document.getElementById("emergencyModalOverlay").style.display = "none";
    });
  }

  // --- ATTACH EVENT LISTENERS ---
  function setupEventListeners() {
    // 1. Quick Login Selection Clicks
    document.querySelectorAll(".quick-login-card").forEach(card => {
      card.addEventListener("click", () => {
        const uid = card.getAttribute("data-uid");
        let role = "patient";
        if (uid === "doctor_sarah") role = "doctor";
        if (uid === "staff_james") role = "staff";
        login(uid, role);
      });
    });

    // 2. Switching Login sub-sections
    document.getElementById("switchToManualBtn").addEventListener("click", () => {
      document.getElementById("quickLoginSection").style.display = "none";
      document.getElementById("manualLoginSection").style.display = "block";
    });

    document.getElementById("switchToQuickBtn").addEventListener("click", () => {
      document.getElementById("manualLoginSection").style.display = "none";
      document.getElementById("quickLoginSection").style.display = "block";
      document.getElementById("loginErrorMessage").style.display = "none";
    });

    // 3. Doctor Self-Registration Onboarding Modal
    document.getElementById("doctorSelfRegisterBtn").addEventListener("click", () => {
      document.getElementById("doctorRegisterModalOverlay").style.display = "flex";
    });

    document.getElementById("submitDoctorSelfRegBtn").addEventListener("click", () => {
      const name = document.getElementById("regDocName").value.trim();
      const username = document.getElementById("regDocUsername").value.trim().toLowerCase();
      const specialty = document.getElementById("regDocSpecialty").value.trim();
      const credentials = document.getElementById("regDocCredentials").value.trim();
      const bio = document.getElementById("regDocBio").value.trim();
      let avatar = document.getElementById("regDocAvatar").value.trim();

      if (!name || !username) {
        alert("Please enter Name and Username.");
        return;
      }

      if (window.MediConnectDB.directory.some(u => u.id === username)) {
        alert("Username already exists in system directory.");
        return;
      }

      if (!avatar) {
        avatar = "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=150&h=150&q=80";
      }

      const newDoctor = {
        id: username,
        role: "doctor",
        name: name,
        avatar: avatar,
        bio: bio || "Self-onboarded consultant physician.",
        specialization: specialty || "General Medicine",
        credentials: credentials || "MD",
        availability: "Mon, Wed, Fri - 09:00 AM to 05:00 PM",
        achievements: ["Self-onboarded consultant profile"]
      };

      registerNewUser(newDoctor);

      document.getElementById("doctorRegisterModalOverlay").style.display = "none";
      document.getElementById("regDocName").value = "";
      document.getElementById("regDocUsername").value = "";
      document.getElementById("regDocSpecialty").value = "";
      document.getElementById("regDocCredentials").value = "";
      document.getElementById("regDocBio").value = "";
      document.getElementById("regDocAvatar").value = "";

      showToastNotification(`Successfully Onboarded! Try logging in as: ${username}`);
    });

    // 4. Manual Sign-In submit button
    document.getElementById("manualSignInBtn").addEventListener("click", () => {
      const username = document.getElementById("loginUsername").value.trim().toLowerCase();
      const role = document.getElementById("loginRole").value;
      const errorMsg = document.getElementById("loginErrorMessage");

      errorMsg.style.display = "none";

      if (role === "patient" && (username === "patient_john" || username === "john")) {
        login("patient_john", "patient");
      } else if (role === "doctor" && (username === "doctor_sarah" || username === "sarah")) {
        login("doctor_sarah", "doctor");
      } else if (role === "staff" && (username === "staff_james" || username === "james")) {
        login("staff_james", "staff");
      } else {
        const match = window.MediConnectDB.directory.find(u => u.id === username && u.role === role);
        if (match) {
          login(username, role);
        } else {
          if (username.length > 2) {
            login(username, role);
          } else {
            errorMsg.style.display = "block";
          }
        }
      }
    });

    // 5. Logout Action button
    document.getElementById("logoutBtn").addEventListener("click", () => {
      if (confirm("Are you sure you want to log out of MediConnect?")) {
        logout();
      }
    });

    // 6. Search Bar input listener
    const searchInput = document.getElementById("topSearchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        state.searchQuery = e.target.value;
        if (state.currentView === "feed") {
          renderFeed(document.getElementById("mainContentArea"));
        }
      });
    }

    // 7. Emergency Trigger button
    document.getElementById("topEmergencyBtn").addEventListener("click", () => {
      startEmergencyAlert();
    });

    // 8. Dark Mode Toggle
    document.getElementById("themeToggleBtn").addEventListener("click", () => {
      toggleDarkMode();
    });

    // 9. Sidebar User Card click links to Profile view
    document.getElementById("sidebarUserCardBtn").addEventListener("click", () => {
      navigateTo("profile");
    });

    // --- GLOBAL AI CHAT TOGGLES ---
    const globalAiBtn = document.getElementById("globalAiToggleBtn");
    const globalAiBox = document.getElementById("globalAiChatBox");
    const closeGlobalAi = document.getElementById("closeGlobalAiChat");
    const minimizeGlobalAi = document.getElementById("minimizeGlobalAiChat");
    const toggleSettingsBtn = document.getElementById("toggleAiSettings");
    const settingsDrawer = document.getElementById("aiSettingsDrawer");
    const saveSettingsBtn = document.getElementById("saveAiSettingsBtn");
    const aiInput = document.getElementById("globalAiChatInput");
    const aiSendBtn = document.getElementById("sendGlobalAiMsgBtn");
    const aiChatWindow = document.getElementById("globalAiChatMsgs");

    if (globalAiBtn && globalAiBox) {
      globalAiBtn.addEventListener("click", () => {
        if (globalAiBox.style.display === "none" || globalAiBox.classList.contains("collapsed")) {
          globalAiBox.style.display = "flex";
          setTimeout(() => { globalAiBox.classList.remove("collapsed"); }, 10);
          aiChatWindow.scrollTop = aiChatWindow.scrollHeight;
        } else {
          globalAiBox.classList.add("collapsed");
          setTimeout(() => { globalAiBox.style.display = "none"; }, 300);
        }
      });
    }

    if (closeGlobalAi && globalAiBox) {
      closeGlobalAi.addEventListener("click", (e) => {
        e.stopPropagation();
        globalAiBox.classList.add("collapsed");
        setTimeout(() => { globalAiBox.style.display = "none"; }, 300);
      });
    }

    if (minimizeGlobalAi && globalAiBox) {
      minimizeGlobalAi.addEventListener("click", (e) => {
        e.stopPropagation();
        globalAiBox.classList.add("collapsed");
        setTimeout(() => { globalAiBox.style.display = "none"; }, 300);
      });
    }

    if (toggleSettingsBtn && settingsDrawer) {
      toggleSettingsBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (settingsDrawer.style.display === "none") {
          settingsDrawer.style.display = "flex";
          document.getElementById("aiProvider").value = localStorage.getItem("mediconnect_ai_provider") || "gemini";
          document.getElementById("aiApiKey").value = localStorage.getItem("mediconnect_ai_api_key") || "";
        } else {
          settingsDrawer.style.display = "none";
        }
      });
    }

    if (saveSettingsBtn && settingsDrawer) {
      saveSettingsBtn.addEventListener("click", () => {
        const provider = document.getElementById("aiProvider").value;
        const apiKey = document.getElementById("aiApiKey").value.trim();
        
        localStorage.setItem("mediconnect_ai_provider", provider);
        localStorage.setItem("mediconnect_ai_api_key", apiKey);
        
        settingsDrawer.style.display = "none";
        showToastNotification("MediBot credentials saved successfully!");
      });
    }

    const handleGlobalAiMsg = () => {
      const q = aiInput.value.trim();
      if (!q) return;
      
      aiInput.value = "";
      processAIQuery(q, aiChatWindow);
    };

    if (aiSendBtn) aiSendBtn.addEventListener("click", handleGlobalAiMsg);
    if (aiInput) aiInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") handleGlobalAiMsg();
    });
  }
});

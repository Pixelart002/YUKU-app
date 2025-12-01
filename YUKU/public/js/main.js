document.addEventListener('DOMContentLoaded', () => {
    let authToken = null;
    
    const app = {
        currentPageScript: null,
        config: {
            API_BASE_URL: 'https://giant-noell-pixelart002-1c1d1fda.koyeb.app'
        },
        
        
        
        urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    },
    
    async subscribeUserToPush() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            throw new Error('Push notifications are not supported by this browser.');
        }
        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            throw new Error('Notification permission was not granted.');
        }
        const response = await fetch(`${this.config.API_BASE_URL}/webpush/vapid-public-key`);
        if (!response.ok) {
            throw new Error('Failed to get VAPID key from server.');
        }
        const { public_key } = await response.json();
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: this.urlBase64ToUint8Array(public_key)
        });
        await fetch(`${this.config.API_BASE_URL}/webpush/subscribe`, {
            method: 'POST',
            body: JSON.stringify(subscription),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.getAuthToken()}`
            }
        });
    },
        
        
        elements: {
            authPage: document.getElementById('auth-page'),
            dashboardPage: document.getElementById('dashboard-page'),
            loginFormAction: document.getElementById('loginFormAction'),
            signupFormAction: document.getElementById('signupFormAction'),
            // START: YEH LINE ADD KAREIN
forgotPasswordFormAction: document.getElementById('forgotPasswordFormAction'),
// END: YEH LINE ADD KAREIN



            logoutBtn: document.getElementById('logoutBtn'),
            authErrorBox: document.getElementById('auth-error-box'),
            showSignupBtn: document.getElementById('show-signup'),
            showLoginBtn: document.getElementById('show-login'),
            
            
            // START: YEH DO LINES ADD KAREIN
showForgotPasswordBtn: document.getElementById('show-forgot-password'),
backToLoginBtn: document.getElementById('back-to-login'),
// END: YEH DO LINES ADD KAREIN


            hamburgerBtn: document.getElementById('hamburgerBtn'),
            closeBtn: document.getElementById('closeBtn'),
            sidebar: document.getElementById('sidebar'),
            overlay: document.getElementById('overlay'),
            navLinks: document.querySelectorAll('.nav-link'),
            contentPanels: document.querySelectorAll('.content-panel'),
            headerTitle: document.getElementById('header-title'),
            profileInitials: document.getElementById('profile-initials'),
            timestamp: document.getElementById('timestamp'),
            // START: YEH LINES ADD KAREIN
            headerActions: document.getElementById('header-actions'),
            profileBtn: document.getElementById('profile-btn'),
            profilePopup: document.getElementById('profile-popup'),
            popupName: document.getElementById('popup-name'),
            popupUsername: document.getElementById('popup-username'),
            popupEmail: document.getElementById('popup-email'),
            // END: YEH LINES ADD KAREIN
       
       
        },
        
        init() {
            this.addEventListeners();
            this.updateTimestamp();
            setInterval(() => this.updateTimestamp(), 1000);
            
            const savedToken = localStorage.getItem('authToken');
            if (savedToken) {
                authToken = savedToken;
                this.showDashboard('yuku-ai');
            }
        },
        
        addEventListeners() {
            this.elements.signupFormAction.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSignup();
            });
            this.elements.loginFormAction.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
            
            
            
            
            
            // START: YEH LINES ADD KAREIN
this.elements.forgotPasswordFormAction.addEventListener('submit', (e) => { e.preventDefault(); this.handleForgotPassword(); });
this.elements.showForgotPasswordBtn.addEventListener('click', (e) => { e.preventDefault(); this.toggleAuthForms('forgot'); });
this.elements.backToLoginBtn.addEventListener('click', (e) => { e.preventDefault(); this.toggleAuthForms('login'); });
// END: YEH LINES ADD KAREIN
            
            
            
            this.elements.logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showAuthPage();
            });
            this.elements.showSignupBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleAuthForms('signup');
            });
            this.elements.showLoginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleAuthForms('login');
            });
            this.elements.hamburgerBtn.addEventListener('click', () => this.openSidebar());
            this.elements.closeBtn.addEventListener('click', () => this.closeSidebar());
            this.elements.overlay.addEventListener('click', () => this.closeSidebar());
            this.elements.navLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.navigateTo(link.getAttribute('data-page'));
                    if (window.innerWidth < 768) this.closeSidebar();
                });
            });
            // START: YEH LINES ADD KAREIN
    this.elements.profileBtn.addEventListener('mouseenter', () => this.showProfilePopup());
    this.elements.profileBtn.addEventListener('mouseleave', () => this.hideProfilePopup());
    this.elements.profileBtn.addEventListener('click', () => { this.navigateTo('profile'); if (window.innerWidth < 768) this.closeSidebar(); });
    // END: YEH LINES ADD KAREIN
        },
        
        getAuthToken() {
            return authToken;
        },
        
        async navigateTo(pageId) {
            if (this.currentPageScript) {
                document.body.removeChild(this.currentPageScript);
                this.currentPageScript = null;
            }
            
            let activeLinkText = '';
            this.elements.navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('data-page') === pageId) {
                    link.classList.add('active');
                    activeLinkText = link.textContent.trim();
                }
            });
            this.elements.headerTitle.textContent = activeLinkText;
            
            this.elements.contentPanels.forEach(p => p.classList.remove('active'));
            const contentContainer = document.getElementById(`${pageId}-content`);
            if (!contentContainer) return;
            
            if (pageId === 'profile') {
                await this.fetchAndDisplayProfile();
                contentContainer.classList.add('active');
                return;
            }
            
            try {
                const response = await fetch(`pages/${pageId}.html`);
                if (!response.ok) throw new Error(`Could not load page: ${response.statusText}`);
                const html = await response.text();
                contentContainer.innerHTML = html;
                contentContainer.classList.add('active');
                
                const scriptPath = `js/pages/${pageId}.js`;
                const scriptCheck = await fetch(scriptPath);
                
                if (scriptCheck.ok) {
                    const script = document.createElement('script');
                    script.src = scriptPath;
                    this.currentPageScript = script;
                    
                    script.onload = () => {
                        const functionName = 'init' + pageId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('') + 'Page';
                        if (typeof window[functionName] === 'function') {
                            window[functionName]();
                        }
                    };
                    document.body.appendChild(script);
                }
            } catch (error) {
                contentContainer.innerHTML = `<p class="text-red-400 text-center">[ERROR]: Could not load content.</p>`;
                contentContainer.classList.add('active');
            }
        },
        
       // --- SNIPPET: Is poore function ko apne purane 'handleApiRequest' function se replace karein ---

async handleApiRequest(endpoint, options = {}, button = null) {
    if (button) button.disabled = true;
    this.elements.authErrorBox.classList.add('hidden');
    
    try {
        const response = await fetch(`${this.config.API_BASE_URL}/${endpoint}`, options);
        
        // Agar response successful nahi hai (e.g., status 422, 401, 500)
        if (!response.ok) {
            const errorData = await response.json().catch(() => {
                // Agar server se JSON mein error nahi aaya
                throw new Error(`Request failed with status: ${response.status}`);
            });
            
            // YEH HAI "ULTRA GOD MODE" LOGIC
            // Agar 'detail' ek array hai (validation errors ke liye)
            if (Array.isArray(errorData.detail)) {
                // Har error message ko extract karke ek line mein jodo
                const readableError = errorData.detail.map(err => err.msg).join('. ');
                throw new Error(readableError);
            }
            
            // Agar 'detail' ek simple string hai
            if (typeof errorData.detail === 'string') {
                throw new Error(errorData.detail);
            }
            
            throw new Error('An unknown error occurred.');
        }
        
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return await response.json();
        } else {
            return { success: true };
        }
        
    } catch (error) {
        // Ab yahan hamesha ek readable error message hi aayega
        this.showAuthError(error.message);
        return null;
    } finally {
        if (button) button.disabled = false;
    }
},
        
        
        
        async handleSignup() {
            const button = this.elements.signupFormAction.querySelector('button');
            const fullname = document.getElementById('signup-fullname').value;
            const username = document.getElementById('signup-username').value;
            const email = document.getElementById('signup-email-address').value;
            const password = document.getElementById('signup-password').value;
            const options = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullname, username, email, password })
            };
            const result = await this.handleApiRequest('signup', options, button);
            if (result) {
                this.handleLogin(email, password);
            }
        },
        
        async handleLogin(emailOverride = null, passwordOverride = null) {
            const button = this.elements.loginFormAction.querySelector('button');
            const email = emailOverride || document.getElementById('login-email-address').value;
            const password = passwordOverride || document.getElementById('login-password').value;
            const options = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            };
            const result = await this.handleApiRequest('login', options, button);
            if (result && result.user) {
                authToken = result.token.access_token;
                localStorage.setItem('authToken', authToken);
                this.updateUserInfo(result.user);
                this.showDashboard('yuku-ai');
            }
        },
        
       
// --- SNIPPET: Is function ko apne purane 'handleAiQuery' function se replace karein ---
        async handleAiQuery(body) {
            const executeBtn = document.getElementById("ai-execute-btn");
            if (executeBtn) executeBtn.disabled = true;

            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json', // Set content type to JSON
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify(body) // Stringify the JSON body
            };

            // /ai/ask endpoint par call karne ke liye handleApiRequest ka istemaal karein
            const result = await this.handleApiRequest('ai/ask', options, executeBtn);
            
            if (executeBtn) executeBtn.disabled = false;
            return result; // handleApiRequest error ko handle karega
        }, 
        // Is poore function ko apne purane 'updateUserInfo' function se replace karein
updateUserInfo(user) {
    const { fullname, username, email } = user;
    const initials = fullname ? fullname.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??';
    
    this.elements.profileInitials.textContent = initials;
    this.elements.popupName.textContent = fullname || '';
    this.elements.popupUsername.textContent = username ? `@${username}` : '';
    this.elements.popupEmail.textContent = email || '';
},
        
        // --- SNIPPET 1: ISSE REPLACE KAREIN ---
showAuthError(error) {
    let errorMessage = 'An unknown error occurred.'; // Default message
    
    if (typeof error === 'string') {
        // Agar error pehle se hi ek string hai
        errorMessage = error;
    } else if (error instanceof Error) {
        // Agar yeh ek standard JavaScript Error object hai
        errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
        // Agar yeh ek custom object hai, to uske andar se message dhoondhein
        errorMessage = error.detail || error.message || JSON.stringify(error);
    }
    
    this.elements.authErrorBox.textContent = `[ERROR]: ${errorMessage}`;
    this.elements.authErrorBox.classList.remove('hidden');
},
        
        showDashboard(defaultPage) {
            this.fetchAndDisplayProfile();
            this.elements.authPage.classList.replace('page-visible', 'page-hidden');
            this.elements.dashboardPage.classList.replace('page-hidden', 'page-visible');
            this.navigateTo(defaultPage);
            
            
            
    // DASHBOARD DIKHNE KE 5 SECONDS BAAD PROMPT CALL HOGA
    setTimeout(() => {
        promptForNotifications();
    }, 5000); // 5000 milliseconds = 5 seconds
        },
        
        showAuthPage() {
            authToken = null;
            localStorage.removeItem('authToken');
            this.closeSidebar();
            this.updateUserInfo({ fullname: '', email: '' });
            document.getElementById('loginFormAction').reset();
            document.getElementById('signupFormAction').reset();
            this.elements.dashboardPage.classList.replace('page-visible', 'page-hidden');
            this.elements.authPage.classList.replace('page-hidden', 'page-visible');
        },
        
        updateTimestamp() {
            this.elements.timestamp.textContent = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        },
        
        // File: js/main.js -> Is poore function ko replace karein
toggleAuthForms(formToShow) {
    ['login-form', 'signup-form', 'forgot-password-form'].forEach(formId => {
        const formEl = document.getElementById(formId);
        if (formEl) {
            formEl.classList.toggle('form-visible', formId.startsWith(formToShow));
            formEl.classList.toggle('form-hidden', !formId.startsWith(formToShow));
        }
    });
},
        openSidebar() {
            this.elements.sidebar.classList.remove('-translate-x-full');
            this.elements.overlay.classList.remove('hidden');
        },
        
        closeSidebar() {
            this.elements.sidebar.classList.add('-translate-x-full');
            this.elements.overlay.classList.add('hidden');
      
        },
        
        // START: YEH DO FUNCTIONS ADD KAREIN
showProfilePopup() {
    this.elements.profilePopup.classList.remove('opacity-0', 'scale-95', 'pointer-events-none');
},

hideProfilePopup() {
    this.elements.profilePopup.classList.add('opacity-0', 'scale-95', 'pointer-events-none');
},
// END: YEH DO FUNCTIONS ADD KAREIN
        async fetchAndDisplayProfile() {
            const options = {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${authToken}` }
            };
            const userData = await this.handleApiRequest('users/me', options);
            if (userData) {
                this.updateUserInfo(userData);
                const contentContainer = document.getElementById('profile-content');
                contentContainer.innerHTML = `<div class="glass-panel relative p-6 rounded-lg max-w-2xl mx-auto space-y-4 border border-[var(--border-color)] bg-[var(--bg-medium)]/50 backdrop-blur-md shadow-md">
    <!-- Header with right-aligned edit icon -->
    <div class="flex items-center justify-between">
        <h3 class="text-2xl font-orbitron text-[var(--accent-green)]">AGENT DOSSIER</h3>

        <a 
            href="/misc/update-profile.html" 
            title="Edit Profile"
            class="transition-transform hover:scale-110"
        >
            <img 
                src="https://cdn-icons-png.flaticon.com/512/1782/1782750.png" 
                alt="Edit Profile"
                class="w-6 h-6 opacity-90 hover:opacity-100 drop-shadow-[0_0_6px_var(--accent-green)]"
            >
        </a>
    </div>

    <!-- Profile Info -->
    <div>
        <p class="text-sm text-text-secondary">USERNAME</p>
        <p class="text-lg">@${userData.username}</p>
    </div>

    <div>
        <p class="text-sm text-text-secondary">FULL NAME</p>
        <p class="text-lg">${userData.fullname}</p>
    </div>

    <div>
        <p class="text-sm text-text-secondary">AGENT ID (EMAIL)</p>
        <p class="text-lg">${userData.email}</p>
    </div>
</div>`;
            } else {
                this.showAuthPage();
            }
        },
        
        
        
        
        // File: js/main.js -> inside the 'app' object
async handleFeedbackSubmit(rating, comment) {
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({ rating, comment })
    };
    const result = await this.handleApiRequest('feedback/', options);
    return result !== null;
},
        
   
   
   
   
   // File: js/main.js -> inside the 'app' object

// This is a helper function to generate star HTML
_createStarsHtml(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            stars += `<span class="text-2xl ${i <= rating ? 'text-accent-green' : 'text-gray-600'}">&star;</span>`;
        }
        return `<div class="flex">${stars}</div>`;
    },
    
    // File: js/main.js -> handleLogin ke baad is function ko add karein
async handleForgotPassword() {
    const button = this.elements.forgotPasswordFormAction.querySelector('button');
    const email = document.getElementById('forgot-email-input').value;
    const messageEl = document.getElementById('forgot-message');
    
    messageEl.textContent = 'Processing...';
    messageEl.className = 'text-center p-2 rounded-md mb-4 text-yellow-400';
    
    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    };
    
    const result = await this.handleApiRequest('forgot-password', options, button);
    
    if (result) {
        messageEl.textContent = result.message || "Password reset link sent successfully.";
        messageEl.className = 'text-center p-2 rounded-md mb-4 text-green-400';
    } else {
        // handleApiRequest already shows the main error, this is a fallback.
        messageEl.textContent = 'Failed. Please check the error message at the top.';
        messageEl.className = 'text-center p-2 rounded-md mb-4 text-red-400';
    }
},
    async handleFetchTestimonials() {
        const container = document.getElementById('testimonials-list');
        if (!container) return;
        
        container.innerHTML = `<p class="text-center text-text-secondary">Loading testimonials...</p>`;
        
        const testimonials = await     this.handleApiRequest('feedback/');
        
        if (testimonials && testimonials.length > 0) {
            container.innerHTML = ''; // Clear loading message
            testimonials.forEach(item => {
                const date = new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                const card = `
                <div class="glass-panel p-6 rounded-xl border-l-4 border-accent-green bg-[rgba(26,26,26,0.8)] shadow-lg backdrop-blur-md transition-transform hover:-translate-y-1 hover:shadow-2xl duration-300 break-words">
    <!-- Comment Text -->
    <p class="text-text-primary italic text-sm md:text-base leading-relaxed mb-4">"${item.comment}"</p>

    <!-- User Info + Stars -->
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between">
        <!-- Username & Date -->
        <div class="text-sm flex items-center gap-2">
            <span class="font-bold text-accent-green">@${item.username}</span>
            <span class="text-text-secondary ml-0 md:ml-2">${date}</span>
        </div>

        <!-- Star Rating -->
        <div class="flex items-center space-x-1 mt-2 md:mt-0">
            ${this._createStarsHtml(item.rating)}
        </div>
    </div>
</div>    `;
                container.innerHTML += card;
            });
        } else if (testimonials) {
            container.innerHTML = `<p class="text-center text-text-secondary">No testimonials submitted yet.</p>`;
        } else {
            container.innerHTML = `<p class="text-center text-red-400">[ERROR] Could not load testimonials.</p>`;
        }
    },
   
   
   
   

// SNIPPET: YEH NAYA FUNCTION 'app' OBJECT KE ANDAR ADD KAREIN
async handleFeedbackUpdate(rating, comment) {
    const options = {
        method: 'PUT', // Use PUT for updating
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({ rating, comment })
    };
    return await this.handleApiRequest('feedback/', options);
},
        
    };
    
    window.app = app;
    app.init();
});
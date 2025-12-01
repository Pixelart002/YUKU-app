
async function initYukuAiPage() {

    // --- 0. SAFE ELEMENT HELPER (Prevents Null Errors) ---
    const getEl = (id) => document.getElementById(id);
    
    const setHTML = (id, html) => {
        const el = getEl(id);
        if (el) el.innerHTML = html;
    };

    const setVal = (id, val) => {
        const el = getEl(id);
        if (el) el.value = val;
    };

    // --- 1. SYSTEM CORE ---
    const System = {
        config: { agent: 'mistral_default', chatId: null, files: [], ocrText: "" },
        
        init: async function() {
            console.log("Booting Yuku Core v3.0 (Safe Mode)...");
            
            // Init Visual Engines if available
            if (window.mermaid) mermaid.initialize({startOnLoad:false, theme:'dark'});
            
            // Init Sub-systems
            IDE.init();
            Chat.loadHistory();
            
            // Console Stream Listener
            window.addEventListener('message', (e) => {
                if (e.data.type === 'log') IDE.log('LOG', e.data.args.join(' '));
                if (e.data.type === 'error') IDE.log('ERR', e.data.args.join(' '), 'text-red-400');
            });

            UI.showToast("System Online", "success");
        },

        api: async function(url, method, body) {
            const token = window.app.getAuthToken();
            const opts = { method, headers: { 'Authorization': `Bearer ${token}` } };
            
            if (body instanceof FormData) {
                opts.body = body;
            } else {
                opts.headers['Content-Type'] = 'application/json';
                if (body) opts.body = JSON.stringify(body);
            }

            const r = await fetch(window.app.config.API_BASE_URL + url, opts);
            return await r.json();
        },

        handleFiles: async function(inp) {
            this.config.files = Array.from(inp.files);
            
            // Render Tags Safely
            const tags = this.config.files.map(f => 
                `<span class="text-[9px] bg-emerald-900/40 text-emerald-300 px-2 py-1 rounded border border-emerald-500/20 flex-shrink-0">📎 ${f.name}</span>`
            ).join('');
            setHTML('file-tags', tags);
            
            // OCR Logic
            const imgs = this.config.files.filter(f => f.type.startsWith('image'));
            if (imgs.length > 0 && window.Tesseract) {
                UI.showToast("Scanning Visuals...", "info");
                const w = await Tesseract.createWorker('eng');
                for (const f of imgs) {
                    const r = await w.recognize(f);
                    this.config.ocrText += `\nFILE: ${f.name}\n${r.data.text}`;
                }
                await w.terminate();
                UI.showToast("Vision Data Ready", "success");
            }
        },

        setAgent: function(a) {
            this.config.agent = a;
            const labels = { 'mistral_default': 'Chat', 'code_editor': 'DevOps IDE', 'flux_image': 'Flux Vision' };
            const labelEl = getEl('active-module-label');
            if(labelEl) labelEl.innerText = `MODULE: ${labels[a] || a}`.toUpperCase();
            
            const menu = getEl('module-menu');
            if(menu) menu.classList.add('hidden');
        }
    };

    // --- 2. POPUP & MODAL MANAGER ---
    const Popup = {
        // IDE Modal
        openIDE: function() {
            const modal = getEl('ide-modal');
            if(modal) modal.classList.add('active');
            
            // Auto-open index
            if (IDE.vfs['index.html']) IDE.openFile('index.html');
            else if (Object.keys(IDE.vfs).length > 0) IDE.openFile(Object.keys(IDE.vfs)[0]);
        },
        
        closeIDE: function() {
            const modal = getEl('ide-modal');
            if(modal) modal.classList.remove('active');
        },

        // SDK Modal
        openSDK: async function() {
            UI.toggleDrawer(); // Close sidebar
            const modal = getEl('sdk-modal');
            if(modal) modal.classList.add('active');
            await SDK.fetch();
        },
        
        closeSDK: function() {
            const modal = getEl('sdk-modal');
            if(modal) modal.classList.remove('active');
        }
    };

    // --- 3. SDK CONTROLLER ---
    const SDK = {
        fetch: async function() {
            try {
                const res = await System.api('/ai/api-key', 'GET');
                setVal('api-key-display', res.api_key || "No Key Generated");
            } catch(e) {}
        },
        generate: async function() {
            try {
                const res = await System.api('/ai/api-key/generate', 'POST');
                setVal('api-key-display', res.api_key);
                UI.showToast("New API Key Generated", "success");
            } catch(e) { UI.showToast("Generation Failed", "error"); }
        },
        copy: function() {
            const el = getEl('api-key-display');
            if(el) {
                navigator.clipboard.writeText(el.value);
                UI.showToast("Copied to Clipboard", "success");
            }
        }
    };

    // --- 4. IDE ENGINE (VFS + Editor) ---
    const IDE = {
        vfs: {},
        cm: null,

        init: function() {
            const area = getEl('code-editor');
            if (!area) return; // Safety check

            if (typeof CodeMirror !== 'undefined') {
                this.cm = CodeMirror.fromTextArea(area, {
                    mode: 'htmlmixed', theme: 'dracula', lineNumbers: true, lineWrapping: true, scrollbarStyle: 'null'
                });
                this.cm.on('change', () => {
                    const pEl = getEl('current-filename');
                    if(pEl) {
                        const p = pEl.innerText;
                        if (this.vfs[p] !== undefined) this.vfs[p] = this.cm.getValue();
                    }
                });
            }
        },

        refreshTree: function() {
            const container = getEl('file-tree-container');
            if(!container) return;
            container.innerHTML = '';
            
            const tree = {};
            Object.keys(this.vfs).sort().forEach(path => {
                path.split('/').reduce((r, k, i, a) => r[k] = r[k] || (i === a.length - 1 ? { type: 'FILE', path } : { type: 'FOLDER', children: {} }), tree);
            });

            const render = (node, parent) => {
                Object.keys(node).sort((a,b) => node[a].type==='FOLDER'?-1:1).forEach(key => {
                    const item = node[key];
                    const div = document.createElement('div');
                    div.className = "flex flex-col";
                    
                    const row = document.createElement('div');
                    row.className = "flex items-center gap-2 cursor-pointer hover:bg-white/5 text-gray-400 hover:text-white py-1 px-2 rounded text-[11px] select-none transition-colors group";
                    
                    if(item.type === 'FOLDER') {
                        row.innerHTML = `<span class="text-emerald-500/50 group-hover:text-emerald-400 transition-colors text-[9px]">▶</span> <span class="text-emerald-600/80 group-hover:text-emerald-400">📁</span> ${key}`;
                        const children = document.createElement('div');
                        children.className = "folder-node hidden"; // CSS class handles indentation
                        row.onclick = () => { 
                            children.classList.toggle('hidden'); 
                            const arrow = row.querySelector('span');
                            if(arrow) arrow.style.transform = children.classList.contains('hidden') ? '' : 'rotate(90deg)';
                        };
                        div.append(row, children);
                        render(item.children, children);
                    } else {
                        let icon = key.endsWith('.js')?'⚡':(key.endsWith('.css')?'🎨':(key.endsWith('.html')?'🌐':'📄'));
                        row.innerHTML = `<span class="opacity-50">${icon}</span> ${key}`;
                        row.onclick = () => this.openFile(item.path);
                        div.appendChild(row);
                    }
                    parent.appendChild(div);
                });
            };
            render(tree, container);
        },

        openFile: function(path) {
            if (!this.vfs[path] || !this.cm) return;
            this.cm.setValue(this.vfs[path]);
            
            const fnEl = getEl('current-filename');
            if(fnEl) fnEl.innerText = path;
            
            let m = 'htmlmixed';
            if (path.endsWith('.js')) m = 'javascript';
            if (path.endsWith('.css')) m = 'css';
            if (path.endsWith('.py')) m = 'python';
            this.cm.setOption('mode', m);

            if (path.endsWith('.html')) this.refreshPreview();
        },

        refreshPreview: function() {
            if (!System.config.chatId) return;
            const frame = getEl('preview-frame');
            if(frame) {
                frame.src = `${window.app.config.API_BASE_URL}/ai/live/${System.config.chatId}?t=${Date.now()}`;
                this.log('SYS', 'Preview Refreshed', 'text-emerald-500');
            }
        },

        runCode: async function() {
            const code = this.cm.getValue();
            const pathEl = getEl('current-filename');
            const path = pathEl ? pathEl.innerText : "";
            
            let lang = path.endsWith('.js')?'javascript':(path.endsWith('.py')?'python':null);
            if (!lang) return UI.showToast("Sandbox: JS/Python Only", "error");
            
            this.log("SYS", "Running in Piston...", "text-blue-400");
            try {
                const res = await System.api('/ai/run-code', 'POST', { language: lang, code });
                if (res.run) {
                    if (res.run.stdout) this.log("OUT", res.run.stdout, "text-green-300");
                    if (res.run.stderr) this.log("ERR", res.run.stderr, "text-red-400");
                }
            } catch (e) { this.log("SYS", "Exec Failed", "text-red-500"); }
        },

        deploy: async function() {
            UI.showToast("Publishing...", "info");
            try {
                const res = await System.api(`/ai/publish/${System.config.chatId}`, 'POST');
                // Using native prompt for copy
                prompt("Live URL:", res.url);
                UI.showToast("Deployed!", "success");
            } catch (e) { UI.showToast("Failed", "error"); }
        },

        download: function() {
            window.open(`${window.app.config.API_BASE_URL}/ai/download-project/${System.config.chatId}`, '_blank');
        },

        log: function(src, msg, color="text-gray-400") {
            const box = getEl('console-out');
            if(!box) return;
            const l = document.createElement('div');
            l.className = `border-b border-white/5 py-1 ${color}`;
            l.innerHTML = `<span class="opacity-50 mr-2 text-[9px]">[${src}]</span>${msg.replace(/\n/g,'<br>')}`;
            box.appendChild(l);
            box.scrollTop = box.scrollHeight;
        }
    };

    // --- 5. CHAT CONTROLLER ---
    const Chat = {
        new: async function() {
            try {
                const res = await System.api('/ai/chats/new', 'POST');
                System.config.chatId = res.chat_id;
                System.config.vfs = {};
                setHTML('chat-stream', '');
                Popup.closeIDE();
                
                const ideBtn = getEl('ide-trigger-btn');
                if(ideBtn) ideBtn.classList.add('hidden');

                UI.showToast("New Session", "success");
            } catch (e) { UI.showToast("Failed", "error"); }
        },

        send: async function(e) {
            e.preventDefault();
            const input = getEl('prompt');
            const text = input.value.trim();
            if(!text && System.config.files.length===0) return;

            let prompt = text;
            if(System.config.ocrText) prompt += `\n\n[VISION DATA]:\n${System.config.ocrText}`;

            this.appendMsg("user", text, System.config.files.map(f=>f.name));
            input.value = '';
            
            const form = new FormData();
            form.append('prompt', prompt);
            form.append('tool_id', System.config.agent);
            if(System.config.chatId) form.append('chat_id', System.config.chatId);
            System.config.files.forEach(f => form.append('files', f));
            
            System.config.files = []; System.config.ocrText = ""; 
            setHTML('file-tags', '');
            
            const loadId = this.appendLoader();

            try {
                const ep = System.config.agent === 'flux_image' ? '/ai/generate-image' : '/ai/ask';
                const token = window.app.getAuthToken();
                
                const res = await fetch(`${window.app.config.API_BASE_URL}${ep}`, {
                    method: 'POST', headers: {'Authorization': `Bearer ${token}`}, body: form
                });
                const data = await res.json();
                
                const loaderEl = getEl(loadId);
                if(loaderEl) loaderEl.remove();
                
                System.config.chatId = data.chat_id;

                if (data.image_url) {
                    this.appendImg(data.image_url);
                } else {
                    this.appendMsg("ai", data.response);
                    
                    if(data.vfs && Object.keys(data.vfs).length > 0) {
                        IDE.vfs = data.vfs;
                        IDE.refreshTree();
                        
                        const ideBtn = getEl('ide-trigger-btn');
                        if(ideBtn) ideBtn.classList.remove('hidden');
                        
                        if(data.data?.is_vfs_update) {
                            Popup.openIDE();
                            IDE.refreshPreview();
                            UI.showToast("VFS Updated", "success");
                        }
                    }
                }
                this.loadHistory();
            } catch(e) {
                const loaderEl = getEl(loadId);
                if(loaderEl) loaderEl.remove();
                this.appendMsg("system", "Error: "+e.message);
            }
        },

        appendMsg: function(role, text, files=[]) {
            const box = getEl('chat-stream');
            if(!box) return;
            
            const div = document.createElement('div');
            div.className = `flex w-full mb-6 ${role === 'user' ? 'justify-end' : 'justify-start'} animate-pop-in`;
            
            // Render Mermaid
            if(text.includes('```mermaid') && window.mermaid) {
                setTimeout(()=> document.querySelectorAll('.mermaid-chart').forEach(el=>{ 
                    if(!el.dataset.d){ mermaid.init(undefined, el); el.dataset.d=true; } 
                }), 200);
                text = text.replace(/```mermaid([\s\S]*?)```/g, '<div class="mermaid-chart bg-black/20 p-4 rounded border border-emerald-500/20 overflow-x-auto">$1</div>');
            }

            const html = window.marked ? marked.parse(text) : text.replace(/\n/g, '<br>');
            div.innerHTML = `
                <div class="${role==='user'?'bg-emerald-900/20 border-emerald-500/40':'bg-[#18181b] border-white/10'} border p-4 rounded-xl max-w-[85%] shadow-lg backdrop-blur-md">
                    ${role==='user' && files.length ? `<div class="text-[10px] text-emerald-400 mb-2 font-mono border-b border-emerald-500/20 pb-1">📎 ${files.join(', ')}</div>` : ''}
                    <div class="prose prose-invert prose-sm text-sm leading-relaxed font-light">${html}</div>
                </div>`;
            box.appendChild(div);
            box.scrollTop = box.scrollHeight;
        },

        appendImg: function(url) {
            const box = getEl('chat-stream');
            if(!box) return;
            const div = document.createElement('div');
            div.className = "flex w-full mb-6 justify-start animate-pop-in";
            div.innerHTML = `<div class="bg-[#18181b] border border-white/10 p-2 rounded-xl max-w-[70%] shadow-lg"><img src="${url}" class="rounded-lg w-full mb-2"><a href="${url}" download="gen.jpg" class="block text-center bg-white/5 text-xs py-1.5 rounded hover:bg-emerald-500 hover:text-black transition-colors font-bold">DOWNLOAD</a></div>`;
            box.appendChild(div);
            box.scrollTop = box.scrollHeight;
        },

        appendLoader: function() {
            const id = 'l-' + Date.now();
            const box = getEl('chat-stream');
            if(box) {
                box.insertAdjacentHTML('beforeend', `<div id="${id}" class="text-xs text-emerald-500 animate-pulse ml-2 mb-4">Thinking...</div>`);
                box.scrollTop = box.scrollHeight;
            }
            return id;
        },

        loadHistory: async function() {
            try {
                const chats = await System.api('/ai/chats', 'GET');
                setHTML('history-list', chats.map(c => `
                    <div onclick="window.Chat.load('${c.id}')" class="p-3 text-xs text-gray-400 hover:text-white cursor-pointer hover:bg-white/5 truncate border-b border-white/5 flex justify-between group transition-colors">
                        <span class="font-mono">${c.title}</span><span class="opacity-0 group-hover:opacity-100 text-emerald-500">➜</span>
                    </div>`).join(''));
            } catch (e) {}
        },

        load: async function(id) {
            const data = await System.api(`/ai/chats/${id}`, 'GET');
            System.config.chatId = data.id;
            IDE.vfs = data.vfs_state || {};
            setHTML('chat-stream', '');
            
            data.messages.forEach(m => {
                if(m.image_data) this.appendImg(m.image_data);
                else this.appendMsg(m.role||'ai', m.content||m.response);
            });

            const ideBtn = getEl('ide-trigger-btn');
            if(Object.keys(IDE.vfs).length > 0) {
                IDE.refreshTree();
                if(ideBtn) ideBtn.classList.remove('hidden');
            } else {
                if(ideBtn) ideBtn.classList.add('hidden');
            }
            UI.toggleDrawer();
        }
    };

    // --- 6. UI UTILITIES ---
    const UI = {
        toggleDrawer: () => {
            const d = getEl('drawer');
            if(d) d.classList.toggle('-translate-x-full');
        },
        
        showToast: function(msg, type='info') {
            const box = getEl('toast-box');
            if(!box) return;
            const d = document.createElement('div');
            const c = { success: 'bg-emerald-600', error: 'bg-red-600', info: 'bg-gray-800' };
            d.className = `${c[type]} text-white px-4 py-2 rounded shadow-lg text-xs font-bold mb-2 animate-pop-in pointer-events-auto border border-white/10`;
            d.innerText = msg;
            box.appendChild(d);
            setTimeout(() => d.remove(), 3000);
        }
    };

    // --- 7. BINDINGS (This fixes ReferenceErrors) ---
    window.UI = UI;
    window.Popup = Popup;
    window.SDK = SDK;
    window.Chat = Chat;
    window.System = System;
    window.IDE = IDE;
    window.Layout = { 
        openIDE: Popup.openIDE, 
        setAgent: System.setAgent, 
        handleFiles: System.handleFiles,
        runCode: IDE.runCode,
        deploy: IDE.deploy,
        download: IDE.download,
        refreshPreview: IDE.refreshPreview,
        refresh: IDE.refreshTree,
        closeIDE: Popup.closeIDE
    };
    
    window.toggleDrawer = UI.toggleDrawer;
    window.newChat = Chat.new;

    // 8. START
    System.init();
    const form = getEl('ai-form');
    if(form) form.addEventListener('submit', (e) => Chat.send(e));
}

// Run Init
window.initYukuAiPage = initYukuAiPage;
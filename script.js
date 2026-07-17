// ==========================================
// STATE & STORAGE MANAGEMENT
// ==========================================
const DEFAULT_AI_RULES = `# AI Rules (ai_rules.md)
You are Vier, an expert AI web developer and 3D assistant. 
Your goal is to help the user build stunning web apps, landing pages, and Three.js scenes.

## UI / UX Design Rules (CRITICAL):
- You have access to Tailwind CSS (via CDN) in the preview. USE IT for styling websites and landing pages.
- DO NOT use emojis in UI text (buttons, headers, etc.). 
- DO NOT use generic purple/blue gradients. Use modern, sleek aesthetics (e.g., dark mode, glassmorphism, subtle accents, high contrast typography).
- Use modern fonts (Inter, Roboto, etc.) via Google Fonts.

## Animation Rules:
- If building a 3D scene, you MUST include animations using requestAnimationFrame. Objects should not be static.

## Mock Data Rules:
- If you need fake data for a website (e.g., user list, product list), generate it in the script.js. 
- YOU MUST inform the user in the chat: "I am using mock data for this demo."

## Interaction Rules:
If you need to ask the user a question to clarify requirements, output EXACTLY this tag:
<question>Your question here?</question>

If you need the user to choose from multiple options, output EXACTLY this tag with valid JSON:
<choose>[{"label":"Option 1"},{"label":"Option 2"},{"label":"Option 3"},{"label":"Option 4"}]</choose>

## Image Generation Rules:
If the user asks to generate an image, texture, or asset, output EXACTLY this tag:
<generate_image>{"prompt": "detailed description of image", "filename": "name.png"}</generate_image>

## Database Rules (localStorage):
If the user asks to save data, create a database, or store user input, use the browser's localStorage API.

## Multi-Page Routing:
If the user asks for multiple pages, create separate HTML files. Vier automatically intercepts <a> clicks.

## Coding Rules:
- If building a 3D scene or game, use Three.js r128.
- If building a website, use HTML + Tailwind CSS + Vanilla JS.
- You MUST ALWAYS output the complete, updated content for ALL THREE files: index.html, script.js, and styles.css.
- To specify which file the code belongs to, put the filename in a comment on the VERY FIRST LINE of the code block. DO NOT use spaces before the filename.

Example:
\`\`\`html
<!--index.html-->
<html>...</html>
\`\`\`

\`\`\`javascript
//script.js
const scene = new THREE.Scene();
\`\`\`
`;

let appSettings = JSON.parse(localStorage.getItem('vier_settings')) || {
    provider: 'openai',
    baseUrl: '',
    apiKey: '',
    textModel: 'gpt-4o',
    imageModel: 'dall-e-3',
    videoModel: '',
    ghPat: '',
    ghRepo: '', 
    aiRules: DEFAULT_AI_RULES,
    fetchedModels: []
};

let projects = JSON.parse(localStorage.getItem('vier_projects')) || [];
let currentProjectId = null;

const defaultFiles = {
    "index.html": "<!DOCTYPE html>\n<html>\n<head>\n  <title>Vier App</title>\n</head>\n<body>\n  <div id='app'>Hello Vier</div>\n  <script src=\"script.js\"></script>\n</body>\n</html>",
    "script.js": "// AI will generate code here\nconsole.log('Vier App Ready');",
    "styles.css": "body { margin: 0; font-family: sans-serif; }",
    "ai_rules.md": appSettings.aiRules
};

const templates = {
    "3D Portfolio": {
        "index.html": "<!DOCTYPE html><html><head><title>3D Portfolio</title><link rel=\"stylesheet\" href=\"styles.css\"></head><body><script src=\"three.js\"></script><script src=\"script.js\"></script></body></html>",
        "script.js": "const scene = new THREE.Scene();\nconst camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);\ncamera.position.z = 5;\nconst renderer = new THREE.WebGLRenderer({ antialias: true });\nrenderer.setSize(window.innerWidth, window.innerHeight);\ndocument.body.appendChild(renderer.domElement);\n\nconst geometry = new THREE.IcosahedronGeometry(1, 0);\nconst material = new THREE.MeshStandardMaterial({ color: 0x8b5cf6, metalness: 0.8, roughness: 0.2 });\nconst mesh = new THREE.Mesh(geometry, material);\nscene.add(mesh);\n\nconst light = new THREE.DirectionalLight(0xffffff, 1);\nlight.position.set(2, 2, 2);\nscene.add(light);\n\nfunction animate() {\n  requestAnimationFrame(animate);\n  mesh.rotation.x += 0.01;\n  mesh.rotation.y += 0.01;\n  renderer.render(scene, camera);\n}\nanimate();",
        "styles.css": "body { margin: 0; overflow: hidden; background: #000; }"
    },
    "SaaS Landing Page": {
        "index.html": "<!DOCTYPE html><html><head><title>SaaS Landing</title><script src=\"https://cdn.tailwindcss.com\"></script><link rel=\"stylesheet\" href=\"styles.css\"></head><body class=\"bg-zinc-900 text-white\"><nav class=\"flex justify-between p-6\"><div class=\"font-bold text-xl\">VierCRM</div><button class=\"bg-indigo-600 px-4 py-2 rounded-lg\">Get Started</button></nav><header class=\"text-center py-20\"><h1 class=\"text-6xl font-extrabold tracking-tight\">The Future of CRM</h1><p class=\"text-zinc-400 mt-4 text-xl\">Manage your customers with AI-powered insights.</p><button class=\"bg-indigo-600 px-8 py-4 rounded-lg text-lg font-bold mt-8\">Start Free Trial</button></header><script src=\"script.js\"></script></body></html>",
        "script.js": "console.log('Landing page loaded');",
        "styles.css": "body { font-family: 'Inter', sans-serif; }"
    },
    "Interactive Game": {
        "index.html": "<!DOCTYPE html><html><head><title>3D Game</title><link rel=\"stylesheet\" href=\"styles.css\"></head><body><h1>Score: <span id=\"score\">0</span></h1><script src=\"three.js\"></script><script src=\"script.js\"></script></body></html>",
        "script.js": "const scene = new THREE.Scene();\nconst camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);\ncamera.position.z = 5;\nconst renderer = new THREE.WebGLRenderer({ antialias: true });\nrenderer.setSize(window.innerWidth, window.innerHeight);\ndocument.body.appendChild(renderer.domElement);\n\nlet score = 0;\nconst player = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({color: 0x00ff00}));\nscene.add(player);\n\nconst enemy = new THREE.Mesh(new THREE.SphereGeometry(), new THREE.MeshStandardMaterial({color: 0xff0000}));\nenemy.position.x = 3;\nscene.add(enemy);\n\nscene.add(new THREE.DirectionalLight(0xffffff, 1));\n\ndocument.addEventListener('keydown', (e) => {\n  if(e.key === 'ArrowUp') player.position.y += 0.1;\n  if(e.key === 'ArrowDown') player.position.y -= 0.1;\n  if(e.key === 'ArrowLeft') player.position.x -= 0.1;\n  if(e.key === 'ArrowRight') player.position.x += 0.1;\n});\n\nfunction animate() {\n  requestAnimationFrame(animate);\n  enemy.position.x -= 0.02;\n  if(enemy.position.x < -3) enemy.position.x = 3;\n  \n  if(player.position.distanceTo(enemy.position) < 1) {\n    score++;\n    document.getElementById('score').innerText = score;\n    enemy.position.x = 3;\n    enemy.position.y = Math.random() * 4 - 2;\n  }\n  \n  renderer.render(scene, camera);\n}\nanimate();",
        "styles.css": "body { margin: 0; overflow: hidden; background: #222; color: white; font-family: sans-serif; } h1 { position: absolute; top: 10px; left: 10px; z-index: 10; }"
    },
    "Dashboard UI": {
        "index.html": "<!DOCTYPE html><html><head><title>Dashboard</title><script src=\"https://cdn.tailwindcss.com\"></script><link rel=\"stylesheet\" href=\"styles.css\"></head><body class=\"bg-gray-100\"><div class=\"flex h-screen\"><nav class=\"w-64 bg-gray-800 text-white p-4 flex flex-col gap-4\"><div class=\"text-2xl font-bold mb-8\">VierDash</div><a href=\"#\" class=\"hover:text-indigo-400\">Overview</a><a href=\"#\" class=\"hover:text-indigo-400\">Analytics</a><a href=\"#\" class=\"hover:text-indigo-400\">Users</a></nav><main class=\"flex-1 p-8\"><h1 class=\"text-3xl font-bold mb-6\">Overview</h1><div class=\"grid grid-cols-3 gap-6\"><div class=\"bg-white p-6 rounded-lg shadow\"><h2 class=\"text-xl text-gray-500\">Revenue</h2><p class=\"text-3xl font-bold mt-2\">$12,345</p></div><div class=\"bg-white p-6 rounded-lg shadow\"><h2 class=\"text-xl text-gray-500\">Users</h2><p class=\"text-3xl font-bold mt-2\">1,234</p></div><div class=\"bg-white p-6 rounded-lg shadow\"><h2 class=\"text-xl text-gray-500\">Conversion</h2><p class=\"text-3xl font-bold mt-2\">3.4%</p></div></div></main></div><script src=\"script.js\"></script></body></html>",
        "script.js": "console.log('Dashboard loaded');",
        "styles.css": "body { font-family: 'Inter', sans-serif; }"
    }
};

let pendingAttachments = [];

// ==========================================
// THEME TOGGLE LOGIC
// ==========================================
function setTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('vier_theme', theme);
    
    const iconHtml = theme === 'dark' 
        ? '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>'
        : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
        
    document.getElementById('theme-icon').innerHTML = iconHtml;
    document.getElementById('theme-icon-editor').innerHTML = iconHtml;
}

document.getElementById('theme-toggle-btn').addEventListener('click', () => {
    const newTheme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
});
document.getElementById('theme-toggle-btn-editor').addEventListener('click', () => {
    const newTheme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
});

setTheme(localStorage.getItem('vier_theme') || 'dark');

// ==========================================
// ROUTING & VIEW MANAGEMENT
// ==========================================
const landingView = document.getElementById('landing-view');
const editorView = document.getElementById('editor-view');

function showView(viewName) {
    landingView.classList.remove('active');
    editorView.classList.remove('active');
    if (viewName === 'landing') {
        landingView.classList.add('active');
        renderProjects();
    } else {
        editorView.classList.add('active');
        updatePreview();
        updateModelSelector();
        initDragAndDrop();
    }
}

document.getElementById('new-project-btn').addEventListener('click', () => {
    const newProject = {
        id: Date.now().toString(),
        name: `Project ${projects.length + 1}`,
        messages: [],
        files: JSON.parse(JSON.stringify(defaultFiles)),
        thumb: null
    };
    projects.push(newProject);
    saveProjects();
    openProject(newProject.id);
});

document.getElementById('clone-url-btn').addEventListener('click', () => {
    const url = document.getElementById('clone-url-input').value.trim();
    if (!url) return alert("Please enter a URL.");
    
    const newProject = {
        id: Date.now().toString(),
        name: `Cloned ${new Date().toLocaleTimeString()}`,
        messages: [],
        files: JSON.parse(JSON.stringify(defaultFiles)),
        thumb: null
    };
    projects.push(newProject);
    saveProjects();
    openProject(newProject.id);
    
    document.getElementById('prompt-input').value = `Please analyze the layout and style of this website: ${url}\nClone its structure using HTML and Tailwind CSS. Use placeholder images.`;
    runGeneration(`Please analyze the layout and style of this website: ${url}\nClone its structure using HTML and Tailwind CSS. Use placeholder images.`);
});

document.querySelectorAll('.template-card').forEach(card => {
    card.addEventListener('click', () => {
        const templateName = card.dataset.template;
        const newProject = {
            id: Date.now().toString(),
            name: templateName,
            messages: [],
            files: JSON.parse(JSON.stringify(templates[templateName])),
            thumb: null
        };
        projects.push(newProject);
        saveProjects();
        openProject(newProject.id);
    });
});

document.getElementById('back-btn').addEventListener('click', () => {
    captureThumbnail();
    showView('landing');
});

function openProject(id) {
    currentProjectId = id;
    const project = projects.find(p => p.id === id);
    if (!project) return;
    
    document.getElementById('editor-project-name').innerText = project.name;
    document.getElementById('chat-history').innerHTML = '';
    document.getElementById('attachment-preview').innerHTML = '';
    pendingAttachments = [];
    
    if (project.messages.length === 0) {
        renderEmptyState();
    } else {
        project.messages.forEach(msg => addMessage(msg.text, msg.sender, false));
    }
    
    showView('editor');
    renderFileTree();
}

function renderEmptyState() {
    const history = document.getElementById('chat-history');
    history.innerHTML = `
        <div id="chat-empty-state" class="chat-empty-state">
            <div class="empty-icon">V</div>
            <h4>Start Building</h4>
            <p>Ask Vier to generate 3D objects, web apps, or landing pages.</p>
            <div class="quick-prompts">
                <button class="quick-prompt">Build a 3D portfolio</button>
                <button class="quick-prompt">Create a SaaS landing page</button>
                <button class="quick-prompt">Generate a cyberpunk texture</button>
            </div>
        </div>
    `;
    document.querySelectorAll('.quick-prompt').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('prompt-input').value = btn.innerText;
            runGeneration(btn.innerText);
        });
    });
}

function renderProjects() {
    const grid = document.getElementById('projects-grid');
    grid.innerHTML = '';
    if (projects.length === 0) {
        grid.innerHTML = '<p style="color: var(--text-tertiary); text-align: center; width: 100%;">No projects yet. Create one to get started!</p>';
        return;
    }
    projects.forEach(p => {
        const card = document.createElement('div');
        card.className = 'project-card';
        
        const thumbStyle = p.thumb ? `style="background-image: url('${p.thumb}')"` : '';
        const thumbContent = p.thumb ? '' : '3D';
        
        card.innerHTML = `
            <div class="project-thumb" ${thumbStyle}>
                ${thumbContent}
                <button class="delete-project-btn" data-id="${p.id}" title="Delete Project">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
            <div class="project-info">
                <h4>${p.name}</h4>
                <p>Last edited: ${new Date(parseInt(p.id)).toLocaleString()}</p>
            </div>
        `;
        card.addEventListener('click', () => openProject(p.id));
        grid.appendChild(card);
    });
    
    document.querySelectorAll('.delete-project-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteProject(btn.dataset.id);
        });
    });
}

function deleteProject(id) {
    if (confirm('Are you sure you want to delete this project?')) {
        projects = projects.filter(p => p.id !== id);
        saveProjects();
        renderProjects();
    }
}

function captureThumbnail() {
    const project = getCurrentProject();
    if (!project) return;
    
    try {
        const iframe = document.getElementById('preview-iframe');
        if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
            const canvas = iframe.contentDocument.querySelector('canvas');
            if (canvas && canvas.width > 0 && canvas.height > 0) {
                project.thumb = canvas.toDataURL('image/jpeg', 0.6);
                saveProjects();
            }
        }
    } catch (e) {
        console.warn("Could not capture thumbnail.", e);
    }
}

function saveProjects() { localStorage.setItem('vier_projects', JSON.stringify(projects)); }
function getCurrentProject() { return projects.find(p => p.id === currentProjectId); }

// ==========================================
// SETTINGS MODAL & TABS
// ==========================================
const settingsModal = document.getElementById('settings-modal');
document.getElementById('open-settings-btn-landing').addEventListener('click', openSettings);
document.getElementById('open-settings-btn-editor').addEventListener('click', openSettings);
document.getElementById('close-settings-btn').addEventListener('click', () => settingsModal.classList.add('hidden'));

function openSettings() {
    populateSettings();
    settingsModal.classList.remove('hidden');
}

document.querySelectorAll('.settings-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.settings-pane').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.querySelector(`.settings-pane[data-pane="${tab.dataset.tab}"]`).classList.add('active');
    });
});

function populateSettings() {
    document.getElementById('api-provider').value = appSettings.provider;
    document.getElementById('base-url').value = appSettings.baseUrl;
    document.getElementById('api-key').value = appSettings.apiKey;
    document.getElementById('gh-pat').value = appSettings.ghPat;
    document.getElementById('ai-rules-input').value = appSettings.aiRules;
    
    if(appSettings.provider === 'custom') document.getElementById('base-url-group').classList.remove('hidden');
    else document.getElementById('base-url-group').classList.add('hidden');

    if(appSettings.ghRepo) {
        const select = document.getElementById('gh-existing-repo');
        select.innerHTML = `<option value="${appSettings.ghRepo}">${appSettings.ghRepo} (Current)</option>`;
        select.disabled = false;
    }

    const textSel = document.getElementById('api-model-text');
    const imgSel = document.getElementById('api-model-image');
    const vidSel = document.getElementById('api-model-video');
    
    textSel.innerHTML = '<option value="">None</option>';
    imgSel.innerHTML = '<option value="">None</option>';
    vidSel.innerHTML = '<option value="">None</option>';

    if (appSettings.fetchedModels && appSettings.fetchedModels.length > 0) {
        appSettings.fetchedModels.forEach(m => {
            textSel.innerHTML += `<option value="${m}">${m}</option>`;
            imgSel.innerHTML += `<option value="${m}">${m}</option>`;
            vidSel.innerHTML += `<option value="${m}">${m}</option>`;
        });
    } else {
        textSel.innerHTML += `<option value="${appSettings.textModel || ''}">${appSettings.textModel || 'Fetch models first'}</option>`;
        imgSel.innerHTML += `<option value="${appSettings.imageModel || ''}">${appSettings.imageModel || 'Fetch models first'}</option>`;
    }

    textSel.value = appSettings.textModel;
    imgSel.value = appSettings.imageModel;
    vidSel.value = appSettings.videoModel;
}

document.getElementById('api-provider').addEventListener('change', (e) => {
    if(e.target.value === 'custom') document.getElementById('base-url-group').classList.remove('hidden');
    else document.getElementById('base-url-group').classList.add('hidden');
});

document.getElementById('save-settings-btn').addEventListener('click', () => {
    appSettings.provider = document.getElementById('api-provider').value;
    appSettings.baseUrl = document.getElementById('base-url').value;
    appSettings.apiKey = document.getElementById('api-key').value;
    appSettings.textModel = document.getElementById('api-model-text').value;
    appSettings.imageModel = document.getElementById('api-model-image').value;
    appSettings.videoModel = document.getElementById('api-model-video').value;
    appSettings.ghPat = document.getElementById('gh-pat').value;
    appSettings.aiRules = document.getElementById('ai-rules-input').value;
    
    const existingRepo = document.getElementById('gh-existing-repo').value;
    const newRepo = document.getElementById('gh-new-repo').value.trim();
    if(newRepo) {
        appSettings.ghRepo = `NEW:${newRepo}`;
    } else if(existingRepo && existingRepo !== 'Fetch repos first...') {
        appSettings.ghRepo = existingRepo;
    }

    localStorage.setItem('vier_settings', JSON.stringify(appSettings));
    settingsModal.classList.add('hidden');
    updateModelSelector();
    
    if (getCurrentProject()) {
        getCurrentProject().files['ai_rules.md'] = appSettings.aiRules;
        saveProjects();
        renderFileTree();
    }
});

document.getElementById('fetch-models-btn').addEventListener('click', async () => {
    const provider = document.getElementById('api-provider').value;
    const key = document.getElementById('api-key').value;
    const baseUrl = document.getElementById('base-url').value;
    if (!key) return alert("Please enter API Key first.");
    
    let endpoint = 'https://api.openai.com/v1/models';
    if (provider === 'custom' && baseUrl) endpoint = `${baseUrl}/models`;
    else if (provider === 'anthropic' || provider === 'gemini') {
        const manualModels = provider === 'anthropic' ? ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'] : ['gemini-1.5-flash', 'gemini-1.5-pro'];
        appSettings.fetchedModels = manualModels;
        appSettings.textModel = manualModels[0];
        localStorage.setItem('vier_settings', JSON.stringify(appSettings));
        populateSettings();
        updateModelSelector();
        return;
    }

    try {
        const res = await fetch(endpoint, { headers: { 'Authorization': `Bearer ${key}` } });
        const data = await res.json();
        if (data.data) {
            appSettings.fetchedModels = data.data.map(m => m.id);
            appSettings.textModel = data.data.find(m => m.id.includes('gpt-4o'))?.id || data.data[0].id;
            appSettings.imageModel = data.data.find(m => m.id.includes('dall-e-3'))?.id || '';
            localStorage.setItem('vier_settings', JSON.stringify(appSettings));
            populateSettings();
            updateModelSelector();
        }
    } catch (e) { alert("Failed to fetch models."); }
});

function updateModelSelector() {
    const chatSelector = document.getElementById('chat-model-selector');
    chatSelector.innerHTML = '';
    
    const icons = {
        text: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>',
        image: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>',
        video: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>'
    };
    
    if (appSettings.textModel) {
        const opt = document.createElement('option');
        opt.value = 'text';
        opt.innerHTML = `${icons.text} ${appSettings.textModel}`;
        chatSelector.appendChild(opt);
    }
    if (appSettings.imageModel) {
        const opt = document.createElement('option');
        opt.value = 'image';
        opt.innerHTML = `${icons.image} ${appSettings.imageModel}`;
        chatSelector.appendChild(opt);
    }
    if (appSettings.videoModel) {
        const opt = document.createElement('option');
        opt.value = 'video';
        opt.innerHTML = `${icons.video} ${appSettings.videoModel}`;
        chatSelector.appendChild(opt);
    }
}

// ==========================================
// GITHUB INTEGRATION & PUBLISH
// ==========================================
document.getElementById('fetch-repos-btn').addEventListener('click', async () => {
    const pat = document.getElementById('gh-pat').value.trim();
    if (!pat) return alert("Please enter GitHub PAT first.");
    
    const statusEl = document.getElementById('gh-status');
    const select = document.getElementById('gh-existing-repo');
    statusEl.innerText = "Fetching repositories...";
    select.disabled = true;
    select.innerHTML = '<option>Loading...</option>';

    try {
        const res = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
            headers: { 'Authorization': `token ${pat}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        
        select.innerHTML = data.map(r => `<option value="${r.full_name}">${r.full_name}</option>`).join('');
        select.disabled = false;
        statusEl.innerText = `Loaded ${data.length} repositories.`;
    } catch (error) {
        select.innerHTML = '<option>Failed to fetch</option>';
        statusEl.innerText = `Error: ${error.message}`;
    }
});

function toBase64(str) { return btoa(unescape(encodeURIComponent(str))); }

async function getGithubOwner() {
    const userRes = await fetch('https://api.github.com/user', { headers: { 'Authorization': `token ${appSettings.ghPat}` }});
    const userData = await userRes.json();
    return userData.login;
}

document.getElementById('publish-btn').addEventListener('click', async () => {
    if (!appSettings.ghPat || !appSettings.ghRepo) return alert("Set GitHub PAT and Repo in settings.");
    
    const project = getCurrentProject();
    let repoFullName = appSettings.ghRepo;
    const publishBtn = document.getElementById('publish-btn');
    publishBtn.innerText = "Publishing...";

    try {
        if (repoFullName.startsWith('NEW:')) {
            const newRepoName = repoFullName.substring(4);
            const owner = await getGithubOwner();
            await fetch('https://api.github.com/user/repos', {
                method: 'POST',
                headers: { 'Authorization': `token ${appSettings.ghPat}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newRepoName, private: false })
            });
            repoFullName = `${owner}/${newRepoName}`;
            appSettings.ghRepo = repoFullName;
            localStorage.setItem('vier_settings', JSON.stringify(appSettings));
        }

        // Clean files for production (remove dev tools like stats.js)
        let prodFiles = JSON.parse(JSON.stringify(project.files));
        if (prodFiles['index.html']) {
            prodFiles['index.html'] = prodFiles['index.html'].replace('<script src="https://cdn.jsdelivr.net/npm/stats.js@1.0.1/build/stats.min.js"><\/script>', '');
        }

        for (const [path, content] of Object.entries(prodFiles)) {
            let sha = null;
            const checkRes = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${path}`, {
                headers: { 'Authorization': `token ${appSettings.ghPat}` }
            });
            if (checkRes.ok) { const fileData = await checkRes.json(); sha = fileData.sha; }

            await fetch(`https://api.github.com/repos/${repoFullName}/contents/${path}`, {
                method: 'PUT',
                headers: { 'Authorization': `token ${appSettings.ghPat}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: `Vier Sync: Update ${path}`, content: toBase64(content), sha: sha })
            });
        }

        const owner = repoFullName.split('/')[0];
        const repoName = repoFullName.split('/')[1];
        
        await fetch(`https://api.github.com/repos/${repoFullName}/pages`, {
            method: 'POST',
            headers: { 'Authorization': `token ${appSettings.ghPat}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: { branch: "main", path: "/" } })
        });

        alert(`Success! Your site is deploying to: https://${owner}.github.io/${repoName}`);
        window.open(`https://${owner}.github.io/${repoName}`, '_blank');
    } catch (error) { 
        alert("Publish failed: " + error.message); 
    } finally {
        publishBtn.innerText = "Publish";
    }
});

// ==========================================
// SHARE PROJECT (URL HASH)
// ==========================================
document.getElementById('share-btn').addEventListener('click', () => {
    const project = getCurrentProject();
    if (!project) return;
    
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(project))));
    const url = `${window.location.origin}${window.location.pathname}#share=${encoded}&readonly=true`;
    
    navigator.clipboard.writeText(url).then(() => {
        alert("Read-only shareable link copied to clipboard!");
    });
});

function checkSharedProject() {
    const hash = window.location.hash;
    if (hash.startsWith('#share=')) {
        try {
            const encoded = hash.substring(7).split('&')[0];
            const project = JSON.parse(decodeURIComponent(escape(atob(encoded))));
            projects.push(project);
            saveProjects();
            history.replaceState(null, null, window.location.pathname);
            openProject(project.id);
            
            // If readonly, hide chat and code
            if (hash.includes('readonly=true')) {
                document.getElementById('mobile-panel-chat').style.display = 'none';
                document.getElementById('mobile-panel-workspace').style.flex = '1';
                document.getElementById('mobile-panel-workspace').classList.add('active-mobile');
                document.querySelector('.ws-tab[data-ws-tab="code"]').style.display = 'none';
                document.querySelector('.ws-tab[data-ws-tab="scene"]').style.display = 'none';
                document.getElementById('terminal-panel').style.display = 'none';
                document.querySelector('.ws-actions').style.display = 'none';
            }
        } catch(e) { console.error("Failed to load shared project", e); }
    }
}

// ==========================================
// DRAG & DROP ASSET CONTEXT & FILE UPLOAD
// ==========================================
function handleFileUpload(files) {
    const project = getCurrentProject();
    if (!project) return;
    const previewArea = document.getElementById('attachment-preview');

    Array.from(files).forEach(file => {
        const path = `assets/${file.name}`;
        const reader = new FileReader();
        reader.onload = function(event) {
            project.files[path] = event.target.result;
            pendingAttachments.push(path);
            saveProjects();
            renderFileTree();
            updatePreview(); 

            const chip = document.createElement('div');
            chip.className = 'attachment-chip';
            chip.innerHTML = `
                📄 ${file.name}
                <span class="remove-att" data-path="${path}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </span>
            `;
            chip.querySelector('.remove-att').addEventListener('click', (e) => {
                e.stopPropagation();
                chip.remove();
                pendingAttachments = pendingAttachments.filter(p => p !== path);
                delete project.files[path]; 
                saveProjects();
                renderFileTree();
                updatePreview();
            });
            previewArea.appendChild(chip);
        };
        reader.readAsDataURL(file);
    });
}

function initDragAndDrop() {
    const editorLayout = document.querySelector('.editor-layout');
    const dropOverlay = document.getElementById('drop-overlay');

    editorLayout.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropOverlay.classList.remove('hidden');
    });

    editorLayout.addEventListener('dragleave', (e) => {
        if (e.target === editorLayout) {
            dropOverlay.classList.add('hidden');
        }
    });

    editorLayout.addEventListener('drop', (e) => {
        e.preventDefault();
        dropOverlay.classList.add('hidden');
        handleFileUpload(e.dataTransfer.files);
    });
}

document.getElementById('upload-btn').addEventListener('click', () => {
    document.getElementById('file-input').click();
});
document.getElementById('file-input').addEventListener('change', (e) => {
    handleFileUpload(e.target.files);
    e.target.value = ''; 
});

document.getElementById('reload-preview-btn').addEventListener('click', () => {
    updatePreview();
});

// ==========================================
// COMPONENT LIBRARY
// ==========================================
document.getElementById('comp-lib-btn').addEventListener('click', () => {
    document.getElementById('comp-dropdown').classList.toggle('hidden');
});

document.querySelectorAll('.comp-item').forEach(item => {
    item.addEventListener('click', () => {
        document.getElementById('prompt-input').value = item.dataset.prompt;
        document.getElementById('comp-dropdown').classList.add('hidden');
        runGeneration(item.dataset.prompt);
    });
});

// ==========================================
// CHAT & AI INTERACTION
// ==========================================
const modeBtns = document.querySelectorAll('.mode-btn');
let currentMode = 'build';
modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.dataset.mode;
    });
});

function formatMarkdown(text) {
    let html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    // Image Markdown Support
    html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; border-radius: 8px; margin-top: 8px;">');
    
    html = html.replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, lang, code) => {
        let codeContent = code.trim();
        let filename = 'code.txt';
        const firstLineEnd = codeContent.indexOf('\n');
        const firstLine = firstLineEnd !== -1 ? codeContent.substring(0, firstLineEnd).trim() : codeContent;
        
        if (firstLine.startsWith('//')) {
            filename = firstLine.replace(/^\/\/\s*/, '').trim();
            codeContent = firstLineEnd !== -1 ? codeContent.substring(firstLineEnd + 1).trim() : '';
        } else if (firstLine.startsWith('<!--')) {
            const matchHtml = firstLine.match(/<!--\s*(.*?)\s*-->/);
            if(matchHtml) filename = matchHtml[1];
            codeContent = firstLineEnd !== -1 ? codeContent.substring(firstLineEnd + 1).trim() : '';
        } else {
            if (lang === 'html') filename = 'index.html';
            else if (lang === 'css') filename = 'styles.css';
            else if (lang === 'javascript' || lang === 'js') filename = 'script.js';
        }
        
        const fileIcon = filename.includes('.html') ? '🌐' : filename.includes('.css') ? '🎨' : filename.includes('.js') ? '⚙️' : '📄';
        
        return `<div class="file-card" data-filename="${filename}">
            <div class="file-card-info">
                <div class="file-card-icon">${fileIcon}</div>
                <div>
                    <div class="file-card-title">${filename}</div>
                    <div class="file-card-subtitle">Code generated • Click to view</div>
                </div>
            </div>
            <button class="btn btn-secondary btn-sm view-code-btn">View Code</button>
        </div>`;
    });
    
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\n/g, "<br>");
    return html;
}

function addMessage(text, sender, save = true) {
    const history = document.getElementById('chat-history');
    const emptyState = document.getElementById('chat-empty-state');
    if (emptyState) emptyState.remove();

    const row = document.createElement('div');
    row.classList.add('chat-row');
    
    const avatar = document.createElement('div');
    avatar.classList.add('chat-avatar', sender);
    avatar.innerText = sender === 'ai' ? 'V' : 'U';
    
    const bubble = document.createElement('div');
    bubble.classList.add('chat-bubble', sender);
    
    const questionMatch = text.match(/<question>(.*?)<\/question>/s);
    const chooseMatch = text.match(/<choose>(.*?)<\/choose>/s);

    if (questionMatch) {
        bubble.classList.remove('chat-bubble');
        bubble.classList.add('ai-interactive');
        bubble.innerHTML = `<p>${questionMatch[1]}</p><input type="text" class="ai-input-field" placeholder="Type your answer..." title="Type your answer here"><button class="btn btn-primary btn-sm" onclick="submitInteraction(this)" title="Submit answer">Submit</button>`;
    } else if (chooseMatch) {
        try {
            const options = JSON.parse(chooseMatch[1]);
            bubble.classList.remove('chat-bubble');
            bubble.classList.add('ai-interactive');
            let optionsHtml = '<div class="ai-options-grid">';
            options.forEach(opt => {
                optionsHtml += `<button class="ai-option-btn" onclick="submitInteraction(this)" title="Click to choose this option">${opt.label}</button>`;
            });
            bubble.innerHTML = `<p>Please choose an option:</p>${optionsHtml}</div>`;
        } catch (e) { bubble.innerHTML = formatMarkdown(text); }
    } else {
        bubble.innerHTML = formatMarkdown(text);
    }

    row.appendChild(avatar);
    row.appendChild(bubble);
    history.appendChild(row);
    
    bubble.querySelectorAll('.view-code-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const filename = btn.closest('.file-card').dataset.filename;
            switchToCodeTab(filename);
        });
    });

    history.scrollTop = history.scrollHeight;

    if (save && getCurrentProject()) {
        getCurrentProject().messages.push({ text, sender });
        saveProjects();
    }
}

function switchToCodeTab(filename) {
    const workspacePanel = document.getElementById('mobile-panel-workspace');
    const chatPanel = document.getElementById('mobile-panel-chat');
    if (!workspacePanel.classList.contains('active-mobile')) {
        chatPanel.classList.remove('active-mobile');
        workspacePanel.classList.add('active-mobile');
        document.querySelectorAll('.mobile-tab').forEach(t => t.classList.remove('active'));
        document.querySelector('.mobile-tab[data-target="code"]').classList.add('active');
    }
    
    document.querySelectorAll('.ws-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.ws-pane').forEach(p => p.classList.remove('active'));
    document.querySelector('.ws-tab[data-ws-tab="code"]').classList.add('active');
    document.getElementById('code-pane').classList.add('active');
    
    const fileItem = document.querySelector(`.file-item[data-file="${filename}"]`);
    if (fileItem) fileItem.click();
}

window.submitInteraction = function(element) {
    const container = element.closest('.ai-interactive');
    let responseText = "";
    const input = container.querySelector('input');
    if (input) responseText = input.value;
    else responseText = element.innerText;
    
    container.remove();
    runGeneration(responseText, true);
}

let isGenerating = false;
let abortController = null;

const generateBtn = document.getElementById('generate-btn');
generateBtn.addEventListener('click', () => {
    if (isGenerating) {
        if (abortController) abortController.abort();
        isGenerating = false;
        updateGenerateBtnUI();
    } else {
        const promptInput = document.getElementById('prompt-input');
        const prompt = promptInput.value.trim();
        if (!prompt && pendingAttachments.length === 0) return;
        runGeneration(prompt);
    }
});

document.getElementById('audit-btn').addEventListener('click', () => {
    const scriptContent = getCurrentProject().files['script.js'] || "// No script found";
    const auditPrompt = `Please perform a strict Three.js performance audit on the following code. Identify bottlenecks (draw calls, lack of InstancedMesh, heavy shadows, expensive materials, memory leaks). Output your findings clearly, then provide the optimized code block.\n\nCode:\n\`\`\`javascript\n${scriptContent}\n\`\`\``;
    document.getElementById('prompt-input').value = auditPrompt;
    runGeneration(auditPrompt);
});

function updateGenerateBtnUI() {
    if (isGenerating) {
        generateBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"></rect></svg> Stop`;
        generateBtn.classList.remove('btn-primary');
        generateBtn.classList.add('btn-danger');
    } else {
        generateBtn.innerHTML = `Generate <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>`;
        generateBtn.classList.remove('btn-danger');
        generateBtn.classList.add('btn-primary');
    }
}

// ==========================================
// REAL-TIME AGENT LOGIC & STREAMING
// ==========================================
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function moveAgentCursor(selector, thoughtText) {
    const cursor = document.getElementById('agent-cursor');
    const bubble = document.getElementById('agent-bubble');
    const target = document.querySelector(selector);
    
    if (!target) return;
    
    const rect = target.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    cursor.style.left = `${x}px`;
    cursor.style.top = `${y}px`;
    if (thoughtText) bubble.innerText = thoughtText;
    
    await sleep(800);
}

async function runAgentSequence() {
    const cursor = document.getElementById('agent-cursor');
    cursor.classList.remove('hidden');
    
    await moveAgentCursor('#prompt-input', 'Analyzing prompt...');
    await moveAgentCursor('#chat-history', 'Thinking...');
    
    await moveAgentCursor('.ws-tab[data-ws-tab="code"]', 'Writing code...');
    document.querySelector('.ws-tab[data-ws-tab="code"]').click();
    
    await moveAgentCursor('.ws-tab[data-ws-tab="preview"]', 'Testing scene...');
    document.querySelector('.ws-tab[data-ws-tab="preview"]').click();
    
    const previewPane = document.getElementById('preview-pane');
    const rect = previewPane.getBoundingClientRect();
    
    cursor.style.left = `${rect.left + 200}px`;
    cursor.style.top = `${rect.top + 200}px`;
    await sleep(600);
    
    cursor.style.left = `${rect.left + 400}px`;
    cursor.style.top = `${rect.top + 300}px`;
    await sleep(600);
    
    cursor.style.left = `${rect.left + 300}px`;
    cursor.style.top = `${rect.top + 200}px`;
    await sleep(600);
    
    await moveAgentCursor('#generate-btn', 'Task complete!');
    await sleep(500);
    cursor.classList.add('hidden');
}

async function runGeneration(prompt, isContinuation = false) {
    if (!appSettings.apiKey) return alert("Please set your API Key in Settings.");
    
    const selectedModelType = document.getElementById('chat-model-selector').value;
    
    // Fix: Only require text model if we are actually doing text generation
    if (selectedModelType !== 'image' && !appSettings.textModel) {
        return alert("Please select a Text Model in Settings (Click 'Fetch Models').");
    }
    
    let displayText = prompt;
    let finalPrompt = prompt;
    
    if (pendingAttachments.length > 0) {
        displayText = prompt + (prompt ? `\n\n(Attached: ${pendingAttachments.join(', ')})` : `(Attached: ${pendingAttachments.join(', ')})`);
        finalPrompt = prompt + `\n\nI have attached the following assets: ${pendingAttachments.join(', ')}. Please use them in the scene.`;
        
        addMessage(finalPrompt, 'user'); 
        document.getElementById('prompt-input').value = '';
        document.getElementById('attachment-preview').innerHTML = ''; 
        pendingAttachments = []; 
    } else {
        if (!displayText.trim()) displayText = "Process attached assets.";
        addMessage(displayText, 'user');
        document.getElementById('prompt-input').value = '';
    }
    
    isGenerating = true;
    updateGenerateBtnUI();
    abortController = new AbortController();

    const thinkingRow = document.createElement('div');
    thinkingRow.classList.add('chat-row');
    thinkingRow.innerHTML = `<div class="chat-avatar ai">V</div><div class="chat-bubble ai"><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;
    document.getElementById('chat-history').appendChild(thinkingRow);
    const thinkingBubble = thinkingRow.querySelector('.chat-bubble');

    try {
        // Direct Image Generation Mode
        if (selectedModelType === 'image' && !isContinuation) {
            thinkingRow.remove();
            addMessage(`Generating image: ${prompt}...`, 'ai');
            const imgUrl = await generateImage(prompt);
            if (imgUrl) {
                const filename = `assets/generated_${Date.now()}.png`;
                getCurrentProject().files[filename] = imgUrl;
                saveProjects();
                renderFileTree();
                addMessage(`![Generated Image](${imgUrl})`, 'ai');
                addMessage("Image generated and saved to assets. Ask me to build a website around it!", 'ai');
            }
            isGenerating = false;
            updateGenerateBtnUI();
            return;
        }

        let aiResponseText = "";
        const sysPrompt = `Mode: ${currentMode}\nRules:\n${appSettings.aiRules}\nCurrent Files: ${JSON.stringify(getCurrentProject().files)}`;
        
        const onChunk = (delta) => {
            aiResponseText += delta;
            
            if (currentMode === 'agent') {
                const cursor = document.getElementById('agent-cursor');
                if (!cursor.classList.contains('hidden')) {
                    if (aiResponseText.includes('```')) {
                        if (!cursor.dataset.coding) {
                            cursor.dataset.coding = 'true';
                            document.querySelector('.ws-tab[data-ws-tab="code"]').click();
                            moveAgentCursor('#code-viewer', 'Writing code...');
                        }
                        const codeStartIndex = aiResponseText.indexOf('```');
                        let codePart = aiResponseText.substring(codeStartIndex + 3);
                        const firstNewline = codePart.indexOf('\n');
                        if (firstNewline !== -1 && !codePart.substring(0, firstNewline).includes(' ')) {
                            codePart = codePart.substring(firstNewline + 1);
                        }
                        document.getElementById('code-viewer').innerText = codePart;
                    } else {
                        thinkingBubble.innerHTML = formatMarkdown(aiResponseText);
                        moveAgentCursor('#chat-history', 'Thinking...');
                    }
                }
            } else {
                thinkingBubble.innerHTML = formatMarkdown(aiResponseText);
            }
        };
        
        if (appSettings.provider === 'openai' || appSettings.provider === 'custom') {
            aiResponseText = await callOpenAIStream(finalPrompt, sysPrompt, abortController.signal, onChunk);
        } else if (appSettings.provider === 'anthropic') {
            aiResponseText = await callAnthropicStream(finalPrompt, sysPrompt, abortController.signal, onChunk);
        } else if (appSettings.provider === 'gemini') {
            aiResponseText = await callGeminiStream(finalPrompt, sysPrompt, abortController.signal, onChunk);
        }

        thinkingRow.remove();
        addMessage(aiResponseText, 'ai');
        
        const imageGenMatch = aiResponseText.match(/<generate_image>(.*?)<\/generate_image>/s);
        if (imageGenMatch) {
            const imgData = JSON.parse(imageGenMatch[1]);
            addMessage(`Generating image: ${imgData.prompt}...`, 'ai');
            const imgUrl = await generateImage(imgData.prompt);
            if (imgUrl) {
                getCurrentProject().files[`assets/${imgData.filename}`] = imgUrl;
                saveProjects();
                renderFileTree();
                addMessage(`![Generated Image](${imgUrl})`, 'ai');
                runGeneration(`The image has been generated and saved at assets/${imgData.filename}. Please update the code to use it.`, true);
                return;
            }
        }
        
        if ((currentMode === 'build' || currentMode === 'agent') && !aiResponseText.includes('<question>') && !aiResponseText.includes('<choose>')) {
            parseAndApplyCode(aiResponseText);
            updatePreview();
            
            if (currentMode === 'agent') {
                await runAgentSequence();
            } else {
                setTimeout(captureThumbnail, 1000); 
            }
        }
    } catch (error) {
        thinkingRow.remove();
        if (error.name === 'AbortError') {
            addMessage("Generation stopped by user.", 'ai');
        } else {
            addMessage("Error: " + error.message, 'ai');
        }
    } finally {
        isGenerating = false;
        updateGenerateBtnUI();
        document.getElementById('agent-cursor').classList.add('hidden');
    }
}

async function generateImage(prompt) {
    if (!appSettings.imageModel) return null;
    try {
        let endpoint = 'https://api.openai.com/v1/images/generations';
        if (appSettings.provider === 'custom' && appSettings.baseUrl) {
            endpoint = `${appSettings.baseUrl}/images/generations`;
        }
        
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${appSettings.apiKey}` },
            body: JSON.stringify({ model: appSettings.imageModel, prompt: prompt, n: 1, size: '1024x1024' })
        });
        const data = await res.json();
        if (data.data && data.data[0].url) {
            const imgRes = await fetch(data.data[0].url);
            const blob = await imgRes.blob();
            return await new Promise(resolve => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
        } else if (data.data && data.data[0].b64_json) {
            return `data:image/png;base64,${data.data[0].b64_json}`;
        }
    } catch (e) {
        console.error("Image gen failed", e);
        addMessage("Image generation failed. Make sure your provider supports it.", 'ai');
        return null;
    }
}

function parseAndApplyCode(text) {
    const project = getCurrentProject();
    if (!project) return;

    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
    let match;
    let filesUpdated = false;

    while ((match = codeBlockRegex.exec(text)) !== null) {
        const lang = (match[1] || '').toLowerCase();
        let codeContent = match[2].trim();
        
        let filename = '';
        const firstLineEnd = codeContent.indexOf('\n');
        const firstLine = firstLineEnd !== -1 ? codeContent.substring(0, firstLineEnd).trim() : codeContent;
        
        if (firstLine.startsWith('//')) {
            filename = firstLine.replace(/^\/\/\s*/, '').trim();
            codeContent = firstLineEnd !== -1 ? codeContent.substring(firstLineEnd + 1).trim() : '';
        } else if (firstLine.startsWith('<!--')) {
            const matchHtml = firstLine.match(/<!--\s*(.*?)\s*-->/);
            if(matchHtml) filename = matchHtml[1];
            codeContent = firstLineEnd !== -1 ? codeContent.substring(firstLineEnd + 1).trim() : '';
        }

        if (!filename) {
            if (lang === 'html') filename = 'index.html';
            else if (lang === 'css') filename = 'styles.css';
            else if (lang === 'javascript' || lang === 'js' || lang === '') filename = 'script.js';
        }

        if (filename) {
            project.files[filename] = codeContent;
            filesUpdated = true;
        }
    }

    if (filesUpdated) {
        saveProjects();
        renderFileTree();
    }
}

// ==========================================
// LIVE PREVIEW IFRAME LOGIC & ERROR CAPTURE
// ==========================================
function updatePreview() {
    const project = getCurrentProject();
    if (!project) return;

    let activePage = project.activePage || 'index.html';
    let htmlContent = project.files[activePage] || '<html><body>404 - Page not found</body></html>';
    const jsContent = project.files['script.js'] || '';
    const cssContent = project.files['styles.css'] || '';

    let assetsJson = {};
    Object.keys(project.files).forEach(path => {
        if (path.startsWith('assets/')) {
            assetsJson[path] = project.files[path]; 
        }
    });

    const threeScript = '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>';
    const gltfLoaderScript = '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"><\/script>';
    const tailwindScript = '<script src="https://cdn.tailwindcss.com"><\/script>';
    const statsScript = '<script src="https://cdn.jsdelivr.net/npm/stats.js@1.0.1/build/stats.min.js"><\/script>';
    const styleTag = `<style>${cssContent}<\/style>`;
    
    const assetInterceptorScript = `
    <script>
        const VIRTUAL_ASSETS = ${JSON.stringify(assetsJson)};
        const originalFetch = window.fetch;
        window.fetch = function(url, options) {
            if (typeof url === 'string' && VIRTUAL_ASSETS[url]) {
                return originalFetch.call(this, VIRTUAL_ASSETS[url], options);
            }
            return originalFetch.apply(this, arguments);
        };
        const OriginalXHR = window.XMLHttpRequest;
        function CustomXHR() {
            const xhr = new OriginalXHR();
            const originalOpen = xhr.open;
            xhr.open = function(method, url, ...args) {
                if (typeof url === 'string' && VIRTUAL_ASSETS[url]) {
                    url = VIRTUAL_ASSETS[url]; 
                }
                return originalOpen.call(this, method, url, ...args);
            };
            return xhr;
        }
        window.XMLHttpRequest = CustomXHR;
        
        window.onerror = function(message, source, lineno, colno, error) {
            window.parent.postMessage({ type: 'iframe_error', error: message + ' (Line: ' + lineno + ')' }, '*');
        };
        
        // Capture console logs
        const originalLog = console.log;
        console.log = function(...args) {
            window.parent.postMessage({ type: 'console_log', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') }, '*');
            originalLog.apply(console, args);
        };
        
        // SPA Router
        document.addEventListener('click', (e) => {
            const a = e.target.closest('a');
            if (a && a.getAttribute('href') && a.getAttribute('href').endsWith('.html')) {
                e.preventDefault();
                const path = a.getAttribute('href');
                window.parent.postMessage({ type: 'navigate', path: path }, '*');
            }
        });
        
        // FPS Monitor & Scene Graph
        window.addEventListener('load', () => {
            if (typeof Stats !== 'undefined' && typeof THREE !== 'undefined') {
                const stats = new Stats();
                stats.showPanel(0); // FPS
                stats.dom.style.position = 'absolute';
                stats.dom.style.top = '0';
                stats.dom.style.right = '0';
                stats.dom.style.left = 'auto';
                document.body.appendChild(stats.dom);
                
                function animateStats() {
                    stats.begin();
                    stats.end();
                    requestAnimationFrame(animateStats);
                }
                animateStats();
                
                // Scene Graph
                setTimeout(() => {
                    if (window.scene) {
                        const tree = [];
                        function traverse(obj, depth) {
                            if (!obj) return;
                            tree.push({ name: obj.name || obj.type, depth: depth });
                            if (obj.children) {
                                obj.children.forEach(c => traverse(c, depth + 1));
                            }
                        }
                        traverse(window.scene, 0);
                        window.parent.postMessage({ type: 'scene_tree', tree: tree }, '*');
                    }
                }, 1000);
            }
        });
    <\/script>`;
    
    const scriptTag = `<script>${jsContent}<\/script>`;
    
    const cleanHtml = htmlContent
        .replace(/<script[^>]*src=["']script\.js["'][^>]*><\/script>/gi, '')
        .replace(/<link[^>]*href=["']styles\.css["'][^>]*>/gi, '')
        .replace(/<\/?body[^>]*>/g, '');

    const fullDoc = `
        <!DOCTYPE html>
        <html>
        <head>
            ${threeScript}
            ${gltfLoaderScript}
            ${tailwindScript}
            ${statsScript}
            ${styleTag}
        </head>
        <body>
            ${cleanHtml}
            ${assetInterceptorScript}
            ${scriptTag}
        </body>
        </html>
    `;
    
    const iframe = document.getElementById('preview-iframe');
    iframe.srcdoc = fullDoc;
    
    document.getElementById('error-banner').classList.add('hidden');
    document.getElementById('scene-tree').innerHTML = '<div class="scene-empty">Running scene...</div>';
    document.getElementById('terminal-output').innerHTML = '';
}

window.addEventListener('message', (event) => {
    if (event.data.type === 'iframe_error') {
        const banner = document.getElementById('error-banner');
        banner.innerHTML = `
            <div class="err-msg">⚠️ ${event.data.error}</div>
            <div class="err-actions">
                <button class="err-btn" onclick="askAiToFixError()">Ask AI to Fix</button>
                <button class="err-btn" onclick="dismissError()">Dismiss</button>
            </div>
        `;
        banner.classList.remove('hidden');
        
        // Also log to terminal
        const term = document.getElementById('terminal-output');
        const log = document.createElement('div');
        log.className = 'term-log term-error';
        log.innerText = `[Error] ${event.data.error}`;
        term.appendChild(log);
        term.scrollTop = term.scrollHeight;
    } else if (event.data.type === 'console_log') {
        const term = document.getElementById('terminal-output');
        const log = document.createElement('div');
        log.className = 'term-log';
        log.innerText = `[Log] ${event.data.message}`;
        term.appendChild(log);
        term.scrollTop = term.scrollHeight;
    } else if (event.data.type === 'navigate') {
        const project = getCurrentProject();
        if (project) {
            project.activePage = event.data.path;
            updatePreview();
        }
    } else if (event.data.type === 'scene_tree') {
        const treeEl = document.getElementById('scene-tree');
        treeEl.innerHTML = '';
        if (event.data.tree.length === 0) {
            treeEl.innerHTML = '<div class="scene-empty">No objects in scene.</div>';
            return;
        }
        event.data.tree.forEach(node => {
            const el = document.createElement('div');
            el.className = 'scene-node';
            el.style.paddingLeft = `${8 + node.depth * 16}px`;
            el.innerText = `${node.name}`;
            treeEl.appendChild(el);
        });
    }
});

document.getElementById('clear-terminal-btn').addEventListener('click', () => {
    document.getElementById('terminal-output').innerHTML = '';
});

window.dismissError = function() {
    document.getElementById('error-banner').classList.add('hidden');
}

window.askAiToFixError = function() {
    const banner = document.getElementById('error-banner');
    const errorMsg = banner.querySelector('.err-msg').innerText;
    const prompt = `The 3D preview threw an error: \n${errorMsg}\n\nPlease fix the code causing this error. Output all 3 files again.`;
    document.getElementById('prompt-input').value = prompt;
    dismissError();
    runGeneration(prompt);
}

// ==========================================
// API CALLS (Streaming)
// ==========================================
async function callOpenAIStream(prompt, sysPrompt, signal, onChunk) {
    const project = getCurrentProject();
    const history = project.messages.map(msg => {
        return { role: msg.sender === 'ai' ? 'assistant' : 'user', content: msg.text };
    });

    const endpoint = appSettings.provider === 'custom' ? `${appSettings.baseUrl}/chat/completions` : 'https://api.openai.com/v1/chat/completions';
    const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${appSettings.apiKey}` },
        body: JSON.stringify({ 
            model: appSettings.textModel || "gpt-4o", 
            messages: [{ role: "system", content: sysPrompt }, ...history], 
            stream: true 
        }),
        signal: signal
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = line.substring(6);
                if (data === '[DONE]') return fullText;
                try {
                    const json = JSON.parse(data);
                    const delta = json.choices[0]?.delta?.content || "";
                    if (delta) {
                        fullText += delta;
                        onChunk(delta);
                    }
                } catch (e) {}
            }
        }
    }
    return fullText;
}

async function callAnthropicStream(prompt, sysPrompt, signal, onChunk) {
    const project = getCurrentProject();
    const history = project.messages.map(msg => {
        return { role: msg.sender === 'ai' ? 'assistant' : 'user', content: msg.text };
    });

    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': appSettings.apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ 
            model: appSettings.textModel || "claude-3-5-sonnet-20241022", 
            system: sysPrompt, 
            messages: history, 
            max_tokens: 4096,
            stream: true
        }),
        signal: signal
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = line.substring(6);
                try {
                    const json = JSON.parse(data);
                    if (json.type === 'content_block_delta' && json.delta.text) {
                        fullText += json.delta.text;
                        onChunk(json.delta.text);
                    }
                } catch (e) {}
            }
        }
    }
    return fullText;
}

async function callGeminiStream(prompt, sysPrompt, signal, onChunk) {
    const project = getCurrentProject();
    const history = project.messages.map(msg => {
        return { role: msg.sender === 'ai' ? 'model' : 'user', parts: [{ text: msg.text }] };
    });

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${appSettings.textModel || 'gemini-1.5-flash'}:streamGenerateContent?alt=sse&key=${appSettings.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            system_instruction: { parts: [{ text: sysPrompt }] }, 
            contents: history 
        }),
        signal: signal
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = line.substring(6);
                try {
                    const json = JSON.parse(data);
                    const delta = json.candidates[0]?.content?.parts[0]?.text || "";
                    if (delta) {
                        fullText += delta;
                        onChunk(delta);
                    }
                } catch (e) {}
            }
        }
    }
    return fullText;
}

// ==========================================
// WORKSPACE TABS & MOBILE NAV
// ==========================================
document.querySelectorAll('.ws-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.ws-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.ws-pane').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`${tab.dataset.wsTab}-pane`).classList.add('active');
    });
});

document.querySelectorAll('.mobile-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.mobile-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const target = tab.dataset.target;
        const chatPanel = document.getElementById('mobile-panel-chat');
        const workspacePanel = document.getElementById('mobile-panel-workspace');
        
        chatPanel.classList.remove('active-mobile');
        workspacePanel.classList.remove('active-mobile');
        
        if (target === 'chat') {
            chatPanel.classList.add('active-mobile');
        } else {
            workspacePanel.classList.add('active-mobile');
            document.querySelector(`.ws-tab[data-ws-tab="${target}"]`).click();
        }
    });
});

function renderFileTree() {
    const project = getCurrentProject();
    if (!project) return;
    
    const tree = document.querySelector('.file-tree');
    tree.innerHTML = '';
    
    let firstFile = null;
    Object.keys(project.files).forEach(filename => {
        if (!firstFile) firstFile = filename;
        const item = document.createElement('div');
        item.className = 'file-item';
        item.dataset.file = filename;
        
        const isAsset = filename.startsWith('assets/');
        const icon = isAsset ? '🖼️' : '📄';
        item.innerHTML = `${icon} ${filename}`;
        
        if (isAsset) {
            const tag = document.createElement('span');
            tag.className = 'asset-tag';
            tag.innerText = 'Asset';
            item.appendChild(tag);
        }
        
        item.addEventListener('click', () => {
            document.querySelectorAll('.file-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            const content = project.files[filename];
            if (typeof content === 'string' && content.startsWith('data:')) {
                document.getElementById('code-viewer').innerText = `// Binary Asset Preview\n// File: ${filename}\n// Size: ${(content.length / 1024).toFixed(2)} KB\n// Use this path in your code:\nconst path = "${filename}";`;
            } else {
                document.getElementById('code-viewer').innerText = content || "// Empty file";
            }
        });
        tree.appendChild(item);
    });
    
    if (firstFile) {
        tree.querySelector('.file-item').classList.add('active');
        document.getElementById('code-viewer').innerText = project.files[firstFile];
    }
}

// Initial Load
checkSharedProject();
showView('landing');

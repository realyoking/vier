// ==========================================
// STATE & STORAGE MANAGEMENT
// ==========================================
const DEFAULT_AI_RULES = `# AI Rules (ai_rules.md)
You are Vier, an expert AI 3D assistant. 
Your goal is to help the user build Three.js scenes.

## Interaction Rules:
If you need to ask the user a question to clarify requirements, FIRST explain WHY you are asking, then output EXACTLY this tag and nothing else:
<question>Your question here?</question>

If you need the user to choose from multiple options, FIRST explain WHY you are asking, then output EXACTLY this tag with valid JSON and nothing else:
<choose>[{"label":"Option 1"},{"label":"Option 2"},{"label":"Option 3"},{"label":"Option 4"}]</choose>

## Asset Rules:
If the user uploads assets (.glb, .png, etc), they are stored in the 'assets/' folder in the virtual file system.
The GLTFLoader is ALREADY imported and available globally in the window. Do not import it.
To load a 3D model, use: new THREE.GLTFLoader().load('assets/model.glb', ...)
To load a texture, use: new THREE.TextureLoader().load('assets/texture.png', ...)

## Image Generation Rules:
If the user asks to generate a texture or image, output EXACTLY this tag and nothing else:
<generate_image>{"prompt": "detailed description of image", "filename": "name.png"}</generate_image>

## Coding Rules (CRITICAL):
When in 'build' or 'agent' mode, you MUST ALWAYS output the complete, updated content for ALL THREE files: index.html, script.js, and styles.css. NEVER omit a file.
Use standard Three.js r128 syntax.

To update files, output the code in standard markdown code blocks. 
To specify which file the code belongs to, put the filename in a comment on the VERY FIRST LINE of the code block.
Example:
\`\`\`html
<!-- index.html -->
<html>...</html>
\`\`\`

\`\`\`javascript
// script.js
const scene = new THREE.Scene();
\`\`\`

## Performance Auditing:
If the user clicks "Audit", analyze the provided code for Three.js performance bottlenecks.
Look for: Excessive draw calls (suggest InstancedMesh), heavy shadow maps, unoptimized geometries, memory leaks (dispose not called).
Provide a clear report of issues, then output the fixed code for ALL THREE files.
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
    "index.html": "<!DOCTYPE html>\n<html>\n<head>\n  <title>3D Scene</title>\n</head>\n<body>\n  <script src=\"three.js\"></script>\n  <script src=\"script.js\"></script>\n</body>\n</html>",
    "script.js": "// AI will generate Three.js code here\nconst scene = new THREE.Scene();",
    "styles.css": "body { margin: 0; }",
    "ai_rules.md": appSettings.aiRules
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
        files: { ...defaultFiles },
        thumb: null
    };
    projects.push(newProject);
    saveProjects();
    openProject(newProject.id);
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
            <div class="empty-icon">3D</div>
            <h4>Start Building</h4>
            <p>Ask Vier to generate 3D objects, drop .glb models, or use Agent Mode.</p>
            <div class="quick-prompts">
                <button class="quick-prompt">Add a rotating cube</button>
                <button class="quick-prompt">Add point lighting</button>
                <button class="quick-prompt">Create a sphere</button>
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

    // Populate Model Selects
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
            // Heuristic for default selections
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
// GITHUB INTEGRATION
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

document.getElementById('sync-gh-btn').addEventListener('click', async () => {
    if (!appSettings.ghPat || !appSettings.ghRepo) return alert("Set GitHub PAT and Repo in settings.");
    
    const project = getCurrentProject();
    let repoFullName = appSettings.ghRepo;
    
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

        for (const [path, content] of Object.entries(project.files)) {
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
        alert(`Synced to GitHub: ${repoFullName}`);
    } catch (error) { alert("Sync failed: " + error.message); }
});

document.getElementById('deploy-gh-btn').addEventListener('click', async () => {
    if (!appSettings.ghPat || !appSettings.ghRepo) return alert("Set GitHub PAT and Repo in settings.");
    if (appSettings.ghRepo.startsWith('NEW:')) return alert("Sync the repository first to create it.");
    
    const repoFullName = appSettings.ghRepo;
    const owner = repoFullName.split('/')[0];
    const repoName = repoFullName.split('/')[1];
    
    const pagesRes = await fetch(`https://api.github.com/repos/${repoFullName}/pages`, {
        method: 'POST',
        headers: { 'Authorization': `token ${appSettings.ghPat}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: { branch: "main", path: "/" } })
    });
    
    if (pagesRes.status === 201) alert(`Deploying! Live at https://${owner}.github.io/${repoName} in a few minutes.`);
    else if (pagesRes.status === 422) alert("GitHub Pages is already enabled for this repo.");
    else alert("Failed to deploy. Check console.");
});

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
    
    html = html.replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, lang, code) => {
        let codeContent = code.trim();
        let filename = 'code.txt';
        const firstLineEnd = codeContent.indexOf('\n');
        const firstLine = firstLineEnd !== -1 ? codeContent.substring(0, firstLineEnd).trim() : codeContent;
        
        if (firstLine.startsWith('// ')) {
            filename = firstLine.substring(3).trim();
        } else if (firstLine.startsWith('<!-- ')) {
            filename = firstLine.replace('<!-- ', '').replace(' -->', '').trim();
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
    
    // 1. Think & Write Reply
    await moveAgentCursor('#chat-history', 'Thinking...');
    
    // 2. Write Code
    await moveAgentCursor('.ws-tab[data-ws-tab="code"]', 'Writing code...');
    document.querySelector('.ws-tab[data-ws-tab="code"]').click();
    
    // 3. Test Scene
    await moveAgentCursor('.ws-tab[data-ws-tab="preview"]', 'Testing scene...');
    document.querySelector('.ws-tab[data-ws-tab="preview"]').click();
    
    // Simulate playing the scene
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
    
    // 4. Done
    await moveAgentCursor('#generate-btn', 'Task complete!');
    await sleep(500);
    cursor.classList.add('hidden');
}

async function runGeneration(prompt, isContinuation = false) {
    if (!appSettings.apiKey) return alert("Set API Key in settings.");
    
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
        let aiResponseText = "";
        const sysPrompt = `Mode: ${currentMode}\nRules:\n${appSettings.aiRules}\nCurrent Files: ${JSON.stringify(getCurrentProject().files)}`;
        
        // Streaming Handler
        const onChunk = (delta) => {
            aiResponseText += delta;
            
            // If in Agent Mode, animate cursor based on content
            if (currentMode === 'agent') {
                const cursor = document.getElementById('agent-cursor');
                if (!cursor.classList.contains('hidden')) {
                    // If code block starts, move to code tab
                    if (aiResponseText.includes('```')) {
                        if (!cursor.dataset.coding) {
                            cursor.dataset.coding = 'true';
                            document.querySelector('.ws-tab[data-ws-tab="code"]').click();
                            moveAgentCursor('#code-viewer', 'Writing code...');
                        }
                        // Update code viewer in real-time
                        const codeStartIndex = aiResponseText.indexOf('```');
                        let codePart = aiResponseText.substring(codeStartIndex + 3);
                        const firstNewline = codePart.indexOf('\n');
                        if (firstNewline !== -1 && !codePart.substring(0, firstNewline).includes(' ')) {
                            codePart = codePart.substring(firstNewline + 1);
                        }
                        document.getElementById('code-viewer').innerText = codePart;
                    } else {
                        // Otherwise, update chat bubble
                        thinkingBubble.innerHTML = formatMarkdown(aiResponseText);
                        moveAgentCursor('#chat-history', 'Thinking...');
                    }
                }
            } else {
                // Normal Mode: Just update chat bubble
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
        
        // Check for Image Generation Tag
        const imageGenMatch = aiResponseText.match(/<generate_image>(.*?)<\/generate_image>/s);
        if (imageGenMatch) {
            const imgData = JSON.parse(imageGenMatch[1]);
            addMessage(`Generating image: ${imgData.prompt}...`, 'ai');
            const imgUrl = await generateImage(imgData.prompt);
            if (imgUrl) {
                getCurrentProject().files[`assets/${imgData.filename}`] = imgUrl;
                saveProjects();
                renderFileTree();
                runGeneration(`The image has been generated and saved at assets/${imgData.filename}. Please update the code to use it.`, true);
                return;
            }
        }
        
        if ((currentMode === 'build' || currentMode === 'agent') && !aiResponseText.includes('<question>') && !aiResponseText.includes('<choose>')) {
            parseAndApplyCode(aiResponseText);
            updatePreview();
            
            if (currentMode === 'agent') {
                // Run the final visual agent sequence (testing the game)
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
        const res = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${appSettings.apiKey}` },
            body: JSON.stringify({ model: appSettings.imageModel, prompt: prompt, n: 1, size: '512x512' })
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
        }
    } catch (e) {
        console.error("Image gen failed", e);
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
        
        if (firstLine.startsWith('// ')) {
            filename = firstLine.substring(3).trim();
            codeContent = codeContent.substring(firstLineEnd + 1).trim();
        } else if (firstLine.startsWith('<!-- ')) {
            filename = firstLine.replace('<!-- ', '').replace(' -->', '').trim();
            codeContent = codeContent.substring(firstLineEnd + 1).trim();
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

    let htmlContent = project.files['index.html'] || '<html><body>No HTML</body></html>';
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
    }
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
showView('landing');

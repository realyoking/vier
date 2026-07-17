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
To load a 3D model, use: new GLTFLoader().load('assets/model.glb', ...)
To load a texture, use: new THREE.TextureLoader().load('assets/texture.png', ...)

## Coding Rules:
When in 'build' mode, always provide the complete, updated file content.
Use standard Three.js r128 syntax.

To update files, output the code in standard markdown code blocks. 
To specify which file the code belongs to, put the filename in a comment on the VERY FIRST LINE of the code block.
Example:
\`\`\`javascript
// script.js
const scene = new THREE.Scene();
\`\`\`

## Performance Auditing:
If the user clicks "Audit", analyze the provided code for Three.js performance bottlenecks.
Look for: Excessive draw calls (suggest InstancedMesh), heavy shadow maps, unoptimized geometries, memory leaks (dispose not called).
Provide a clear report of issues, then output the fixed code.
`;

let appSettings = JSON.parse(localStorage.getItem('vier_settings')) || {
    provider: 'openai',
    baseUrl: '',
    apiKey: '',
    model: 'gpt-4o',
    ghPat: '',
    ghRepo: '', 
    aiRules: DEFAULT_AI_RULES
};

let projects = JSON.parse(localStorage.getItem('vier_projects')) || [];
let currentProjectId = null;

const defaultFiles = {
    "index.html": "<!DOCTYPE html>\n<html>\n<head>\n  <title>3D Scene</title>\n</head>\n<body>\n  <script src=\"three.js\"></script>\n  <script src=\"script.js\"></script>\n</body>\n</html>",
    "script.js": "// AI will generate Three.js code here\nconst scene = new THREE.Scene();",
    "styles.css": "body { margin: 0; }",
    "ai_rules.md": appSettings.aiRules
};

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
        updatePreview(); // Load iframe on view open
        updateModelSelector();
        initDragAndDrop();
    }
}

document.getElementById('new-project-btn').addEventListener('click', () => {
    const newProject = {
        id: Date.now().toString(),
        name: `Project ${projects.length + 1}`,
        messages: [],
        files: { ...defaultFiles }
    };
    projects.push(newProject);
    saveProjects();
    openProject(newProject.id);
});

document.getElementById('back-btn').addEventListener('click', () => showView('landing'));

function openProject(id) {
    currentProjectId = id;
    const project = projects.find(p => p.id === id);
    if (!project) return;
    
    document.getElementById('editor-project-name').innerText = project.name;
    document.getElementById('chat-history').innerHTML = '';
    
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
            <p>Ask Vier to generate 3D objects, drop .glb models, or audit code.</p>
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
        card.innerHTML = `
            <div class="project-thumb">3D</div>
            <div class="project-info">
                <h4>${p.name}</h4>
                <p>Last edited: ${new Date(parseInt(p.id)).toLocaleString()}</p>
            </div>
        `;
        card.addEventListener('click', () => openProject(p.id));
        grid.appendChild(card);
    });
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
    document.getElementById('api-model').value = appSettings.model;
    document.getElementById('gh-pat').value = appSettings.ghPat;
    document.getElementById('ai-rules-input').value = appSettings.aiRules;
    
    if(appSettings.provider === 'custom') document.getElementById('base-url-group').classList.remove('hidden');
    else document.getElementById('base-url-group').classList.add('hidden');

    if(appSettings.ghRepo) {
        const select = document.getElementById('gh-existing-repo');
        select.innerHTML = `<option value="${appSettings.ghRepo}">${appSettings.ghRepo} (Current)</option>`;
        select.disabled = false;
    }
}

document.getElementById('api-provider').addEventListener('change', (e) => {
    if(e.target.value === 'custom') document.getElementById('base-url-group').classList.remove('hidden');
    else document.getElementById('base-url-group').classList.add('hidden');
});

document.getElementById('save-settings-btn').addEventListener('click', () => {
    appSettings.provider = document.getElementById('api-provider').value;
    appSettings.baseUrl = document.getElementById('base-url').value;
    appSettings.apiKey = document.getElementById('api-key').value;
    appSettings.model = document.getElementById('api-model').value;
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
        document.getElementById('api-model').innerHTML = manualModels.map(m => `<option value="${m}">${m}</option>`).join('');
        appSettings.model = manualModels[0];
        updateModelSelector();
        return;
    }

    try {
        const res = await fetch(endpoint, { headers: { 'Authorization': `Bearer ${key}` } });
        const data = await res.json();
        if (data.data) {
            const select = document.getElementById('api-model');
            select.innerHTML = data.data.map(m => `<option value="${m.id}">${m.id}</option>`).join('');
            const preferred = data.data.find(m => m.id.includes('gpt-4o') || m.id.includes('gpt-4'));
            if (preferred) select.value = preferred.id;
            appSettings.model = select.value;
            updateModelSelector();
        }
    } catch (e) { alert("Failed to fetch models."); }
});

function updateModelSelector() {
    const chatSelector = document.getElementById('chat-model-selector');
    const settingsSelector = document.getElementById('api-model');
    chatSelector.innerHTML = settingsSelector.innerHTML;
    chatSelector.value = appSettings.model;
}

document.getElementById('chat-model-selector').addEventListener('change', (e) => {
    appSettings.model = e.target.value;
    localStorage.setItem('vier_settings', JSON.stringify(appSettings));
});

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
// DRAG & DROP ASSET CONTEXT (Feature 3)
// ==========================================
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

    editorLayout.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropOverlay.classList.add('hidden');
        
        const files = e.dataTransfer.files;
        const project = getCurrentProject();
        if (!project) return;

        let uploadedAssets = [];
        
        for (let file of files) {
            const path = `assets/${file.name}`;
            const reader = new FileReader();
            
            await new Promise((resolve) => {
                reader.onload = function(event) {
                    project.files[path] = event.target.result; // Stores as Base64 Data URL
                    uploadedAssets.push(path);
                    resolve();
                };
                reader.readAsDataURL(file);
            });
        }

        saveProjects();
        renderFileTree();
        updatePreview(); // Update iframe to include assets
        
        if (uploadedAssets.length > 0) {
            const promptText = `I uploaded the following assets: ${uploadedAssets.join(', ')}. Please add them to the scene.`;
            document.getElementById('prompt-input').value = promptText;
            runGeneration(promptText);
        }
    });
}

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
    html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => `<pre><code>${code.trim()}</code></pre>`);
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
    history.scrollTop = history.scrollHeight;

    if (save && getCurrentProject()) {
        getCurrentProject().messages.push({ text, sender });
        saveProjects();
    }
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

// Generate Button Stop/Start Logic
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
        if (!prompt) return;
        runGeneration(prompt);
    }
});

// Performance Audit Button (Feature 5)
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

async function runGeneration(prompt, isContinuation = false) {
    if (!appSettings.apiKey) return alert("Set API Key in settings.");
    if (!isContinuation) {
        addMessage(prompt, 'user');
        document.getElementById('prompt-input').value = '';
    } else {
        addMessage(prompt, 'user');
    }
    
    isGenerating = true;
    updateGenerateBtnUI();
    abortController = new AbortController();

    const thinkingRow = document.createElement('div');
    thinkingRow.classList.add('chat-row');
    thinkingRow.innerHTML = `<div class="chat-avatar ai">V</div><div class="chat-bubble ai">Vier is thinking...</div>`;
    document.getElementById('chat-history').appendChild(thinkingRow);

    try {
        let aiResponseText = "";
        const sysPrompt = `Mode: ${currentMode}\nRules:\n${appSettings.aiRules}\nCurrent Files: ${JSON.stringify(getCurrentProject().files)}`;
        
        if (appSettings.provider === 'openai' || appSettings.provider === 'custom') {
            aiResponseText = await callOpenAI(prompt, sysPrompt, abortController.signal);
        } else if (appSettings.provider === 'anthropic') {
            aiResponseText = await callAnthropic(prompt, sysPrompt, abortController.signal);
        } else if (appSettings.provider === 'gemini') {
            aiResponseText = await callGemini(prompt, sysPrompt, abortController.signal);
        }

        thinkingRow.remove();
        addMessage(aiResponseText, 'ai');
        
        if (currentMode === 'build' && !aiResponseText.includes('<question>') && !aiResponseText.includes('<choose>')) {
            parseAndApplyCode(aiResponseText);
            updatePreview(); // <--- THIS FIXES THE PREVIEW NOT UPDATING
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
    }
}

// Smarter Code Parser to handle any backtick format
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
// LIVE PREVIEW IFRAME LOGIC
// ==========================================
function updatePreview() {
    const project = getCurrentProject();
    if (!project) return;

    let htmlContent = project.files['index.html'] || '<html><body>No HTML</body></html>';
    const jsContent = project.files['script.js'] || '';
    const cssContent = project.files['styles.css'] || '';

    const threeScript = '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>';
    const styleTag = `<style>${cssContent}<\/style>`;
    const scriptTag = `<script>${jsContent}<\/script>`;
    
    // Strip body tags from AI's HTML so we can inject cleanly
    const cleanHtml = htmlContent
        .replace(/<script[^>]*src=["']script\.js["'][^>]*><\/script>/gi, '')
        .replace(/<link[^>]*href=["']styles\.css["'][^>]*>/gi, '')
        .replace(/<\/?body[^>]*>/g, '');

    const fullDoc = `
        <!DOCTYPE html>
        <html>
        <head>
            ${threeScript}
            ${styleTag}
        </head>
        <body>
            ${cleanHtml}
            ${scriptTag}
        </body>
        </html>
    `;
    
    const iframe = document.getElementById('preview-iframe');
    iframe.srcdoc = fullDoc;
}

async function callOpenAI(prompt, sysPrompt, signal) {
    const endpoint = appSettings.provider === 'custom' ? `${appSettings.baseUrl}/chat/completions` : 'https://api.openai.com/v1/chat/completions';
    const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${appSettings.apiKey}` },
        body: JSON.stringify({ model: appSettings.model || "gpt-4o", messages: [{ role: "system", content: sysPrompt }, { role: "user", content: prompt }] }),
        signal: signal
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message);
    return data.choices[0].message.content;
}

async function callAnthropic(prompt, sysPrompt, signal) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': appSettings.apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: appSettings.model || "claude-3-5-sonnet-20241022", system: sysPrompt, messages: [{ role: 'user', content: prompt }], max_tokens: 1024 }),
        signal: signal
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message);
    return data.content[0].text;
}

async function callGemini(prompt, sysPrompt, signal) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${appSettings.model || 'gemini-1.5-flash'}:generateContent?key=${appSettings.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system_instruction: { parts: [{ text: sysPrompt }] }, contents: [{ parts: [{ text: prompt }] }] }),
        signal: signal
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message);
    return data.candidates[0].content.parts[0].text;
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

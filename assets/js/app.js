(function(){
  'use strict';

  const STORAGE_KEY = 'remoteos-v5-final';
  const DEFAULT_WORKSPACE = {
    name: 'RemoteOS',
    company: 'NovaFlow Systems',
    timezone: 'Asia/Beirut',
    appearance: 'dark',
    density: 'comfortable',
    startView: 'dashboard',
    onboardingDismissed: false
  };


  const MAX_IMPORT_BYTES = 1024 * 1024 * 2;
  const MAX_ATTACHMENT_BYTES = 1024 * 1024 * 20;
  const ALLOWED_ATTACHMENT_TYPES = [
    'application/pdf','application/zip','application/x-zip-compressed','application/json','text/plain','image/png','image/jpeg','image/webp'
  ];
  const DEFAULT_ATTACHMENT_PAYLOADS = {
    'banner-pack.zip': { mime:'application/zip', content:btoa('RemoteOS bundled delivery archive\nVersion: v1.0\nContains: exported banners, source references, and review checklist.') },
    'preview-sheet.pdf': { mime:'application/pdf', content:btoa('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF') }
  };
  const VIEW_META = {
    dashboard: ['Operations Hub', 'Execution cockpit for priorities, blockers, approvals, and next action.'],
    clients: ['Clients', 'Relationship records with project visibility and contact details.'],
    projects: ['Projects', 'Workspace-level delivery tracking, risk signals, and task orchestration.'],
    tasks: ['Tasks', 'Execution board with hard transitions, next action, and proof readiness.'],
    focus: ['Focus Workspace', 'Single-task execution mode with checklist, proof, and review readiness.'],
    chat: ['Collaboration Hub', 'Structured communication linked to tasks, projects, and reviews.'],
    deliveries: ['Deliveries & Reviews', 'Submission, approval, revision, and decision history.'],
    reports: ['Reports', 'Health score, risk queue, throughput, and exportable summaries.'],
    settings: ['Settings', 'Theme, density, startup behavior, and workspace controls.']
  };

  const VIEWS_BY_ROLE = {
    owner: ['dashboard','clients','projects','tasks','focus','chat','deliveries','reports','settings'],
    worker:['dashboard','clients','projects','tasks','focus','chat','deliveries','reports','settings'],
    client:['dashboard','clients','projects','tasks','chat','deliveries','reports','settings']
  };

  const initialState = {
    workspace: { ...DEFAULT_WORKSPACE },
    role: 'owner',
    currentView: 'dashboard',
    selectedProjectId: 'p1',
    selectedTaskId: 't1',
    selectedConversationId: 'cv2',
    selectedDeliveryId: 'd1',
    users: [
      { id:'u1', name:'John Carter', role:'owner', clientId:null },
      { id:'u2', name:'Rami', role:'worker', clientId:null },
      { id:'u3', name:'Lina', role:'client', clientId:'c1' }
    ],
    clients: [
      { id:'c1', name:'Acme Studio', company:'Acme Studio LLC', email:'client@acme.com', phone:'+961 70 000 000', status:'active', notes:'High-value retainer client.' },
      { id:'c2', name:'Northwind Labs', company:'Northwind Labs', email:'ops@northwind.com', phone:'+961 71 000 000', status:'active', notes:'Launch asset support client.' }
    ],
    projects: [
      { id:'p1', clientId:'c1', title:'Website Redesign', description:'Premium redesign with review workflow.', status:'active', priority:'high', dueAt:'2026-04-18', members:['u1','u2'] },
      { id:'p2', clientId:'c2', title:'Launch Assets Sprint', description:'Banner and marketing asset delivery cycle.', status:'review', priority:'urgent', dueAt:'2026-04-12', members:['u1','u2'] }
    ],
    tasks: [
      {
        id:'t1', projectId:'p1', clientId:'c1', assigneeId:'u2', title:'Homepage hero redesign', description:'Upgrade hero section hierarchy and CTA clarity.', status:'in_progress', priority:'high', dueAt:'2026-04-18',
        nextAction:'Finalize desktop hero spacing and prepare preview images.', blockerNote:'', statusReason:'', deliverableSummary:'Approved homepage hero preview package with desktop and mobile variants ready for client sign-off.', acceptanceCriteria:['Headline hierarchy upgraded','CTA variants prepared','Responsive preview included'], estimatedMinutes:180, actualMinutes:75,
        proofNote:'Updated hero hierarchy, prepared CTA variants, and attached preview package for reviewer approval.', revisionCount:0,
        checklist:[
          { id:'chk1', label:'Review client feedback', isDone:true },
          { id:'chk2', label:'Update hero typography', isDone:true },
          { id:'chk3', label:'Create CTA variants', isDone:false },
          { id:'chk4', label:'Submit preview for review', isDone:false }
        ],
        history:[
          { id:'h1', text:'Task moved to in progress', at:'2026-04-15 09:10' },
          { id:'h2', text:'Client requested stronger headline and CTA', at:'2026-04-15 10:05' }
        ]
      },
      {
        id:'t2', projectId:'p1', clientId:'c1', assigneeId:'u2', title:'Testimonials section design', description:'Add premium trust section and layout variants.', status:'waiting_client', priority:'normal', dueAt:'2026-04-19',
        nextAction:'Wait for client to approve selected layout style.', blockerNote:'Awaiting client decision on style A/B.', statusReason:'Client must choose layout direction before finalizing delivery.', deliverableSummary:'Signed-off testimonials section layout selected by client and ready for final integration.', acceptanceCriteria:['Two layout directions prepared','Client can compare tradeoffs clearly','Selected direction can move into final design'], estimatedMinutes:120, actualMinutes:40,
        proofNote:'Two testimonial layouts prepared and waiting on client choice.', revisionCount:1,
        checklist:[
          { id:'chk5', label:'Prepare style A', isDone:true },
          { id:'chk6', label:'Prepare style B', isDone:true },
          { id:'chk7', label:'Ask client to choose', isDone:true }
        ],
        history:[{ id:'h3', text:'Client dependency flagged', at:'2026-04-15 11:20' }]
      },
      {
        id:'t3', projectId:'p2', clientId:'c2', assigneeId:'u2', title:'Ad banner pack delivery', description:'Finalize banner exports and source bundle.', status:'in_review', priority:'urgent', dueAt:'2026-04-16',
        nextAction:'Monitor review thread and convert feedback into follow-up task if needed.', blockerNote:'', statusReason:'', deliverableSummary:'Final banner pack with 5 exported sizes, source bundle, and preview sheet ready for approval.', acceptanceCriteria:['All 5 banner sizes exported','Source files bundled','Preview sheet attached for reviewer'], estimatedMinutes:90, actualMinutes:105,
        proofNote:'All banner exports completed, packaged, and documented for review.', revisionCount:0,
        checklist:[
          { id:'chk8', label:'Export 5 banner sizes', isDone:true },
          { id:'chk9', label:'Zip source files', isDone:true },
          { id:'chk10', label:'Submit delivery', isDone:true }
        ],
        history:[{ id:'h4', text:'Delivery submitted for review', at:'2026-04-15 08:52' }]
      }
    ],
    conversations: [
      { id:'cv1', type:'project', clientId:'c1', projectId:'p1', taskId:null, deliveryId:null, visibility:'client_visible', title:'Website Redesign — Project Chat' },
      { id:'cv2', type:'task', clientId:'c1', projectId:'p1', taskId:'t1', deliveryId:null, visibility:'client_visible', title:'Homepage hero redesign — Task Chat' },
      { id:'cv3', type:'review', clientId:'c2', projectId:'p2', taskId:'t3', deliveryId:'d1', visibility:'client_visible', title:'Ad banner pack — Review Thread' }
    ],
    messages: [
      { id:'m1', conversationId:'cv2', senderId:'u3', body:'Please make the headline stronger and make the CTA more premium and visible.', createdAt:'10:05' },
      { id:'m2', conversationId:'cv2', senderId:'u2', body:'Understood. I am updating typography, CTA weight, and spacing now.', createdAt:'10:08' },
      { id:'m3', conversationId:'cv1', senderId:'u1', body:'Phase 1 is on track. Hero redesign is being finalized today.', createdAt:'09:50' },
      { id:'m4', conversationId:'cv3', senderId:'u2', body:'Delivery submitted. Please review the exported banner pack and mark approved or request changes.', createdAt:'08:52' }
    ],
    deliveries: [
      { id:'d1', projectId:'p2', clientId:'c2', taskId:'t3', versionLabel:'v1.0', summary:'Final banner pack with 5 exported sizes, source bundle, and preview sheet ready for approval.', status:'under_review', reviewStage:'under_review', createdById:'u2', createdAt:'2026-04-15 08:52', note:'Pending client review.', reviewerNote:'Review in progress.', changeSummary:'', internalNote:'', clientVisibleNote:'', decisionAt:'', acceptanceCriteriaSnapshot:['All 5 banner sizes exported','Source files bundled','Preview sheet attached for reviewer'], proofSnapshot:'All banner exports completed, packaged, and documented for review.' }
    ],
    reviews: [
      { id:'r1', deliveryId:'d1', reviewerId:'u1', status:'under_review', note:'Pending client review.', createdAt:'2026-04-15 08:53' }
    ],
    attachments: [
      { id:'f1', entityType:'delivery', entityId:'d1', name:'banner-pack.zip', type:'archive', size:'12.4 MB' },
      { id:'f2', entityType:'delivery', entityId:'d1', name:'preview-sheet.pdf', type:'document', size:'1.8 MB' }
    ],
    activity: [
      { id:'a1', actorId:'u2', text:'Submitted delivery for Ad banner pack', when:'08:52' },
      { id:'a2', actorId:'u3', text:'Requested stronger headline and CTA in hero redesign', when:'10:05' },
      { id:'a3', actorId:'u1', text:'Updated project status for Website Redesign', when:'09:50' }
    ]
  };

  const FIRST_LOAD = !localStorage.getItem(STORAGE_KEY);
  let state = loadState();
  const uiState = { busy:'' };

  const el = {
    nav: byId('mainNav'),
    title: byId('pageTitle'),
    subtitle: byId('pageSubtitle'),
    profileName: byId('profileName'),
    profileRole: byId('profileRole'),
    root: byId('view-root'),
    searchInput: byId('searchInput'),
    searchBtn: byId('searchBtn'),
    resetBtn: byId('resetDemoBtn'),
    exportBtn: byId('exportBtn'),
    importBtn: byId('importBtn'),
    importInput: byId('importFileInput'),
    searchResults: byId('searchResults'),
    toast: byId('toast'),
    fileInput: ensureHiddenFileInput()
  };

  let modalState = null;
  const dragState = { taskId:'', overStatus:'' };

  bindGlobalEvents();
  render();

  function byId(id){ return document.getElementById(id); }
  function ensureHiddenFileInput(){
    let input = document.getElementById('hiddenAttachmentInput');
    if(!input){
      input = document.createElement('input');
      input.type = 'file';
      input.id = 'hiddenAttachmentInput';
      input.className = 'hidden';
      document.body.appendChild(input);
    }
    return input;
  }
  function uid(prefix){ return `${prefix}${Date.now()}${Math.random().toString(36).slice(2,6)}`; }
  function now(){ return new Date().toISOString().slice(0,16).replace('T',' '); }
  function timeNow(){ return new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }); }

  function cloneInitial(){ return JSON.parse(JSON.stringify(initialState)); }
  function normalizeChecklist(list){
    if(!Array.isArray(list)) return [];
    return list
      .map(item => {
        if(typeof item === 'string'){
          const label = item.trim();
          return label ? { id: uid('chk'), label, done:false, isDone:false } : null;
        }
        if(!item || typeof item !== 'object') return null;
        const label = String(item.label || item.title || item.text || '').trim();
        if(!label) return null;
        const done = Boolean(item.done ?? item.isDone ?? false);
        return { ...item, id: String(item.id || uid('chk')), label, done, isDone: done };
      })
      .filter(Boolean);
  }
  function loadState(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const next = raw ? normalizeState(JSON.parse(raw)) : normalizeState(cloneInitial());
      const savedTheme = localStorage.getItem('theme');
      const savedDensity = localStorage.getItem('density');
      if(['dark','light'].includes(savedTheme)) next.workspace.appearance = savedTheme;
      if(['comfortable','compact'].includes(savedDensity)) next.workspace.density = savedDensity;
      return next;
    } catch {
      return normalizeState(cloneInitial());
    }
  }

  function normalizeState(input){
    const safeInput = input && typeof input === 'object' ? input : {};
    const base = cloneInitial();
    const next = { ...base, ...safeInput };
    next.workspace = { ...DEFAULT_WORKSPACE, ...(safeInput.workspace || {}) };
    next.role = VIEWS_BY_ROLE[safeInput.role] ? safeInput.role : base.role;
    next.workspace.appearance = ['dark','light'].includes(next.workspace.appearance) ? next.workspace.appearance : DEFAULT_WORKSPACE.appearance;
    next.workspace.density = ['comfortable','compact'].includes(next.workspace.density) ? next.workspace.density : DEFAULT_WORKSPACE.density;
    next.workspace.startView = VIEW_META[next.workspace.startView] ? next.workspace.startView : DEFAULT_WORKSPACE.startView;
    next.workspace.onboardingDismissed = Boolean(next.workspace.onboardingDismissed);
    next.users = Array.isArray(safeInput.users) && safeInput.users.length ? safeInput.users : base.users;
    next.clients = (Array.isArray(safeInput.clients) ? safeInput.clients : base.clients)
      .filter(client => client && typeof client === 'object' && String(client.id || '').trim())
      .map(client => ({ status:'active', notes:'', ...client }));
    next.projects = (Array.isArray(safeInput.projects) ? safeInput.projects : base.projects)
      .filter(project => project && typeof project === 'object' && String(project.id || '').trim())
      .map(project => ({
        status:'active',
        priority:'normal',
        members:next.users.filter(user => user.role !== 'client').map(user => user.id),
        ...project,
        members:Array.isArray(project.members) ? project.members.filter(memberId => next.users.some(user => user.id === memberId)) : next.users.filter(user => user.role !== 'client').map(user => user.id)
      }))
      .filter(project => next.clients.some(client => client.id === project.clientId));
    next.tasks = (Array.isArray(safeInput.tasks) ? safeInput.tasks : base.tasks)
      .filter(task => task && typeof task === 'object' && String(task.id || '').trim())
      .map(task => ({
        history: [],
        checklist: [],
        revisionCount:0,
        blockerNote:'',
        statusReason:'',
        proofNote:'',
        deliverableSummary:'',
        acceptanceCriteria:[],
        estimatedMinutes:60,
        actualMinutes:0,
        priority:'normal',
        status:'new',
        ...task,
        acceptanceCriteria:Array.isArray(task.acceptanceCriteria) ? task.acceptanceCriteria.filter(item => String(item || '').trim()).map(item => String(item).trim()) : [],
        checklist:normalizeChecklist(task.checklist),
        history:Array.isArray(task.history) ? task.history.filter(item => item && String(item.id || '').trim()) : []
      }))
      .filter(task => next.projects.some(project => project.id === task.projectId) && next.clients.some(client => client.id === task.clientId) && next.users.some(user => user.id === task.assigneeId));
    next.conversations = (Array.isArray(safeInput.conversations) ? safeInput.conversations : base.conversations)
      .filter(conversation => conversation && typeof conversation === 'object' && String(conversation.id || '').trim())
      .filter(conversation => next.clients.some(client => client.id === conversation.clientId))
      .filter(conversation => !conversation.projectId || next.projects.some(project => project.id === conversation.projectId))
      .filter(conversation => !conversation.taskId || next.tasks.some(task => task.id === conversation.taskId));
    next.messages = (Array.isArray(safeInput.messages) ? safeInput.messages : base.messages)
      .filter(message => message && typeof message === 'object' && String(message.id || '').trim())
      .filter(message => next.conversations.some(conversation => conversation.id === message.conversationId))
      .filter(message => next.users.some(user => user.id === message.senderId));
    next.deliveries = (Array.isArray(safeInput.deliveries) ? safeInput.deliveries : base.deliveries)
      .filter(delivery => delivery && typeof delivery === 'object' && String(delivery.id || '').trim())
      .map(d => ({
      reviewNote:'', changeSummary:'', internalNote:'', clientVisibleNote:'', note:'', reviewerId:null, updatedAt:d.createdAt || now(), decisionAt:'', reviewStage:d.status || 'submitted', acceptanceCriteriaSnapshot:[], proofSnapshot:'', ...d
    }))
      .filter(delivery => next.tasks.some(task => task.id === delivery.taskId) && next.projects.some(project => project.id === delivery.projectId) && next.clients.some(client => client.id === delivery.clientId));
    next.reviews = (Array.isArray(safeInput.reviews) ? safeInput.reviews : base.reviews)
      .filter(review => review && typeof review === 'object' && String(review.id || '').trim())
      .filter(review => next.deliveries.some(delivery => delivery.id === review.deliveryId))
      .map(r => ({ reviewerId:r.reviewerId || '', reviewerNote:r.note || '', changeSummary:'', internalNote:'', clientVisibleNote:'', reviewerName:r.reviewerName || userNameSafe(next.users, r.reviewerId || ''), ...r }));
    next.attachments = (Array.isArray(safeInput.attachments) ? safeInput.attachments : base.attachments)
      .filter(attachment => attachment && typeof attachment === 'object' && String(attachment.id || '').trim())
      .filter(attachment => {
        if(attachment.entityType === 'delivery') return next.deliveries.some(delivery => delivery.id === attachment.entityId);
        return false;
      })
      .map(enrichAttachmentRecord);
    next.activity = (Array.isArray(safeInput.activity) ? safeInput.activity : base.activity)
      .filter(item => item && typeof item === 'object' && String(item.id || '').trim())
      .filter(item => next.users.some(user => user.id === item.actorId));
    if(!VIEWS_BY_ROLE[next.role]?.includes(next.currentView)) next.currentView = next.workspace.startView || 'dashboard';
    next.currentView = VIEW_META[next.currentView] ? next.currentView : 'dashboard';
    syncSelectedEntities(next);
    return next;
  }

  function persist(){
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      localStorage.setItem('theme', state.workspace.appearance);
      localStorage.setItem('density', state.workspace.density);
    } catch {
      showToast('Workspace could not be saved locally.');
    }
  }

  function userNameSafe(users, id){ return users.find(x => x.id === id)?.name || 'Unknown'; }
  function defaultAttachmentData(name){
    const payload = DEFAULT_ATTACHMENT_PAYLOADS[name];
    return payload ? `data:${payload.mime};base64,${payload.content}` : '';
  }
  function enrichAttachmentRecord(file){
    const next = { mime:'application/octet-stream', bytes:0, createdAt:now(), ...file };
    if(!next.dataUrl && next.name) next.dataUrl = defaultAttachmentData(next.name);
    if(!next.mime) next.mime = next.type || 'application/octet-stream';
    if(!next.bytes && typeof next.size === 'string'){
      const match = String(next.size).match(/([\d.]+)\s*(B|KB|MB|GB)/i);
      if(match){
        const units = {B:1,KB:1024,MB:1024**2,GB:1024**3};
        next.bytes = Math.round(Number(match[1]) * units[String(match[2]).toUpperCase()] || 1);
      }
    }
    next.size = next.size || formatFileSize(next.bytes || 0);
    return next;
  }

  function currentUser(){ return state.users.find(u => u.role === state.role) || state.users[0]; }
  function workspaceOperators(){ return state.users.filter(user => user.role !== 'client'); }
  function getClient(id){ return state.clients.find(x => x.id === id); }
  function getProject(id){ return state.projects.find(x => x.id === id); }
  function getTask(id){ return state.tasks.find(x => x.id === id); }
  function getConversation(id){ return state.conversations.find(x => x.id === id); }
  function getDelivery(id){ return state.deliveries.find(x => x.id === id); }
  function userName(id){ return state.users.find(x => x.id === id)?.name || 'Unknown'; }
  function esc(v){ return String(v ?? '').replace(/[&<>\"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s])); }
  function badge(label, tone){ return `<span class="badge ${tone || toneFor(label)}">${esc(label)}</span>`; }
  function toneFor(value){
    const v = String(value || '').toLowerCase();
    if(['owner','approved','done','active'].includes(v)) return 'tone-green';
    if(['urgent','blocked','changes_requested','overdue'].includes(v)) return 'tone-red';
    if(['high','under_review','in_review','review'].includes(v)) return 'tone-gold';
    if(['waiting_client'].includes(v)) return 'tone-orange';
    if(['client'].includes(v)) return 'tone-purple';
    return 'tone-blue';
  }
  function projectTasks(projectId){ return visibleTasks().filter(t => t.projectId === projectId); }
  function projectDeliveries(projectId){ return visibleDeliveries().filter(d => d.projectId === projectId); }
  function completion(task){ return task.checklist.length ? Math.round((task.checklist.filter(c => c.isDone).length / task.checklist.length) * 100) : 0; }
  function visibleClients(){
    if(state.role === 'client') return state.clients.filter(c => c.id === currentUser().clientId);
    if(state.role === 'worker') return state.clients.filter(c => state.projects.some(p => p.clientId === c.id && p.members?.includes(currentUser().id)));
    return state.clients;
  }
  function visibleProjects(){
    if(state.role === 'client') return state.projects.filter(p => p.clientId === currentUser().clientId);
    if(state.role === 'worker') return state.projects.filter(p => Array.isArray(p.members) && p.members.includes(currentUser().id));
    return state.projects;
  }
  function visibleTasks(){
    if(state.role === 'client') return state.tasks.filter(t => t.clientId === currentUser().clientId);
    if(state.role === 'worker') return state.tasks.filter(t => t.assigneeId === currentUser().id);
    return state.tasks;
  }
  function visibleConversations(){
    if(state.role === 'client') return state.conversations.filter(c => c.clientId === currentUser().clientId && c.visibility !== 'internal_only');
    return state.conversations;
  }
  function visibleMessages(){
    const ids = new Set(visibleConversations().map(c => c.id));
    return state.messages.filter(m => ids.has(m.conversationId));
  }
  function visibleDeliveries(){
    if(state.role === 'client') return state.deliveries.filter(d => d.clientId === currentUser().clientId);
    if(state.role === 'worker') return state.deliveries.filter(d => visibleTasks().some(t => t.id === d.taskId));
    return state.deliveries;
  }
  function selectedProject(){ return visibleProjects().find(x => x.id === state.selectedProjectId) || visibleProjects()[0] || null; }
  function selectedTask(){ return visibleTasks().find(x => x.id === state.selectedTaskId) || visibleTasks()[0] || null; }
  function selectedConversation(){ return visibleConversations().find(x => x.id === state.selectedConversationId) || visibleConversations()[0] || null; }
  function selectedDelivery(){ return visibleDeliveries().find(x => x.id === state.selectedDeliveryId) || visibleDeliveries()[0] || null; }
  function healthScore(){
    const tasks = visibleTasks();
    if(!tasks.length) return 100;
    let score = 100;
    score -= tasks.filter(t => t.status === 'blocked').length * 18;
    score -= tasks.filter(t => t.status === 'waiting_client').length * 10;
    score -= tasks.filter(t => ['submitted','in_review'].includes(t.status)).length * 8;
    score -= reviewQueue().length * 4;
    score += tasks.filter(t => t.status === 'done').length * 5;
    return Math.max(15, Math.min(100, score));
  }

  function overdueTasks(){
    const today = new Date();
    return visibleTasks().filter(t => t.status !== 'done' && t.dueAt && new Date(`${t.dueAt}T23:59:59`) < today);
  }
  function pressureSummary(){
    const tasks = visibleTasks();
    const blocked = tasks.filter(t => t.status === 'blocked').length;
    const waiting = tasks.filter(t => t.status === 'waiting_client').length;
    const waitingDelayed = waitingClientDelayTasks().length;
    const review = tasks.filter(t => ['submitted','in_review'].includes(t.status)).length + reviewQueue().length;
    const overdue = overdueTasks().length;
    const overload = reviewOverloadActive() ? 1 : 0;
    return { blocked, waiting, waitingDelayed, review, overdue, overload, total: blocked + waiting + waitingDelayed + review + overdue + overload };
  }
  function healthLabel(score){
    if(score >= 85) return 'Healthy — low execution risk and review pressure.';
    if(score >= 70) return 'Warning — keep approvals and client replies moving.';
    return 'Critical — blockers, overdue work, or review backlog need action.';
  }
  function urgencyTone(task){
    if(!task) return 'tone-blue';
    if(overdueTasks().some(x => x.id === task.id) || task.status === 'blocked') return 'tone-red';
    if(task.status === 'waiting_client') return 'tone-orange';
    if(['submitted','in_review'].includes(task.status)) return 'tone-gold';
    return toneFor(task.priority || task.status);
  }
  function smartSuggestion(task){
    if(!task) return 'Create a project and assign the first execution item.';
    if(overdueTasks().some(x => x.id === task.id)) return 'This task is overdue. Update the client, unblock it, or reschedule today.';
    if(task.status === 'blocked') return currentTaskReason(task) ? `Resolve blocker: ${currentTaskReason(task)}` : 'Capture the blocker reason, resolve it, or escalate it now.';
    if(task.status === 'waiting_client') return currentTaskReason(task) ? `Waiting on client: ${currentTaskReason(task)}` : 'Capture the client dependency and send a follow-up request.';
    if(task.status === 'submitted') return 'The delivery is submitted. Reviewer must start structured review before approval can happen.';
    if(task.status === 'in_review') return 'Close the review loop fast and turn feedback into the next revision.';
    if(!deliverableReady(task)) return 'Define the concrete deliverable this task must produce.';
    if(!acceptanceCriteriaReady(task)) return 'Add acceptance criteria so approval is based on clear completion rules.';
    if(task.status === 'in_progress' && !allChecklistDone(task)) return 'Finish checklist items before you request review.';
    if(task.status === 'in_progress' && allChecklistDone(task) && !task.proofNote.trim()) return 'Add proof and request review from Deliveries.';
    return 'Open focus mode and finish the next required move.';
  }
  function nextRequiredMove(task){
    if(!task) return 'Create the next task or select a project.';
    if(!deliverableReady(task)) return 'Define the deliverable this task is accountable for.';
    if(!acceptanceCriteriaReady(task)) return 'Add acceptance criteria before execution continues.';
    if(task.status === 'new') return 'Start work to enter active execution.';
    if(task.status === 'in_progress' && !allChecklistDone(task)) return 'Complete remaining checklist items.';
    if(task.status === 'in_progress' && allChecklistDone(task) && !task.proofNote.trim()) return 'Add completion proof before review.';
    if(task.status === 'in_progress' && allChecklistDone(task) && task.proofNote.trim()) return 'Submit to review when ready.';
    if(task.status === 'waiting_client') return currentTaskReason(task) ? `Collect client decision: ${currentTaskReason(task)}` : 'Collect the client decision needed to move this delivery forward.';
    if(task.status === 'blocked') return currentTaskReason(task) ? `Resolve blocker: ${currentTaskReason(task)}` : 'Resolve blocker or escalate through chat.';
    if(task.status === 'submitted') return 'Reviewer must start structured review before a decision can be recorded.';
    if(task.status === 'in_review') return 'Monitor review outcome and convert feedback to revision if needed.';
    if(task.status === 'done') return 'Task complete. Move to the next execution item.';
    return 'Open task and continue execution.';
  }
  function allChecklistDone(task){ return task.checklist.length ? task.checklist.every(x => x.isDone) : true; }
  function reviewHistory(deliveryId){ return state.reviews.filter(r => r.deliveryId === deliveryId).sort((a,b) => String(a.createdAt || '').localeCompare(String(b.createdAt || ''))); }
  function attachmentsFor(entityType, entityId){ return state.attachments.filter(a => a.entityType === entityType && a.entityId === entityId); }
  function canReviewDelivery(delivery){
    if(!delivery) return false;
    const me = currentUser();
    if(me.id === delivery.createdById) return false;
    return me.role === 'owner' || me.role === 'client';
  }
  function deliveryVersionsForTask(taskId){ return state.deliveries.filter(d => d.taskId === taskId).sort((a,b) => b.createdAt.localeCompare(a.createdAt)); }
  function nextDeliveryVersion(task){
    const versions = deliveryVersionsForTask(task.id);
    if(!versions.length) return 'v1.0';
    const latest = versions[0].versionLabel || 'v1.0';
    const match = latest.match(/^v(\d+)\.(\d+)$/i);
    if(!match) return `v1.${(task.revisionCount || 0) + 1}`;
    return `v${Number(match[1])}.${Number(match[2]) + 1}`;
  }
  function projectConversationMessages(projectId){
    const ids = new Set(visibleConversations().filter(c => c.projectId === projectId).map(c => c.id));
    return visibleMessages().filter(m => ids.has(m.conversationId));
  }
  function formatFileSize(bytes){
    if(!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B','KB','MB','GB'];
    let size = bytes;
    let idx = 0;
    while(size >= 1024 && idx < units.length - 1){ size /= 1024; idx += 1; }
    return `${size >= 10 || idx === 0 ? Math.round(size) : size.toFixed(1)} ${units[idx]}`;
  }
  function addActivity(text){ state.activity.unshift({ id: uid('a'), actorId: currentUser().id, text, when: timeNow() }); }
  function showToast(text){
    el.toast.textContent = text;
    el.toast.classList.remove('hidden');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => el.toast.classList.add('hidden'), 2200);
  }
  function setBusy(text){
    uiState.busy = String(text || '').trim();
    render();
  }
  function clearBusy(){
    if(!uiState.busy) return;
    uiState.busy = '';
    render();
  }
  function hideSearchResults(){
    el.searchResults.classList.add('hidden');
    el.searchResults.innerHTML = '';
  }

  function escapeAttr(v){ return esc(v).replace(/"/g,'&quot;'); }
  function isValidDate(value){ return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime()); }
  function isValidEmail(value){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim()); }
  function isValidPhone(value){
    const digits = String(value || '').replace(/[^\d+]/g, '');
    return digits.length >= 7 && digits.length <= 16;
  }
  function isValidTimeZone(value){
    try {
      Intl.DateTimeFormat('en-US', { timeZone: String(value || '').trim() });
      return true;
    } catch {
      return false;
    }
  }
  function clearFieldState(form){
    if(!form) return;
    form.querySelectorAll('.invalid-field').forEach(field => field.classList.remove('invalid-field'));
  }
  function flagInvalidField(field){
    if(!field) return;
    field.classList.add('invalid-field');
  }
  function validateClientFields(form, options = {}){
    const { companyRequired = true, phoneRequired = true } = options;
    clearFieldState(form);
    const nameField = form.querySelector('[name="name"]');
    const companyField = form.querySelector('[name="company"]');
    const emailField = form.querySelector('[name="email"]');
    const phoneField = form.querySelector('[name="phone"]');
    const name = String(nameField?.value || '').trim();
    const company = String(companyField?.value || '').trim();
    const email = String(emailField?.value || '').trim();
    const phone = String(phoneField?.value || '').trim();
    const errors = [];
    if(!name){
      errors.push({ field: nameField, message:'Client name is required' });
    }
    if(companyRequired && !company){
      errors.push({ field: companyField, message:'Company is required' });
    }
    if(email && !isValidEmail(email)){
      errors.push({ field: emailField, message:'Enter a valid email address' });
    }
    if(phoneRequired && !phone){
      errors.push({ field: phoneField, message:'Phone is required' });
    }
    if(phone && !isValidPhone(phone)){
      errors.push({ field: phoneField, message:'Enter a valid phone number' });
    }
    if(errors.length){
      errors.forEach(error => flagInvalidField(error.field));
      errors[0].field?.focus();
      showToast(errors[0].message);
      return null;
    }
    return { name, company, email, phone };
  }
  function normalizedPriority(value){
    return ['normal','high','urgent'].includes(String(value || '').trim()) ? String(value).trim() : 'normal';
  }
  function parseAcceptanceCriteria(value){
    return String(value || '')
      .split(/\r?\n/)
      .map(item => item.trim())
      .filter(Boolean);
  }
  function taskReadiness(task){
    const missing = [];
    if(!deliverableReady(task)) missing.push('Missing deliverable');
    if(!acceptanceCriteriaReady(task)) missing.push('Missing acceptance criteria');
    if(!proofReady(task)) missing.push('Missing proof');
    return { ready: missing.length === 0, missing, label: missing.length ? missing.join(' · ') : 'Ready' };
  }
  function acceptanceCriteriaCount(task){ return Array.isArray(task?.acceptanceCriteria) ? task.acceptanceCriteria.length : 0; }
  function acceptanceCriteriaReady(task){ return acceptanceCriteriaCount(task) > 0; }
  function deliverableReady(task){ return !!String(task?.deliverableSummary || '').trim(); }
  function proofReady(task){ return !!String(task?.proofNote || '').trim(); }
  function reviewDecisionForTask(task){
    const latest = task ? deliveryVersionsForTask(task.id)[0] : null;
    return latest?.status || '';
  }
  function taskUiState(task){
    if(!task) return 'none';
    const latestDecision = reviewDecisionForTask(task);
    if(task.status === 'done') return 'done';
    if(latestDecision === 'changes_requested') return 'changes_requested';
    if(['submitted','in_review'].includes(task.status)) return 'under_review';
    if(task.status === 'in_progress' && deliverableReady(task) && acceptanceCriteriaReady(task) && allChecklistDone(task) && proofReady(task)) return 'ready_for_review';
    if(task.status === 'in_progress') return 'in_progress';
    if(task.status === 'new') return 'new';
    if(task.status === 'blocked') return 'blocked';
    if(task.status === 'waiting_client') return 'waiting_client';
    return task.status || 'none';
  }
  function taskPrimaryLabel(task){
    switch(taskUiState(task)){
      case 'new': return 'Start work';
      case 'in_progress': return 'Continue work';
      case 'ready_for_review': return 'Submit review';
      case 'under_review': return 'Waiting for decision';
      case 'changes_requested': return 'Apply changes';
      case 'done': return 'Completed';
      case 'blocked': return 'Resolve blocker';
      case 'waiting_client': return 'Waiting on client';
      default: return 'Open task';
    }
  }
  function reviewQueue(){
    return visibleDeliveries().filter(delivery => ['submitted','under_review'].includes(delivery.status));
  }
  function blockedTasks(){ return visibleTasks().filter(task => task.status === 'blocked'); }
  function waitingClientTasks(){ return visibleTasks().filter(task => task.status === 'waiting_client'); }
  function waitingClientDelayTasks(){
    const today = new Date();
    return waitingClientTasks().filter(task => task.dueAt && new Date(`${task.dueAt}T23:59:59`) <= today);
  }
  function reviewOverloadCount(){ return reviewQueue().length; }
  function reviewOverloadActive(){ return reviewOverloadCount() >= 3; }
  function currentTaskReason(task){ return String(task?.statusReason || task?.blockerNote || '').trim(); }
  function readTaskReason(task){
    const field = document.getElementById('statusReason');
    const focusedTask = selectedTask();
    const canReadFocusedField = state.currentView === 'focus' && focusedTask?.id === task?.id;
    return String(canReadFocusedField && field ? field.value : currentTaskReason(task)).trim();
  }
  function reviewDecisionLabel(delivery){
    if(!delivery) return 'No delivery selected';
    if(delivery.status === 'approved') return 'Approved';
    if(delivery.status === 'approved_with_notes') return 'Approved with notes';
    if(delivery.status === 'changes_requested') return 'Changes requested';
    if(delivery.status === 'under_review') return 'Review in progress';
    if(delivery.status === 'submitted') return 'Waiting for reviewer to start';
    return 'Needs decision';
  }
  function deliveryNextAction(delivery){
    if(!delivery) return 'Submit a task for review to create the first delivery packet.';
    const task = getTask(delivery.taskId);
    if(!attachmentsFor('delivery', delivery.id).length) return 'Attach deliverable files so review can happen against real output.';
    if(delivery.status === 'submitted') return 'Reviewer should open the packet, add review note, and mark under review.';
    if(delivery.status === 'under_review') return 'Reviewer should choose approved or changes requested with a clear decision note.';
    if(delivery.status === 'changes_requested') return `Execution team should revise ${task?.title || 'the task'} and submit the next version.`;
    if(['approved','approved_with_notes'].includes(delivery.status)) return task?.status === 'done' ? 'Delivery is closed. Move on to the next execution item.' : 'Mark the task done once delivery acceptance is complete.';
    return 'Review the current packet and make the next decision.';
  }
  function canTransitionDelivery(delivery, nextStatus){
    if(!delivery) return false;
    if(nextStatus === 'under_review') return ['submitted','under_review'].includes(delivery.status);
    if(['approved','approved_with_notes','changes_requested'].includes(nextStatus)) return delivery.status === 'under_review';
    return false;
  }
  function systemNextAction(){
    const blocked = blockedTasks()[0];
    if(blocked) return `Unblock ${blocked.title}: ${currentTaskReason(blocked) || 'capture a blocker reason and clear the dependency.'}`;
    const waitingDelay = waitingClientDelayTasks()[0];
    if(waitingDelay) return `Follow up with the client on ${waitingDelay.title} before the due date slips further.`;
    const queueItem = reviewQueue()[0];
    if(queueItem) return `${reviewOverloadActive() ? 'Reduce review load:' : 'Advance review:'} ${deliveryNextAction(queueItem)}`;
    const task = visibleTasks().find(item => item.status !== 'done');
    return task ? nextRequiredMove(task) : 'Create the first client, project, and deliverable-producing task.';
  }
  function onboardingSteps(){
    return [
      { key:'client', label:'Add client', complete: state.clients.length > 0, view:'clients', action: state.role === 'owner' ? 'focus-form' : '', target:'clientForm' },
      { key:'project', label:'Create project', complete: state.projects.length > 0, view:'projects', action: state.role === 'owner' ? 'focus-form' : '' , target:'projectForm' },
      { key:'task', label:'Create task', complete: state.tasks.length > 0, view:'tasks', action: state.role !== 'client' ? 'focus-form' : '', target:'taskForm' },
      { key:'delivery', label:'Submit for review', complete: state.deliveries.length > 0, view:'focus', action: '', target:'' }
    ];
  }
  function onboardingComplete(){ return onboardingSteps().every(step => step.complete); }
  function shouldShowOnboarding(){
    const noOperationalData = !state.clients.length || !state.projects.length || !state.tasks.length || !state.deliveries.length;
    return !state.workspace.onboardingDismissed && (FIRST_LOAD || noOperationalData) && !onboardingComplete();
  }
  function renderOnboardingOverlay(){
    if(!shouldShowOnboarding()) return '';
    const steps = onboardingSteps();
    return `<section class="panel" style="margin-bottom:16px"><div class="panel-head"><div><span class="eyebrow">Guided setup</span><h3>Launch the workspace in four steps</h3><p>Follow the setup path once and the system will hide this guide automatically.</p></div><button class="ghost-btn" data-action="dismiss-onboarding">Skip for now</button></div><div class="panel-body stack">${steps.map((step, index) => `<div class="entity-row onboarding-row"><div><h4>${index + 1}. ${esc(step.label)}</h4><p>${step.key === 'client' ? 'Create the client account record first.' : step.key === 'project' ? 'Create a project linked to that client.' : step.key === 'task' ? 'Create a deliverable-producing task with acceptance criteria.' : 'Save proof and send the first task into review.'}</p></div><div class="inline-actions">${step.complete ? `<span class="badge tone-green">Complete</span>` : step.action === 'focus-form' ? `<button class="primary-btn" data-action="guided-step" data-view="${esc(step.view)}" data-target="${esc(step.target)}">Open step</button>` : `<button class="primary-btn" data-view="${esc(step.view)}">Open step</button>`}</div></div>`).join('')}</div></section>`;
  }
  function openGuidedStep(view, target){
    if(view) navigate(view);
    requestAnimationFrame(() => focusForm(target));
  }
  function focusForm(formId){
    const form = document.getElementById(String(formId || ''));
    const field = form?.querySelector('input,textarea,select,button');
    if(!field) return showToast('The primary action is not available in this view.');
    field.focus();
    showToast('Primary action ready.');
  }
  function actionButton(config){
    if(!config) return '';
    const attrs = [];
    if(config.action) attrs.push(`data-action="${esc(config.action)}"`);
    if(config.id) attrs.push(`data-id="${escapeAttr(config.id)}"`);
    if(config.taskId) attrs.push(`data-taskid="${escapeAttr(config.taskId)}"`);
    if(config.projectId) attrs.push(`data-projectid="${escapeAttr(config.projectId)}"`);
    if(config.deliveryId) attrs.push(`data-deliveryid="${escapeAttr(config.deliveryId)}"`);
    if(config.view) attrs.push(`data-view="${esc(config.view)}"`);
    if(config.target) attrs.push(`data-target="${esc(config.target)}"`);
    return `<button type="button" class="${config.secondary ? 'ghost-btn' : 'primary-btn'}" ${attrs.join(' ')}>${esc(config.label || 'Open')}</button>`;
  }
  function actionBand(text, primaryConfig, secondaryConfig){
    return `<div class="info-band"><strong>Next required action:</strong> ${esc(text)}${primaryConfig || secondaryConfig ? `<div class="inline-actions" style="margin-top:10px">${actionButton(primaryConfig)}${actionButton(secondaryConfig)}</div>` : ''}</div>`;
  }
  function focusPrimaryAction(task){
    if(!task) return { label:'Open task board', view:'tasks' };
    const latestDelivery = deliveryVersionsForTask(task.id)[0];
    if(task.status === 'new') return { label:'Start work', action:'task-start', id:task.id };
    if(taskUiState(task) === 'changes_requested') return { label:'Apply changes', action:'open-focus', taskId:task.id };
    if(task.status === 'blocked') return { label:'Resolve blocker', action:'focus-form', target:'statusReasonForm' };
    if(task.status === 'waiting_client') return { label:'Waiting on client', action:'focus-form', target:'statusReasonForm' };
    if(taskUiState(task) === 'ready_for_review') return { label:'Submit review', action:'task-submit', id:task.id };
    if(task.status === 'in_progress') return proofReady(task) ? { label:'Continue work', action:'open-focus', taskId:task.id } : { label:'Continue work', action:'focus-form', target:'proofForm' };
    if(['submitted','in_review'].includes(task.status) && latestDelivery) return { label:'Waiting for decision', action:'open-delivery', deliveryId:latestDelivery.id };
    if(task.status === 'done') return { label:'Completed', action:'open-focus', taskId:task.id };
    return { label:'Open task', action:'open-focus', taskId:task.id };
  }
  function tasksPrimaryAction(tasks){
    if(!tasks.length) return state.role === 'client' ? { label:'Open projects', view:'projects' } : { label:'Create task', action:'focus-form', target:'taskForm' };
    return focusPrimaryAction(tasks.find(task => task.status !== 'done') || tasks[0]);
  }
  function projectPrimaryAction(project){
    const tasks = project ? projectTasks(project.id) : [];
    if(!project) return state.role === 'owner' ? { label:'Create project', action:'focus-form', target:'projectForm' } : { label:'Open dashboard', view:'dashboard' };
    const urgentTask = tasks.find(task => ['blocked','waiting_client','submitted','in_review','in_progress','new'].includes(task.status)) || tasks[0];
    if(urgentTask) return ['submitted','in_review'].includes(urgentTask.status) ? focusPrimaryAction(urgentTask) : { label:'Open task focus', action:'open-focus', taskId:urgentTask.id };
    return state.role === 'client' ? { label:'Open deliveries', view:'deliveries' } : { label:'Create task', view:'tasks' };
  }
  function openTaskModal(taskId){
    const task = getTask(taskId);
    if(!task) return showToast('Task not found.');
    state.selectedTaskId = task.id;
    state.selectedProjectId = task.projectId;
    openEntityModal('task-preview', task);
  }
  function moveTaskFromBoard(taskId, targetStatus){
    const task = getTask(taskId);
    if(!task) return showToast('Task not found.');
    if(state.role === 'client') return showToast('Clients can review work, not move execution cards.');
    const currentColumn = taskUiState(task) === 'ready_for_review' ? 'in_progress' : taskUiState(task) === 'under_review' ? 'in_review' : (['new','blocked'].includes(task.status) ? 'in_progress' : task.status);
    if(currentColumn === targetStatus) return showToast('Task is already in that lane.');
    if(targetStatus === 'in_progress') return setTaskStatus(taskId, 'in_progress');
    if(targetStatus === 'waiting_client') {
      if(!currentTaskReason(task)) {
        state.selectedTaskId = task.id;
        navigate('focus');
        requestAnimationFrame(() => focusForm('statusReasonForm'));
        return showToast('Add a waiting-client reason before moving this task.');
      }
      return setTaskStatus(taskId, 'waiting_client');
    }
    if(targetStatus === 'in_review') {
      if(['submitted','in_review'].includes(task.status)) return showToast('Review is already active for this task.');
      return submitTaskReview(taskId);
    }
    if(targetStatus === 'done') return setTaskDone(taskId);
    return showToast('That board move is not available.');
  }
  function boardTasksForStatus(status){
    return visibleTasks().filter(task => {
      if(status === 'in_progress') return ['new','in_progress','blocked'].includes(task.status);
      if(status === 'waiting_client') return task.status === 'waiting_client';
      if(status === 'in_review') return ['submitted','in_review'].includes(task.status);
      if(status === 'done') return task.status === 'done';
      return false;
    });
  }
  function boardColumnSummary(status, count){
    if(status === 'in_progress') return count ? 'Execute, unblock, and prepare proof.' : 'Move active tasks here to execute.';
    if(status === 'waiting_client') return count ? 'Every card here needs a client response reason.' : 'Waiting-client work will appear here.';
    if(status === 'in_review') return count ? 'Submitted and under-review work stays here until decision.' : 'Submit proof-backed tasks to start review.';
    return count ? 'Only approved tasks can finish here.' : 'Approved work lands here once completed.';
  }
  function kanbanTaskCard(task){
    return `<article class="kanban-card" ${state.role !== 'client' && task.status !== 'done' ? `draggable="true" data-drag-taskid="${escapeAttr(task.id)}"` : ''}>
      <div class="kanban-card-top">
        <h4>${esc(task.title)}</h4>
      </div>
      <div class="badges kanban-card-badges">${badge(task.status, urgencyTone(task))} ${badge(task.priority)}</div>
      <p class="kanban-card-summary">${esc(task.deliverableSummary || 'Define the deliverable outcome for this task.')}</p>
      <div class="inline-actions compact-actions kanban-card-actions">
        ${actionButton({ ...focusPrimaryAction(task), label: taskPrimaryLabel(task) })}
        <button class="ghost-btn" data-action="open-task-modal" data-id="${task.id}">Open</button>
      </div>
    </article>`;
  }
  function deliveriesPrimaryAction(delivery){
    if(!delivery) return { label:'Open task board', view:'tasks' };
    const task = getTask(delivery.taskId);
    if(delivery.status === 'submitted' && canReviewDelivery(delivery)) return { label:'Start review', action:'mark-review' };
    if(delivery.status === 'under_review' && canReviewDelivery(delivery)) return { label:'Review decision', action:'open-review-decision' };
    if(delivery.status === 'changes_requested' && task) return { label:'Open revision task', action:'open-focus', taskId:task.id };
    if(['approved','approved_with_notes'].includes(delivery.status) && task && task.status !== 'done' && state.role !== 'client') return { label:'Mark task done', action:'task-done', id:task.id };
    if(task) return { label:'Open linked task', action:'open-focus', taskId:task.id };
    return { label:'Open deliveries', view:'deliveries' };
  }
  function reportsPrimaryAction(){
    const blocked = blockedTasks()[0];
    if(blocked) return { label:'Resolve blocker', action:'open-focus', taskId:blocked.id };
    const waiting = waitingClientDelayTasks()[0];
    if(waiting) return { label:'Follow up on delay', action:'open-focus', taskId:waiting.id };
    const reviewItem = reviewQueue()[0];
    if(reviewItem) return { label:'Open review queue', action:'open-delivery', deliveryId:reviewItem.id };
    return { label:'Open task board', view:'tasks' };
  }
  function syncSelectedEntities(targetState = state){
    const projects = targetState.role && typeof visibleProjectsForState === 'function' ? visibleProjectsForState(targetState) : targetState.projects;
    const tasks = targetState.role && typeof visibleTasksForState === 'function' ? visibleTasksForState(targetState) : targetState.tasks;
    const conversations = targetState.role && typeof visibleConversationsForState === 'function' ? visibleConversationsForState(targetState) : targetState.conversations;
    const deliveries = targetState.role && typeof visibleDeliveriesForState === 'function' ? visibleDeliveriesForState(targetState) : targetState.deliveries;
    targetState.selectedProjectId = projects.find(project => project.id === targetState.selectedProjectId)?.id || projects[0]?.id || '';
    targetState.selectedTaskId = tasks.find(task => task.id === targetState.selectedTaskId)?.id || tasks[0]?.id || '';
    targetState.selectedConversationId = conversations.find(conversation => conversation.id === targetState.selectedConversationId)?.id || conversations[0]?.id || '';
    targetState.selectedDeliveryId = deliveries.find(delivery => delivery.id === targetState.selectedDeliveryId)?.id || deliveries[0]?.id || '';
    if(!VIEWS_BY_ROLE[targetState.role]?.includes(targetState.currentView)) {
      targetState.currentView = VIEWS_BY_ROLE[targetState.role]?.includes(targetState.workspace.startView) ? targetState.workspace.startView : 'dashboard';
    }
  }
  function hasDuplicateName(items, value, currentId, key){
    const target = String(value || '').trim().toLowerCase();
    if(!target) return false;
    return items.some(item => item.id !== currentId && String(item[key] || '').trim().toLowerCase() === target);
  }
  function reviewMetrics(delivery){
    const files = attachmentsFor('delivery', delivery.id).length;
    const task = getTask(delivery.taskId);
    const readiness = taskReadiness(task);
    const proofReady = readiness.ready || !readiness.missing.includes('Missing proof');
    const criteriaReady = readiness.ready || !readiness.missing.includes('Missing acceptance criteria');
    const status = readiness.label;
    const overdueReview = ['submitted','under_review'].includes(delivery.status) && delivery.createdAt && (Date.now() - new Date(delivery.createdAt.replace(' ','T')).getTime()) > 1000 * 60 * 60 * 24;
    const clientDelay = state.role !== 'client' && task?.status === 'waiting_client';
    return { files, proofReady, criteriaReady, status, overdueReview, clientDelay, ready: readiness.ready, missing: readiness.missing };
  }
  function disableIf(flag){ return flag ? 'disabled aria-disabled="true"' : ''; }
  function visibleProjectsForState(targetState){
    const me = targetState.users.find(user => user.role === targetState.role) || targetState.users[0];
    if(targetState.role === 'client') return targetState.projects.filter(project => project.clientId === me?.clientId);
    if(targetState.role === 'worker') return targetState.projects.filter(project => Array.isArray(project.members) && project.members.includes(me?.id));
    return targetState.projects;
  }
  function visibleTasksForState(targetState){
    const me = targetState.users.find(user => user.role === targetState.role) || targetState.users[0];
    if(targetState.role === 'client') return targetState.tasks.filter(task => task.clientId === me?.clientId);
    if(targetState.role === 'worker') return targetState.tasks.filter(task => task.assigneeId === me?.id);
    return targetState.tasks;
  }
  function visibleConversationsForState(targetState){
    const me = targetState.users.find(user => user.role === targetState.role) || targetState.users[0];
    if(targetState.role === 'client') return targetState.conversations.filter(conversation => conversation.clientId === me?.clientId && conversation.visibility !== 'internal_only');
    return targetState.conversations;
  }
  function visibleDeliveriesForState(targetState){
    const me = targetState.users.find(user => user.role === targetState.role) || targetState.users[0];
    if(targetState.role === 'client') return targetState.deliveries.filter(delivery => delivery.clientId === me?.clientId);
    if(targetState.role === 'worker') {
      const visibleTaskIds = new Set(visibleTasksForState(targetState).map(task => task.id));
      return targetState.deliveries.filter(delivery => visibleTaskIds.has(delivery.taskId));
    }
    return targetState.deliveries;
  }
  function openModal(config){
    closeModal();
    modalState = config;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'appModal';
    overlay.innerHTML = `<div class="modal-card panel"><div class="panel-head"><div><span class="eyebrow">${esc(config.eyebrow || 'Workspace action')}</span><h3>${esc(config.title)}</h3><p>${esc(config.description || '')}</p></div><button class="ghost-btn" type="button" data-modal-close>Close</button></div><div class="panel-body">${config.html}</div></div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', evt => { if(evt.target === overlay || evt.target.hasAttribute('data-modal-close')) closeModal(); });
    overlay.querySelector('input,textarea,select')?.focus();
  }
  function closeModal(){ document.getElementById('appModal')?.remove(); modalState = null; }
  function openConfirmModal(opts){
    openModal({
      title: opts.title,
      eyebrow: opts.eyebrow || 'Confirm action',
      description: opts.description || '',
      html:`<div class="stack"><div class="info-band">${esc(opts.message || '')}</div><div class="inline-actions"><button class="ghost-btn" type="button" data-modal-close>Cancel</button><button class="primary-btn" type="button" id="modalConfirmBtn">${esc(opts.confirmText || 'Confirm')}</button></div></div>`
    });
    document.getElementById('modalConfirmBtn')?.addEventListener('click', () => { closeModal(); opts.onConfirm?.(); });
  }
  function openStorageWarningModal(opts){
    openConfirmModal({
      title: opts.title,
      eyebrow: 'Browser storage notice',
      description: opts.description || 'This workspace stores data in your browser LocalStorage.',
      message: opts.message || 'Continuing will overwrite the current workspace data stored in this browser. Export a backup first if you need to keep the current state.',
      confirmText: opts.confirmText || 'Continue',
      onConfirm: opts.onConfirm
    });
  }
  function openEntityModal(type, entity){
    const idField = entity ? `<input type="hidden" name="entityId" value="${escapeAttr(entity.id)}">` : '';
    if(type === 'client'){
      openModal({ title:'Edit client', eyebrow:'Client record', description:'Update client details with validation.', html:`<form id="entityModalForm" class="form-stack" novalidate><input type="hidden" name="entityType" value="client">${idField}<input class="field" name="name" value="${escapeAttr(entity.name)}" placeholder="Client name"><input class="field" name="company" value="${escapeAttr(entity.company)}" placeholder="Company"><input class="field" name="email" value="${escapeAttr(entity.email)}" placeholder="Email"><input class="field" name="phone" value="${escapeAttr(entity.phone)}" placeholder="Phone"><div class="inline-actions"><button class="ghost-btn" type="button" data-modal-close>Cancel</button><button class="primary-btn" type="submit">Save client</button></div></form>` });
    }
    if(type === 'project'){
      openModal({ title:'Edit project', eyebrow:'Project record', description:'Update project details without leaving the workspace.', html:`<form id="entityModalForm" class="form-stack"><input type="hidden" name="entityType" value="project">${idField}<input class="field" name="title" value="${escapeAttr(entity.title)}" placeholder="Project title" required><textarea class="area" name="description" placeholder="Project description" required>${esc(entity.description)}</textarea><input class="field" name="dueAt" value="${escapeAttr(entity.dueAt)}" placeholder="YYYY-MM-DD" required><div class="inline-actions"><button class="ghost-btn" type="button" data-modal-close>Cancel</button><button class="primary-btn" type="submit">Save project</button></div></form>` });
    }
    if(type === 'task'){
      openModal({ title:'Edit task', eyebrow:'Task record', description:'Keep execution details, deliverable outcome, and approval criteria current.', html:`<form id="entityModalForm" class="form-stack"><input type="hidden" name="entityType" value="task">${idField}<input class="field" name="title" value="${escapeAttr(entity.title)}" placeholder="Task title" required><textarea class="area" name="deliverableSummary" placeholder="Deliverable outcome" required>${esc(entity.deliverableSummary || '')}</textarea><textarea class="area" name="acceptanceCriteria" placeholder="Acceptance criteria, one per line" required>${esc((entity.acceptanceCriteria || []).join('\n'))}</textarea><textarea class="area" name="nextAction" placeholder="Next action" required>${esc(entity.nextAction)}</textarea><input class="field" name="dueAt" value="${escapeAttr(entity.dueAt)}" placeholder="YYYY-MM-DD" required><div class="inline-actions"><button class="ghost-btn" type="button" data-modal-close>Cancel</button><button class="primary-btn" type="submit">Save task</button></div></form>` });
    }
    if(type === 'task-preview'){
      const latestDelivery = deliveryVersionsForTask(entity.id)[0];
      openModal({ title:entity.title, eyebrow:'Task overview', description:'Open task context, status, deliverable, and next step.', html:`<div class="stack"><div class="mini-card"><strong>Status</strong><span>${esc(taskPrimaryLabel(entity))} · ${esc(entity.status.replace('_',' '))}</span></div><div class="mini-card"><strong>Deliverable</strong><span>${esc(entity.deliverableSummary)}</span></div><div class="mini-card"><strong>Acceptance criteria</strong><span>${esc((entity.acceptanceCriteria || []).join(' | '))}</span></div><div class="mini-card"><strong>Next action</strong><span>${esc(nextRequiredMove(entity))}</span></div><div class="inline-actions"><button class="ghost-btn" type="button" data-modal-close>Close</button><button class="ghost-btn" type="button" data-taskid="${escapeAttr(entity.id)}" data-action="open-focus">Open focus</button>${latestDelivery ? `<button class="ghost-btn" type="button" data-deliveryid="${escapeAttr(latestDelivery.id)}" data-action="open-delivery">Open delivery</button>` : ''}${state.role !== 'client' ? `<button class="primary-btn" type="button" data-action="edit-task" data-id="${escapeAttr(entity.id)}">Edit task</button>` : ''}</div></div>` });
    }
    if(type === 'checklist'){
      openModal({ title:'Add checklist item', eyebrow:'Task checklist', description:'Add a real execution step to the task.', html:`<form id="entityModalForm" class="form-stack"><input type="hidden" name="entityType" value="checklist"><input type="hidden" name="entityId" value="${escapeAttr(entity.id)}"><input class="field" name="label" placeholder="Checklist item" required><div class="inline-actions"><button class="ghost-btn" type="button" data-modal-close>Cancel</button><button class="primary-btn" type="submit">Add item</button></div></form>` });
    }
    if(type === 'time'){
      openModal({ title:'Log time', eyebrow:'Execution time', description:'Add minutes to actual effort.', html:`<form id="entityModalForm" class="form-stack"><input type="hidden" name="entityType" value="time"><input type="hidden" name="entityId" value="${escapeAttr(entity.id)}"><input class="field" name="minutes" type="number" min="1" step="1" value="15" required><div class="inline-actions"><button class="ghost-btn" type="button" data-modal-close>Cancel</button><button class="primary-btn" type="submit">Log time</button></div></form>` });
    }
  }
  function openReviewDecisionModal(){
    const delivery = selectedDelivery();
    if(!delivery) return showToast('Open a delivery before recording a review decision.');
    if(!canReviewDelivery(delivery)) return showToast('Only a valid reviewer can record a review decision.');
    if(delivery.status !== 'under_review') return showToast('Start structured review before recording a decision.');
    openModal({
      title:'Review decision',
      eyebrow:'Delivery approval',
      description:'Record the final review decision with a required note.',
      html:`<form id="entityModalForm" class="form-stack">
        <input type="hidden" name="entityType" value="review-decision">
        <select class="select" name="decision" required>
          <option value="approved">Approve</option>
          <option value="changes_requested">Request changes</option>
        </select>
        <textarea class="area" name="reviewerNote" placeholder="Decision note" required>${esc(delivery.reviewerNote || '')}</textarea>
        <textarea class="area" name="changeSummary" placeholder="Change request summary">${esc(delivery.changeSummary || '')}</textarea>
        <textarea class="area" name="internalNote" placeholder="Internal note">${esc(delivery.internalNote || '')}</textarea>
        <textarea class="area" name="clientVisibleNote" placeholder="Client-visible note">${esc(delivery.clientVisibleNote || '')}</textarea>
        <div class="inline-actions"><button class="ghost-btn" type="button" data-modal-close>Cancel</button><button class="primary-btn" type="submit">Save decision</button></div>
      </form>`
    });
  }
  function dataUrlToBlob(dataUrl){
    const parts = String(dataUrl || '').split(',');
    if(parts.length < 2) return null;
    const match = parts[0].match(/data:(.*?);base64/i);
    if(!match) return null;
    const binary = atob(parts[1]);
    const bytes = new Uint8Array(binary.length);
    for(let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: match[1] || 'application/octet-stream' });
  }

  function bindGlobalEvents(){
    document.addEventListener('click', onClick);
    document.addEventListener('change', onChange);
    document.addEventListener('submit', onSubmit);
    document.addEventListener('dragstart', onDragStart);
    document.addEventListener('dragover', onDragOver);
    document.addEventListener('drop', onDrop);
    document.addEventListener('dragend', onDragEnd);
    el.searchBtn.addEventListener('click', runSearch);
    el.searchInput.addEventListener('keydown', e => { if(e.key === 'Enter') runSearch(); });
    function openResetModal(){
      document.querySelectorAll('.modal-overlay').forEach((node, index) => {
        if(index > 0) node.remove();
      });
      if(document.querySelector('.modal-overlay')) return;
      openStorageWarningModal({
        title:'Reset workspace',
        description:'This action clears the workspace stored in browser LocalStorage.',
        message:'This will permanently remove the current workspace from browser LocalStorage and overwrite the active state with a blank workspace. Export a backup first if you may need this data again.',
        confirmText:'Reset workspace',
        onConfirm: () => {
          const savedTheme = localStorage.getItem('theme') || state.workspace.appearance;
          const savedDensity = localStorage.getItem('density') || state.workspace.density;
          state = normalizeState(cloneInitial());
          if(['dark','light'].includes(savedTheme)) state.workspace.appearance = savedTheme;
          if(['comfortable','compact'].includes(savedDensity)) state.workspace.density = savedDensity;
          persist();
          if(savedTheme) localStorage.setItem('theme', savedTheme);
          if(savedDensity) localStorage.setItem('density', savedDensity);
          render();
          showToast('Workspace reset complete.');
        }
      });
    }
    el.resetBtn.onclick = openResetModal;
    el.exportBtn.addEventListener('click', exportJson);
    el.importBtn.onclick = () => {
      document.querySelectorAll('.modal-overlay').forEach((node, index) => {
        if(index > 0) node.remove();
      });
      if(document.querySelector('.modal-overlay')) return;
      openStorageWarningModal({
        title:'Import workspace JSON',
        description:'Import replaces the workspace stored in browser LocalStorage.',
        message:'Importing a JSON backup will overwrite the current workspace data stored in this browser LocalStorage. Export a backup first if you need to keep the current state before continuing.',
        confirmText:'Choose JSON file',
        onConfirm: () => {
          el.importInput.value = '';
          el.importInput.click();
        }
      });
    };
    el.importInput.addEventListener('change', importJson);
    el.fileInput.addEventListener('change', handleAttachmentSelection);
    window.addEventListener('hashchange', () => {
      const target = location.hash.replace('#','');
      if(target && VIEW_META[target] && VIEWS_BY_ROLE[state.role].includes(target)) {
        state.currentView = target;
        persist();
        render();
      }
    });
    const initialHash = location.hash.replace('#','');
    if(initialHash && VIEW_META[initialHash] && VIEWS_BY_ROLE[state.role].includes(initialHash)) {
      state.currentView = initialHash;
    }
  }

  function onClick(e){
    const btn = e.target.closest('[data-action],[data-view],[data-role],[data-projectid],[data-taskid],[data-conversationid],[data-deliveryid]');
    if(!btn) return;
    if(btn.matches('[disabled],[aria-disabled="true"]')) return;
    if(btn.dataset.role){
      state.role = btn.dataset.role;
      syncSelectedEntities();
      hideSearchResults();
      persist();
      render();
      showToast(`Role switched to ${btn.dataset.role}.`);
      return;
    }
    if(btn.dataset.view){ navigate(btn.dataset.view); return; }
    if(btn.dataset.projectid){
      state.selectedProjectId = btn.dataset.projectid;
      if(!btn.dataset.action){ hideSearchResults(); persist(); render(); return; }
    }
    if(btn.dataset.taskid){
      state.selectedTaskId = btn.dataset.taskid;
      if(btn.dataset.action === 'open-focus'){ navigate('focus'); return; }
      if(!btn.dataset.action){ navigate('focus'); return; }
    }
    if(btn.dataset.conversationid){
      state.selectedConversationId = btn.dataset.conversationid;
      if(!btn.dataset.action){ hideSearchResults(); persist(); render(); return; }
    }
    if(btn.dataset.deliveryid){
      state.selectedDeliveryId = btn.dataset.deliveryid;
      if(!btn.dataset.action){ hideSearchResults(); persist(); render(); return; }
    }
    const action = btn.dataset.action;
    const actionId = btn.dataset.id || btn.dataset.taskid || btn.dataset.projectid || btn.dataset.deliveryid || btn.dataset.conversationid || '';
    if(action === 'toggle-checklist') toggleChecklist(actionId);
    else if(action === 'task-start') setTaskStatus(actionId, 'in_progress');
    else if(action === 'task-block') setTaskStatus(actionId, 'blocked');
    else if(action === 'task-wait') setTaskStatus(actionId, 'waiting_client');
    else if(action === 'task-submit') submitTaskReview(actionId);
    else if(action === 'task-done') setTaskDone(actionId);
    else if(action === 'go-projects') navigate('projects');
    else if(action === 'go-focus') { state.selectedTaskId = state.tasks[0]?.id || ''; navigate('focus'); }
    else if(action === 'open-project') { state.selectedProjectId = actionId; navigate('projects'); }
    else if(action === 'open-delivery') { state.selectedDeliveryId = actionId; navigate('deliveries'); }
    else if(action === 'focus-form') focusForm(btn.dataset.target);
    else if(action === 'guided-step') openGuidedStep(btn.dataset.view, btn.dataset.target);
    else if(action === 'dismiss-onboarding') { state.workspace.onboardingDismissed = true; persist(); render(); showToast('Setup guide dismissed.'); }
    else if(action === 'approve-delivery') reviewDelivery('approved');
    else if(action === 'approve-notes') reviewDelivery('approved_with_notes');
    else if(action === 'request-changes') reviewDelivery('changes_requested');
    else if(action === 'mark-review') reviewDelivery('under_review');
    else if(action === 'theme-dark') { state.workspace.appearance = 'dark'; hideSearchResults(); persist(); render(); showToast('Dark view enabled.'); }
    else if(action === 'theme-light') { state.workspace.appearance = 'light'; hideSearchResults(); persist(); render(); showToast('Light view enabled.'); }
    else if(action === 'density-compact') { state.workspace.density = 'compact'; hideSearchResults(); persist(); render(); showToast('Compact density enabled.'); }
    else if(action === 'density-comfort') { state.workspace.density = 'comfortable'; hideSearchResults(); persist(); render(); showToast('Comfortable density enabled.'); }
    else if(action === 'upload-attachment') triggerAttachmentUpload();
    else if(action === 'open-attachment') openAttachment(actionId);
    else if(action === 'remove-attachment') removeAttachment(actionId);
    else if(action === 'search-open') openSearchResult(btn.dataset.kind, actionId);
    else if(action === 'open-task-modal') openTaskModal(actionId);
    else if(action === 'open-review-decision') openReviewDecisionModal();
    else if(action === 'edit-task') editTask(actionId);
    else if(action === 'edit-project') editProject(actionId);
    else if(action === 'edit-client') editClient(actionId);
    else if(action === 'add-checklist') addChecklistItem(actionId);
    else if(action === 'log-time') logTaskTime(actionId);
  }

  function onDragStart(e){
    const card = e.target.closest('[data-drag-taskid]');
    if(!card) return;
    onDragEnd();
    dragState.taskId = card.dataset.dragTaskid;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragState.taskId);
    e.dataTransfer.setDragImage(card, Math.min(32, card.offsetWidth / 4), 24);
    card.classList.add('dragging');
    document.body.classList.add('drag-active');
    document.querySelectorAll('[data-dropstatus]').forEach(zone => zone.classList.add('drop-ready'));
  }

  function onDragOver(e){
    const zone = e.target.closest('[data-dropstatus]');
    if(!zone || !dragState.taskId) return;
    e.preventDefault();
    dragState.overStatus = zone.dataset.dropstatus;
    document.querySelectorAll('[data-dropstatus]').forEach(item => item.classList.remove('drop-active'));
    zone.classList.add('drop-active');
  }

  function onDrop(e){
    const zone = e.target.closest('[data-dropstatus]');
    if(!zone || !dragState.taskId) return;
    e.preventDefault();
    const draggedTaskId = dragState.taskId;
    const targetStatus = zone.dataset.dropstatus;
    onDragEnd();
    moveTaskFromBoard(draggedTaskId, targetStatus);
  }

  function onDragEnd(){
    dragState.taskId = '';
    dragState.overStatus = '';
    document.body.classList.remove('drag-active');
    document.querySelectorAll('.dragging').forEach(item => item.classList.remove('dragging'));
    document.querySelectorAll('[data-dropstatus]').forEach(item => item.classList.remove('drop-active','drop-ready'));
  }

  function onChange(e){
    const target = e.target;
    if(target.matches('#clientForm .field, #entityModalForm .field')){
      target.classList.remove('invalid-field');
    }
    if(target.matches('[data-setting]')){
      state.workspace[target.dataset.setting] = target.value;
      persist();
      render();
    }
  }

  function onSubmit(e){
    const form = e.target;
    if(form.matches('#entityModalForm')){
      e.preventDefault();
      const fd = new FormData(form);
      const entityType = String(fd.get('entityType'));
      const entityId = String(fd.get('entityId') || '');
      if(entityType === 'client'){
        const client = getClient(entityId);
        const validated = validateClientFields(form);
        if(!client || !validated) return;
        const { name, company, email, phone } = validated;
        if(hasDuplicateName(state.clients, name, entityId, 'name')) return showToast('Client name must be unique.');
        Object.assign(client, { name, company, email, phone });
        hideSearchResults();
        persist(); render(); closeModal(); showToast('Client updated.');
        return;
      }
      if(entityType === 'project'){
        const project = getProject(entityId);
        const title = String(fd.get('title')).trim();
        const description = String(fd.get('description')).trim();
        const dueAt = String(fd.get('dueAt')).trim();
        if(!project || !title || !description || !isValidDate(dueAt)) return showToast('Enter a valid project title, description, and date.');
        if(hasDuplicateName(state.projects, title, entityId, 'title')) return showToast('Project title must be unique.');
        Object.assign(project, { title, description, dueAt });
        hideSearchResults();
        persist(); render(); closeModal(); showToast('Project updated.');
        return;
      }
      if(entityType === 'task'){
        const task = getTask(entityId);
        const title = String(fd.get('title')).trim();
        const deliverableSummary = String(fd.get('deliverableSummary')).trim();
        const acceptanceCriteria = parseAcceptanceCriteria(fd.get('acceptanceCriteria'));
        const nextAction = String(fd.get('nextAction')).trim();
        const dueAt = String(fd.get('dueAt')).trim();
        if(!task || !title || !deliverableSummary || !nextAction || !isValidDate(dueAt)) return showToast('Enter a valid task title, deliverable, next action, and due date.');
        if(!acceptanceCriteria.length) return showToast('Add at least one acceptance criterion.');
        if(hasDuplicateName(state.tasks.filter(t => t.projectId === task.projectId), title, entityId, 'title')) return showToast('Task title must be unique inside the project.');
        Object.assign(task, { title, deliverableSummary, acceptanceCriteria, nextAction, dueAt });
        task.history.unshift({ id: uid('h'), text:'Task details updated', at: now() });
        hideSearchResults();
        persist(); render(); closeModal(); showToast('Task updated.');
        return;
      }
      if(entityType === 'checklist'){
        const task = getTask(entityId);
        const label = String(fd.get('label')).trim();
        if(!task || !label) return showToast('Checklist item cannot be empty.');
        if(task.checklist.some(item => item.label.trim().toLowerCase() === label.toLowerCase())) return showToast('Checklist item already exists.');
        task.checklist.push({ id: uid('chk'), label, isDone:false });
        task.history.unshift({ id: uid('h'), text:`Checklist item added: ${label}`, at: now() });
        hideSearchResults();
        persist(); render(); closeModal(); showToast('Checklist item added.');
        return;
      }
      if(entityType === 'time'){
        const task = getTask(entityId);
        const value = Number(fd.get('minutes'));
        if(!task || !Number.isFinite(value) || value <= 0) return showToast('Enter a valid number of minutes.');
        task.actualMinutes += value;
        task.history.unshift({ id: uid('h'), text:`Logged ${value} minutes`, at: now() });
        hideSearchResults();
        persist(); render(); closeModal(); showToast('Time logged.');
        return;
      }
      if(entityType === 'review-decision'){
        const decision = String(fd.get('decision') || '').trim();
        const reviewerNote = String(fd.get('reviewerNote') || '').trim();
        const changeSummary = String(fd.get('changeSummary') || '').trim();
        const internalNote = String(fd.get('internalNote') || '').trim();
        const clientVisibleNote = String(fd.get('clientVisibleNote') || '').trim();
        if(!['approved','changes_requested'].includes(decision)) return showToast('Choose a valid review decision.');
        if(!reviewerNote) return showToast('Decision note is required before saving review.');
        if(decision === 'changes_requested' && !changeSummary) return showToast('Change request summary is required when requesting changes.');
        closeModal();
        reviewDelivery(decision, { reviewerNote, changeSummary, internalNote, clientVisibleNote });
        return;
      }
    }
    if(form.matches('#clientForm')){
      e.preventDefault();
      if(state.role !== 'owner') return showToast('Only owner can create clients.');
      const fd = new FormData(form);
      const validated = validateClientFields(form);
      if(!validated) return;
      const { name, company, email, phone } = validated;
      if(hasDuplicateName(state.clients, name, '', 'name')) return showToast('Client name must be unique.');
      state.clients.unshift({ id: uid('c'), name, company, email, phone, status:'active', notes: String(fd.get('notes')).trim() });
      state.workspace.onboardingDismissed = onboardingComplete();
      addActivity(`Created client ${String(fd.get('name')).trim()}`);
      hideSearchResults();
      form.reset();
      clearFieldState(form);
      persist(); render(); showToast('Client created successfully');
    }
    if(form.matches('#projectForm')){
      e.preventDefault();
      if(state.role !== 'owner') return showToast('Only owner can create projects.');
      const fd = new FormData(form);
      const clientId = String(fd.get('clientId'));
      const title = String(fd.get('title')).trim();
      const description = String(fd.get('description')).trim();
      const dueAt = String(fd.get('dueAt'));
      const priority = normalizedPriority(fd.get('priority'));
      if(!getClient(clientId) || !title || !description || !isValidDate(dueAt)) return showToast('Enter valid project details.');
      if(hasDuplicateName(state.projects, title, '', 'title')) return showToast('Project title must be unique.');
      const project = { id: uid('p'), clientId, title, description, status:'active', priority, dueAt, members:workspaceOperators().map(user => user.id) };
      state.projects.unshift(project);
      state.selectedProjectId = project.id;
      state.workspace.onboardingDismissed = onboardingComplete();
      addActivity(`Created project ${project.title}`);
      hideSearchResults();
      persist(); render(); showToast('Project created.');
    }
    if(form.matches('#taskForm')){
      e.preventDefault();
      if(state.role === 'client') return showToast('Clients cannot create tasks.');
      const fd = new FormData(form);
      const projectId = String(fd.get('projectId'));
      const project = getProject(projectId);
      const title = String(fd.get('title')).trim();
      const description = String(fd.get('description')).trim();
      const deliverableSummary = String(fd.get('deliverableSummary')).trim();
      const acceptanceCriteria = parseAcceptanceCriteria(fd.get('acceptanceCriteria'));
      const dueAt = String(fd.get('dueAt'));
      const nextAction = String(fd.get('nextAction')).trim();
      const assigneeId = String(fd.get('assigneeId'));
      const priority = normalizedPriority(fd.get('priority'));
      const estimatedMinutes = Number(fd.get('estimatedMinutes') || 60);
      if(!project || !title || !description || !deliverableSummary || !nextAction || !isValidDate(dueAt)) return showToast('Enter valid task details.');
      if(!acceptanceCriteria.length) return showToast('Add at least one acceptance criterion.');
      if(!workspaceOperators().some(user => user.id === assigneeId)) return showToast('Select a valid assignee.');
      if(!Number.isFinite(estimatedMinutes) || estimatedMinutes < 15) return showToast('Estimated time must be at least 15 minutes.');
      if(hasDuplicateName(state.tasks.filter(t => t.projectId === projectId), title, '', 'title')) return showToast('Task title must be unique inside the project.');
      const task = {
        id: uid('t'), projectId, clientId: project.clientId, assigneeId, title, description,
        status:'new', priority, dueAt, nextAction, blockerNote:'', statusReason:'', deliverableSummary, acceptanceCriteria, estimatedMinutes, actualMinutes:0, proofNote:'', revisionCount:0,
        checklist:[{ id: uid('chk'), label:'Execute the core deliverable output', isDone:false }, { id: uid('chk'), label:'Validate acceptance criteria', isDone:false }, { id: uid('chk'), label:'Prepare review packet and proof', isDone:false }], history:[{ id: uid('h'), text:'Task created with deliverable scope', at: now() }]
      };
      state.tasks.unshift(task);
      state.selectedTaskId = task.id;
      state.workspace.onboardingDismissed = onboardingComplete();
      addActivity(`Created task ${task.title}`);
      hideSearchResults();
      persist(); render(); showToast('Task created. Open focus mode to continue execution.');
    }
    if(form.matches('#messageForm')){
      e.preventDefault();
      const fd = new FormData(form);
      const body = String(fd.get('body')).trim();
      if(!body) return showToast('Message cannot be empty.');
      if(!selectedConversation()) return showToast('Open a conversation before sending a message.');
      state.messages.push({ id: uid('m'), conversationId: state.selectedConversationId, senderId: currentUser().id, body, createdAt: timeNow() });
      addActivity('Posted message in collaboration hub');
      hideSearchResults();
      persist(); render(); showToast('Message sent.');
    }
    if(form.matches('#proofForm')){
      e.preventDefault();
      const task = selectedTask();
      if(!task) return;
      const proof = String(new FormData(form).get('proofNote')).trim();
      if(!proof) return showToast('Proof note cannot be empty.');
      task.proofNote = proof;
      task.history.unshift({ id: uid('h'), text:'Updated completion proof', at: now() });
      addActivity(`Updated proof for ${task.title}`);
      hideSearchResults();
      persist(); render(); showToast(allChecklistDone(task) ? 'Proof saved. Submit review when ready.' : 'Proof saved. Finish the remaining checklist items next.');
    }
    if(form.matches('#statusReasonForm')){
      e.preventDefault();
      const task = selectedTask();
      if(!task) return;
      const reason = String(new FormData(form).get('statusReason')).trim();
      if(!reason) return showToast('Execution reason cannot be empty.');
      task.statusReason = reason;
      if(task.status === 'blocked') task.blockerNote = reason;
      task.history.unshift({ id: uid('h'), text:`Execution note updated for ${task.status.replace('_',' ')}`, at: now() });
      addActivity(`Updated execution note for ${task.title}`);
      hideSearchResults();
      persist(); render(); showToast('Execution note saved.');
    }
    if(form.matches('#settingsForm')){
      e.preventDefault();
      const fd = new FormData(form);
      const name = String(fd.get('name')).trim();
      const company = String(fd.get('company')).trim();
      const timezone = String(fd.get('timezone')).trim();
      const startView = String(fd.get('startView'));
      if(!name || !company || !timezone) return showToast('All settings fields are required.');
      if(!isValidTimeZone(timezone)) return showToast('Enter a valid IANA timezone, like Asia/Beirut.');
      if(!VIEW_META[startView]) return showToast('Choose a valid start view.');
      state.workspace.name = name;
      state.workspace.company = company;
      state.workspace.timezone = timezone;
      state.workspace.startView = startView;
      hideSearchResults();
      setBusy('Saving settings...');
      persist(); render(); showToast('Settings saved successfully');
      clearBusy();
    }
  }

  function toggleChecklist(itemId){
    if(state.role === 'client') return showToast('Clients cannot change checklists.');
    const task = selectedTask();
    if(!task) return;
    const item = task.checklist.find(x => x.id === itemId);
    if(!item) return;
    item.isDone = !item.isDone;
    task.history.unshift({ id: uid('h'), text:`Checklist updated: ${item.label}`, at: now() });
    hideSearchResults();
    persist(); render();
    showToast(item.isDone ? 'Checklist item completed.' : 'Checklist item reopened.');
  }

  function setTaskStatus(taskId, next){
    if(state.role === 'client') return showToast('Clients cannot change task status.');
    const task = getTask(taskId);
    if(!task) return;
    const reason = readTaskReason(task);
    if(next === 'in_progress' && !['new','blocked','waiting_client','in_progress'].includes(task.status)) return showToast('Only new, blocked, or waiting-client tasks can move into progress.');
    if(next === 'in_progress' && task.status === 'done') return showToast('Done tasks cannot restart automatically.');
    if(next === 'waiting_client' && !task.nextAction.trim()) return showToast('Set next action before waiting on client.');
    if(next === 'waiting_client' && ['done','submitted','in_review'].includes(task.status)) return showToast('This task cannot wait on client from its current state.');
    if(next === 'blocked' && ['done','submitted','in_review'].includes(task.status)) return showToast('This task cannot be blocked from its current state.');
    if(['blocked','waiting_client'].includes(next) && !reason) return showToast(`Add a clear reason before moving this task to ${next.replace('_',' ')}.`);
    if(next === 'blocked') task.blockerNote = reason;
    if(next === 'waiting_client') task.blockerNote = '';
    task.statusReason = ['blocked','waiting_client'].includes(next) ? reason : '';
    task.status = next;
    task.history.unshift({ id: uid('h'), text:`Status changed to ${next.replace('_',' ')}`, at: now() });
    addActivity(`Task ${task.title} moved to ${next.replace('_',' ')}`);
    hideSearchResults();
    persist(); render();
    showToast(`Task moved to ${next.replace('_',' ')}.`);
  }

  function submitTaskReview(taskId){
    if(state.role === 'client') return showToast('Clients cannot submit tasks for review.');
    const task = getTask(taskId);
    if(!task) return;
    const latestDelivery = deliveryVersionsForTask(task.id)[0];
    if(latestDelivery && ['submitted','under_review'].includes(latestDelivery.status)) {
      return showToast('Finish the active review cycle before submitting another delivery.');
    }
    if(['blocked','waiting_client'].includes(task.status)) return showToast('Resolve blocked or waiting-client state before review.');
    if(task.status !== 'in_progress') return showToast('Only in-progress tasks can be submitted for review.');
    if(!deliverableReady(task)) return showToast('Define the deliverable before review.');
    if(!acceptanceCriteriaReady(task)) return showToast('Acceptance criteria is required before submitting review');
    if(!allChecklistDone(task)) return showToast('Complete all checklist items first.');
    if(!task.proofNote.trim()) return showToast('Add completion proof before review.');
    setBusy('Submitting review...');
    task.status = 'submitted';
    const versionLabel = nextDeliveryVersion(task);
    task.history.unshift({ id: uid('h'), text:`Submitted for review (${versionLabel})`, at: now() });
    const delivery = { id: uid('d'), projectId: task.projectId, clientId: task.clientId, taskId: task.id, versionLabel, summary: task.deliverableSummary, status:'submitted', reviewStage:'submitted', createdById: currentUser().id, createdAt: now(), updatedAt: now(), note:'Awaiting reviewer start.', reviewerNote:'', changeSummary:'', internalNote:'', clientVisibleNote:'', decisionAt:'', acceptanceCriteriaSnapshot:[...task.acceptanceCriteria], proofSnapshot:task.proofNote };
    state.deliveries.unshift(delivery);
    state.selectedDeliveryId = delivery.id;
    state.workspace.onboardingDismissed = onboardingComplete();
    state.reviews.unshift({ id: uid('r'), deliveryId: delivery.id, reviewerId:'', reviewerName:'System', status:'submitted', note:'Delivery submitted for review.', reviewerNote:'', changeSummary:'', internalNote:'', clientVisibleNote:'', createdAt: now() });
    addActivity(`Submitted ${task.title} for review (${versionLabel})`);
    hideSearchResults();
    persist(); render(); showToast('Review submitted successfully.');
    clearBusy();
  }

  function setTaskDone(taskId){
    if(state.role === 'client') return showToast('Clients cannot complete tasks.');
    const task = getTask(taskId);
    if(!task) return;
    const delivery = deliveryVersionsForTask(task.id)[0];
    if(!delivery || !['approved','approved_with_notes'].includes(delivery.status)) return showToast('Approved delivery required before completion.');
    task.status = 'done';
    task.history.unshift({ id: uid('h'), text:'Task marked done', at: now() });
    addActivity(`Completed task ${task.title}`);
    hideSearchResults();
    persist(); render(); showToast('Task completed.');
  }

  function reviewDelivery(nextStatus, overrides = {}){
    const delivery = selectedDelivery();
    if(!delivery) return;
    if(!canReviewDelivery(delivery)) return showToast('Only owner or client reviewers can review this delivery, and never the original submitter.');
    if(!canTransitionDelivery(delivery, nextStatus)) {
      return showToast(delivery.status === 'submitted' ? 'Start review before making an approval decision.' : 'This delivery decision is locked. Submit a new revision to continue the workflow.');
    }
    const reviewerNote = String(overrides.reviewerNote ?? document.getElementById('reviewerNote')?.value ?? '').trim();
    const changeSummary = String(overrides.changeSummary ?? document.getElementById('changeSummary')?.value ?? '').trim();
    const internalNote = String(overrides.internalNote ?? document.getElementById('internalNote')?.value ?? '').trim();
    const clientVisibleNote = String(overrides.clientVisibleNote ?? document.getElementById('clientVisibleNote')?.value ?? '').trim();
    const files = attachmentsFor('delivery', delivery.id).length;
    if(nextStatus === 'under_review' && !files) return showToast('Attach files before moving a delivery into review.');
    if(nextStatus === 'under_review' && !reviewerNote) return showToast('Reviewer note is required to start structured review.');
    if((nextStatus === 'approved' || nextStatus === 'approved_with_notes') && !reviewerNote) return showToast('Reviewer note is required before approval.');
    if(nextStatus === 'changes_requested' && !changeSummary) return showToast('Change request summary is required.');
    if(nextStatus === 'changes_requested' && !reviewerNote) return showToast('Reviewer note is required before requesting changes.');
    if((nextStatus === 'approved' || nextStatus === 'approved_with_notes') && !files) return showToast('Approval requires at least one attachment.');
    if(nextStatus === 'changes_requested' && !clientVisibleNote && state.role === 'client') return showToast('Client-visible note is required when requesting changes as client.');
    setBusy(nextStatus === 'under_review' ? 'Saving review...' : 'Saving decision...');
    delivery.status = nextStatus;
    delivery.reviewStage = nextStatus;
    delivery.note = reviewerNote || delivery.note || 'Review updated.';
    delivery.reviewerNote = reviewerNote;
    delivery.changeSummary = changeSummary;
    delivery.internalNote = internalNote;
    delivery.clientVisibleNote = clientVisibleNote;
    delivery.reviewerId = currentUser().id;
    delivery.updatedAt = now();
    delivery.decisionAt = ['approved','approved_with_notes','changes_requested'].includes(nextStatus) ? now() : delivery.decisionAt;
    state.reviews.unshift({ id: uid('r'), deliveryId: delivery.id, reviewerId: currentUser().id, reviewerName:userName(currentUser().id), status: nextStatus, note: delivery.note, reviewerNote, changeSummary, internalNote, clientVisibleNote, createdAt: now() });
    const task = getTask(delivery.taskId);
    if(task){
      state.selectedTaskId = task.id;
      state.selectedProjectId = task.projectId;
      if(nextStatus === 'changes_requested') {
        task.status = 'in_progress';
        task.revisionCount += 1;
        task.statusReason = '';
        task.blockerNote = '';
        task.history.unshift({ id: uid('h'), text:`Review requested changes on ${delivery.versionLabel}: ${changeSummary}`, at: now() });
      }
      if(nextStatus === 'approved' || nextStatus === 'approved_with_notes') {
        task.history.unshift({ id: uid('h'), text:`Review approved ${delivery.versionLabel} (${nextStatus.replace('_',' ')})`, at: now() });
      }
      if(nextStatus === 'under_review') task.status = 'in_review';
    }
    addActivity(`Delivery ${delivery.versionLabel} moved to ${nextStatus.replace('_',' ')}`);
    hideSearchResults();
    persist(); render(); showToast(nextStatus === 'under_review' ? 'Structured review started.' : nextStatus === 'changes_requested' ? 'Changes requested saved.' : 'Delivery approved successfully.');
    clearBusy();
  }


  function triggerAttachmentUpload(){
    if(state.role === 'client') return showToast('Clients cannot add attachments.');
    const delivery = selectedDelivery();
    if(!delivery) return showToast('Open a delivery first.');
    el.fileInput.dataset.entityType = 'delivery';
    el.fileInput.dataset.entityId = delivery.id;
    el.fileInput.click();
    showToast('Choose a file to attach to this delivery.');
  }

  function handleAttachmentSelection(e){
    const file = e.target.files?.[0];
    const entityType = e.target.dataset.entityType;
    const entityId = e.target.dataset.entityId;
    if(!file || !entityType || !entityId) return;
    if(file.size > MAX_ATTACHMENT_BYTES){ e.target.value = ''; return showToast('Attachment is too large. Maximum size is 20 MB.'); }
    if(file.type && !ALLOWED_ATTACHMENT_TYPES.includes(file.type)){ e.target.value = ''; return showToast('Unsupported attachment type.'); }
    if(state.attachments.some(attachment => attachment.entityType === entityType && attachment.entityId === entityId && attachment.name.toLowerCase() === file.name.toLowerCase())) {
      e.target.value = '';
      return showToast('An attachment with this name already exists for the delivery.');
    }
    setBusy('Reading attachment...');
    const reader = new FileReader();
    reader.onload = () => {
      state.attachments.unshift({
        id: uid('f'),
        entityType,
        entityId,
        name: file.name,
        type: file.type || 'file',
        mime: file.type || 'application/octet-stream',
        size: formatFileSize(file.size),
        bytes: file.size,
        dataUrl: String(reader.result || ''),
        createdAt: now()
      });
      hideSearchResults();
      persist();
      render();
      showToast('Attachment added to delivery.');
      clearBusy();
      e.target.value = '';
    };
    reader.onerror = () => {
      clearBusy();
      e.target.value = '';
      showToast('Attachment could not be read.');
    };
    reader.readAsDataURL(file);
  }

  function openAttachment(id){
    const file = state.attachments.find(a => a.id === id);
    if(!file) return showToast('Attachment not found.');
    if(!file.name || !file.bytes) return showToast('This file is empty or incomplete and cannot be opened.');
    if(!file.dataUrl) return showToast('This attachment has no local file data to open.');
    setBusy('Opening file...');
    const blob = dataUrlToBlob(file.dataUrl);
    if(!blob || !blob.size) { clearBusy(); return showToast('This file could not be opened.'); }
    const url = URL.createObjectURL(blob);
    if(/^image\/|^application\/pdf$|^text\/|^application\/json$/i.test(file.mime || '')){
      const popup = window.open(url, '_blank', 'noopener');
      if(popup) {
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        clearBusy();
        return showToast('File opened.');
      }
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    clearBusy();
    showToast('File download started.');
  }

  function removeAttachment(id){
    if(state.role === 'client') return showToast('Clients cannot remove attachments.');
    if(!state.attachments.some(attachment => attachment.id === id)) return showToast('Attachment not found.');
    state.attachments = state.attachments.filter(a => a.id !== id);
    hideSearchResults();
    persist();
    render();
    showToast('File removed successfully.');
  }

  function openSearchResult(kind, id){
    if(kind === 'client'){
      const client = visibleClients().find(x => x.id === id);
      if(client && VIEWS_BY_ROLE[state.role].includes('clients')) return navigate('clients');
      const fallbackProject = visibleProjects().find(p => p.clientId === id);
      if(fallbackProject){ state.selectedProjectId = fallbackProject.id; return navigate('projects'); }
      return showToast('No accessible client result for this role.');
    }
    if(kind === 'project'){
      const project = visibleProjects().find(x => x.id === id);
      if(project){ state.selectedProjectId = id; return navigate('projects'); }
      const task = visibleTasks().find(t => t.projectId === id);
      if(task){ state.selectedTaskId = task.id; return navigate('focus'); }
      return showToast('Project is not accessible in this role.');
    }
    if(kind === 'task'){
      const task = visibleTasks().find(x => x.id === id);
      if(task){ state.selectedTaskId = id; return navigate('focus'); }
      const project = visibleProjects().find(p => p.id === getTask(id)?.projectId);
      if(project){ state.selectedProjectId = project.id; return navigate('projects'); }
      return showToast('Task is not accessible in this role.');
    }
    if(kind === 'delivery'){
      const delivery = visibleDeliveries().find(x => x.id === id);
      if(delivery){ state.selectedDeliveryId = id; return navigate('deliveries'); }
      const task = visibleTasks().find(t => t.id === getDelivery(id)?.taskId);
      if(task){ state.selectedTaskId = task.id; return navigate('focus'); }
      return showToast('Delivery is not accessible in this role.');
    }
    if(kind === 'message'){
      const msg = visibleMessages().find(m => m.id === id);
      if(msg){ state.selectedConversationId = msg.conversationId; return navigate('chat'); }
      const conv = visibleConversations().find(c => c.id === state.messages.find(m => m.id === id)?.conversationId);
      if(conv){ state.selectedConversationId = conv.id; return navigate('chat'); }
      return showToast('Message is not accessible in this role.');
    }
  }

  function editClient(id){
    if(state.role !== 'owner') return showToast('Only owner can edit clients.');
    const client = getClient(id);
    if(!client) return;
    openEntityModal('client', client);
  }

  function editProject(id){
    if(state.role === 'client') return showToast('Clients cannot edit projects.');
    const project = getProject(id);
    if(!project) return;
    openEntityModal('project', project);
  }

  function editTask(id){
    if(state.role === 'client') return showToast('Clients cannot edit tasks.');
    const task = getTask(id);
    if(!task) return;
    openEntityModal('task', task);
  }

  function addChecklistItem(id){
    if(state.role === 'client') return showToast('Clients cannot change checklists.');
    const task = getTask(id);
    if(!task) return;
    openEntityModal('checklist', task);
  }

  function logTaskTime(id){
    if(state.role === 'client') return showToast('Clients cannot log task time.');
    const task = getTask(id);
    if(!task) return;
    openEntityModal('time', task);
  }

  function exportJson(){
    let payload = '';
    try { payload = JSON.stringify(normalizeState(state), null, 2); } catch { return showToast('Workspace export failed.'); }
    setBusy('Preparing workspace export...');
    const blob = new Blob([payload], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'remoteos-workspace.json';
    a.click();
    URL.revokeObjectURL(url);
    hideSearchResults();
    clearBusy();
    showToast('Workspace exported.');
  }

  function firstImportedValue(...values){
    for(const value of values){
      if(value === 0 || value === false) return value;
      if(value == null) continue;
      if(typeof value === 'string' && !value.trim()) continue;
      return value;
    }
    return '';
  }

  function importedArray(source, keys){
    for(const key of keys){
      if(Array.isArray(source?.[key])) return source[key];
    }
    return [];
  }

  function importedObject(source, keys){
    for(const key of keys){
      const value = source?.[key];
      if(value && typeof value === 'object' && !Array.isArray(value)) return value;
    }
    return null;
  }

  function importedLookup(items, fields){
    const lookup = new Map();
    items.forEach(item => {
      fields.forEach(field => {
        const raw = item?.[field];
        const key = String(raw || '').trim().toLowerCase();
        if(key) lookup.set(key, item.id);
      });
    });
    return lookup;
  }

  function importedId(value, lookup){
    const raw = String(value || '').trim();
    if(!raw) return '';
    return lookup.get(raw.toLowerCase()) || raw;
  }

  function importedCriteria(value){
    const raw = Array.isArray(value)
      ? value
      : typeof value === 'string'
        ? value.split(/\r?\n|[;|]/)
        : Array.isArray(value?.items)
          ? value.items
          : [];
    return raw.map(item => String(item || '').trim()).filter(Boolean);
  }

  function importedChecklist(value){
    return normalizeChecklist(value);
  }

  function importedHistory(value){
    if(!Array.isArray(value)) return [];
    return value
      .map(item => {
        if(typeof item === 'string') return { id: uid('h'), text: item.trim(), at: now() };
        if(!item || typeof item !== 'object') return null;
        const text = String(firstImportedValue(item.text, item.note, item.message, item.title)).trim();
        if(!text) return null;
        return { id: String(item.id || uid('h')), text, at: String(firstImportedValue(item.at, item.when, item.createdAt, now())) };
      })
      .filter(Boolean);
  }

  function importedTaskStatus(status){
    const raw = String(status || '').trim().toLowerCase();
    if(['new','todo','backlog'].includes(raw)) return 'new';
    if(['in_progress','progress','active','working'].includes(raw)) return 'in_progress';
    if(['waiting_client','waiting-client','waiting on client','waiting'].includes(raw)) return 'waiting_client';
    if(['blocked','on_hold','on-hold'].includes(raw)) return 'blocked';
    if(['submitted','ready_for_review','ready-for-review','review','in_review','under_review'].includes(raw)) return 'in_review';
    if(['done','approved','complete','completed'].includes(raw)) return 'done';
    return 'new';
  }

  function importedDeliveryStatus(status){
    const raw = String(status || '').trim().toLowerCase();
    if(['approved','done','complete','completed'].includes(raw)) return 'approved';
    if(['changes_requested','changes-requested','revision_requested'].includes(raw)) return 'changes_requested';
    if(['under_review','in_review','reviewing'].includes(raw)) return 'under_review';
    return 'submitted';
  }

  function importedRoot(parsed){
    return importedObject(parsed, ['state','data','workspaceData','snapshot','payload']) || parsed;
  }

  function buildImportedState(parsed){
    const source = importedRoot(parsed);
    const hasWorkspace = Boolean(source?.workspace && typeof source.workspace === 'object' && !Array.isArray(source.workspace));
    const hasTasksArray = Array.isArray(source?.tasks) || Array.isArray(source?.items) || Array.isArray(source?.todos);
    const hasClientsArray = Array.isArray(source?.clients) || Array.isArray(source?.customers) || Array.isArray(source?.accounts);
    if(!source || typeof source !== 'object' || Array.isArray(source)) throw new Error('invalid');
    if(!hasWorkspace || !hasTasksArray || !hasClientsArray) throw new Error('Invalid JSON structure');

    const baseUsers = Array.isArray(source.users) && source.users.length ? source.users : state.users;
    const users = baseUsers
      .filter(user => user && typeof user === 'object')
      .map((user, index) => ({
        ...user,
        id: String(firstImportedValue(user.id, uid('u'))),
        name: String(firstImportedValue(user.name, user.fullName, `User ${index + 1}`)).trim(),
        role: ['owner','worker','client'].includes(String(firstImportedValue(user.role, user.type, 'worker')).trim().toLowerCase()) ? String(firstImportedValue(user.role, user.type, 'worker')).trim().toLowerCase() : 'worker',
        clientId: firstImportedValue(user.clientId, user.client_id, user.accountId, '') || null
      }));
    if(!users.some(user => user.role === 'owner') && users[0]) users[0].role = 'owner';
    const operators = users.filter(user => user.role !== 'client');
    const fallbackAssigneeId = operators[0]?.id || users[0]?.id || cloneInitial().users[0].id;

    const rawClients = importedArray(source, ['clients','customers','accounts']);
    const clients = rawClients
      .filter(client => client && typeof client === 'object')
      .map((client, index) => ({
        id: String(firstImportedValue(client.id, client.clientId, client.client_id, uid('c'))),
        name: String(firstImportedValue(client.name, client.title, client.contactName, client.company, `Client ${index + 1}`)).trim(),
        company: String(firstImportedValue(client.company, client.business, client.name, '')).trim(),
        email: String(firstImportedValue(client.email, client.mail, '')).trim(),
        phone: String(firstImportedValue(client.phone, client.mobile, client.telephone, '')).trim(),
        status: String(firstImportedValue(client.status, 'active')).trim() || 'active',
        notes: String(firstImportedValue(client.notes, client.note, client.description, '')).trim()
      }));
    const clientLookup = importedLookup(clients, ['id','name','company','email']);

    const rawProjects = importedArray(source, ['projects','jobs']);
    const projects = rawProjects
      .filter(project => project && typeof project === 'object')
      .map((project, index) => {
        const clientId = importedId(firstImportedValue(project.clientId, project.client_id, project.client?.id, project.client, clients[0]?.id), clientLookup);
        const rawMembers = Array.isArray(project.members) ? project.members : Array.isArray(project.memberIds) ? project.memberIds : [];
        const members = rawMembers.length
          ? rawMembers
              .map(member => importedId(typeof member === 'object' ? member.id : member, importedLookup(users, ['id','name'])))
              .filter(memberId => users.some(user => user.id === memberId))
          : operators.map(user => user.id);
        return {
          id: String(firstImportedValue(project.id, project.projectId, project.project_id, uid('p'))),
          clientId,
          title: String(firstImportedValue(project.title, project.name, `Project ${index + 1}`)).trim(),
          description: String(firstImportedValue(project.description, project.summary, project.note, '')).trim(),
          status: String(firstImportedValue(project.status, 'active')).trim() || 'active',
          priority: String(firstImportedValue(project.priority, 'normal')).trim() || 'normal',
          dueAt: String(firstImportedValue(project.dueAt, project.due_date, project.deadline, '')).trim(),
          members: members.length ? members : operators.map(user => user.id)
        };
      })
      .filter(project => project.clientId && clients.some(client => client.id === project.clientId));
    const projectLookup = importedLookup(projects, ['id','title']);
    const userLookup = importedLookup(users, ['id','name']);

    const rawTasks = importedArray(source, ['tasks','items','todos']);
    const tasks = rawTasks
      .filter(task => task && typeof task === 'object')
      .map((task, index) => {
        const projectId = importedId(firstImportedValue(task.projectId, task.project_id, task.project?.id, task.project, projects[0]?.id), projectLookup);
        const project = projects.find(item => item.id === projectId);
        const clientId = importedId(firstImportedValue(task.clientId, task.client_id, task.client?.id, task.client, project?.clientId, clients[0]?.id), clientLookup);
        const assigneeId = importedId(firstImportedValue(task.assigneeId, task.assignee_id, task.assignee?.id, task.assignee, fallbackAssigneeId), userLookup) || fallbackAssigneeId;
        const acceptanceCriteria = importedCriteria(firstImportedValue(task.acceptanceCriteria, task.criteria, task.acceptance, task.requirements));
        return {
          id: String(firstImportedValue(task.id, task.taskId, task.task_id, uid('t'))),
          projectId,
          clientId,
          assigneeId,
          title: String(firstImportedValue(task.title, task.name, `Task ${index + 1}`)).trim(),
          description: String(firstImportedValue(task.description, task.summary, task.note, '')).trim(),
          status: importedTaskStatus(firstImportedValue(task.status, task.stage, task.workflowState)),
          priority: String(firstImportedValue(task.priority, 'normal')).trim() || 'normal',
          dueAt: String(firstImportedValue(task.dueAt, task.due_date, task.deadline, project?.dueAt, '')).trim(),
          nextAction: String(firstImportedValue(task.nextAction, task.next_action, task.nextStep, 'Continue work')).trim(),
          blockerNote: String(firstImportedValue(task.blockerNote, task.blocker, '')).trim(),
          statusReason: String(firstImportedValue(task.statusReason, task.reason, task.waitReason, '')).trim(),
          deliverableSummary: String(firstImportedValue(task.deliverableSummary, task.deliverable, task.outcome, task.summary, task.title, '')).trim(),
          acceptanceCriteria,
          estimatedMinutes: Number(firstImportedValue(task.estimatedMinutes, task.estimate, 60)) || 60,
          actualMinutes: Number(firstImportedValue(task.actualMinutes, task.loggedMinutes, task.actual, 0)) || 0,
          proofNote: String(firstImportedValue(task.proofNote, task.proof, task.completionProof, '')).trim(),
          revisionCount: Number(firstImportedValue(task.revisionCount, task.revisions, 0)) || 0,
          checklist: importedChecklist(task.checklist),
          history: importedHistory(firstImportedValue(task.history, task.timeline, []))
        };
      })
      .filter(task => task.projectId && task.clientId && task.assigneeId)
      .filter(task => projects.some(project => project.id === task.projectId) && clients.some(client => client.id === task.clientId) && users.some(user => user.id === task.assigneeId));
    const taskLookup = importedLookup(tasks, ['id','title']);

    const rawDeliveries = importedArray(source, ['deliveries','submissions']);
    const deliveries = rawDeliveries
      .filter(delivery => delivery && typeof delivery === 'object')
      .map((delivery, index) => {
        const taskId = importedId(firstImportedValue(delivery.taskId, delivery.task_id, delivery.task?.id, delivery.task, tasks[0]?.id), taskLookup);
        const task = tasks.find(item => item.id === taskId);
        return {
          id: String(firstImportedValue(delivery.id, delivery.deliveryId, delivery.delivery_id, uid('d'))),
          projectId: task?.projectId || '',
          clientId: task?.clientId || '',
          taskId,
          versionLabel: String(firstImportedValue(delivery.versionLabel, delivery.version, `v${index + 1}.0`)).trim(),
          summary: String(firstImportedValue(delivery.summary, delivery.deliverableSummary, task?.deliverableSummary, '')).trim(),
          status: importedDeliveryStatus(firstImportedValue(delivery.status, delivery.reviewStage, 'submitted')),
          reviewStage: importedDeliveryStatus(firstImportedValue(delivery.reviewStage, delivery.status, 'submitted')),
          createdById: importedId(firstImportedValue(delivery.createdById, delivery.created_by, delivery.authorId, fallbackAssigneeId), userLookup) || fallbackAssigneeId,
          createdAt: String(firstImportedValue(delivery.createdAt, delivery.created_at, now())),
          updatedAt: String(firstImportedValue(delivery.updatedAt, delivery.updated_at, delivery.createdAt, now())),
          note: String(firstImportedValue(delivery.note, '')).trim(),
          reviewerNote: String(firstImportedValue(delivery.reviewerNote, delivery.reviewNote, '')).trim(),
          changeSummary: String(firstImportedValue(delivery.changeSummary, delivery.changes, '')).trim(),
          internalNote: String(firstImportedValue(delivery.internalNote, '')).trim(),
          clientVisibleNote: String(firstImportedValue(delivery.clientVisibleNote, '')).trim(),
          decisionAt: String(firstImportedValue(delivery.decisionAt, delivery.decision_at, '')).trim(),
          acceptanceCriteriaSnapshot: importedCriteria(firstImportedValue(delivery.acceptanceCriteriaSnapshot, delivery.acceptanceCriteria, task?.acceptanceCriteria, [])),
          proofSnapshot: String(firstImportedValue(delivery.proofSnapshot, delivery.proof, task?.proofNote, '')).trim()
        };
      })
      .filter(delivery => delivery.taskId && tasks.some(task => task.id === delivery.taskId));
    const deliveryLookup = importedLookup(deliveries, ['id','versionLabel']);

    const reviews = importedArray(source, ['reviews'])
      .filter(review => review && typeof review === 'object')
      .map(review => ({
        id: String(firstImportedValue(review.id, review.reviewId, review.review_id, uid('r'))),
        deliveryId: importedId(firstImportedValue(review.deliveryId, review.delivery_id, review.delivery?.id, review.delivery), deliveryLookup),
        reviewerId: importedId(firstImportedValue(review.reviewerId, review.reviewer_id, review.reviewer?.id, fallbackAssigneeId), userLookup) || fallbackAssigneeId,
        reviewerName: String(firstImportedValue(review.reviewerName, review.reviewer?.name, userNameSafe(users, importedId(firstImportedValue(review.reviewerId, review.reviewer_id, review.reviewer?.id, fallbackAssigneeId), userLookup) || fallbackAssigneeId))).trim(),
        status: importedDeliveryStatus(firstImportedValue(review.status, 'submitted')),
        note: String(firstImportedValue(review.note, review.reviewerNote, '')).trim(),
        reviewerNote: String(firstImportedValue(review.reviewerNote, review.note, '')).trim(),
        changeSummary: String(firstImportedValue(review.changeSummary, review.changes, '')).trim(),
        internalNote: String(firstImportedValue(review.internalNote, '')).trim(),
        clientVisibleNote: String(firstImportedValue(review.clientVisibleNote, '')).trim(),
        createdAt: String(firstImportedValue(review.createdAt, review.created_at, now())).trim()
      }))
      .filter(review => deliveries.some(delivery => delivery.id === review.deliveryId));

    const attachments = importedArray(source, ['attachments','files'])
      .filter(file => file && typeof file === 'object')
      .map(file => ({
        ...file,
        id: String(firstImportedValue(file.id, file.fileId, file.file_id, uid('f'))),
        entityType: String(firstImportedValue(file.entityType, file.type === 'delivery' ? 'delivery' : file.entityType, 'delivery')).trim(),
        entityId: importedId(firstImportedValue(file.entityId, file.deliveryId, file.delivery_id, file.delivery?.id), deliveryLookup),
        name: String(firstImportedValue(file.name, file.filename, 'attachment')).trim()
      }))
      .filter(file => file.entityType === 'delivery' && deliveries.some(delivery => delivery.id === file.entityId));

    const conversations = importedArray(source, ['conversations','threads']).filter(item => item && typeof item === 'object');
    const messages = importedArray(source, ['messages','comments']).filter(item => item && typeof item === 'object');
    const activity = importedArray(source, ['activity','timeline']).filter(item => item && typeof item === 'object');

    if(!clients.length && !projects.length && !tasks.length && !deliveries.length) throw new Error('invalid');

    return {
      workspace: { ...state.workspace, ...(importedObject(source, ['workspace','settings']) || {}) },
      role: state.role,
      currentView: state.currentView,
      users,
      clients,
      projects,
      tasks,
      conversations,
      messages,
      deliveries,
      reviews,
      attachments,
      activity
    };
  }

  function importJson(e){
    const file = e.target.files?.[0];
    if(!file) return;
    if(file.size > MAX_IMPORT_BYTES){ e.target.value = ''; return showToast('Import file is too large. Maximum size is 2 MB.'); }
    if(file.type && file.type !== 'application/json' && !file.name.toLowerCase().endsWith('.json')){ e.target.value = ''; return showToast('Import a valid JSON file.'); }
    setBusy('Importing workspace snapshot...');
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const imported = buildImportedState(parsed);
        state = normalizeState(imported);
        syncSelectedEntities();
        hideSearchResults();
        persist();
        render();
        showToast('Workspace imported.');
      } catch {
        showToast('Invalid JSON file.');
      }
      clearBusy();
      e.target.value = '';
    };
    reader.onerror = () => {
      clearBusy();
      e.target.value = '';
      showToast('Import failed while reading the file.');
    };
    reader.readAsText(file);
  }

  function runSearch(){
    const q = el.searchInput.value.trim().toLowerCase();
    if(!q){ el.searchResults.classList.add('hidden'); el.searchResults.innerHTML = ''; return; }
    const buckets = {
      Clients: visibleClients().filter(x => `${x.name} ${x.company}`.toLowerCase().includes(q)).map(x => ({ id:x.id, label:x.name, meta:x.company, kind:'client' })),
      Projects: visibleProjects().filter(x => `${x.title} ${x.description}`.toLowerCase().includes(q)).map(x => ({ id:x.id, label:x.title, meta:x.description, kind:'project' })),
      Tasks: visibleTasks().filter(x => `${x.title} ${x.description} ${x.nextAction}`.toLowerCase().includes(q)).map(x => ({ id:x.id, label:x.title, meta:x.nextAction, kind:'task' })),
      Deliveries: visibleDeliveries().filter(x => `${x.versionLabel} ${x.summary} ${x.status}`.toLowerCase().includes(q)).map(x => ({ id:x.id, label:x.versionLabel, meta:x.summary, kind:'delivery' })),
      Messages: visibleMessages().filter(x => x.body.toLowerCase().includes(q)).map(x => ({ id:x.id, label:x.body, meta:userName(x.senderId), kind:'message' }))
    };
    el.searchResults.classList.remove('hidden');
    el.searchResults.innerHTML = `<div class="search-grid">${Object.entries(buckets).map(([label, items]) => `<div class="panel compact-panel"><h4>${esc(label)}</h4>${(items.slice(0,4).map(i => `<button class="result-item result-button" data-action="search-open" data-kind="${i.kind}" data-id="${i.id}"><strong>${esc(i.label)}</strong><span>${esc(i.meta || '')}</span></button>`).join('') || '<div class="result-item">No matches</div>')}</div>`).join('')}</div>`;
  }

  function navigate(view){
    if(!VIEW_META[view] || !VIEWS_BY_ROLE[state.role].includes(view)) return;
    state.currentView = view;
    hideSearchResults();
    syncViewHash(view, 'push');
    persist();
    render();
  }

  function syncViewHash(view, mode = 'replace'){
    if(!view || location.hash.replace('#','') === view) return;
    if(location.protocol === 'file:') return;
    const nextUrl = `${location.pathname}${location.search}#${view}`;
    if(window.history){
      try {
        if(mode === 'push' && typeof window.history.pushState === 'function') {
          window.history.pushState(null, '', nextUrl);
          return;
        }
        if(typeof window.history.replaceState === 'function') {
          window.history.replaceState(null, '', nextUrl);
          return;
        }
      } catch {}
    }
      return;
  }
  function render(){
    syncSelectedEntities();
    syncViewHash(state.currentView, 'replace');
    document.body.dataset.theme = state.workspace.appearance;
    document.body.dataset.density = state.workspace.density;
    renderNav();
    renderHeader();
    renderView();
    document.querySelectorAll('button:not([type])').forEach(button => { button.type = 'button'; });
    requestAnimationFrame(() => {
      document.querySelector('.main')?.scrollTo(0,0);
      window.scrollTo(0,0);
    });
  }

  function renderNav(){
    el.nav.innerHTML = VIEWS_BY_ROLE[state.role].map(view => {
      const icon = {dashboard:'◉',clients:'◎',projects:'▣',tasks:'☑',focus:'◌',chat:'✉',deliveries:'⬒',reports:'◫',settings:'⚙'}[view] || '•';
      return `<button class="nav-btn ${state.currentView === view ? 'active' : ''}" data-view="${view}"><span class="nav-icon">${icon}</span><span>${esc(VIEW_META[view][0])}</span></button>`;
    }).join('');
    const me = currentUser();
    el.profileName.textContent = me.name;
    el.profileRole.textContent = me.role.charAt(0).toUpperCase() + me.role.slice(1);
    document.querySelectorAll('.role-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.role === state.role));
  }

  function renderHeader(){
    const [title, subtitle] = VIEW_META[state.currentView];
    el.title.textContent = title;
    el.subtitle.textContent = subtitle;
  }

  function renderView(){
    const renderers = { dashboard: renderDashboard, clients: renderClients, projects: renderProjects, tasks: renderTasks, focus: renderFocus, chat: renderChat, deliveries: renderDeliveries, reports: renderReports, settings: renderSettings };
    try {
      const viewHtml = renderers[state.currentView]();
      const busyHtml = uiState.busy ? `<section class="panel" style="margin-bottom:16px"><div class="panel-body"><div class="info-band"><strong>Working:</strong> ${esc(uiState.busy)}</div></div></section>` : '';
      el.root.innerHTML = `${busyHtml}${renderOnboardingOverlay()}${viewHtml}`;
    } catch (error) {
      el.root.innerHTML = `<section class="panel"><div class="panel-body"><div class="empty-state"><h3>Something went wrong</h3><p>This view failed to render. Reset the workspace or import a clean backup.</p></div></div></section>`;
    }
  }

  function renderDashboard(){
    const tasks = visibleTasks();
    const deliveries = visibleDeliveries();
    const projects = visibleProjects();
    const clients = visibleClients();
    const focusTask = tasks.find(t => ['blocked','submitted','in_review','waiting_client','in_progress','new'].includes(t.status)) || tasks[0] || null;
    const riskQueue = tasks.filter(t => ['blocked','waiting_client','submitted','in_review'].includes(t.status) || overdueTasks().some(x => x.id === t.id)).slice(0,5);
    const pressure = pressureSummary();
    const primaryAction = focusTask ? focusPrimaryAction(focusTask) : projects.length ? { label:'Open task board', view:'tasks' } : state.role === 'owner' ? { label:'Add client record', view:'clients' } : { label:'Open projects', view:'projects' };
    const emptyWorkspace = !clients.length && !projects.length && !tasks.length && !deliveries.length;
    return `
      ${emptyWorkspace ? `<section class="panel" style="margin-bottom:16px"><div class="panel-body">${emptyBlock('Start by adding a client, then create a project and task.', state.role === 'owner' ? { label:'Add client', view:'clients' } : { label:'Open projects', view:'projects' })}<div class="inline-actions" style="justify-content:center;margin-top:12px">${state.role === 'owner' ? actionButton({ label:'Create project', view:'projects', secondary:true }) : ''}</div></div></section>` : ''}
      <section class="hero-grid">
        <div class="hero-card panel">
          <div class="panel-body">
            <span class="eyebrow">Execution health</span>
            <h3>${healthScore()} / 100</h3>
            <p>${healthLabel(healthScore())}</p>
            <div class="kpi-strip">
              <div class="kpi"><strong>${projects.length}</strong><span>Projects</span></div>
              <div class="kpi"><strong>${tasks.filter(t => t.status !== 'done').length}</strong><span>Open tasks</span></div>
              <div class="kpi"><strong>${deliveries.filter(d => ['submitted','under_review','changes_requested'].includes(d.status)).length}</strong><span>Review load</span></div>
              <div class="kpi"><strong>${pressure.overdue}</strong><span>Overdue</span></div>
            </div>
          </div>
        </div>
        <div class="smart-card panel">
          <div class="panel-body">
            <span class="eyebrow">Action required now</span>
            <h3>${pressure.total ? `${pressure.total} pressure signal${pressure.total > 1 ? 's' : ''}` : 'Pipeline is clear'}</h3>
            <p>${pressure.total ? 'Blocked work, waiting client replies, overdue tasks, or review pressure need attention now.' : 'No urgent friction detected across the visible workspace.'}</p>
            <div class="badges urgency-row">
              <span class="badge ${pressure.blocked ? 'tone-red pulse' : 'tone-blue'}">Blocked ${pressure.blocked}</span>
              <span class="badge ${pressure.waiting ? 'tone-orange pulse' : 'tone-blue'}">Waiting client ${pressure.waiting}</span>
              <span class="badge ${pressure.review ? 'tone-gold pulse' : 'tone-blue'}">Review ${pressure.review}</span>
              <span class="badge ${pressure.waitingDelayed ? 'tone-orange pulse' : 'tone-blue'}">Client delay ${pressure.waitingDelayed}</span>
              <span class="badge ${pressure.overdue ? 'tone-red pulse' : 'tone-blue'}">Overdue ${pressure.overdue}</span>
            </div>
            ${actionBand(systemNextAction(), primaryAction, { label:'Open task board', view:'tasks', secondary:true })}
          </div>
        </div>
      </section>

      <section class="panel" style="margin-bottom:16px"><div class="panel-head"><div><span class="eyebrow">Operating sequence</span><h3>Workspace setup flow</h3><p>Create a clear path from client intake to approved delivery.</p></div></div><div class="panel-body stack"><div class="grid-columns"><div class="mini-card"><strong>1. Add client</strong><span>Create the organization record first.</span></div><div class="mini-card"><strong>2. Create project</strong><span>Set due date, priority, and owner.</span></div><div class="mini-card"><strong>3. Create task</strong><span>Define next action and checklist.</span></div><div class="mini-card"><strong>4. Save proof</strong><span>Document completion before review.</span></div><div class="mini-card"><strong>5. Submit review</strong><span>Create a versioned delivery record.</span></div></div></div></section>

      <section class="dashboard-grid">
        <section class="panel">
          <div class="panel-head"><div><span class="eyebrow">Priority queue</span><h3>Operations queue</h3><p>Direct view of what needs action, review, or escalation.</p></div></div>
          <div class="panel-body stack">${tasks.slice(0,4).map(taskCardCompact).join('') || emptyBlock('No visible tasks yet. Create a task or switch to a role with active work.')}</div>
        </section>
        <section class="panel">
          <div class="panel-head"><div><span class="eyebrow">Smart next move</span><h3>Action guide</h3><p>System-generated guidance to keep execution moving.</p></div></div>
          <div class="panel-body stack">${focusTask ? `<div class="decision-card"><div><h4>${esc(focusTask.title)}</h4><p>${esc(smartSuggestion(focusTask))}</p><div class="badges">${badge(focusTask.status, urgencyTone(focusTask))} ${badge(focusTask.priority)}</div></div><div class="inline-actions"><button class="primary-btn" data-taskid="${focusTask.id}" data-action="open-focus">Open focus mode</button><button class="ghost-btn" data-action="open-task-modal" data-id="${focusTask.id}">Open task</button></div></div>` : emptyBlock('Select or create a task to generate the next recommended action.')}</div>
        </section>
      </section>

      <section class="dashboard-grid lower-grid">
        <section class="panel">
          <div class="panel-head"><div><span class="eyebrow">Risk monitor</span><h3>Pressure board</h3><p>Items slowing delivery quality or approval speed.</p></div></div>
          <div class="panel-body stack">${riskQueue.map(task => `<div class="risk-row danger-${urgencyTone(task).replace('tone-','')}"><div><h4>${esc(task.title)}</h4><p>${esc(smartSuggestion(task))}</p></div><div class="badges">${badge(overdueTasks().some(x => x.id===task.id) ? 'overdue' : task.status, urgencyTone(task))} ${badge(task.priority)}</div></div>`).join('') || emptyBlock('No critical risks right now.')}</div>
        </section>
        <section class="panel">
          <div class="panel-head"><div><span class="eyebrow">Recent activity</span><h3>Last updates</h3><p>Action log across work, reviews, and communication.</p></div></div>
          <div class="panel-body stack">${state.activity.slice(0,6).map(item => `<div class="activity-row"><strong>${esc(userName(item.actorId))}</strong><span>${esc(item.text)}</span><small>${esc(item.when)}</small></div>`).join('')}</div>
        </section>
      </section>`;
  }

  function renderClients(){
    const clients = visibleClients();
    const clientProjects = visibleProjects();
    const primaryAction = state.role === 'owner' ? { label:'Add client record', action:'focus-form', target:'clientForm' } : (clientProjects[0] ? { label:'Open active project', action:'open-project', projectId:clientProjects[0].id } : { label:'Open dashboard', view:'dashboard' });
    return `
      <section class="content-grid two-col">
        <section class="panel">
          <div class="panel-head"><div><span class="eyebrow">Relationship book</span><h3>Client records</h3><p>Client status, contact details, and linked project count.</p></div></div>
          <div class="panel-body stack">
            ${actionBand('Keep client records complete so every project and approval path stays tied to a real account owner.', primaryAction)}
            ${clients.map(client => {
              const linkedProject = clientProjects.find(project => project.clientId === client.id);
              return `<div class="entity-row"><div><h4>${esc(client.name)}</h4><p>${esc(client.company)} · ${esc(client.email)} · ${esc(client.phone)}</p><div class="badges">${badge(client.status)} <span class="muted-chip">${state.projects.filter(p => p.clientId === client.id).length} projects</span></div></div><div class="inline-actions compact-actions">${state.role === 'owner' ? `<button class="ghost-btn" data-action="edit-client" data-id="${client.id}">Edit</button>` : ''}${linkedProject ? `<button class="ghost-btn" data-action="open-project" data-id="${linkedProject.id}">Open project</button>` : ''}</div></div>`;
            }).join('') || emptyBlock('No clients yet. Add your first client.', state.role === 'owner' ? { label:'Add your first client', action:'focus-form', target:'clientForm' } : { label:'Open dashboard', view:'dashboard' })}
          </div>
        </section>
        <section class="panel">
          <div class="panel-head"><div><span class="eyebrow">Quick create</span><h3>Add client</h3><p>Owner-only workflow for new client onboarding.</p></div>${state.role !== 'owner' ? badge('Owner only') : ''}</div>
          <div class="panel-body">
            ${state.role === 'owner' ? `
            <form id="clientForm" class="form-stack" novalidate>
              <input class="field" name="name" placeholder="Client name">
              <input class="field" name="company" placeholder="Company">
              <input class="field" name="email" type="email" placeholder="Email">
              <input class="field" name="phone" placeholder="Phone">
              <textarea class="area" name="notes" placeholder="Notes"></textarea>
              <button class="primary-btn" type="submit">Create client</button>
            </form>` : emptyBlock('Switch to owner role to create or edit clients.', { label:'Open dashboard', view:'dashboard' })}
          </div>
        </section>
      </section>`;
  }

  function renderProjects(){
    const project = selectedProject();
    if(!project){
      return `
        <section class="panel"><div class="panel-body">${emptyBlock(state.role === 'owner' ? 'Create your first project to turn client work into an active workspace.' : 'No project available for this role.', state.role === 'owner' ? (state.clients.length ? { label:'Create your first project', action:'focus-form', target:'projectForm' } : { label:'Add client first', view:'clients' }) : { label:'Open dashboard', view:'dashboard' })}</div></section>
        ${state.role === 'owner' ? `<section class="panel" style="margin-top:16px"><div class="panel-head"><div><span class="eyebrow">Quick create</span><h3>Add project</h3><p>Create a new workspace with due date and priority.</p></div></div><div class="panel-body">${state.clients.length ? `<form id="projectForm" class="compact-form"><input class="field" name="title" placeholder="Project title" required><select class="select" name="clientId">${state.clients.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select><select class="select" name="priority"><option>normal</option><option>high</option><option>urgent</option></select><input class="field" type="date" name="dueAt" required><input class="field" name="description" placeholder="Description" required><button class="primary-btn" type="submit">Create project</button></form>` : emptyBlock('Create a client first to unlock project creation.', { label:'Add client', view:'clients' })}</div></section>` : ''}`;
    }
    const client = getClient(project.clientId);
    const tasks = projectTasks(project.id);
    const deliveries = projectDeliveries(project.id);
    const primaryAction = projectPrimaryAction(project);
    return `
      <section class="workspace-grid">
        <aside class="panel side-panel">
          <div class="panel-head"><div><span class="eyebrow">Portfolio</span><h3>Projects</h3><p>Choose a workspace.</p></div></div>
          <div class="panel-body stack">${visibleProjects().map(p => `<button class="list-button ${p.id===project.id?'active':''}" data-projectid="${p.id}"><strong>${esc(p.title)}</strong><span>${esc(getClient(p.clientId)?.name || '')}</span><span class="badges">${badge(p.status)} ${badge(p.priority)}</span></button>`).join('')}</div>
        </aside>
        <section class="panel main-panel">
          <div class="panel-body project-hero">
            <div>
              <span class="eyebrow">Project cockpit</span>
              <h3>${esc(project.title)}</h3>
              <p>${esc(project.description)}</p>
              <div class="badges">${badge(client?.name || 'Unknown client')} ${badge(project.status)} ${badge(project.priority)}</div>
            </div>
            <div class="kpi-strip project-kpis">
              <div class="kpi"><strong>${tasks.filter(t => t.status !== 'done').length}</strong><span>Open tasks</span></div>
              <div class="kpi"><strong>${tasks.filter(t => ['submitted','in_review'].includes(t.status)).length}</strong><span>Review</span></div>
              <div class="kpi"><strong>${tasks.filter(t => t.status === 'waiting_client').length}</strong><span>Client wait</span></div>
              <div class="kpi"><strong>${deliveries.length}</strong><span>Deliveries</span></div>
            </div>
          </div>
          <div class="panel-body stack border-top">
${actionBand(tasks.length ? nextRequiredMove(tasks.find(t => ['blocked','waiting_client','submitted','in_review','in_progress','new'].includes(t.status)) || tasks[0]) : 'Create the first deliverable-producing task for this project.', primaryAction, state.role !== 'client' ? { label:'Edit project', action:'edit-project', id:project.id, secondary:true } : deliveries[0] ? { label:'Open deliveries', action:'open-delivery', deliveryId:deliveries[0].id, secondary:true } : null)}
            ${tasks.map(taskCardWide).join('') || emptyBlock('No tasks linked to this project. Start by creating a task.', state.role !== 'client' ? { label:'Create your first task', view:'tasks' } : { label:'Open deliveries', view:'deliveries' })}
          </div>
        </section>
        <aside class="panel side-panel">
          <div class="panel-head"><div><span class="eyebrow">Workspace signals</span><h3>Right rail</h3><p>Messages, risks, and due date.</p></div></div>
          <div class="panel-body stack">
            <div class="mini-card"><strong>Due date</strong><span>${esc(project.dueAt)}</span></div>
            <div class="mini-card"><strong>Risk queue</strong><span>${tasks.filter(t => ['blocked','waiting_client','submitted','in_review'].includes(t.status)).length} items</span></div>
            <div class="mini-card"><strong>Recent messages</strong><span>${projectConversationMessages(project.id).slice(-2).map(m => esc(m.body)).join(' · ') || 'No recent messages'}</span></div>
            <div class="mini-card"><strong>Client</strong><span>${esc(client?.company || '')}</span></div>
          </div>
        </aside>
      </section>

      ${state.role === 'owner' ? `<section class="panel" style="margin-top:16px"><div class="panel-head"><div><span class="eyebrow">Quick create</span><h3>Add project</h3><p>Create a new workspace with due date and priority.</p></div></div><div class="panel-body"><form id="projectForm" class="compact-form"><input class="field" name="title" placeholder="Project title" required><select class="select" name="clientId">${state.clients.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select><select class="select" name="priority"><option>normal</option><option>high</option><option>urgent</option></select><input class="field" type="date" name="dueAt" required><input class="field" name="description" placeholder="Description" required><button class="primary-btn" type="submit">Create project</button></form></div></section>`:''}`;
  }

  function renderTasks(){
    const tasks = visibleTasks();
    const assignableUsers = workspaceOperators();
    const availableProjects = visibleProjects();
    const primaryAction = tasks.length ? tasksPrimaryAction(tasks) : state.role === 'client' ? { label:'Open projects', view:'projects' } : availableProjects.length ? { label:'Create task', action:'focus-form', target:'taskForm' } : { label:'Create project', view:'projects' };
    const focusTask = tasks.find(task => task.status !== 'done') || tasks[0] || null;
    const boardStatuses = ['in_progress','waiting_client','in_review','done'];
    return `
      <section class="tasks-page">
        <section class="panel tasks-board-panel">
          <div class="panel-head"><div><span class="eyebrow">Execution board</span><h3>Tasks</h3><p>Hard transitions, next action, and proof-first review pipeline.</p></div></div>
          <div class="panel-body">
            ${actionBand(tasks.length ? systemNextAction() : 'Create a task with a deliverable, acceptance criteria, and proof path.', primaryAction, availableProjects.length ? { label:'Open projects', view:'projects', secondary:true } : null)}
            <section class="kanban-board">
              ${boardStatuses.map(status => {
                const boardTasks = boardTasksForStatus(status);
                const label = status === 'in_progress' ? 'In Progress' : status === 'waiting_client' ? 'Waiting Client' : status === 'in_review' ? 'In Review' : 'Done';
                return `<div class="kanban-column"><div class="kanban-column-head"><div><strong>${esc(label)}</strong><p>${esc(boardColumnSummary(status, boardTasks.length))}</p></div><span class="muted-chip">${boardTasks.length}</span></div><div class="kanban-dropzone" data-dropstatus="${status}">${boardTasks.map(kanbanTaskCard).join('') || `<div class="kanban-empty">No tasks in this lane.</div>`}</div></div>`;
              }).join('')}
            </section>
          </div>
        </section>
        <section class="tasks-support-grid">
          <section class="panel tasks-summary-panel">
            <div class="panel-head"><div><span class="eyebrow">Execution snapshot</span><h3>Board signals</h3><p>Keep scan-friendly context visible without repeating the full task list.</p></div></div>
            <div class="panel-body stack">
              <div class="grid-columns">
                <div class="mini-card"><strong>${tasks.filter(task => task.status !== 'done').length}</strong><span>Open tasks</span></div>
                <div class="mini-card"><strong>${tasks.filter(task => task.status === 'waiting_client').length}</strong><span>Waiting client</span></div>
                <div class="mini-card"><strong>${tasks.filter(task => ['submitted','in_review'].includes(task.status)).length}</strong><span>In review</span></div>
                <div class="mini-card"><strong>${tasks.filter(task => task.status === 'done').length}</strong><span>Completed</span></div>
              </div>
              ${focusTask ? `<div class="decision-card task-spotlight"><div><h4>${esc(focusTask.title)}</h4><p>${esc(nextRequiredMove(focusTask))}</p><div class="badges">${badge(focusTask.status, urgencyTone(focusTask))} ${badge(focusTask.priority)}</div></div><div class="inline-actions">${actionButton({ ...focusPrimaryAction(focusTask), label: taskPrimaryLabel(focusTask) })}<button class="ghost-btn" data-action="open-task-modal" data-id="${focusTask.id}">Open</button></div></div>` : emptyBlock('Start by creating a task.', state.role === 'client' ? { label:'Open projects', view:'projects' } : availableProjects.length ? { label:'Create your first task', action:'focus-form', target:'taskForm' } : { label:'Create project first', view:'projects' })}
            </div>
          </section>
          <section class="panel task-create-panel">
            <div class="panel-head"><div><span class="eyebrow">Quick create</span><h3>Add task</h3><p>Create a new execution item without pulling focus away from the board.</p></div>${state.role==='client'?badge('Client locked'):''}</div>
            <div class="panel-body">${state.role === 'client' ? emptyBlock('Clients can review work, not create tasks.', { label:'Open deliveries', view:'deliveries' }) : !availableProjects.length ? emptyBlock('Create a project first to unlock task creation.', { label:'Create your first project', view:'projects' }) : !assignableUsers.length ? emptyBlock('Add a non-client user before assigning tasks.') : `<form id="taskForm" class="form-stack task-create-form"><select class="select" name="projectId">${availableProjects.map(p => `<option value="${p.id}">${esc(p.title)}</option>`).join('')}</select><input class="field" name="title" placeholder="Task title" required><textarea class="area" name="description" placeholder="Description" required></textarea><textarea class="area" name="deliverableSummary" placeholder="Deliverable outcome this task must produce" required></textarea><textarea class="area" name="acceptanceCriteria" placeholder="Acceptance criteria, one per line" required></textarea><select class="select" name="assigneeId">${assignableUsers.map(user => `<option value="${user.id}">${esc(user.name)}</option>`).join('')}</select><div class="task-create-meta"><select class="select" name="priority"><option>normal</option><option>high</option><option>urgent</option></select><input class="field" type="date" name="dueAt" required><input class="field" type="number" name="estimatedMinutes" min="15" step="15" value="60"></div><input class="field" name="nextAction" placeholder="Next action" required><button class="primary-btn" type="submit">Create task</button></form>`}</div>
          </section>
        </section>
      </section>`;
  }

  function renderFocus(){
    const task = selectedTask();
    if(!task) return `<section class="panel"><div class="panel-body">${emptyBlock('Select a task from Projects or Tasks.', { label:'Open task board', view:'tasks' })}</div></section>`;
    const project = getProject(task.projectId);
    const latestDelivery = deliveryVersionsForTask(task.id)[0] || null;
    const primaryAction = focusPrimaryAction(task);
    return `
      <section class="content-grid two-col focus-layout">
        <section class="panel">
          <div class="panel-body focus-hero">
            <span class="eyebrow">Focus mode</span>
            <h3>${esc(task.title)}</h3>
            <p>${esc(task.description)}</p>
            <div class="badges">${badge(task.status)} ${badge(task.priority)} ${badge(project?.title || '')}</div>
            <div class="focus-summary">
              <div><strong>${completion(task)}%</strong><span>Checklist complete</span></div>
              <div><strong>${task.actualMinutes}m</strong><span>Tracked time</span></div>
              <div><strong>${task.revisionCount}</strong><span>Revision cycles</span></div>
            </div>
            ${actionBand(nextRequiredMove(task), primaryAction, latestDelivery ? { label:'Open delivery', action:'open-delivery', deliveryId:latestDelivery.id, secondary:true } : { label:'Open project', action:'open-project', projectId:task.projectId, secondary:true })}
          </div>
          <div class="panel-body border-top stack">
            <div class="mini-card"><strong>Deliverable</strong><span>${esc(task.deliverableSummary || 'Define the deliverable output for this task.')}</span></div>
            <div class="mini-card"><strong>Acceptance criteria</strong><span>${task.acceptanceCriteria?.length ? esc(task.acceptanceCriteria.join(' | ')) : 'Add acceptance criteria before review.'}</span></div>
            <div class="mini-card"><strong>Latest delivery status</strong><span>${esc(latestDelivery ? `${latestDelivery.versionLabel} · ${reviewDecisionLabel(latestDelivery)}` : 'No delivery submitted yet.')}</span></div>
            <h4>Execution checklist</h4>
            ${task.checklist.map(item => `<label class="check-row"><input type="checkbox" ${item.isDone ? 'checked' : ''} data-action="toggle-checklist" data-id="${item.id}"><span>${esc(item.label)}</span></label>`).join('')}
            <div class="inline-actions">
              ${actionButton({ ...primaryAction, label: taskPrimaryLabel(task) })}
              <button class="ghost-btn" data-action="edit-task" data-id="${task.id}">Edit task</button>
              <button class="ghost-btn" data-action="add-checklist" data-id="${task.id}">Add checklist item</button>
              <button class="ghost-btn" data-action="log-time" data-id="${task.id}">Log time</button>
              ${task.status !== 'waiting_client' ? `<button class="ghost-btn" data-action="task-wait" data-id="${task.id}">Waiting client</button>` : ''}
              ${task.status !== 'blocked' ? `<button class="ghost-btn" data-action="task-block" data-id="${task.id}">Mark blocked</button>` : ''}
              ${((latestDelivery && ['approved','approved_with_notes'].includes(latestDelivery.status)) || task.status === 'done') ? `<button class="ghost-btn" data-action="task-done" data-id="${task.id}">Mark done</button>` : ''}
            </div>
          </div>
        </section>
        <section class="panel">
          <div class="panel-head"><div><span class="eyebrow">Proof and timeline</span><h3>Completion proof</h3><p>Required before review and preserved in the task history.</p></div></div>
          <div class="panel-body stack">
            <form id="proofForm" class="form-stack">
              <textarea class="area" id="proofNote" name="proofNote" placeholder="Describe the work completed, deliverables prepared, and what reviewer should verify.">${esc(task.proofNote)}</textarea>
              <button class="primary-btn" type="submit">Save proof</button>
            </form>
            <form id="statusReasonForm" class="form-stack">
              <textarea class="area" id="statusReason" name="statusReason" placeholder="Reason required when task is blocked or waiting on client.">${esc(currentTaskReason(task))}</textarea>
              <button class="ghost-btn" type="submit">Save execution note</button>
            </form>
            <div class="mini-card"><strong>Current execution note</strong><span>${esc(currentTaskReason(task) || 'No active blocker or waiting reason.')}</span></div>
            <div class="stack">${task.history.map(item => `<div class="timeline-row"><strong>${esc(item.text)}</strong><small>${esc(item.at)}</small></div>`).join('')}</div>
          </div>
        </section>
      </section>`;
  }

  function renderChat(){
    const conversation = selectedConversation();
    if(!conversation) return `<section class="panel"><div class="panel-body">${emptyBlock('No conversation available.')}</div></section>`;
    return `
      <section class="workspace-grid chat-layout">
        <aside class="panel side-panel"><div class="panel-head"><div><span class="eyebrow">Threads</span><h3>Conversations</h3><p>Project, task, and review context.</p></div></div><div class="panel-body stack">${visibleConversations().map(c => `<button class="list-button ${c.id===conversation.id?'active':''}" data-conversationid="${c.id}"><strong>${esc(c.title)}</strong><span>${esc(c.visibility.replace('_',' '))}</span></button>`).join('')}</div></aside>
        <section class="panel main-panel"><div class="panel-head"><div><span class="eyebrow">Current thread</span><h3>${esc(conversation.title)}</h3><p>Messages are linked to work instead of generic chat.</p></div></div><div class="panel-body stack">${actionBand('Use this thread to resolve the current execution or approval decision, not just post general updates.', { label:'Write update', action:'focus-form', target:'messageForm' })}<div class="messages-stack">${state.messages.filter(m => m.conversationId === conversation.id).map(m => `<div class="message ${m.senderId===currentUser().id?'mine':''}"><div class="message-body">${esc(m.body)}</div><small>${esc(userName(m.senderId))} · ${esc(m.createdAt)}</small></div>`).join('')}</div></div><div class="panel-body border-top"><form id="messageForm" class="inline-form"><input class="field" name="body" placeholder="Write update or request..." required><button class="primary-btn" type="submit">Send</button></form></div></section>
      </section>`;
  }

  function renderDeliveries(){
    const delivery = selectedDelivery();
    if(!delivery) return `<section class="panel"><div class="panel-body">${emptyBlock('Submit your first delivery by moving a task through proof and review.', state.role === 'client' ? { label:'Open projects', view:'projects' } : state.tasks.length ? { label:'Open task board', view:'tasks' } : { label:'Create task first', view:'tasks' })}</div></section>`;
    const task = getTask(delivery.taskId);
    const files = attachmentsFor('delivery', delivery.id);
    const metrics = reviewMetrics(delivery);
    const reviewLocked = !canReviewDelivery(delivery);
    const reviewerNote = esc(delivery.reviewerNote || delivery.note || '');
    const changeSummary = esc(delivery.changeSummary || '');
    const internalNote = esc(delivery.internalNote || '');
    const clientVisibleNote = esc(delivery.clientVisibleNote || '');
    const taskVersions = deliveryVersionsForTask(delivery.taskId);
    const primaryAction = deliveriesPrimaryAction(delivery);
    return `
      <section class="workspace-grid">
        <aside class="panel side-panel"><div class="panel-head"><div><span class="eyebrow">Submission queue</span><h3>Deliveries</h3><p>Choose a submission to review.</p></div></div><div class="panel-body stack compact-list">${visibleDeliveries().map(d => `<button class="list-button ${d.id===delivery.id?'active':''}" data-deliveryid="${d.id}"><strong>${esc(d.versionLabel)}</strong><span>${esc(getTask(d.taskId)?.title || '')}</span><span class="badges">${badge(d.status)}</span></button>`).join('')}</div></aside>
        <section class="panel main-panel"><div class="panel-body project-hero"><div><span class="eyebrow">Review packet</span><h3>${esc(delivery.versionLabel)} · ${esc(task?.title || 'Delivery')}</h3><p>${esc(delivery.summary)}</p><div class="badges">${badge(delivery.status)} ${badge(getProject(delivery.projectId)?.title || '')} <span class="muted-chip">${esc(metrics.status)}</span><span class="muted-chip">${esc(reviewDecisionLabel(delivery))}</span>${metrics.overdueReview ? '<span class="badge tone-red">Overdue review</span>' : ''}${metrics.clientDelay ? '<span class="badge tone-orange">Client response delay</span>' : ''}${reviewOverloadActive() ? '<span class="badge tone-gold">Review overload</span>' : ''}</div></div><div class="kpi-strip project-kpis"><div class="kpi"><strong>${reviewHistory(delivery.id).length}</strong><span>Review events</span></div><div class="kpi"><strong>${files.length}</strong><span>Files</span></div><div class="kpi"><strong>${task?.revisionCount || 0}</strong><span>Revisions</span></div><div class="kpi"><strong>${metrics.ready ? 'Ready' : 'Action needed'}</strong><span>Readiness</span></div></div></div><div class="panel-body border-top stack">${actionBand(deliveryNextAction(delivery), primaryAction, task ? { label:'Open linked task', action:'open-focus', taskId:task.id, secondary:true } : null)}<div class="grid-columns"><div class="mini-card"><strong>Deliverable outcome</strong><span>${esc(delivery.summary)}</span></div><div class="mini-card"><strong>Acceptance criteria</strong><span>${delivery.acceptanceCriteriaSnapshot?.length ? esc(delivery.acceptanceCriteriaSnapshot.join(' | ')) : 'No criteria snapshot recorded.'}</span></div><div class="mini-card"><strong>Proof snapshot</strong><span>${esc(delivery.proofSnapshot || task?.proofNote || 'No proof snapshot recorded.')}</span></div><div class="mini-card"><strong>Readiness status</strong><span>${esc(metrics.status)}${metrics.overdueReview ? ' · Overdue review' : ''}${metrics.clientDelay ? ' · Waiting on client' : ''}</span></div></div><div class="grid-columns single-friendly">${files.map(file => `<div class="mini-card ${state.selectedDeliveryId===delivery.id?'selected-card':''}"><strong>${esc(file.name)}</strong><span>${esc(file.size)}</span><div class="inline-actions compact-actions"><button class="ghost-btn" data-action="open-attachment" data-id="${file.id}">Open</button>${state.role !== 'client' ? `<button class="ghost-btn" data-action="remove-attachment" data-id="${file.id}">Remove</button>` : ''}</div></div>`).join('') || emptyBlock('No delivery files recorded.')}</div><div class="inline-actions">${state.role !== 'client' ? `<button class="ghost-btn" data-action="upload-attachment">Add attachment</button>` : ''}${reviewLocked ? `<span class="muted-chip">Review locked for original submitter or non-review role</span>` : ''}</div><div class="review-grid"><textarea class="area" id="reviewerNote" placeholder="Reviewer note. Required to start structured review.">${reviewerNote}</textarea><textarea class="area" id="changeSummary" placeholder="Change request summary. Used in the review decision modal.">${changeSummary}</textarea><textarea class="area" id="internalNote" placeholder="Internal note for the team.">${internalNote}</textarea><textarea class="area" id="clientVisibleNote" placeholder="Client-visible note.">${clientVisibleNote}</textarea></div><div class="inline-actions"><button class="ghost-btn" ${disableIf(reviewLocked || !files.length || !canTransitionDelivery(delivery, 'under_review'))} data-action="mark-review">Start review</button><button class="primary-btn" ${disableIf(reviewLocked || delivery.status !== 'under_review')} data-action="open-review-decision">Review decision</button></div></div></section>
        <aside class="panel side-panel"><div class="panel-head"><div><span class="eyebrow">Decision trail</span><h3>Review history</h3><p>Every review action is logged with reviewer identity and notes.</p></div></div><div class="panel-body stack compact-list">${reviewHistory(delivery.id).map(r => `<div class="timeline-row"><strong>${esc(r.status.replace('_',' '))} · ${esc(r.reviewerName || userName(r.reviewerId))}</strong><span>${esc(r.reviewerNote || r.note || 'No note')}</span>${r.changeSummary ? `<span>${esc(r.changeSummary)}</span>` : ''}${r.clientVisibleNote ? `<span>${esc(r.clientVisibleNote)}</span>` : ''}<small>${esc(r.createdAt)}</small></div>`).join('')}<div class="mini-card"><strong>Revision history</strong><span>${taskVersions.map(version => `${version.versionLabel}: ${reviewDecisionLabel(version)}`).join(' | ')}</span></div></div></aside>
      </section>`;
  }

  function renderReports(){
    const tasks = visibleTasks();
    const deliveries = visibleDeliveries();
    const riskItems = tasks.filter(t => ['blocked','waiting_client','submitted','in_review'].includes(t.status));
    const primaryAction = reportsPrimaryAction();
    return `
      <section class="hero-grid compact-hero">
        <div class="hero-card panel"><div class="panel-body"><span class="eyebrow">Health score</span><h3>${healthScore()} / 100</h3><p>Execution confidence based on blockers, review load, and waiting-client pressure.</p></div></div>
        <div class="smart-card panel"><div class="panel-body"><span class="eyebrow">Smart signal</span><h3>${riskItems.length ? 'Risk queue active' : 'Stable pipeline'}</h3><p>${riskItems.length ? `${riskItems.length} items need escalation, client response, or review cleanup.` : 'No critical queue detected right now.'}</p>${actionBand(systemNextAction(), primaryAction)}</div></div>
      </section>
      <section class="content-grid two-col">
        <section class="panel"><div class="panel-head"><div><span class="eyebrow">Operational report</span><h3>System metrics</h3><p>High-signal summary for daily review.</p></div></div><div class="panel-body stack">
          <div class="report-row"><strong>Open tasks</strong><span>${tasks.filter(t => t.status !== 'done').length}</span></div>
          <div class="report-row"><strong>Blocked tasks</strong><span>${tasks.filter(t => t.status === 'blocked').length}</span></div>
          <div class="report-row"><strong>Waiting client</strong><span>${tasks.filter(t => t.status === 'waiting_client').length}</span></div>
          <div class="report-row"><strong>Waiting client delay</strong><span>${waitingClientDelayTasks().length}</span></div>
          <div class="report-row"><strong>Review queue</strong><span>${reviewQueue().length}</span></div>
          <div class="report-row"><strong>Review overload</strong><span>${reviewOverloadActive() ? 'Active' : 'Clear'}</span></div>
          <div class="report-row"><strong>Done tasks</strong><span>${tasks.filter(t => t.status === 'done').length}</span></div>
        </div></section>
        <section class="panel"><div class="panel-head"><div><span class="eyebrow">Risk queue</span><h3>Items that need action</h3><p>Review these before they slow the workspace.</p></div></div><div class="panel-body stack">${riskItems.map(task => `<div class="risk-row"><div><h4>${esc(task.title)}</h4><p>${esc(nextRequiredMove(task))}</p><small>${esc(currentTaskReason(task) || task.deliverableSummary || '')}</small></div><div class="badges">${badge(task.status)} ${badge(task.priority)}</div></div>`).join('') || emptyBlock('No risk items detected.')}${reviewOverloadActive() ? `<div class="risk-row"><div><h4>Review queue overload</h4><p>${esc(`${reviewQueue().length} deliveries are waiting for review decisions.`)}</p></div><div class="badges">${badge('under_review')} ${badge('high')}</div></div>` : ''}</div></section>
      </section>`;
  }

  function renderSettings(){
    return `
      <section class="hero-grid compact-hero">
        <div class="hero-card panel"><div class="panel-body"><span class="eyebrow">Appearance</span><h3>${state.workspace.appearance === 'dark' ? 'Dark mode' : 'Light mode'}</h3><p>Switch between dark and light workspace views instantly.</p><div class="inline-actions"><button class="ghost-btn" data-action="theme-dark">Dark view</button><button class="ghost-btn" data-action="theme-light">Light view</button></div></div></div>
        <div class="smart-card panel"><div class="panel-body"><span class="eyebrow">Density</span><h3>${state.workspace.density === 'compact' ? 'Compact' : 'Comfortable'}</h3><p>Control how dense rows, cards, and spacing feel across the system.</p><div class="inline-actions"><button class="ghost-btn" data-action="density-comfort">Comfortable</button><button class="ghost-btn" data-action="density-compact">Compact</button></div></div></div>
      </section>
      <section class="content-grid two-col">
        <section class="panel"><div class="panel-head"><div><span class="eyebrow">Workspace profile</span><h3>Core settings</h3><p>Saved locally and applied on startup.</p></div></div><div class="panel-body">${actionBand('Keep startup behavior and workspace identity aligned with how the team runs delivery work.', { label:'Update settings', action:'focus-form', target:'settingsForm' })}<form id="settingsForm" class="form-stack"><input class="field" name="name" value="${esc(state.workspace.name)}" placeholder="Workspace name"><input class="field" name="company" value="${esc(state.workspace.company)}" placeholder="Company"><input class="field" name="timezone" value="${esc(state.workspace.timezone)}" placeholder="Timezone"><select class="select" name="startView">${Object.keys(VIEW_META).map(v => `<option value="${v}" ${state.workspace.startView===v?'selected':''}>${esc(VIEW_META[v][0])}</option>`).join('')}</select><button class="primary-btn" type="submit">Save settings</button></form></div></section>
        <section class="panel"><div class="panel-head"><div><span class="eyebrow">System behavior</span><h3>Operational policy</h3><p>Rules that make the workflow more real and review-safe.</p></div></div><div class="panel-body stack"><div class="mini-card"><strong>Review gate</strong><span>Tasks require in-progress state, completed checklist, and proof before review.</span></div><div class="mini-card"><strong>Completion gate</strong><span>Tasks cannot finish without approved delivery.</span></div><div class="mini-card"><strong>Import / export</strong><span>Workspace backup and restore are built in.</span></div><div class="mini-card"><strong>Theme switching</strong><span>Dark and light views are persisted locally.</span></div></div></section>
      </section>`;
  }

  function taskCardCompact(task){
    const primaryAction = focusPrimaryAction(task);
    return `<div class="task-card compact interactive-card"><div><h4>${esc(task.title)}</h4><p>${esc(smartSuggestion(task))}</p><div class="badges">${badge(overdueTasks().some(x => x.id===task.id) ? 'overdue' : task.status, urgencyTone(task))} ${badge(task.priority)} <span class="muted-chip">${completion(task)}%</span> <span class="muted-chip">${acceptanceCriteriaCount(task)} criteria</span></div><p class="muted-text">${esc(task.deliverableSummary || 'Define the deliverable outcome for this task.')}</p></div><div class="inline-actions compact-actions">${actionButton({ ...primaryAction, label: taskPrimaryLabel(task) })}<button class="ghost-btn" data-action="open-task-modal" data-id="${task.id}">Open</button>${state.role !== 'client' ? `<button class="ghost-btn" data-action="edit-task" data-id="${task.id}">Edit</button>` : ''}</div></div>`;
  }

  function taskCardWide(task){
    const primaryAction = focusPrimaryAction(task);
    return `<div class="task-card wide interactive-card"><div class="task-card-main"><div><h4>${esc(task.title)}</h4><p>${esc(task.description)}</p><div class="badges">${badge(overdueTasks().some(x => x.id===task.id) ? 'overdue' : task.status, urgencyTone(task))} ${badge(task.priority)} <span class="muted-chip">${esc(userName(task.assigneeId))}</span> <span class="muted-chip">Due ${esc(task.dueAt)}</span></div></div><div class="task-actions">${actionButton({ ...primaryAction, label: taskPrimaryLabel(task) })}<button class="ghost-btn" data-action="open-task-modal" data-id="${task.id}">Open</button>${state.role !== 'client' ? `<button class="ghost-btn" data-action="edit-task" data-id="${task.id}">Edit</button>` : ''}</div></div><div class="task-meta-row"><span><strong>Deliverable:</strong> ${esc(task.deliverableSummary || 'Define deliverable outcome')}</span><span><strong>Proof:</strong> ${task.proofNote ? 'Ready' : 'Missing'}</span><span><strong>Acceptance:</strong> ${acceptanceCriteriaCount(task)} criteria</span><span><strong>Revision cycles:</strong> ${task.revisionCount}</span></div></div>`;
  }

  function deliveryCardCompact(delivery){
    const task = getTask(delivery.taskId);
    return `<div class="delivery-row"><div><h4>${esc(delivery.versionLabel)} · ${esc(task?.title || 'Delivery')}</h4><p>${esc(delivery.summary)}</p></div><div class="badges">${badge(delivery.status)}</div></div>`;
  }

  function emptyBlock(text, actionConfig){
    return `<div class="empty-state"><p>${esc(text)}</p>${actionConfig ? `<div class="inline-actions" style="justify-content:center;margin-top:12px">${actionButton(actionConfig)}</div>` : ''}</div>`;
  }
})();














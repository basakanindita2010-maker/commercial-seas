require('dotenv').config();

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is missing. Please set process.env.MONGODB_URI and restart the application.');
  process.exit(1);
}

const APP_NAME = 'Principal Software Architect SaaS';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

mongoose.set('strictQuery', true);

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
}

function sanitize(value) {
  if (typeof value === 'string') return value.trim().replace(/\$/g, '').replace(/\u0000/g, '');
  return value;
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

function generateCode(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

const { Schema } = mongoose;

function addCommonFields(schema) {
  schema.add({
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, default: 'Active', index: true }
  });
  schema.set('timestamps', true);
}

const UserSchema = new Schema({
  fullName: { type: String, required: true, trim: true, index: true },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['Administrator', 'Manager', 'Staff', 'Operator', 'Viewer'], default: 'Viewer', index: true },
  phone: { type: String, default: '', trim: true },
  lastLoginAt: { type: Date, default: null },
  loginCount: { type: Number, default: 0 },
  resetTokenHash: { type: String, default: null },
  resetTokenExpiresAt: { type: Date, default: null },
  forcePasswordChange: { type: Boolean, default: false }
});
addCommonFields(UserSchema);

const ClientSchema = new Schema({
  clientCode: { type: String, required: true, trim: true, unique: true, index: true },
  companyName: { type: String, required: true, trim: true, index: true },
  contactPerson: { type: String, required: true, trim: true },
  email: { type: String, default: '', trim: true, lowercase: true },
  phone: { type: String, default: '', trim: true },
  address: { type: String, default: '', trim: true },
  category: { type: String, default: 'Corporate', index: true },
  gstNumber: { type: String, default: '', trim: true },
  creditLimit: { type: Number, default: 0 }
});
addCommonFields(ClientSchema);

const ProjectSchema = new Schema({
  projectCode: { type: String, required: true, trim: true, unique: true, index: true },
  title: { type: String, required: true, trim: true, index: true },
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', default: null, index: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium', index: true },
  startDate: { type: Date, default: null },
  dueDate: { type: Date, default: null },
  budget: { type: Number, default: 0 },
  progress: { type: Number, default: 0 },
  description: { type: String, default: '', trim: true }
});
addCommonFields(ProjectSchema);

const TaskSchema = new Schema({
  taskCode: { type: String, required: true, trim: true, unique: true, index: true },
  title: { type: String, required: true, trim: true, index: true },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', default: null, index: true },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  dueDate: { type: Date, default: null },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium', index: true },
  completion: { type: Number, default: 0 },
  notes: { type: String, default: '', trim: true }
});
addCommonFields(TaskSchema);

const DocumentSchema = new Schema({
  documentCode: { type: String, required: true, trim: true, unique: true, index: true },
  title: { type: String, required: true, trim: true, index: true },
  module: { type: String, default: 'General', trim: true, index: true },
  fileName: { type: String, default: '', trim: true },
  mimeType: { type: String, default: '', trim: true },
  fileSize: { type: Number, default: 0 },
  referenceId: { type: String, default: '', trim: true },
  notes: { type: String, default: '', trim: true }
});
addCommonFields(DocumentSchema);

const InvoiceSchema = new Schema({
  invoiceNumber: { type: String, required: true, trim: true, unique: true, index: true },
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', default: null, index: true },
  invoiceDate: { type: Date, default: Date.now, index: true },
  dueDate: { type: Date, default: null, index: true },
  subtotal: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0, index: true },
  paidAmount: { type: Number, default: 0 },
  currency: { type: String, default: 'INR', trim: true },
  paymentStatus: { type: String, enum: ['Draft', 'Sent', 'Partially Paid', 'Paid', 'Overdue'], default: 'Draft', index: true },
  notes: { type: String, default: '', trim: true }
});
addCommonFields(InvoiceSchema);

const PaymentSchema = new Schema({
  paymentNumber: { type: String, required: true, trim: true, unique: true, index: true },
  invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', default: null, index: true },
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', default: null, index: true },
  paymentDate: { type: Date, default: Date.now, index: true },
  amount: { type: Number, default: 0 },
  method: { type: String, enum: ['Cash', 'Bank Transfer', 'Cheque', 'Card', 'UPI', 'Other'], default: 'Bank Transfer' },
  reference: { type: String, default: '', trim: true }
});
addCommonFields(PaymentSchema);

const NotificationSchema = new Schema({
  title: { type: String, required: true, trim: true, index: true },
  message: { type: String, required: true, trim: true },
  recipientId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  readAt: { type: Date, default: null },
  severity: { type: String, enum: ['Info', 'Success', 'Warning', 'Danger'], default: 'Info', index: true }
});
addCommonFields(NotificationSchema);

const AuditLogSchema = new Schema({
  action: { type: String, required: true, trim: true, index: true },
  entityName: { type: String, required: true, trim: true, index: true },
  entityId: { type: String, default: '', trim: true },
  summary: { type: String, default: '', trim: true },
  ipAddress: { type: String, default: '', trim: true },
  userAgent: { type: String, default: '', trim: true }
});
addCommonFields(AuditLogSchema);

const SettingSchema = new Schema({
  key: { type: String, required: true, unique: true, trim: true, index: true },
  value: { type: Schema.Types.Mixed, default: null },
  label: { type: String, default: '', trim: true },
  description: { type: String, default: '', trim: true }
});
addCommonFields(SettingSchema);

const ActivitySchema = new Schema({
  moduleName: { type: String, required: true, trim: true, index: true },
  action: { type: String, required: true, trim: true, index: true },
  details: { type: String, default: '', trim: true },
  relatedEntity: { type: String, default: '', trim: true },
  relatedEntityId: { type: String, default: '', trim: true }
});
addCommonFields(ActivitySchema);

const ModuleSchema = new Schema({
  moduleKey: { type: String, required: true, unique: true, trim: true, index: true },
  moduleName: { type: String, required: true, trim: true, index: true },
  description: { type: String, default: '', trim: true },
  icon: { type: String, default: 'fa-cube', trim: true },
  route: { type: String, default: '', trim: true },
  order: { type: Number, default: 0 }
});
addCommonFields(ModuleSchema);

const ReportSchema = new Schema({
  reportCode: { type: String, required: true, unique: true, trim: true, index: true },
  title: { type: String, required: true, trim: true, index: true },
  reportType: { type: String, enum: ['Dashboard', 'Financial', 'Operational', 'Audit', 'Compliance'], default: 'Operational', index: true },
  dateFrom: { type: Date, default: null },
  dateTo: { type: Date, default: null },
  parameters: { type: Schema.Types.Mixed, default: {} }
});
addCommonFields(ReportSchema);

const CommentSchema = new Schema({
  subjectType: { type: String, required: true, trim: true, index: true },
  subjectId: { type: String, required: true, trim: true, index: true },
  comment: { type: String, required: true, trim: true }
});
addCommonFields(CommentSchema);

const User = mongoose.model('User', UserSchema);
const Client = mongoose.model('Client', ClientSchema);
const Project = mongoose.model('Project', ProjectSchema);
const Task = mongoose.model('Task', TaskSchema);
const Document = mongoose.model('Document', DocumentSchema);
const Invoice = mongoose.model('Invoice', InvoiceSchema);
const Payment = mongoose.model('Payment', PaymentSchema);
const Notification = mongoose.model('Notification', NotificationSchema);
const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
const Setting = mongoose.model('Setting', SettingSchema);
const Activity = mongoose.model('Activity', ActivitySchema);
const Module = mongoose.model('Module', ModuleSchema);
const Report = mongoose.model('Report', ReportSchema);
const Comment = mongoose.model('Comment', CommentSchema);

const pageConfigs = {
  dashboard: { title: 'Dashboard', modelKey: null },
  users: { title: 'Users', modelKey: 'users' },
  clients: { title: 'Clients', modelKey: 'clients' },
  projects: { title: 'Projects', modelKey: 'projects' },
  tasks: { title: 'Tasks', modelKey: 'tasks' },
  documents: { title: 'Documents', modelKey: 'documents' },
  invoices: { title: 'Invoices', modelKey: 'invoices' },
  payments: { title: 'Payments', modelKey: 'payments' },
  notifications: { title: 'Notifications', modelKey: 'notifications' },
  auditlogs: { title: 'Audit Logs', modelKey: 'auditlogs' },
  settings: { title: 'Settings', modelKey: 'settings' },
  activities: { title: 'Activities', modelKey: 'activities' },
  modules: { title: 'Modules', modelKey: 'modules' },
  reports: { title: 'Reports', modelKey: 'reports' },
  comments: { title: 'Comments', modelKey: 'comments' }
};

const MODELS = {
  users: User,
  clients: Client,
  projects: Project,
  tasks: Task,
  documents: Document,
  invoices: Invoice,
  payments: Payment,
  notifications: Notification,
  auditlogs: AuditLog,
  settings: Setting,
  activities: Activity,
  modules: Module,
  reports: Report,
  comments: Comment
};

const rolePermissions = {
  Administrator: { create: true, read: true, update: true, delete: true, export: true, print: true },
  Manager: { create: true, read: true, update: true, delete: false, export: true, print: true },
  Staff: { create: true, read: true, update: true, delete: false, export: false, print: false },
  Operator: { create: true, read: true, update: false, delete: false, export: false, print: false },
  Viewer: { create: false, read: true, update: false, delete: false, export: true, print: true }
};

function hasPermission(user, action) {
  if (!user) return false;
  const perms = rolePermissions[user.role] || rolePermissions.Viewer;
  return Boolean(perms[action]);
}

async function logAudit(req, user, action, entityName, entityId = '', summary = '') {
  try {
    await AuditLog.create({
      action,
      entityName,
      entityId: String(entityId || ''),
      summary: String(summary || ''),
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
      createdBy: user ? user._id : null,
      status: 'Active'
    });
  } catch (e) {
    console.error('Audit log error:', e.message);
  }
}

async function seedData() {
  const adminEmail = 'admin@company.com';
  const existing = await User.findOne({ email: adminEmail }).lean();
  if (!existing) {
    await User.create({
      fullName: 'System Administrator',
      email: adminEmail,
      passwordHash: hashPassword('admin123'),
      role: 'Administrator',
      phone: '',
      status: 'Active'
    });
    console.log('Seeded default admin: admin@company.com / admin123');
  }

  const settings = [
    { key: 'app_name', value: APP_NAME, label: 'App Name', description: 'Application display name' },
    { key: 'timezone', value: 'Asia/Kolkata', label: 'Timezone', description: 'System timezone' },
    { key: 'currency', value: 'INR', label: 'Currency', description: 'Default currency' },
    { key: 'session_timeout_minutes', value: 480, label: 'Session Timeout', description: 'Timeout in minutes' }
  ];

  for (const s of settings) {
    const exists = await Setting.findOne({ key: s.key }).lean();
    if (!exists) {
      await Setting.create({ ...s, status: 'Active' });
    }
  }
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({ extended: true, limit: '2mb' }));
app.use(bodyParser.json({ limit: '2mb' }));

app.use(session({
  name: 'psa.sid',
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 1000 * 60 * 60 * 8
  }
}));

app.use((req, res, next) => {
  res.locals.appName = APP_NAME;
  res.locals.currentUser = req.session.user || null;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
});

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  next();
}

app.get('/', (req, res) => {
  if (req.session.userId) return res.redirect('/app?page=dashboard');
  return res.redirect('/login');
});

app.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/app?page=dashboard');
  res.render('login', { appName: APP_NAME, flash: req.session.flash || null, error: null });
});

app.post('/login', async (req, res) => {
  try {
    const email = sanitize(req.body.email).toLowerCase();
    const password = sanitize(req.body.password);
    const remember = req.body.remember ? true : false;

    const user = await User.findOne({ email, status: 'Active' }).lean();
    if (!user || user.passwordHash !== hashPassword(password)) {
      return res.status(401).render('login', { appName: APP_NAME, flash: null, error: 'Invalid email or password.' });
    }

    req.session.regenerate(async (err) => {
      if (err) {
        console.error(err);
        return res.status(500).render('login', { appName: APP_NAME, flash: null, error: 'Unable to start session.' });
      }

      req.session.userId = String(user._id);
      req.session.user = {
        _id: String(user._id),
        fullName: user.fullName,
        email: user.email,
        role: user.role
      };

      if (remember) req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30;

      await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() }, $inc: { loginCount: 1 } });
      await logAudit(req, user, 'Login', 'User', user._id, `Login by ${user.email}`);
      return res.redirect('/app?page=dashboard');
    });
  } catch (error) {
    console.error(error);
    return res.status(500).render('login', { appName: APP_NAME, flash: null, error: 'Login failed.' });
  }
});

app.get('/logout', requireAuth, async (req, res) => {
  try {
    const user = req.session.user;
    await logAudit(req, user, 'Logout', 'User', user?._id, `Logout by ${user?.email || ''}`);
    req.session.destroy(() => res.redirect('/login'));
  } catch (error) {
    console.error(error);
    return res.redirect('/login');
  }
});

app.post('/forgot-password', async (req, res) => {
  try {
    const email = sanitize(req.body.email).toLowerCase();
    const user = await User.findOne({ email });
    if (!user) {
      req.session.flash = { type: 'warning', message: 'If the email exists, a reset token has been generated.' };
      return res.redirect('/login');
    }

    const token = crypto.randomBytes(24).toString('hex');
    user.resetTokenHash = hashPassword(token);
    user.resetTokenExpiresAt = new Date(Date.now() + 1000 * 60 * 30);
    await user.save();

    req.session.flash = { type: 'success', message: `Reset token generated: ${token}` };
    return res.redirect('/login');
  } catch (error) {
    console.error(error);
    req.session.flash = { type: 'danger', message: 'Forgot password failed.' };
    return res.redirect('/login');
  }
});

app.get('/app', requireAuth, async (req, res) => {
  try {
    const page = String(req.query.page || 'dashboard').toLowerCase();
    const cfg = pageConfigs[page] || pageConfigs.dashboard;
    const model = cfg.modelKey ? MODELS[cfg.modelKey] : null;
    const search = sanitize(req.query.search || '');
    const currentPage = Math.max(parseInt(req.query.p || '1', 10) || 1, 1);
    const perPage = Math.min(Math.max(parseInt(req.query.limit || '10', 10) || 10, 5), 100);

    const canCreate = hasPermission(req.session.user, 'create');
    const canRead = hasPermission(req.session.user, 'read');
    const canUpdate = hasPermission(req.session.user, 'update');
    const canDelete = hasPermission(req.session.user, 'delete');
    const canExport = hasPermission(req.session.user, 'export');
    const canPrint = hasPermission(req.session.user, 'print');

    if (page === 'dashboard') {
      const [usersCount, clientsCount, projectsCount, tasksCount, invoicesCount, paymentsCount, notificationsCount, auditCount] = await Promise.all([
        User.countDocuments({ status: 'Active' }),
        Client.countDocuments({ status: 'Active' }),
        Project.countDocuments({ status: 'Active' }),
        Task.countDocuments({}),
        Invoice.countDocuments({}),
        Payment.countDocuments({}),
        Notification.countDocuments({}),
        AuditLog.countDocuments({})
      ]);

      const recentActivities = await AuditLog.find({}).sort({ createdAt: -1 }).limit(8).lean();

      const monthlyInvoiceAgg = await Invoice.aggregate([
        { $group: { _id: { $month: '$createdAt' }, total: { $sum: '$totalAmount' } } },
        { $sort: { _id: 1 } }
      ]);

      const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const invoiceSeries = Array(12).fill(0);
      monthlyInvoiceAgg.forEach(item => { invoiceSeries[item._id - 1] = item.total; });

      const latestClients = await Client.find({}).sort({ createdAt: -1 }).limit(6).lean();

      return res.render('app', {
        appName: APP_NAME,
        page: 'dashboard',
        pageTitle: 'Dashboard',
        cfg: pageConfigs.dashboard,
        rows: [],
        record: null,
        meta: {},
        stats: { usersCount, clientsCount, projectsCount, tasksCount, invoicesCount, paymentsCount, notificationsCount, auditCount },
        charts: { labels, invoiceSeries },
        relations: {},
        recentActivities,
        latestClients,
        flash: req.session.flash || null,
        error: null,
        currentUser: req.session.user,
        canCreate,
        canRead,
        canUpdate,
        canDelete,
        canExport,
        canPrint,
        search: '',
        totalPages: 1,
        currentPage: 1
      });
    }

    if (!model) {
      return res.status(404).render('app', {
        appName: APP_NAME,
        page,
        pageTitle: cfg.title,
        cfg,
        rows: [],
        record: null,
        meta: {},
        stats: {},
        charts: {},
        relations: {},
        recentActivities: [],
        latestClients: [],
        flash: req.session.flash || null,
        error: 'Module not found.',
        currentUser: req.session.user,
        canCreate,
        canRead,
        canUpdate,
        canDelete,
        canExport,
        canPrint,
        search: '',
        totalPages: 1,
        currentPage: 1
      });
    }

    const filter = {};
    if (search) {
      filter.$or = Object.keys(model.schema.paths)
        .filter(k => !['_id', '__v', 'createdAt', 'updatedAt', 'createdBy'].includes(k))
        .slice(0, 6)
        .map(k => ({ [k]: { $regex: search, $options: 'i' } }));
    }

    const total = await model.countDocuments(filter);
    const totalPages = Math.max(Math.ceil(total / perPage), 1);
    const skip = (currentPage - 1) * perPage;

    const rows = await model.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage)
      .populate('createdBy', 'fullName email role')
      .populate('clientId', 'companyName clientCode')
      .populate('ownerId', 'fullName email')
      .populate('projectId', 'title projectCode')
      .populate('assignedTo', 'fullName email')
      .populate('invoiceId', 'invoiceNumber totalAmount')
      .populate('recipientId', 'fullName email')
      .lean();

    const relations = {
      users: await User.find({ status: 'Active' }).sort({ fullName: 1 }).lean(),
      clients: await Client.find({ status: 'Active' }).sort({ companyName: 1 }).lean(),
      projects: await Project.find({ status: 'Active' }).sort({ title: 1 }).lean(),
      invoices: await Invoice.find({ status: 'Active' }).sort({ invoiceNumber: 1 }).lean(),
      tasks: await Task.find({}).sort({ title: 1 }).lean()
    };

    const editId = req.query.edit ? String(req.query.edit) : null;
    const record = editId ? await model.findById(editId).lean() : null;

    return res.render('app', {
      appName: APP_NAME,
      page,
      pageTitle: cfg.title,
      cfg,
      rows,
      record,
      meta: { total, totalPages, currentPage, perPage },
      stats: {},
      charts: {},
      relations,
      recentActivities: [],
      latestClients: [],
      flash: req.session.flash || null,
      error: null,
      currentUser: req.session.user,
      canCreate,
      canRead,
      canUpdate,
      canDelete,
      canExport,
      canPrint,
      search,
      totalPages,
      currentPage
    });
  } catch (error) {
    console.error(error);
    return res.status(500).render('app', {
      appName: APP_NAME,
      page: 'dashboard',
      pageTitle: 'Dashboard',
      cfg: pageConfigs.dashboard,
      rows: [],
      record: null,
      meta: {},
      stats: {},
      charts: {},
      relations: {},
      recentActivities: [],
      latestClients: [],
      flash: null,
      error: 'Unexpected server error.',
      currentUser: req.session.user || null,
      canCreate: false,
      canRead: false,
      canUpdate: false,
      canDelete: false,
      canExport: false,
      canPrint: false,
      search: '',
      totalPages: 1,
      currentPage: 1
    });
  }
});

app.post('/app/:page/:action', requireAuth, async (req, res) => {
  try {
    const page = String(req.params.page || '').toLowerCase();
    const action = String(req.params.action || '').toLowerCase();
    const cfg = pageConfigs[page];
    if (!cfg || !cfg.modelKey) return res.redirect('/app?page=dashboard');

    const Model = MODELS[cfg.modelKey];
    const user = req.session.user;
    const recordId = sanitize(req.body.id || req.body._id || '');

    if (action === 'create') {
      if (!hasPermission(user, 'create')) throw new Error('Access denied.');

      const data = {};
      for (const key of Object.keys(req.body)) {
        if (key === 'id' || key === '_id' || key === '__v') continue;
        data[key] = sanitize(req.body[key]);
      }

      if (page === 'users') {
        if (!data.password) throw new Error('Password is required.');
        data.passwordHash = hashPassword(data.password);
        delete data.password;
      }

      if (page === 'clients' && !data.clientCode) data.clientCode = generateCode('CLT');
      if (page === 'projects' && !data.projectCode) data.projectCode = generateCode('PRJ');
      if (page === 'tasks' && !data.taskCode) data.taskCode = generateCode('TSK');
      if (page === 'documents' && !data.documentCode) data.documentCode = generateCode('DOC');
      if (page === 'invoices' && !data.invoiceNumber) data.invoiceNumber = generateCode('INV');
      if (page === 'payments' && !data.paymentNumber) data.paymentNumber = generateCode('PAY');
      if (page === 'reports' && !data.reportCode) data.reportCode = generateCode('RPT');
      if (page === 'modules' && !data.moduleKey) data.moduleKey = generateCode('MOD');

      data.createdBy = user._id;
      data.status = data.status || 'Active';

      const created = await Model.create(data);
      await logAudit(req, user, 'Insert', cfg.title, created._id, `Created ${cfg.title}`);
      req.session.flash = { type: 'success', message: `${cfg.title} created successfully.` };
      return res.redirect(`/app?page=${page}`);
    }

    if (action === 'update') {
      if (!hasPermission(user, 'update')) throw new Error('Access denied.');
      if (!recordId) throw new Error('Missing record ID.');

      const data = {};
      for (const key of Object.keys(req.body)) {
        if (key === 'id' || key === '_id' || key === '__v' || key === 'createdAt' || key === 'updatedAt' || key === 'createdBy') continue;
        data[key] = sanitize(req.body[key]);
      }

      if (page === 'users' && data.password) {
        data.passwordHash = hashPassword(data.password);
        delete data.password;
      }

      const updated = await Model.findByIdAndUpdate(recordId, { $set: data }, { new: true, runValidators: true });
      if (!updated) throw new Error('Record not found.');

      await logAudit(req, user, 'Update', cfg.title, updated._id, `Updated ${cfg.title}`);
      req.session.flash = { type: 'success', message: `${cfg.title} updated successfully.` };
      return res.redirect(`/app?page=${page}`);
    }

    if (action === 'delete') {
      if (!hasPermission(user, 'delete')) throw new Error('Access denied.');
      if (!recordId) throw new Error('Missing record ID.');

      const deleted = await Model.findByIdAndDelete(recordId);
      if (!deleted) throw new Error('Record not found.');

      await logAudit(req, user, 'Delete', cfg.title, recordId, `Deleted ${cfg.title}`);
      req.session.flash = { type: 'success', message: `${cfg.title} deleted successfully.` };
      return res.redirect(`/app?page=${page}`);
    }

    if (action === 'export') {
      if (!hasPermission(user, 'export')) throw new Error('Access denied.');
      await logAudit(req, user, 'Export', cfg.title, recordId || '', `Exported ${cfg.title}`);
      req.session.flash = { type: 'info', message: `${cfg.title} export requested.` };
      return res.redirect(`/app?page=${page}`);
    }

    if (action === 'print') {
      if (!hasPermission(user, 'print')) throw new Error('Access denied.');
      await logAudit(req, user, 'Print', cfg.title, recordId || '', `Printed ${cfg.title}`);
      req.session.flash = { type: 'info', message: `${cfg.title} print requested.` };
      return res.redirect(`/app?page=${page}`);
    }

    throw new Error('Invalid action.');
  } catch (error) {
    console.error(error);
    req.session.flash = { type: 'danger', message: error.message || 'Operation failed.' };
    return res.redirect(`/app?page=${req.params.page || 'dashboard'}`);
  }
});

app.post('/change-password', requireAuth, async (req, res) => {
  try {
    const currentPassword = sanitize(req.body.currentPassword);
    const newPassword = sanitize(req.body.newPassword);
    const confirmPassword = sanitize(req.body.confirmPassword);

    if (!newPassword || newPassword.length < 8) throw new Error('New password must be at least 8 characters.');
    if (newPassword !== confirmPassword) throw new Error('Passwords do not match.');

    const user = await User.findById(req.session.userId);
    if (!user) throw new Error('User not found.');
    if (user.passwordHash !== hashPassword(currentPassword)) throw new Error('Current password is incorrect.');

    user.passwordHash = hashPassword(newPassword);
    user.forcePasswordChange = false;
    await user.save();

    await logAudit(req, req.session.user, 'Update', 'User', user._id, 'Password changed');
    req.session.flash = { type: 'success', message: 'Password changed successfully.' };
    return res.redirect('/app?page=settings');
  } catch (error) {
    console.error(error);
    req.session.flash = { type: 'danger', message: error.message || 'Password change failed.' };
    return res.redirect('/app?page=settings');
  }
});

app.post('/quick-create', requireAuth, async (req, res) => {
  try {
    const type = String(req.body.type || '').toLowerCase();
    if (type === 'client') {
      await Client.create({
        clientCode: generateCode('CLT'),
        companyName: sanitize(req.body.companyName || 'New Client'),
        contactPerson: sanitize(req.body.contactPerson || req.session.user.fullName),
        email: sanitize(req.body.email || ''),
        phone: sanitize(req.body.phone || ''),
        address: sanitize(req.body.address || ''),
        category: 'Corporate',
        status: 'Active',
        createdBy: req.session.user._id
      });
      await logAudit(req, req.session.user, 'Insert', 'Client', '', 'Quick client created');
      req.session.flash = { type: 'success', message: 'Client created successfully.' };
      return res.redirect('/app?page=clients');
    }

    if (type === 'task') {
      await Task.create({
        taskCode: generateCode('TSK'),
        title: sanitize(req.body.title || 'New Task'),
        notes: sanitize(req.body.notes || ''),
        status: 'Open',
        createdBy: req.session.user._id
      });
      await logAudit(req, req.session.user, 'Insert', 'Task', '', 'Quick task created');
      req.session.flash = { type: 'success', message: 'Task created successfully.' };
      return res.redirect('/app?page=tasks');
    }

    throw new Error('Invalid quick create type.');
  } catch (error) {
    console.error(error);
    req.session.flash = { type: 'danger', message: error.message || 'Quick create failed.' };
    return res.redirect('/app?page=dashboard');
  }
});

app.post('/mark-notification-read', requireAuth, async (req, res) => {
  try {
    const id = sanitize(req.body.id);
    await Notification.findByIdAndUpdate(id, { $set: { readAt: new Date(), status: 'Read' } });
    await logAudit(req, req.session.user, 'Update', 'Notification', id, 'Marked notification read');
    req.session.flash = { type: 'success', message: 'Notification updated.' };
    return res.redirect('/app?page=notifications');
  } catch (error) {
    console.error(error);
    req.session.flash = { type: 'danger', message: 'Unable to update notification.' };
    return res.redirect('/app?page=notifications');
  }
});

app.use((req, res) => {
  if (req.session.userId) return res.redirect('/app?page=dashboard');
  return res.redirect('/login');
});

(async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      autoIndex: true,
      serverSelectionTimeoutMS: 10000
    });
    console.log('MongoDB connected');
    await seedData();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`${APP_NAME} running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Startup error:', error.message);
    process.exit(1);
  }
})();

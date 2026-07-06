require('dotenv').config();

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is missing.');
  console.error('Please set MONGODB_URI in your Render.com environment variables and restart the application.');
  process.exit(1);
}

mongoose.set('strictQuery', true);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
  secret: 'inventory_erp_secret_key',
  resave: false,
  saveUninitialized: true
}));

const { Schema } = mongoose;

const UserSchema = new Schema({
  full_name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true },
  password: { type: String, default: '123456' },
  role: { type: String, enum: ['admin', 'manager', 'staff', 'accountant', 'viewer'], default: 'viewer' },
  phone: { type: String, default: '' },
  status: { type: String, default: 'Active' }
}, { timestamps: true });

const CategorySchema = new Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  status: { type: String, default: 'Active' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

const SupplierSchema = new Schema({
  supplierCode: { type: String, required: true, unique: true, trim: true },
  companyName: { type: String, required: true, trim: true },
  contactPerson: { type: String, default: '' },
  email: { type: String, default: '', lowercase: true, trim: true },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  status: { type: String, default: 'Active' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

const ProductSchema = new Schema({
  sku: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  categoryId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
  supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', default: null },
  unit: { type: String, default: 'pcs' },
  costPrice: { type: Number, default: 0 },
  sellingPrice: { type: Number, default: 0 },
  stockQty: { type: Number, default: 0 },
  reorderLevel: { type: Number, default: 0 },
  description: { type: String, default: '' },
  status: { type: String, default: 'Active' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

const WarehouseSchema = new Schema({
  code: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  location: { type: String, default: '' },
  managerName: { type: String, default: '' },
  status: { type: String, default: 'Active' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

const StockMovementSchema = new Schema({
  movementCode: { type: String, required: true, unique: true, trim: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', default: null },
  movementType: { type: String, enum: ['IN', 'OUT', 'ADJUST'], required: true },
  quantity: { type: Number, required: true },
  referenceType: { type: String, default: '' },
  referenceId: { type: String, default: '' },
  notes: { type: String, default: '' },
  movementDate: { type: Date, default: Date.now },
  status: { type: String, default: 'Active' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

const PurchaseSchema = new Schema({
  purchaseCode: { type: String, required: true, unique: true, trim: true },
  supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
  purchaseDate: { type: Date, default: Date.now },
  totalAmount: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  balanceAmount: { type: Number, default: 0 },
  paymentStatus: { type: String, default: 'Pending' },
  notes: { type: String, default: '' },
  status: { type: String, default: 'Active' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

const SaleSchema = new Schema({
  saleCode: { type: String, required: true, unique: true, trim: true },
  customerName: { type: String, required: true, trim: true },
  customerEmail: { type: String, default: '', lowercase: true, trim: true },
  saleDate: { type: Date, default: Date.now },
  totalAmount: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  balanceAmount: { type: Number, default: 0 },
  paymentStatus: { type: String, default: 'Pending' },
  notes: { type: String, default: '' },
  status: { type: String, default: 'Active' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

const NotificationSchema = new Schema({
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true },
  type: { type: String, default: 'Info' },
  status: { type: String, default: 'Active' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

const AuditLogSchema = new Schema({
  action: { type: String, required: true, trim: true },
  entityName: { type: String, required: true, trim: true },
  entityId: { type: String, default: '' },
  summary: { type: String, default: '' },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  status: { type: String, default: 'Active' }
}, { timestamps: true });

const SettingSchema = new Schema({
  key: { type: String, required: true, unique: true, trim: true },
  value: { type: Schema.Types.Mixed, default: null },
  label: { type: String, default: '' },
  description: { type: String, default: '' },
  status: { type: String, default: 'Active' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const Category = mongoose.model('Category', CategorySchema);
const Supplier = mongoose.model('Supplier', SupplierSchema);
const Product = mongoose.model('Product', ProductSchema);
const Warehouse = mongoose.model('Warehouse', WarehouseSchema);
const StockMovement = mongoose.model('StockMovement', StockMovementSchema);
const Purchase = mongoose.model('Purchase', PurchaseSchema);
const Sale = mongoose.model('Sale', SaleSchema);
const Notification = mongoose.model('Notification', NotificationSchema);
const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
const Setting = mongoose.model('Setting', SettingSchema);

function generateCode(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

function sanitize(value) {
  if (typeof value === 'string') return value.trim().replace(/\$/g, '');
  return value;
}

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
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
  } catch (error) {
    console.error('Audit logging failed:', error.message);
  }
}

async function seedAdmin() {
  const exists = await User.findOne({ role: 'admin' });
  if (!exists) {
    await User.create({
      full_name: 'Administrator',
      email: 'admin@inventory.com',
      password: 'admin123',
      role: 'admin',
      phone: '',
      status: 'Active'
    });
    console.log('Default admin created: admin@inventory.com / admin123');
  }
}

app.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/app?page=dashboard');
  return res.redirect('/login');
});

app.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/app?page=dashboard');
  res.render('login', { error: req.query.error || '' });
});

app.post('/login', async (req, res) => {
  try {
    const email = sanitize(req.body.email).toLowerCase();
    const password = sanitize(req.body.password);
    const user = await User.findOne({ email, password });
    if (!user) return res.redirect('/login?error=Invalid%20credentials');

    req.session.user = {
      _id: user._id.toString(),
      full_name: user.full_name,
      email: user.email,
      role: user.role
    };

    await logAudit(req, user, 'Login', 'User', user._id, `User logged in: ${user.email}`);
    return res.redirect('/app?page=dashboard');
  } catch (error) {
    console.error(error);
    return res.redirect('/login?error=Database%20Error');
  }
});

app.get('/logout', requireAuth, async (req, res) => {
  try {
    await logAudit(req, req.session.user, 'Logout', 'User', req.session.user._id, `User logged out: ${req.session.user.email}`);
  } catch (e) {}
  req.session.destroy(() => res.redirect('/login'));
});

const PAGE_CONFIG = {
  dashboard: 'Dashboard',
  products: 'Products',
  categories: 'Categories',
  suppliers: 'Suppliers',
  warehouses: 'Warehouses',
  stock: 'Stock Movements',
  purchases: 'Purchases',
  sales: 'Sales',
  notifications: 'Notifications',
  settings: 'Settings',
  audit: 'Audit Logs',
  users: 'Users'
};

app.get('/app', requireAuth, async (req, res) => {
  try {
    const page = String(req.query.page || 'dashboard').toLowerCase();
    const user = req.session.user;
    const search = sanitize(req.query.search || '');
    const message = sanitize(req.query.msg || '');
    const data = {
      user,
      page,
      pageTitle: PAGE_CONFIG[page] || 'Dashboard',
      message,
      rows: [],
      total: 0,
      productsCount: 0,
      categoriesCount: 0,
      suppliersCount: 0,
      warehousesCount: 0,
      salesCount: 0,
      purchasesCount: 0,
      lowStockCount: 0,
      chartLabels: [],
      chartData: [],
      product: null,
      category: null,
      supplier: null,
      warehouse: null,
      notification: null,
      products: [],
      categories: [],
      suppliers: [],
      warehouses: [],
      movements: [],
      purchases: [],
      sales: [],
      notifications: [],
      auditlogs: [],
      users: []
    };

    if (req.query.delete && req.query.table && req.query.id) {
      const { table, id } = req.query;
      const map = {
        products: Product,
        categories: Category,
        suppliers: Supplier,
        warehouses: Warehouse,
        stock: StockMovement,
        purchases: Purchase,
        sales: Sale,
        notifications: Notification,
        users: User
      };
      const Model = map[table];
      if (Model) {
        await Model.findByIdAndDelete(id);
        await logAudit(req, user, 'Delete', table, id, `Deleted ${table} record`);
      }
      return res.redirect(`/app?page=${page}&msg=Record%20deleted%20successfully.`);
    }

    if (req.method === 'POST') {
      const action = req.body.action;

      if (action === 'add_category') {
        await Category.create({
          name: sanitize(req.body.name),
          description: sanitize(req.body.description || ''),
          createdBy: user._id,
          status: 'Active'
        });
        await logAudit(req, user, 'Create', 'Category', '', `Created category ${req.body.name}`);
        return res.redirect('/app?page=categories&msg=Category%20created%20successfully.');
      }

      if (action === 'add_supplier') {
        await Supplier.create({
          supplierCode: req.body.supplierCode || generateCode('SUP'),
          companyName: sanitize(req.body.companyName),
          contactPerson: sanitize(req.body.contactPerson || ''),
          email: sanitize(req.body.email || '').toLowerCase(),
          phone: sanitize(req.body.phone || ''),
          address: sanitize(req.body.address || ''),
          createdBy: user._id,
          status: 'Active'
        });
        await logAudit(req, user, 'Create', 'Supplier', '', `Created supplier ${req.body.companyName}`);
        return res.redirect('/app?page=suppliers&msg=Supplier%20created%20successfully.');
      }

      if (action === 'add_product') {
        await Product.create({
          sku: req.body.sku || generateCode('SKU'),
          name: sanitize(req.body.name),
          categoryId: req.body.categoryId || null,
          supplierId: req.body.supplierId || null,
          unit: sanitize(req.body.unit || 'pcs'),
          costPrice: Number(req.body.costPrice || 0),
          sellingPrice: Number(req.body.sellingPrice || 0),
          stockQty: Number(req.body.stockQty || 0),
          reorderLevel: Number(req.body.reorderLevel || 0),
          description: sanitize(req.body.description || ''),
          createdBy: user._id,
          status: 'Active'
        });
        await logAudit(req, user, 'Create', 'Product', '', `Created product ${req.body.name}`);
        return res.redirect('/app?page=products&msg=Product%20created%20successfully.');
      }

      if (action === 'add_warehouse') {
        await Warehouse.create({
          code: req.body.code || generateCode('WH'),
          name: sanitize(req.body.name),
          location: sanitize(req.body.location || ''),
          managerName: sanitize(req.body.managerName || ''),
          createdBy: user._id,
          status: 'Active'
        });
        await logAudit(req, user, 'Create', 'Warehouse', '', `Created warehouse ${req.body.name}`);
        return res.redirect('/app?page=warehouses&msg=Warehouse%20created%20successfully.');
      }

      if (action === 'add_stock') {
        await StockMovement.create({
          movementCode: req.body.movementCode || generateCode('MOV'),
          productId: req.body.productId,
          warehouseId: req.body.warehouseId || null,
          movementType: req.body.movementType,
          quantity: Number(req.body.quantity || 0),
          referenceType: sanitize(req.body.referenceType || ''),
          referenceId: sanitize(req.body.referenceId || ''),
          notes: sanitize(req.body.notes || ''),
          movementDate: req.body.movementDate ? new Date(req.body.movementDate) : new Date(),
          createdBy: user._id,
          status: 'Active'
        });
        await logAudit(req, user, 'Create', 'StockMovement', '', `Created stock movement`);
        return res.redirect('/app?page=stock&msg=Stock%20movement%20saved%20successfully.');
      }

      if (action === 'add_purchase') {
        const total = Number(req.body.totalAmount || 0);
        const paid = Number(req.body.paidAmount || 0);
        await Purchase.create({
          purchaseCode: req.body.purchaseCode || generateCode('PUR'),
          supplierId: req.body.supplierId,
          purchaseDate: req.body.purchaseDate ? new Date(req.body.purchaseDate) : new Date(),
          totalAmount: total,
          paidAmount: paid,
          balanceAmount: total - paid,
          paymentStatus: req.body.paymentStatus || 'Pending',
          notes: sanitize(req.body.notes || ''),
          createdBy: user._id,
          status: 'Active'
        });
        await logAudit(req, user, 'Create', 'Purchase', '', `Created purchase`);
        return res.redirect('/app?page=purchases&msg=Purchase%20created%20successfully.');
      }

      if (action === 'add_sale') {
        const total = Number(req.body.totalAmount || 0);
        const paid = Number(req.body.paidAmount || 0);
        await Sale.create({
          saleCode: req.body.saleCode || generateCode('SAL'),
          customerName: sanitize(req.body.customerName),
          customerEmail: sanitize(req.body.customerEmail || '').toLowerCase(),
          saleDate: req.body.saleDate ? new Date(req.body.saleDate) : new Date(),
          totalAmount: total,
          paidAmount: paid,
          balanceAmount: total - paid,
          paymentStatus: req.body.paymentStatus || 'Pending',
          notes: sanitize(req.body.notes || ''),
          createdBy: user._id,
          status: 'Active'
        });
        await logAudit(req, user, 'Create', 'Sale', '', `Created sale`);
        return res.redirect('/app?page=sales&msg=Sale%20created%20successfully.');
      }

      if (action === 'send_notification') {
        await Notification.create({
          title: sanitize(req.body.title),
          message: sanitize(req.body.message),
          type: sanitize(req.body.type || 'Info'),
          createdBy: user._id,
          status: 'Active'
        });
        await logAudit(req, user, 'Create', 'Notification', '', `Sent notification`);
        return res.redirect('/app?page=notifications&msg=Notification%20sent%20successfully.');
      }

      if (action === 'add_user') {
        await User.create({
          full_name: sanitize(req.body.full_name),
          email: sanitize(req.body.email).toLowerCase(),
          password: sanitize(req.body.password || '123456'),
          role: sanitize(req.body.role || 'viewer'),
          phone: sanitize(req.body.phone || ''),
          status: 'Active'
        });
        await logAudit(req, user, 'Create', 'User', '', `Created user ${req.body.email}`);
        return res.redirect('/app?page=users&msg=User%20created%20successfully.');
      }
    }

    data.productsCount = await Product.countDocuments({});
    data.categoriesCount = await Category.countDocuments({});
    data.suppliersCount = await Supplier.countDocuments({});
    data.warehousesCount = await Warehouse.countDocuments({});
    data.salesCount = await Sale.countDocuments({});
    data.purchasesCount = await Purchase.countDocuments({});
    data.lowStockCount = await Product.countDocuments({ stockQty: { $lte: 10 } });

    if (page === 'dashboard') {
      data.products = await Product.find({}).sort({ createdAt: -1 }).limit(5).lean();
      data.auditlogs = await AuditLog.find({}).sort({ createdAt: -1 }).limit(8).lean();
      data.notifications = await Notification.find({}).sort({ createdAt: -1 }).limit(5).lean();
      data.chartLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      data.chartData = [12, 19, 9, 15, 22, 18];
    }

    if (page === 'products') {
      data.products = await Product.find({})
        .populate('categoryId')
        .populate('supplierId')
        .sort({ createdAt: -1 })
        .lean();
      data.categories = await Category.find({}).sort({ name: 1 }).lean();
      data.suppliers = await Supplier.find({}).sort({ companyName: 1 }).lean();
    }

    if (page === 'categories') {
      data.categories = await Category.find({}).sort({ createdAt: -1 }).lean();
    }

    if (page === 'suppliers') {
      data.suppliers = await Supplier.find({}).sort({ createdAt: -1 }).lean();
    }

    if (page === 'warehouses') {
      data.warehouses = await Warehouse.find({}).sort({ createdAt: -1 }).lean();
    }

    if (page === 'stock') {
      data.movements = await StockMovement.find({})
        .populate('productId')
        .populate('warehouseId')
        .sort({ createdAt: -1 })
        .lean();
      data.products = await Product.find({}).sort({ name: 1 }).lean();
      data.warehouses = await Warehouse.find({}).sort({ name: 1 }).lean();
    }

    if (page === 'purchases') {
      data.purchases = await Purchase.find({})
        .populate('supplierId')
        .sort({ createdAt: -1 })
        .lean();
      data.suppliers = await Supplier.find({}).sort({ companyName: 1 }).lean();
    }

    if (page === 'sales') {
      data.sales = await Sale.find({}).sort({ createdAt: -1 }).lean();
    }

    if (page === 'notifications') {
      data.notifications = await Notification.find({}).sort({ createdAt: -1 }).lean();
    }

    if (page === 'settings') {
      data.settings = await Setting.find({}).sort({ createdAt: -1 }).lean();
    }

    if (page === 'audit') {
      data.auditlogs = await AuditLog.find({})
        .populate('createdBy')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
    }

    if (page === 'users') {
      data.users = await User.find({}).sort({ createdAt: -1 }).lean();
    }

    return res.render('app', data);
  } catch (error) {
    console.error(error);
    return res.status(500).send('An error occurred while loading the page.');
  }
});

app.use((req, res) => {
  res.status(404).send(`Route Not Found: ${req.method} ${req.url}`);
});

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI);
    await seedAdmin();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Inventory ERP running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
}

startServer();

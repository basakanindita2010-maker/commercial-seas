require('dotenv').config();

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is missing.');
  console.error('You must set MONGODB_URI in your Render.com environment variables.');
  process.exit(1);
}

mongoose.set('strictQuery', true);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'secret_key_cms',
  resave: false,
  saveUninitialized: true
}));

const { Schema } = mongoose;

const CourseSchema = new Schema({
  name: { type: String, required: true, trim: true }
});

const SubjectSchema = new Schema({
  name: { type: String, required: true, trim: true },
  course_id: { type: Schema.Types.ObjectId, ref: 'Course', required: true }
});

const UserSchema = new Schema({
  full_name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true },
  password: { type: String, default: '123456' },
  role: { type: String, enum: ['admin', 'staff', 'student'], required: true },
  gender: { type: String, default: '' },
  address: { type: String, default: '' },
  profile_pic: { type: String, default: 'default.png' },
  course_id: { type: Schema.Types.ObjectId, ref: 'Course', default: null },
  session_id: { type: String, default: '' }
});

const AttendanceSchema = new Schema({
  student_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  subject_id: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
  course_id: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  status: { type: String, required: true },
  date: { type: String, required: true }
});

const ScoreSchema = new Schema({
  student_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  subject_id: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
  score: { type: Number, default: 0 }
});

const LeaveSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, required: true },
  date: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, default: 'Pending' },
  created_at: { type: Date, default: Date.now }
});

const NotificationSchema = new Schema({
  message: { type: String, required: true },
  type: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

const FeedbackSchema = new Schema({
  student_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

const Course = mongoose.model('Course', CourseSchema);
const Subject = mongoose.model('Subject', SubjectSchema);
const User = mongoose.model('User', UserSchema);
const Attendance = mongoose.model('Attendance', AttendanceSchema);
const Score = mongoose.model('Score', ScoreSchema);
const Leave = mongoose.model('Leave', LeaveSchema);
const Notification = mongoose.model('Notification', NotificationSchema);
const Feedback = mongoose.model('Feedback', FeedbackSchema);

async function initAdmin() {
  const existingAdmin = await User.findOne({ role: 'admin' });
  if (!existingAdmin) {
    await User.create({
      full_name: 'Administrator',
      email: 'admin@gmail.com',
      password: '123456',
      role: 'admin',
      gender: '',
      address: '',
      profile_pic: 'default.png'
    });
    console.log('Admin user created: admin@gmail.com / 123456');
  }
}

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

app.get('/', (req, res) => {
  res.redirect('/app');
});

app.get('/login', (req, res) => {
  res.render('login', { error: req.query.error || '' });
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    if (!user) return res.redirect('/login?error=Invalid%20credentials');

    req.session.user = {
      _id: user._id.toString(),
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      gender: user.gender,
      course_id: user.course_id ? user.course_id.toString() : ''
    };

    return res.redirect('/app?page=dashboard');
  } catch (error) {
    console.error(error);
    return res.redirect('/login?error=Database%20Error');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

async function appHandler(req, res) {
  try {
    const success_msg = req.query.msg || '';
    const page = req.query.page || 'dashboard';
    const user = req.session.user;

    if (req.query.delete && req.query.table && req.query.id) {
      const { table, id } = req.query;
      if (table === 'courses') {
        await Course.findByIdAndDelete(id);
      } else if (table === 'subjects') {
        await Subject.findByIdAndDelete(id);
      } else if (table === 'staff' || table === 'students') {
        await User.findByIdAndDelete(id);
      }
      return res.redirect(`/app?page=${encodeURIComponent(page)}&msg=Record%20deleted%20successfully.`);
    }

    if (req.method === 'POST') {
      const action = req.body.action;

      if (action === 'add_course') {
        await Course.create({ name: req.body.name });
        return res.redirect(`/app?page=courses&msg=Course%20added%20successfully.`);
      }

      if (action === 'add_subject') {
        await Subject.create({ name: req.body.name, course_id: req.body.course_id });
        return res.redirect(`/app?page=subjects&msg=Subject%20added%20successfully.`);
      }

      if (action === 'add_staff') {
        await User.create({
          full_name: req.body.full_name,
          email: req.body.email,
          password: req.body.password || '123456',
          role: 'staff',
          gender: req.body.gender || '',
          address: req.body.address || '',
          profile_pic: 'default.png',
          course_id: null
        });
        return res.redirect(`/app?page=manage_staff&msg=Staff%20added%20successfully.`);
      }

      if (action === 'add_student') {
        await User.create({
          full_name: req.body.full_name,
          email: req.body.email,
          password: req.body.password || '123456',
          role: 'student',
          gender: req.body.gender || '',
          address: req.body.address || '',
          profile_pic: 'default.png',
          course_id: req.body.course_id || null
        });
        return res.redirect(`/app?page=manage_students&msg=Student%20added%20successfully.`);
      }

      if (action === 'save_attendance') {
        const { date, course_id, subject_id, attendance } = req.body;
        await Attendance.deleteMany({ date, course_id, subject_id });

        if (attendance && typeof attendance === 'object') {
          for (const studentId of Object.keys(attendance)) {
            await Attendance.create({
              student_id: studentId,
              subject_id,
              course_id,
              status: attendance[studentId],
              date
            });
          }
        }

        return res.redirect(`/app?page=take_attendance&msg=Attendance%20saved%20successfully.`);
      }

      if (action === 'save_scores') {
        const { subject_id, score } = req.body;
        if (score && typeof score === 'object') {
          for (const studentId of Object.keys(score)) {
            const val = score[studentId];
            if (val !== '' && val !== null && typeof val !== 'undefined') {
              await Score.findOneAndUpdate(
                { student_id: studentId, subject_id },
                { score: Number(val) },
                { upsert: true, new: true }
              );
            }
          }
        }

        return res.redirect(`/app?page=manage_exams&msg=Scores%20saved%20successfully.`);
      }

      if (action === 'apply_leave') {
        await Leave.create({
          user_id: user._id,
          role: user.role,
          date: req.body.date,
          message: req.body.message
        });
        return res.redirect(`/app?page=apply_leave&msg=Leave%20applied%20successfully.`);
      }

      if (action === 'update_leave') {
        await Leave.findByIdAndUpdate(req.body.leave_id, { status: req.body.status });
        return res.redirect(`/app?page=notifications&msg=Leave%20status%20updated%20successfully.`);
      }

      if (action === 'send_notification') {
        await Notification.create({
          message: req.body.message,
          type: req.body.type
        });
        return res.redirect(`/app?page=notify&msg=Notification%20sent%20successfully.`);
      }

      if (action === 'send_feedback') {
        await Feedback.create({
          student_id: user._id,
          message: req.body.message
        });
        return res.redirect(`/app?page=feedback&msg=Feedback%20sent%20successfully.`);
      }
    }

    const data = {
      user,
      page,
      success_msg,
      fetched_students: [],
      exam_students: [],
      existing_scores: {},
      existing_attendance: {}
    };

    data.courses = await Course.find({});
    data.subjects = await Subject.find({}).populate('course_id');

    if (page === 'dashboard') {
      data.total_students = await User.countDocuments({ role: 'student' });
      data.total_staff = await User.countDocuments({ role: 'staff' });
      data.total_courses = await Course.countDocuments({});
      data.total_subjects = await Subject.countDocuments({});
      data.att_count = await Attendance.countDocuments({});

      if (user.role === 'student') {
        data.total_present = await Attendance.countDocuments({ student_id: user._id, status: 'Present' });
        data.total_total = await Attendance.countDocuments({ student_id: user._id });
      }
    }

    if (page === 'manage_staff') {
      data.staffs = await User.find({ role: 'staff' });
    }

    if (page === 'manage_students') {
      data.students = await User.find({ role: 'student' }).populate('course_id');
    }

    if (page === 'manage_attendance' || page === 'take_attendance') {
      if (req.query.fetch_course && req.query.fetch_date && req.query.fetch_subject) {
        const students = await User.find({ role: 'student', course_id: req.query.fetch_course });
        const records = await Attendance.find({
          date: req.query.fetch_date,
          course_id: req.query.fetch_course,
          subject_id: req.query.fetch_subject
        });

        const map = {};
        records.forEach(r => {
          map[r.student_id.toString()] = r.status;
        });

        data.fetched_students = students;
        data.existing_attendance = map;
        data.fetch_date = req.query.fetch_date;
        data.fetch_course = req.query.fetch_course;
        data.fetch_subject = req.query.fetch_subject;
      }
    }

    if (page === 'manage_exams') {
      if (req.query.fetch_course && req.query.fetch_subject) {
        const students = await User.find({ role: 'student', course_id: req.query.fetch_course });
        const records = await Score.find({ subject_id: req.query.fetch_subject });

        const map = {};
        records.forEach(r => {
          map[r.student_id.toString()] = r.score;
        });

        data.exam_students = students;
        data.existing_scores = map;
        data.fetch_course = req.query.fetch_course;
        data.fetch_subject = req.query.fetch_subject;
      }
    }

    if (page === 'notifications' && user.role === 'admin') {
      data.leaves = await Leave.find({}).populate('user_id').sort({ created_at: -1 });
    }

    if (page === 'staff_notifs' || page === 'student_notifs') {
      const type = user.role;
      data.notifs = await Notification.find({ type }).sort({ created_at: -1 });
    }

    if (page === 'apply_leave') {
      data.my_leaves = await Leave.find({ user_id: user._id }).sort({ created_at: -1 });
    }

    if (page === 'view_attendance' && user.role === 'staff') {
      data.logs = await Attendance.find({}).populate('student_id').populate('subject_id').sort({ date: -1 }).limit(50);
    }

    if (page === 'my_attendance' && user.role === 'student') {
      data.my_att = await Attendance.find({ student_id: user._id }).populate('subject_id').sort({ date: -1 });
    }

    if (page === 'exam_results' && user.role === 'student') {
      data.scores = await Score.find({ student_id: user._id }).populate('subject_id');
    }

    return res.render('app', data);
  } catch (error) {
    console.error(error);
    return res.status(500).send('An error occurred while loading the page.');
  }
}

app.get('/app', requireAuth, appHandler);
app.post('/app', requireAuth, appHandler);

app.use((req, res) => {
  res.status(404).send(`Route Not Found: ${req.method} ${req.url}`);
});

async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    await initAdmin();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
}

start();

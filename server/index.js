const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: __dirname + '/.env' });

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect(err => {
  if (err) { console.error('DB Error:', err); return; }
  console.log('✅ Connected to goatfarm_db');

  // ── vaccination_alerts table (goat-wise, exact datetime) ──
  db.query(`
    CREATE TABLE IF NOT EXISTS vaccination_alerts (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      user_id         INT NOT NULL,
      vaccination_id  INT NOT NULL,
      alert_datetime  DATETIME NOT NULL,
      sent            TINYINT(1) DEFAULT 0,
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (vaccination_id) REFERENCES vaccinations(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) console.error('vaccination_alerts table error:', err);
    else console.log('✅ vaccination_alerts table ready');
  });
});

// ─── UPLOADS DIRECTORY SETUP ─────────────────────────────
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `user_${req.params.id}_${Date.now()}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images'));
  }
});

app.use('/uploads', express.static(uploadDir));

// ─── NODEMAILER SETUP ────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASS,
  },
});

// ─── GOAT-WISE VACCINATION EMAIL FUNCTION ────────────────
function sendGoatAlert(alertRow) {
  const { email, full_name, goat_code, vaccine_name, next_due } = alertRow;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:linear-gradient(135deg,#1B5E20,#388E3C);padding:24px 28px;border-radius:12px 12px 0 0;">
        <h2 style="color:#fff;margin:0;">🐐 GoatFarm Pro</h2>
        <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:14px;">Vaccination Reminder</p>
      </div>
      <div style="background:#fff;padding:24px 28px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 12px 12px;">
        <p style="font-size:15px;color:#333;margin-bottom:4px;">Hello <b>${full_name}</b>,</p>
        <p style="color:#555;font-size:14px;">This is a reminder that the following goat has a vaccination due soon:</p>

        <table style="width:100%;border-collapse:collapse;margin:16px 0;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background:#E8F5E9;">
              <th style="padding:10px 14px;text-align:left;color:#2E7D32;font-size:13px;">Goat ID</th>
              <th style="padding:10px 14px;text-align:left;color:#2E7D32;font-size:13px;">Vaccine</th>
              <th style="padding:10px 14px;text-align:left;color:#2E7D32;font-size:13px;">Due Date</th>
              <th style="padding:10px 14px;text-align:left;color:#2E7D32;font-size:13px;">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid #eee;">
              <td style="padding:10px 14px;font-weight:700;color:#2E7D32;font-size:14px;">${goat_code}</td>
              <td style="padding:10px 14px;font-size:14px;">${vaccine_name}</td>
              <td style="padding:10px 14px;font-size:14px;color:#E65100;font-weight:600;">${next_due}</td>
              <td style="padding:10px 14px;">
                <span style="background:#FFF3E0;color:#E65100;padding:3px 10px;border-radius:5px;font-size:12px;font-weight:600;">⚠️ Pending</span>
              </td>
            </tr>
          </tbody>
        </table>

        <p style="color:#555;font-size:13px;">Please log in to <b>GoatFarm Pro</b> to mark this vaccination as done once completed.</p>
        <p style="color:#aaa;font-size:12px;margin-top:20px;border-top:1px solid #eee;padding-top:12px;">
          This is an automated alert from GoatFarm Pro. You set this reminder yourself.
        </p>
      </div>
    </div>`;

  transporter.sendMail({
    from: `"GoatFarm Pro" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `🔔 Vaccination Reminder — ${goat_code} needs ${vaccine_name} (Due: ${next_due})`,
    html,
  }, (mailErr, info) => {
    if (mailErr) console.error(`❌ Alert email failed to ${email}:`, mailErr.message);
    else console.log(`✅ Alert email sent to ${email} for goat ${goat_code}:`, info.messageId);
  });
}

// ─── PER-MINUTE CRON: Check exact datetime alerts ────────
cron.schedule('* * * * *', () => {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const windowStart = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:00`;
  const windowEnd   = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:59`;

  db.query(
    `SELECT va.id as alert_id, va.vaccination_id,
            v.vaccine_name, DATE_FORMAT(v.next_due, "%Y-%m-%d") as next_due,
            g.goat_code,
            u.email, u.full_name
     FROM vaccination_alerts va
     JOIN vaccinations v ON va.vaccination_id = v.id
     JOIN goats g ON v.goat_id = g.id
     JOIN users u ON va.user_id = u.id
     WHERE va.sent = 0
       AND va.alert_datetime BETWEEN ? AND ?`,
    [windowStart, windowEnd],
    (err, rows) => {
      if (err) { console.error('Alert cron error:', err); return; }
      if (!rows.length) return;
      rows.forEach(row => {
        console.log(`⏰ Sending alert for goat ${row.goat_code} (alert_id=${row.alert_id})`);
        sendGoatAlert(row);
        db.query('UPDATE vaccination_alerts SET sent = 1 WHERE id = ?', [row.alert_id]);
      });
    }
  );
});

// ─── DAILY 7AM CRON: Auto-mark overdue vaccinations ──────
cron.schedule('0 7 * * *', () => {
  const today = new Date().toISOString().slice(0, 10);
  db.query(
    `UPDATE vaccinations SET status='Overdue'
     WHERE status='Pending' AND next_due IS NOT NULL AND next_due < ?`,
    [today],
    (err, result) => {
      if (err) console.error('Overdue update error:', err);
      else if (result.affectedRows > 0)
        console.log(`⚠️ ${result.affectedRows} vaccinations marked Overdue`);
    }
  );
  db.query(
    `SELECT g.id, g.goat_code, g.weaning_date, u.email, u.full_name
     FROM goats g JOIN users u ON g.user_id = u.id
     WHERE g.life_stage = 'Kid' AND g.weaning_date = ?`,
    [today],
    (err, rows) => {
      if (err || !rows.length) return;
      console.log(`🍼 ${rows.length} kids due for weaning today`);
    }
  );
});

console.log('⏰ Cron jobs scheduled (every-minute alert check, 7AM overdue update)');

// ═══════════════════════════════════════════════════════
// ─── VACCINATION ALERTS (GOAT-WISE) ─────────────────────
// ═══════════════════════════════════════════════════════

app.get('/api/vaccination-alerts', (req, res) => {
  const user_id = req.query.user_id;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  db.query(
    `SELECT va.id, va.vaccination_id, va.alert_datetime, va.sent,
            v.vaccine_name as vaccine, DATE_FORMAT(v.next_due, "%Y-%m-%d") as nextDue,
            g.goat_code as goat
     FROM vaccination_alerts va
     JOIN vaccinations v ON va.vaccination_id = v.id
     JOIN goats g ON v.goat_id = g.id
     WHERE va.user_id = ? AND va.sent = 0
     ORDER BY va.alert_datetime ASC`,
    [user_id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.post('/api/vaccination-alerts', (req, res) => {
  const { user_id, vaccination_id, alert_datetime } = req.body;
  if (!user_id || !vaccination_id || !alert_datetime)
    return res.status(400).json({ error: 'user_id, vaccination_id, alert_datetime required' });

  db.query(
    'SELECT next_due FROM vaccinations WHERE id = ?',
    [vaccination_id],
    (err, rows) => {
      if (err || !rows.length) return res.status(404).json({ error: 'Vaccination not found' });
      const nextDue = rows[0].next_due;
      if (nextDue) {
        const alertDt = new Date(alert_datetime);
        const maxDt = new Date(nextDue);
        maxDt.setHours(23, 59, 59);
        if (alertDt > maxDt) {
          return res.status(400).json({ error: `Alert cannot be set after due date (${nextDue})` });
        }
      }
      db.query(
        'INSERT INTO vaccination_alerts (user_id, vaccination_id, alert_datetime) VALUES (?, ?, ?)',
        [user_id, vaccination_id, alert_datetime],
        (err2, result) => {
          if (err2) return res.status(500).json({ error: err2.message });
          res.json({ success: true, id: result.insertId, vaccination_id, alert_datetime });
        }
      );
    }
  );
});

app.delete('/api/vaccination-alerts/:id', (req, res) => {
  db.query('DELETE FROM vaccination_alerts WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ═══════════════════════════════════════════════════════
// ─── GOATS ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════

app.get('/api/goats', (req, res) => {
  const user_id = req.query.user_id;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  db.query(
    `SELECT g.id, g.goat_code, g.breed, g.gender,
TIMESTAMPDIFF(YEAR, g.birth_date, CURDATE()) as age_years,
TIMESTAMPDIFF(MONTH, g.birth_date, CURDATE()) as age_months,
TIMESTAMPDIFF(DAY, g.birth_date, CURDATE()) as age_days,
g.weight,
g.health_status as health,
DATE_FORMAT(g.created_at, "%Y-%m-%d") as added,
CASE
  WHEN TIMESTAMPDIFF(MONTH, g.birth_date, CURDATE()) < 6 THEN 'Kid'
  WHEN TIMESTAMPDIFF(MONTH, g.birth_date, CURDATE()) < 12 THEN 'Juvenile'
  ELSE 'Adult'
END as life_stage,
g.mother_id, gm.goat_code as mother_code,
g.father_id, gf.goat_code as father_code,
DATE_FORMAT(g.birth_date, "%Y-%m-%d") as birth_date,
DATE_FORMAT(g.weaning_date, "%Y-%m-%d") as weaning_date,
g.breeding_id,
g.group_id, gg.name as group_name, gg.color as group_color
     FROM goats g
     LEFT JOIN goats gm ON g.mother_id = gm.id
     LEFT JOIN goats gf ON g.father_id = gf.id
     LEFT JOIN goat_groups gg ON g.group_id = gg.id
     WHERE g.user_id=? ORDER BY g.id DESC`,
    [user_id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.post('/api/goats', (req, res) => {
const { goat_code, breed, weight, health, gender, user_id,
        life_stage, mother_id, father_id, birth_date, breeding_id, group_id } = req.body;
  if (!goat_code) return res.status(400).json({ error: 'Goat ID required hai' });
  const uid = user_id || 1;
  db.query('SELECT id FROM goats WHERE goat_code=? AND user_id=?', [goat_code, uid], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (rows.length > 0) return res.status(400).json({ error: ' Add Uniq Goat ID ' });

  let stage = 'Adult';

if (birth_date) {
  const months = Math.floor((new Date() - new Date(birth_date)) / (1000 * 60 * 60 * 24 * 30));

  if (months < 6) stage = 'Kid';
  else if (months < 12) stage = 'Juvenile';
  else stage = 'Adult';
}
    const weaningDate = (stage === 'Kid' && birth_date)
      ? (() => { const d = new Date(birth_date); d.setDate(d.getDate() + 90); return d.toISOString().slice(0, 10); })()
      : null;

    db.query(
     `INSERT INTO goats (user_id, goat_code, breed, gender, weight, health_status,
life_stage, mother_id, father_id, birth_date, weaning_date, breeding_id, group_id)
VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
[uid, goat_code, breed, gender||'Female', weight||null, health||'Healthy',
 stage, mother_id||null, father_id||null, birth_date||null, weaningDate,
 breeding_id||null, group_id||null],
      (err2, result) => {
        if (err2) return res.status(500).json({ error: err2.message });
        const added = new Date().toISOString().slice(0, 10);
      res.json({
  id: result.insertId,
  goat_code,
  breed,
  gender: gender || 'Female',
  weight,
  health: health || 'Healthy',
  added,
  life_stage: stage,
  mother_id: mother_id || null,
  father_id: father_id || null,
  birth_date: birth_date || null,
  weaning_date: weaningDate,
  breeding_id: breeding_id || null,
});
      }
    );
  });
});

app.put('/api/goats/:id', (req, res) => {
const { goat_code, breed, birth_date, weight, health, gender, life_stage, group_id } = req.body;
  if (!goat_code) return res.status(400).json({ error: 'Goat ID required hai' });
  db.query('SELECT user_id FROM goats WHERE id=?', [req.params.id], (errU, uRows) => {
    if (errU || !uRows.length) return res.status(404).json({ error: 'Goat nahi mila' });
    const owner_id = uRows[0].user_id;
    db.query('SELECT id FROM goats WHERE goat_code=? AND user_id=? AND id!=?',
      [goat_code, owner_id, req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        if (rows.length > 0) return res.status(400).json({ error: 'Aapke farm mein yeh Goat ID kisi aur goat ka hai' });
        db.query(
`UPDATE goats SET goat_code=?, breed=?, birth_date=?, weight=?, health_status=?,
gender=?, life_stage=?, group_id=? WHERE id=?`,
[goat_code, breed, birth_date||null, weight||null, health||'Healthy',
 gender||'Female', life_stage||'Adult', group_id||null, req.params.id],
          (err2) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ success: true });
          }
        );
      }
    );
  });
});

app.put('/api/goats/:id/promote', (req, res) => {
  const { gender } = req.body;
  const today = new Date().toISOString().slice(0, 10);
  db.query(
    `UPDATE goats SET life_stage='Adult', gender=?, promoted_at=? WHERE id=?`,
    [gender || 'Female', today, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, life_stage: 'Adult', promoted_at: today });
    }
  );
});

app.delete('/api/goats/:id', (req, res) => {
  db.query('DELETE FROM goats WHERE id=?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.get('/api/goats/:goat_code/profile', (req, res) => {
  const goat_code = req.params.goat_code;
  const user_id = req.query.user_id;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });

  db.query(
    `SELECT g.*, DATE_FORMAT(g.birth_date,"%Y-%m-%d") as birth_date_fmt,
     DATE_FORMAT(g.weaning_date,"%Y-%m-%d") as weaning_date_fmt,
     DATE_FORMAT(g.promoted_at,"%Y-%m-%d") as promoted_at_fmt,
     gm.goat_code as mother_code, gf.goat_code as father_code
     FROM goats g
     LEFT JOIN goats gm ON g.mother_id = gm.id
     LEFT JOIN goats gf ON g.father_id = gf.id
     WHERE g.goat_code=? AND g.user_id=?`,
    [goat_code, user_id],
    (err, goatRows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!goatRows || goatRows.length === 0) return res.status(404).json({ error: 'Goat nahi mila' });
      const goat = goatRows[0];
      const id = goat.id;

      Promise.all([
        new Promise((resolve, reject) => {
          db.query(
            `SELECT id, source, amount, DATE_FORMAT(date,"%Y-%m-%d") as date, notes
             FROM income WHERE goat_id=? AND user_id=? ORDER BY date DESC`,
            [id, user_id], (err, rows) => err ? reject(err) : resolve(rows)
          );
        }),
        new Promise((resolve, reject) => {
          db.query(
            `SELECT id, type, category, amount, DATE_FORMAT(date,"%Y-%m-%d") as date, notes
             FROM expenses WHERE goat_id=? AND user_id=? ORDER BY date DESC`,
            [id, user_id], (err, rows) => err ? reject(err) : resolve(rows)
          );
        }),
        new Promise((resolve, reject) => {
          db.query(
            `SELECT v.id, v.vaccine_name,
             DATE_FORMAT(v.date_given,"%Y-%m-%d") as given,
             DATE_FORMAT(v.next_due,"%Y-%m-%d") as nextDue,
             v.status
             FROM vaccinations v JOIN goats g ON v.goat_id = g.id
             WHERE v.goat_id=? AND g.user_id=? ORDER BY v.id DESC`,
            [id, user_id], (err, rows) => err ? reject(err) : resolve(rows)
          );
        }),
        new Promise((resolve, reject) => {
          db.query(
            `SELECT id, record_type, diagnosis, medicine, dosage, vet_name, cost,
             DATE_FORMAT(date,"%Y-%m-%d") as date,
             DATE_FORMAT(followup_date,"%Y-%m-%d") as followup_date,
             notes FROM health_records
             WHERE goat_id=? AND user_id=? ORDER BY date DESC`,
            [id, user_id], (err, rows) => err ? reject(err) : resolve(rows)
          );
        }),
        new Promise((resolve, reject) => {
          db.query(
            `SELECT id, weight, DATE_FORMAT(date,"%Y-%m-%d") as date, notes
             FROM weight_logs WHERE goat_id=? AND user_id=? ORDER BY date ASC`,
            [id, user_id], (err, rows) => err ? reject(err) : resolve(rows)
          );
        }),
        new Promise((resolve, reject) => {
          db.query(
            `SELECT id, goat_code, breed, gender, life_stage,
             DATE_FORMAT(birth_date,"%Y-%m-%d") as birth_date,
             health_status as health
             FROM goats WHERE (mother_id=? OR father_id=?) AND user_id=?`,
            [id, id, user_id], (err, rows) => err ? reject(err) : resolve(rows)
          );
        }),
      ]).then(([income, expenses, vaccinations, healthRecords, weightLogs, kids]) => {
        const totalIncome = income.reduce((s, i) => s + Number(i.amount), 0);
        const totalExpense = expenses.reduce((s, e) => s + Number(e.amount), 0);
        res.json({
          goat, income, expenses, vaccinations, healthRecords, weightLogs, kids,
          totalIncome, totalExpense, netProfit: totalIncome - totalExpense,
        });
      }).catch(err => res.status(500).json({ error: err.message }));
    }
  );
});

// ═══════════════════════════════════════════════════════
// ─── INCOME ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════

app.get('/api/income', (req, res) => {
  const user_id = req.query.user_id;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  db.query(
    `SELECT i.id, i.goat_id, g.goat_code as goat, i.source, i.amount,
     DATE_FORMAT(i.date, "%Y-%m-%d") as date, i.notes,
     i.group_id, gg.name as group_name, gg.color as group_color
     FROM income i
     LEFT JOIN goats g ON i.goat_id = g.id
     LEFT JOIN goat_groups gg ON i.group_id = gg.id
     WHERE i.user_id=? ORDER BY i.date DESC`,
    [user_id], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows.map(r => ({ ...r, amount: Number(r.amount) })));
    }
  );
});

app.post('/api/income', (req, res) => {
  const { goat_id, source, amount, date, user_id, group_id } = req.body;
  const uid = user_id || 1;
  const d = date || new Date().toISOString().slice(0, 10);
  db.query(
    'INSERT INTO income (user_id, goat_id, source, amount, date, group_id) VALUES (?,?,?,?,?,?)',
    [uid, goat_id || null, source, Number(amount), d, group_id || null],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: result.insertId, goat_id: goat_id || null, source, amount: Number(amount), date: d, group_id: group_id || null });
    }
  );
});

app.put('/api/income/:id', (req, res) => {
  const { goat_id, source, amount, date, group_id } = req.body;
  db.query(
    'UPDATE income SET goat_id=?, source=?, amount=?, date=?, group_id=? WHERE id=?',
    [goat_id || null, source, Number(amount), date, group_id || null, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.delete('/api/income/:id', (req, res) => {
  db.query('DELETE FROM income WHERE id=?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ═══════════════════════════════════════════════════════
// ─── EXPENSES ───────────────────────────────────────────
// ═══════════════════════════════════════════════════════

app.get('/api/expenses', (req, res) => {
  const user_id = req.query.user_id;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  db.query(
    `SELECT e.id, e.goat_id, g.goat_code as goat, e.type, e.category, e.amount,
     DATE_FORMAT(e.date, "%Y-%m-%d") as date, e.notes,
     e.group_id, gg.name as group_name, gg.color as group_color
     FROM expenses e
     LEFT JOIN goats g ON e.goat_id = g.id
     LEFT JOIN goat_groups gg ON e.group_id = gg.id
     WHERE e.user_id=? ORDER BY e.date DESC`,
    [user_id], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows.map(r => ({ ...r, amount: Number(r.amount) })));
    }
  );
});

app.post('/api/expenses', (req, res) => {
  const { goat_id, type, category, amount, date, user_id, group_id } = req.body;
  const uid = user_id || 1;
  const d = date || new Date().toISOString().slice(0, 10);
  db.query(
    'INSERT INTO expenses (user_id, goat_id, type, category, amount, date, group_id) VALUES (?,?,?,?,?,?,?)',
    [uid, goat_id || null, type, category || 'Feed', Number(amount), d, group_id || null],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: result.insertId, goat_id: goat_id || null, type, category: category || 'Feed', amount: Number(amount), date: d, group_id: group_id || null });
    }
  );
});

app.put('/api/expenses/:id', (req, res) => {
  const { goat_id, type, category, amount, date, group_id } = req.body;
  db.query(
    'UPDATE expenses SET goat_id=?, type=?, category=?, amount=?, date=?, group_id=? WHERE id=?',
    [goat_id || null, type, category || 'Feed', Number(amount), date, group_id || null, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.delete('/api/expenses/:id', (req, res) => {
  db.query('DELETE FROM expenses WHERE id=?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ═══════════════════════════════════════════════════════
// ─── VACCINATIONS ───────────────────────────────────────
// ═══════════════════════════════════════════════════════

app.get('/api/vaccinations', (req, res) => {
  const user_id = req.query.user_id;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  db.query(
    `SELECT v.id, v.goat_id, g.goat_code as goat, v.vaccine_name as vaccine,
     DATE_FORMAT(v.date_given, "%Y-%m-%d") as \`given\`,
     DATE_FORMAT(v.next_due, "%Y-%m-%d") as nextDue, v.status, v.description
     FROM vaccinations v
     JOIN goats g ON v.goat_id = g.id
     WHERE g.user_id=? ORDER BY v.id DESC`,
    [user_id], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows.map(r => ({ ...r, given: r.given || '-', nextDue: r.nextDue || '-' })));
    }
  );
});

app.post('/api/vaccinations', (req, res) => {
  const { goat_id, vaccine, given, nextDue, description } = req.body;
  db.query(
    'INSERT INTO vaccinations (goat_id, vaccine_name, date_given, next_due, status, description) VALUES (?,?,?,?,?,?)',
    [goat_id, vaccine, given || null, nextDue || null, 'Pending', description || null],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      db.query('SELECT goat_code FROM goats WHERE id=?', [goat_id], (err2, rows) => {
        const goatCode = rows?.[0]?.goat_code || '';
        res.json({ id: result.insertId, goat_id, goat: goatCode, vaccine, given: given || '-', nextDue: nextDue || '-', status: 'Pending', description: description || null });
      });
    }
  );
});

app.put('/api/vaccinations/:id/done', (req, res) => {
  db.query("UPDATE vaccinations SET status='Done' WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ═══════════════════════════════════════════════════════
// ─── WEIGHT LOGS ────────────────────────────────────────
// ═══════════════════════════════════════════════════════

app.get('/api/weight-logs', (req, res) => {
  const { user_id, goat_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  const query = goat_id
    ? `SELECT wl.id, wl.goat_id, g.goat_code, wl.weight,
       DATE_FORMAT(wl.date,"%Y-%m-%d") as date, wl.notes
       FROM weight_logs wl JOIN goats g ON wl.goat_id = g.id
       WHERE wl.user_id=? AND wl.goat_id=? ORDER BY wl.date ASC`
    : `SELECT wl.id, wl.goat_id, g.goat_code, wl.weight,
       DATE_FORMAT(wl.date,"%Y-%m-%d") as date, wl.notes
       FROM weight_logs wl JOIN goats g ON wl.goat_id = g.id
       WHERE wl.user_id=? ORDER BY wl.date DESC`;
  const params = goat_id ? [user_id, goat_id] : [user_id];
  db.query(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => ({ ...r, weight: Number(r.weight) })));
  });
});

app.post('/api/weight-logs', (req, res) => {
  const { goat_id, weight, date, notes, user_id } = req.body;
  if (!goat_id || !weight) return res.status(400).json({ error: 'goat_id and weight required' });
  const d = date || new Date().toISOString().slice(0, 10);
  db.query(
    'INSERT INTO weight_logs (goat_id, user_id, weight, date, notes) VALUES (?,?,?,?,?)',
    [goat_id, user_id, Number(weight), d, notes || null],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      db.query('UPDATE goats SET weight=? WHERE id=?', [Number(weight), goat_id]);
      res.json({ id: result.insertId, goat_id, weight: Number(weight), date: d, notes: notes || null });
    }
  );
});

app.delete('/api/weight-logs/:id', (req, res) => {
  db.query('DELETE FROM weight_logs WHERE id=?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ═══════════════════════════════════════════════════════
// ─── HEALTH RECORDS ─────────────────────────────────────
// ═══════════════════════════════════════════════════════

app.get('/api/health-records', (req, res) => {
  const { user_id, goat_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  const query = goat_id
    ? `SELECT hr.id, hr.goat_id, g.goat_code, hr.record_type, hr.diagnosis,
       hr.medicine, hr.dosage, hr.vet_name, hr.cost,
       DATE_FORMAT(hr.date,"%Y-%m-%d") as date,
       DATE_FORMAT(hr.followup_date,"%Y-%m-%d") as followup_date,
       hr.notes FROM health_records hr
       JOIN goats g ON hr.goat_id = g.id
       WHERE hr.user_id=? AND hr.goat_id=? ORDER BY hr.date DESC`
    : `SELECT hr.id, hr.goat_id, g.goat_code, hr.record_type, hr.diagnosis,
       hr.medicine, hr.dosage, hr.vet_name, hr.cost,
       DATE_FORMAT(hr.date,"%Y-%m-%d") as date,
       DATE_FORMAT(hr.followup_date,"%Y-%m-%d") as followup_date,
       hr.notes FROM health_records hr
       JOIN goats g ON hr.goat_id = g.id
       WHERE hr.user_id=? ORDER BY hr.date DESC`;
  const params = goat_id ? [user_id, goat_id] : [user_id];
  db.query(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => ({ ...r, cost: Number(r.cost) })));
  });
});

app.post('/api/health-records', (req, res) => {
  const { goat_id, record_type, diagnosis, medicine, dosage, vet_name, cost, date, followup_date, notes, user_id } = req.body;
  if (!goat_id || !date) return res.status(400).json({ error: 'goat_id and date required' });
  db.query(
    `INSERT INTO health_records (goat_id, user_id, record_type, diagnosis, medicine, dosage,
     vet_name, cost, date, followup_date, notes)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [goat_id, user_id, record_type || 'Treatment', diagnosis || null, medicine || null,
     dosage || null, vet_name || null, Number(cost) || 0, date,
     followup_date || null, notes || null],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (Number(cost) > 0) {
        db.query(
          'INSERT INTO expenses (user_id, goat_id, type, category, amount, date) VALUES (?,?,?,?,?,?)',
          [user_id, goat_id, `Medical: ${diagnosis || record_type || 'Treatment'}`, 'Medical', Number(cost), date]
        );
      }
      res.json({ id: result.insertId, goat_id, record_type: record_type || 'Treatment', diagnosis, medicine, dosage, vet_name, cost: Number(cost) || 0, date, followup_date: followup_date || null, notes });
    }
  );
});

app.put('/api/health-records/:id', (req, res) => {
  const { record_type, diagnosis, medicine, dosage, vet_name, cost, date, followup_date, notes } = req.body;
  db.query(
    `UPDATE health_records SET record_type=?, diagnosis=?, medicine=?, dosage=?,
     vet_name=?, cost=?, date=?, followup_date=?, notes=? WHERE id=?`,
    [record_type || 'Treatment', diagnosis || null, medicine || null, dosage || null,
     vet_name || null, Number(cost) || 0, date, followup_date || null, notes || null, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.delete('/api/health-records/:id', (req, res) => {
  db.query('DELETE FROM health_records WHERE id=?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ═══════════════════════════════════════════════════════
// ─── DISPOSAL RECORDS ───────────────────────────────────
// ═══════════════════════════════════════════════════════

app.get('/api/disposal-records', (req, res) => {
  const user_id = req.query.user_id;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  db.query(
    `SELECT dr.id, dr.goat_id, g.goat_code, dr.disposal_type, dr.amount, dr.party_name,
     dr.cause, DATE_FORMAT(dr.date,"%Y-%m-%d") as date, dr.notes
     FROM disposal_records dr
     LEFT JOIN goats g ON dr.goat_id = g.id
     WHERE dr.user_id=? ORDER BY dr.date DESC`,
    [user_id], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows.map(r => ({ ...r, amount: Number(r.amount) })));
    }
  );
});

app.post('/api/disposal-records', (req, res) => {
  const { goat_id, disposal_type, date, amount, party_name, cause, notes, user_id } = req.body;
  if (!goat_id || !disposal_type || !date) return res.status(400).json({ error: 'goat_id, disposal_type, date required' });
  const uid = user_id || 1;
  db.query(
    'INSERT INTO disposal_records (user_id, goat_id, disposal_type, date, amount, party_name, cause, notes) VALUES (?,?,?,?,?,?,?,?)',
    [uid, goat_id, disposal_type, date, Number(amount) || 0, party_name || null, cause || null, notes || null],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (disposal_type === 'Sold' && Number(amount) > 0) {
        db.query('INSERT INTO income (user_id, goat_id, source, amount, date) VALUES (?,?,?,?,?)',
          [uid, goat_id, `Goat Sale${party_name ? ' to ' + party_name : ''}`, Number(amount), date]);
      } else if (disposal_type === 'Purchased' && Number(amount) > 0) {
        db.query('INSERT INTO expenses (user_id, goat_id, type, category, amount, date) VALUES (?,?,?,?,?,?)',
          [uid, goat_id, `Goat Purchase${party_name ? ' from ' + party_name : ''}`, 'Other', Number(amount), date]);
      }
      if (disposal_type === 'Sold' || disposal_type === 'Died') {
        db.query("UPDATE goats SET health_status='Sick' WHERE id=?", [goat_id]);
      }
      res.json({ id: result.insertId, goat_id, disposal_type, date, amount: Number(amount) || 0, party_name, cause, notes });
    }
  );
});

app.delete('/api/disposal-records/:id', (req, res) => {
  db.query('DELETE FROM disposal_records WHERE id=?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ═══════════════════════════════════════════════════════
// ─── KID REGISTRATION ───────────────────────────────────
// ═══════════════════════════════════════════════════════

app.post('/api/breeding/:id/register-kids', (req, res) => {
  const { kids, user_id } = req.body;
  if (!kids || !kids.length) return res.status(400).json({ error: 'Kids data required' });

  db.query(
    `SELECT br.*, gf.goat_code as female_code, gm.goat_code as male_code,
     gf.id as female_id, gm.id as male_id
     FROM breeding_records br
     JOIN goats gf ON br.female_goat_id = gf.id
     JOIN goats gm ON br.male_goat_id = gm.id
     WHERE br.id=?`,
    [req.params.id],
    (err, brRows) => {
      if (err || !brRows.length) return res.status(404).json({ error: 'Breeding record nahi mila' });
      const br = brRows[0];
      const birthDate = br.actual_delivery || new Date().toISOString().slice(0, 10);
      const registeredKids = [];
      let completed = 0;
      const errors = [];

      const allowed = br.survived || br.total_born || 0;

      db.query(
        `SELECT COUNT(*) as count FROM goats WHERE breeding_id = ?`,
        [req.params.id],
        (errCount, countRows) => {
          if (errCount) return res.status(500).json({ error: errCount.message });

          const alreadyRegistered = countRows[0].count;

          if (alreadyRegistered >= allowed) {
            return res.status(400).json({
              error: 'All kids already registered for this breeding record'
            });
          }

          const remaining = allowed - alreadyRegistered;
          const kidsToInsert = kids.slice(0, remaining);

          kidsToInsert.forEach((kid) => {
            const weaningDate = (() => {
              const d = new Date(birthDate);
              d.setDate(d.getDate() + 90);
              return d.toISOString().slice(0, 10);
            })();

            db.query(
              `INSERT INTO goats (user_id, goat_code, breed, gender, weight, health_status,
life_stage, mother_id, father_id, birth_date, weaning_date, breeding_id, group_id)
VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
              [
                user_id || 1,
                kid.goat_code,
                br.notes || 'Mixed',
                kid.gender || 'Female',
                kid.weight || null,
                'Healthy',
                'Kid',
                br.female_goat_id,
                br.male_goat_id,
                birthDate,
                weaningDate,
                br.id,
                kid.group_id || null,
              ],
              (err2, result) => {
                completed++;
                if (err2) {
                  errors.push({ code: kid.goat_code, error: err2.message });
                } else {
                  registeredKids.push({
                    id: result.insertId,
                    goat_code: kid.goat_code,
                    gender: kid.gender || 'Female',
                    life_stage: 'Kid',
                    birth_date: birthDate,
                    weaning_date: weaningDate,
                    mother_code: br.female_code,
                    father_code: br.male_code,
                  });
                }
                if (completed === kidsToInsert.length) {
                  res.json({ registered: registeredKids, errors });
                }
              }
            );
          });
        }
      );
    }
  );
});

// ═══════════════════════════════════════════════════════
// ─── DASHBOARD STATS ────────────────────────────────────
// ═══════════════════════════════════════════════════════

app.get('/api/dashboard/stats', (req, res) => {
  const user_id = req.query.user_id;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });

  const today = new Date().toISOString().slice(0, 10);
  const weekLater = new Date();
  weekLater.setDate(weekLater.getDate() + 7);
  const weekStr = weekLater.toISOString().slice(0, 10);
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().slice(0, 10);
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);

  Promise.all([
    new Promise((resolve, reject) => {
      db.query(
        `SELECT br.id, gf.goat_code as female_code, br.expected_delivery,
         DATEDIFF(br.expected_delivery, CURDATE()) as days_left
         FROM breeding_records br
         JOIN goats gf ON br.female_goat_id = gf.id
         WHERE br.user_id=? AND br.status='Pending' AND br.expected_delivery IS NOT NULL
         ORDER BY br.expected_delivery ASC`,
        [user_id], (err, rows) => err ? reject(err) : resolve(rows)
      );
    }),
    new Promise((resolve, reject) => {
      db.query(
        `SELECT COUNT(*) as count FROM vaccinations v
         JOIN goats g ON v.goat_id = g.id
         WHERE g.user_id=? AND v.status='Pending'
         AND v.next_due BETWEEN ? AND ?`,
        [user_id, today, weekStr], (err, rows) => err ? reject(err) : resolve(rows[0].count)
      );
    }),
    new Promise((resolve, reject) => {
      db.query(
        `SELECT COUNT(*) as count FROM goats
         WHERE user_id=? AND life_stage='Kid' AND birth_date >= ?`,
        [user_id, monthStartStr], (err, rows) => err ? reject(err) : resolve(rows[0].count)
      );
    }),
    new Promise((resolve, reject) => {
      db.query(
        `SELECT COUNT(*) as count FROM disposal_records
         WHERE user_id=? AND disposal_type='Died' AND date >= ?`,
        [user_id, yearStart], (err, rows) => err ? reject(err) : resolve(rows[0].count)
      );
    }),
    new Promise((resolve, reject) => {
      db.query(
        `SELECT id, goat_code, weaning_date,
         DATEDIFF(weaning_date, CURDATE()) as days_left
         FROM goats WHERE user_id=? 
AND life_stage='Kid'
AND weaning_date IS NOT NULL 
AND weaning_date BETWEEN ? AND ?`,
        [user_id, weekStr], (err, rows) => err ? reject(err) : resolve(rows)
      );
    }),
    new Promise((resolve, reject) => {
      db.query(
        `SELECT id, goat_code, birth_date,
         TIMESTAMPDIFF(MONTH, birth_date, CURDATE()) as age_months
         FROM goats WHERE user_id=? AND life_stage='Kid'
         AND birth_date IS NOT NULL
         AND TIMESTAMPDIFF(MONTH, birth_date, CURDATE()) >= 6`,
        [user_id], (err, rows) => err ? reject(err) : resolve(rows)
      );
    }),
    new Promise((resolve, reject) => {
      db.query(
        `SELECT COUNT(*) as count FROM goats WHERE user_id=? AND life_stage='Kid'`,
        [user_id], (err, rows) => err ? reject(err) : resolve(rows[0].count)
      );
    }),
    new Promise((resolve, reject) => {
      db.query(
        `SELECT COUNT(*) as count
         FROM breeding_records
         WHERE user_id=? AND status='Pending'`,
        [user_id],
        (err, rows) => err ? reject(err) : resolve(rows[0].count)
      );
    }),
  ]).then(([pendingPregnancies, vaccinationsDueCount, kidsThisMonth,
        mortalityCount, weaningAlerts, promoteAlerts, totalKids,
        pregnantCount]) => {
    res.json({
      pendingPregnancies,
      vaccinationsDueCount,
      kidsThisMonth,
      mortalityCount,
      weaningAlerts,
      promoteAlerts,
      totalKids,
      pregnantCount,
    });
  }).catch(err => res.status(500).json({ error: err.message }));
});

// ═══════════════════════════════════════════════════════
// ─── AUTH ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  db.query('SELECT * FROM users WHERE email=? AND password=?', [email, password], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid email or password.' });
    const user = rows[0];
    res.json({
      id: user.id,
      name: user.full_name,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      farm_name: user.farm_name || '',
      photo_url: user.photo_url || null,
    });
  });
});

app.post('/api/register', (req, res) => {
  const { name, phone, email, password, role, farm_name } = req.body;
  db.query('SELECT id FROM users WHERE email=?', [email], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (rows.length > 0) return res.status(400).json({ error: 'Email already registered.' });
    db.query(
      'INSERT INTO users (full_name, phone, email, password, role, farm_name) VALUES (?,?,?,?,?,?)',
      [name, phone, email, password, role || 'farmer', farm_name || null],
      (err2, result) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ id: result.insertId, name, phone, email, role: role || 'farmer', farm_name: farm_name || null });
      }
    );
  });
});

// ═══════════════════════════════════════════════════════
// ─── USERS / SETTINGS ───────────────────────────────────
// ═══════════════════════════════════════════════════════

app.get('/api/users/:id', (req, res) => {
  db.query(
    'SELECT id, full_name, email, phone, role, farm_name, photo_url FROM users WHERE id=?',
    [req.params.id], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!rows.length) return res.status(404).json({ error: 'User not found' });
      res.json(rows[0]);
    }
  );
});

app.put('/api/users/:id', (req, res) => {
  const { name, email, phone, farm_name } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });
  db.query('SELECT id FROM users WHERE email=? AND id!=?', [email, req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (rows.length > 0) return res.status(400).json({ error: 'Email already used by another account' });
    db.query(
      'UPDATE users SET full_name=?, email=?, phone=?, farm_name=? WHERE id=?',
      [name, email, phone || null, farm_name || null, req.params.id],
      (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ success: true });
      }
    );
  });
});

app.put('/api/users/:id/password', (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });
  db.query('SELECT id FROM users WHERE id=? AND password=?', [req.params.id, currentPassword], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!rows.length) return res.status(401).json({ error: 'Current password is incorrect' });
    db.query('UPDATE users SET password=? WHERE id=?', [newPassword, req.params.id], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ success: true });
    });
  });
});

app.post('/api/users/:id/check-password', (req, res) => {
  const { password } = req.body;
  if (!password) return res.json({ correct: false });
  db.query('SELECT id FROM users WHERE id=? AND password=?', [req.params.id, password], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ correct: rows.length > 0 });
  });
});

// ─── PHOTO UPLOAD ────────────────────────────────────────
app.post('/api/users/:id/photo', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const photoUrl = `/uploads/${req.file.filename}`;
  db.query('UPDATE users SET photo_url=? WHERE id=?', [photoUrl, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, photo_url: photoUrl });
  });
});

// ═══════════════════════════════════════════════════════
// ─── BREEDING ───────────────────────────────────────────
// ═══════════════════════════════════════════════════════

app.get('/api/breeding', (req, res) => {
  const user_id = req.query.user_id;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  db.query(
    `SELECT br.id,
       br.female_goat_id, gf.goat_code AS female_code,
       br.male_goat_id,   gm.goat_code AS male_code,
       DATE_FORMAT(br.crossing_date,     "%Y-%m-%d") AS crossing_date,
       DATE_FORMAT(br.expected_delivery, "%Y-%m-%d") AS expected_delivery,
       DATE_FORMAT(br.actual_delivery,   "%Y-%m-%d") AS actual_delivery,
       br.total_born, br.survived, br.died,
       br.notes, br.status,
       DATE_FORMAT(br.created_at, "%Y-%m-%d") AS created_at,
       (SELECT COUNT(*) FROM goats k WHERE k.breeding_id = br.id AND k.life_stage='Kid') as kids_registered
     FROM breeding_records br
     JOIN goats gf ON br.female_goat_id = gf.id
     JOIN goats gm ON br.male_goat_id   = gm.id
     WHERE br.user_id = ?
     ORDER BY br.id DESC`,
    [user_id], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.post('/api/breeding', (req, res) => {
  const { female_goat_id, male_goat_id, crossing_date, expected_delivery, notes, user_id } = req.body;
  if (!female_goat_id || !male_goat_id || !crossing_date)
    return res.status(400).json({ error: 'female_goat_id, male_goat_id, crossing_date required' });
  const uid = user_id || 1;
  db.query(
    `INSERT INTO breeding_records (user_id, female_goat_id, male_goat_id, crossing_date, expected_delivery, notes, status)
     VALUES (?,?,?,?,?,?,'Pending')`,
    [uid, female_goat_id, male_goat_id, crossing_date, expected_delivery || null, notes || null],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      db.query(
        `SELECT br.id, br.female_goat_id, gf.goat_code AS female_code,
                br.male_goat_id, gm.goat_code AS male_code,
                DATE_FORMAT(br.crossing_date,     "%Y-%m-%d") AS crossing_date,
                DATE_FORMAT(br.expected_delivery, "%Y-%m-%d") AS expected_delivery,
                br.actual_delivery, br.total_born, br.survived, br.died,
                br.notes, br.status, 0 as kids_registered
         FROM breeding_records br
         JOIN goats gf ON br.female_goat_id = gf.id
         JOIN goats gm ON br.male_goat_id   = gm.id
         WHERE br.id = ?`,
        [result.insertId],
        (err2, rows) => {
          if (err2) return res.status(500).json({ error: err2.message });
          res.json(rows[0]);
        }
      );
    }
  );
});

app.put('/api/breeding/:id', (req, res) => {
  const { female_goat_id, male_goat_id, crossing_date, expected_delivery, notes } = req.body;
  db.query(
    `UPDATE breeding_records SET female_goat_id=?, male_goat_id=?, crossing_date=?, expected_delivery=?, notes=? WHERE id=?`,
    [female_goat_id, male_goat_id, crossing_date, expected_delivery || null, notes || null, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      db.query(
        `SELECT br.id, br.female_goat_id, gf.goat_code AS female_code,
                br.male_goat_id, gm.goat_code AS male_code,
                DATE_FORMAT(br.crossing_date,     "%Y-%m-%d") AS crossing_date,
                DATE_FORMAT(br.expected_delivery, "%Y-%m-%d") AS expected_delivery,
                DATE_FORMAT(br.actual_delivery,   "%Y-%m-%d") AS actual_delivery,
                br.total_born, br.survived, br.died, br.notes, br.status,
                (SELECT COUNT(*) FROM goats k WHERE k.breeding_id = br.id) as kids_registered
         FROM breeding_records br
         JOIN goats gf ON br.female_goat_id = gf.id
         JOIN goats gm ON br.male_goat_id   = gm.id
         WHERE br.id = ?`,
        [req.params.id],
        (err2, rows) => {
          if (err2) return res.status(500).json({ error: err2.message });
          res.json(rows[0]);
        }
      );
    }
  );
});

app.put('/api/breeding/:id/outcome', (req, res) => {
  const { actual_delivery, total_born, survived, died } = req.body;
  if (!actual_delivery) return res.status(400).json({ error: 'actual_delivery required' });
  db.query(
    `UPDATE breeding_records SET actual_delivery=?, total_born=?, survived=?, died=?, status='Delivered' WHERE id=?`,
    [actual_delivery, total_born || 0, survived || 0, died || 0, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, status: 'Delivered' });
    }
  );
});

app.delete('/api/breeding/:id', (req, res) => {
  db.query('DELETE FROM breeding_records WHERE id=?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.get('/api/breeding/:id/kids', (req, res) => {
  const breeding_id = req.params.id;
  db.query(
    `SELECT id, goat_code, gender, weight, birth_date
     FROM goats
     WHERE breeding_id = ?`,
    [breeding_id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// ═══════════════════════════════════════════════════════
// ─── HITTING CYCLE (HEAT CYCLE) ─────────────────────────
// ═══════════════════════════════════════════════════════

app.get('/api/hitting-cycle', (req, res) => {
  const user_id = req.query.user_id;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  db.query(
    `SELECT hc.id, hc.goat_id, g.goat_code, hc.cycle_date,
     hc.next_expected, hc.notes, hc.status,
     DATE_FORMAT(hc.cycle_date, "%Y-%m-%d") as cycle_date_fmt,
     DATE_FORMAT(hc.next_expected, "%Y-%m-%d") as next_expected_fmt
     FROM hitting_cycles hc
     JOIN goats g ON hc.goat_id = g.id
     WHERE hc.user_id = ? ORDER BY hc.cycle_date DESC`,
    [user_id], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.post('/api/hitting-cycle', (req, res) => {
  const { goat_id, cycle_date, notes, user_id } = req.body;
  if (!goat_id || !cycle_date)
    return res.status(400).json({ error: 'goat_id and cycle_date required' });

  const next = new Date(cycle_date);
  next.setDate(next.getDate() + 21);
  const next_expected = next.toISOString().slice(0, 10);

  db.query(
    `INSERT INTO hitting_cycles (user_id, goat_id, cycle_date, next_expected, notes, status)
     VALUES (?, ?, ?, ?, ?, 'Active')`,
    [user_id, goat_id, cycle_date, next_expected, notes || null],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      db.query('SELECT goat_code FROM goats WHERE id=?', [goat_id], (e, rows) => {
        res.json({
          id: result.insertId, goat_id,
          goat_code: rows?.[0]?.goat_code || '',
          cycle_date_fmt: cycle_date,
          next_expected_fmt: next_expected,
          notes: notes || null, status: 'Active'
        });
      });
    }
  );
});

app.put('/api/hitting-cycle/:id', (req, res) => {
  const { goat_id, cycle_date, next_expected, notes } = req.body;
  if (!goat_id || !cycle_date)
    return res.status(400).json({ error: 'goat_id and cycle_date required' });
  db.query(
    'UPDATE hitting_cycles SET goat_id=?, cycle_date=?, next_expected=?, notes=? WHERE id=?',
    [goat_id, cycle_date, next_expected || null, notes || null, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.delete('/api/hitting-cycle/:id', (req, res) => {
  db.query('DELETE FROM hitting_cycles WHERE id=?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ═══════════════════════════════════════════════════════
// ─── GOAT GROUPS ────────────────────────────────────────
// ═══════════════════════════════════════════════════════

app.get('/api/groups', (req, res) => {
  const user_id = req.query.user_id;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  db.query(
    `SELECT g.id, g.name, g.description, g.color,
            COUNT(DISTINCT gt.id) as goat_count
     FROM goat_groups g
     LEFT JOIN goats gt ON gt.group_id = g.id
     WHERE g.user_id = ?
     GROUP BY g.id
     ORDER BY g.name ASC`,
    [user_id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.post('/api/groups', (req, res) => {
  const { name, description, color, user_id } = req.body;
  if (!name || !user_id) return res.status(400).json({ error: 'name and user_id required' });
  db.query(
    'SELECT id FROM goat_groups WHERE name = ? AND user_id = ?',
    [name, user_id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (rows.length > 0) return res.status(400).json({ error: 'Group name already exists' });
      db.query(
        'INSERT INTO goat_groups (user_id, name, description, color) VALUES (?,?,?,?)',
        [user_id, name, description || null, color || '#4CAF50'],
        (err2, result) => {
          if (err2) return res.status(500).json({ error: err2.message });
          res.json({ id: result.insertId, name, description: description || null, color: color || '#4CAF50', goat_count: 0 });
        }
      );
    }
  );
});

app.put('/api/groups/:id', (req, res) => {
  const { name, description, color } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  db.query(
    'UPDATE goat_groups SET name=?, description=?, color=? WHERE id=?',
    [name, description || null, color || '#4CAF50', req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.delete('/api/groups/:id', (req, res) => {
  db.query('DELETE FROM goat_groups WHERE id=?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.get('/api/groups/:id/goats', (req, res) => {
  const user_id = req.query.user_id;
  db.query(
    `SELECT id, goat_code, breed, gender, life_stage, health_status, weight
     FROM goats WHERE group_id = ? AND user_id = ?`,
    [req.params.id, user_id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.get('/api/groups/:id/finance', (req, res) => {
  const user_id = req.query.user_id;
  Promise.all([
    new Promise((resolve, reject) => {
      db.query(
        `SELECT COALESCE(SUM(amount), 0) as total FROM income WHERE group_id = ? AND user_id = ?`,
        [req.params.id, user_id],
        (err, rows) => err ? reject(err) : resolve(Number(rows[0].total))
      );
    }),
    new Promise((resolve, reject) => {
      db.query(
        `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE group_id = ? AND user_id = ?`,
        [req.params.id, user_id],
        (err, rows) => err ? reject(err) : resolve(Number(rows[0].total))
      );
    }),
  ]).then(([totalIncome, totalExpense]) => {
    res.json({ totalIncome, totalExpense, net: totalIncome - totalExpense });
  }).catch(err => res.status(500).json({ error: err.message }));
});

app.get('/api/breeding/:id/died-kids', (req, res) => {
  db.query(
    `SELECT id, goat_code, gender, DATE_FORMAT(birth_date,"%Y-%m-%d") as birth_date
     FROM goats WHERE breeding_id = ? AND health_status = 'Died'`,
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.post('/api/breeding/:id/register-died-kids', (req, res) => {
  const { kids, user_id } = req.body;
  if (!kids || !kids.length) return res.status(400).json({ error: 'Kids data required' });

  db.query(
    `SELECT br.*, gf.goat_code as female_code, gm.goat_code as male_code,
     gf.id as female_id, gm.id as male_id
     FROM breeding_records br
     JOIN goats gf ON br.female_goat_id = gf.id
     JOIN goats gm ON br.male_goat_id = gm.id
     WHERE br.id = ?`,
    [req.params.id],
    (err, brRows) => {
      if (err || !brRows.length) return res.status(404).json({ error: 'Breeding record nahi mila' });
      const br = brRows[0];
      const birthDate = br.actual_delivery
        ? new Date(br.actual_delivery).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);
      const diedAllowed = Number(br.died) || 0;

      if (diedAllowed === 0) {
        return res.status(400).json({ error: 'No died kids recorded for this breeding' });
      }

      db.query(
        `SELECT COUNT(*) as count FROM goats WHERE breeding_id = ? AND health_status = 'Died'`,
        [req.params.id],
        (errCount, countRows) => {
          if (errCount) return res.status(500).json({ error: errCount.message });
          const alreadyRegistered = Number(countRows[0].count);
          if (alreadyRegistered >= diedAllowed) {
            return res.status(400).json({ error: 'All died kids already registered' });
          }
          const remaining = diedAllowed - alreadyRegistered;
          const kidsToInsert = kids.slice(0, remaining);
          const registered = [];
          const errors = [];
          let completed = 0;

          kidsToInsert.forEach((kid) => {
            db.query(
              `INSERT INTO goats (user_id, goat_code, breed, gender, weight, health_status,
               life_stage, mother_id, father_id, birth_date, breeding_id)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
              [
                user_id || 1,
                kid.goat_code.trim(),
                'Mixed',
                kid.gender || 'Female',
                null,
                'Died',
                'Kid',
                br.female_goat_id,
                br.male_goat_id,
                birthDate,
                br.id,
              ],
              (err2, result) => {
                completed++;
                if (err2) {
                  console.error('Died kid insert error:', err2.message, '| code:', kid.goat_code);
                  errors.push({ code: kid.goat_code, error: err2.message });
                } else {
                  registered.push({ id: result.insertId, goat_code: kid.goat_code.trim(), gender: kid.gender || 'Female' });
                }
                if (completed === kidsToInsert.length) {
                  res.json({ registered, errors });
                }
              }
            );
          });
        }
      );
    }
  );
});

app.listen(process.env.PORT || 4000, () => console.log(`🚀 Server on http://localhost:4000`));
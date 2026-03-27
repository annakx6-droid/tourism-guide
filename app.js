const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const session = require('express-session'); // 1. ເພີ່ມ session
const multer = require('multer');
const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// 2. ຕັ້ງຄ່າ Session
app.use(session({
    secret: 'mysecretkey',
    resave: false,
    saveUninitialized: true
}));

// --- ສ່ວນການເຊື່ອມຕໍ່ MySQL ---
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '12345678', 
    database: 'tourism_db'
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL Database!');
});

// 3. Middleware ສໍາລັບກວດສອບວ່າເປັນ Admin ຫຼື ບໍ່ (ປ້ອງກັນການເຂົ້າທາງ URL ໂດຍກົງ)
const isAdminMode = (req, res, next) => {
    if (req.session.isAdmin) {
        next();
    } else {
        res.status(403).send('ເຂົ້າເຖິງບໍ່ໄດ້: ທ່ານບໍ່ມີສິດຈັດການຂໍ້ມູນ');
    }
};
// 2. ຕັ້ງຄ່າການເກັບຮູບພາບດ້ວຍ Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/'); // ກຳນົດໂຟນເດີເກັບຮູບ
    },
    filename: (req, file, cb) => {
        // ປ່ຽນຊື່ໄຟລ໌ໃຫ້ເປັນ ວັນທີ-ຊື່ໄຟລ໌ເກົ່າ ເພື່ອບໍ່ໃຫ້ຊ້ຳກັນ
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage }); // ສ້າງຕົວປ່ຽນສຳລັບອັບໂຫລດ

// --- Routes ---

// ໜ້າຫຼັກ
app.get('/', (req, res) => {
    res.render('index', { title: 'ໜ້າຫຼັກ', active: 'home', isAdmin: req.session.isAdmin });
});

// 4. ສ່ວນຂອງ Login / Logout
app.get('/login', (req, res) => {
    res.render('login', { title: 'ເຂົ້າສູ່ລະບົບ', active: 'login', error: null });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === '1234') {
        req.session.isAdmin = true;
        res.redirect('/places');
    } else {
        res.render('login', { title: 'ເຂົ້າສູ່ລະບົບ', active: 'login', error: 'ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ!' });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/places');
});

// 5. ໜ້າສະຖານທີ່ (ສົ່ງ isAdmin ໄປໃຫ້ View ເພື່ອເຊື່ອງ/ສະແດງປຸ່ມ)
app.get('/places', (req, res) => {
    const keyword = req.query.search || ''; 
    const province = req.query.province || ''; // ດຶງຄ່າແຂວງຈາກ Dropdown

    let sql = "SELECT * FROM places WHERE name LIKE ?";
    let params = [`%${keyword}%`];

    // ຖ້າມີການເລືອກແຂວງ ໃຫ້ເພີ່ມເງື່ອນໄຂ WHERE ເຂົ້າໄປ
    if (province) {
        sql += " AND province = ?";
        params.push(province);
    }

    db.query(sql, params, (err, results) => {
        if (err) throw err;
        res.render('places', { 
            title: 'ສະຖານທີ່ທ່ອງທ່ຽວ', 
            active: 'places', 
            placesData: results,
            isAdmin: req.session.isAdmin,
            searchValue: keyword,
            selectedProvince: province // ສົ່ງຄ່າແຂວງທີ່ເລືອກກັບໄປ
        });
    });
});

// ໜ້າລາຍລະອຽດ
app.get('/places/:id', (req, res) => {
    const sql = 'SELECT * FROM places WHERE id = ?';
    db.query(sql, [req.params.id], (err, result) => {
        if (err) throw err;
        if (result.length > 0) {
            res.render('place-detail', { title: result[0].name, active: 'places', place: result[0] });
        } else {
            res.status(404).send('ບໍ່ພົບຂໍ້ມູນ');
        }
    });
});

// 6. ປ້ອງກັນ Routes ຈັດການຂໍ້ມູນດ້ວຍ isAdminMode (Middleware)
app.get('/add-place', isAdminMode, (req, res) => {
    res.render('add-place', { title: 'ເພີ່ມສະຖານທີ່', active: 'places' });
});

// 3. ຕື່ມ upload.single('image') ໃສ່ກາງເພື່ອຮັບໄຟລ໌
app.post('/add-place', isAdminMode, upload.single('image'), (req, res) => {
    const { name, province, description, map_url } = req.body;
    
    // 4. ເອົາຊື່ໄຟລ໌ທີ່ອັບໂຫລດມາ ( req.file.filename) ມາເກັບລົງ DB ໂດຍໃສ່ Path ທາງໜ້າ
    const imagePath = req.file ? '/uploads/' + req.file.filename : '';

    const sql = 'INSERT INTO places (name, province, description, image, map_url) VALUES (?, ?, ?, ?, ?)';
    db.query(sql, [name, province, description, imagePath, map_url], (err, result) => {
        if (err) throw err;
        res.redirect('/places');
    });
});

app.get('/delete-place/:id', isAdminMode, (req, res) => {
    const id = req.params.id;
    const sql = 'DELETE FROM places WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send('ເກີດຂໍ້ຜິດພາດໃນການລຶບ');
        }
        res.redirect('/places');
    });
});

app.get('/edit-place/:id', isAdminMode, (req, res) => {
    const sql = 'SELECT * FROM places WHERE id = ?';
    db.query(sql, [req.params.id], (err, result) => {
        if (err) throw err;
        if (result.length > 0) {
            res.render('edit-place', { title: 'ແກ້ໄຂຂໍ້ມູນ', active: 'places', place: result[0] });
        } else {
            res.status(404).send('ບໍ່ພົບຂໍ້ມູນ');
        }
    });
});

// 5. ຕື່ມ upload.single('image') ໃສ່ກາງເພື່ອຮັບໄຟລ໌
app.post('/update-place/:id', isAdminMode, upload.single('image'), (req, res) => {
    const { name, province, description, map_url } = req.body;
    const id = req.params.id;

    // 6. ກວດເບິ່ງວ່າມີການເລືອກຮູບໃໝ່ບໍ່
    let imagePath = '';
    if (req.file) {
        // ຖ້າມີຮູບໃໝ່ ໃຫ້ໃຊ້ຊື່ຮູບໃໝ່
        imagePath = '/uploads/' + req.file.filename;
        const sql = 'UPDATE places SET name = ?, province = ?, description = ?, image = ?, map_url = ? WHERE id = ?';
        db.query(sql, [name, province, description, imagePath, map_url, id], (err, result) => {
            if (err) throw err;
            res.redirect('/places');
        });
    } else {
        // ຖ້າບໍ່ມີຮູບໃໝ່ ບໍ່ຕ້ອງອັບເດດຟິວ image (ໃຊ້ຮູບເກົ່າ)
        const sql = 'UPDATE places SET name = ?, province = ?, description = ?, map_url = ? WHERE id = ?';
        db.query(sql, [name, province, description, map_url, id], (err, result) => {
            if (err) throw err;
            res.redirect('/places');
        });
    }
});

app.get('/about', (req, res) => {
    res.render('about', { title: 'ກ່ຽວກັບເຮົາ', active: 'about' });
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
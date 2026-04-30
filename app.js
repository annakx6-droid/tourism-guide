const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const session = require('express-session');
const multer = require('multer');
const app = express();
const PORT = 3000;


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'mysecretkey',
    resave: false,
    saveUninitialized: true
}));


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// --- 3. MySQL Connection ---
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


const isAdminMode = (req, res, next) => {
    if (req.session.isAdmin) {
        next();
    } else {
        res.status(403).send('ເຂົ້າເຖິງບໍ່ໄດ້: ທ່ານບໍ່ມີສິດຈັດການຂໍ້ມູນ');
    }
};

// ໜ້າຫຼັກ
app.get('/', (req, res) => {
    res.render('index', { title: 'ໜ້າຫຼັກ', active: 'home', isAdmin: req.session.isAdmin });
});

// Login / Logout
app.get('/login', (req, res) => {
    res.render('login', { title: 'ເຂົ້າສູ່ລະບົບ', active: 'login', error: null });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const sql = "SELECT * FROM users WHERE username = ? AND password = ?";
    db.query(sql, [username, password], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            req.session.isAdmin = true;
            res.redirect('/places');
        } else {
            res.render('login', { error: 'ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ!', title: 'Login', active: 'login' });
        }
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/places');
});

// ໜ້າສະຖານທີ່ທັງໝົດ
app.get('/places', (req, res) => {
    const keyword = req.query.search || ''; 
    const province = req.query.province || '';
    let sql = "SELECT * FROM places WHERE name LIKE ?";
    let params = [`%${keyword}%`];

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
            selectedProvince: province 
        });
    });
});

// ໜ້າລາຍລະອຽດ (ດຶງຂໍ້ມູນຮູບຈາກ Table Gallery ມາສະແດງ)
app.get('/places/:id', (req, res) => {
    const placeId = req.params.id;
    const sqlPlace = 'SELECT * FROM places WHERE id = ?';
    
    db.query(sqlPlace, [placeId], (err, placeResult) => {
        if (err) throw err;
        if (placeResult.length > 0) {
            const sqlImages = 'SELECT * FROM place_images WHERE place_id = ?';
            db.query(sqlImages, [placeId], (err, imageResults) => {
                if (err) throw err;
                res.render('place-detail', { 
                    title: placeResult[0].name, 
                    active: 'places', 
                    place: placeResult[0],
                    images: imageResults 
                });
            });
        } else {
            res.status(404).send('ບໍ່ພົບຂໍ້ມູນ');
        }
    });
});

// --- ສ່ວນຈັດການຂໍ້ມູນ (Admin Only) ---

app.get('/add-place', isAdminMode, (req, res) => {
    res.render('add-place', { title: 'ເພີ່ມສະຖານທີ່', active: 'places' });
});

// ⭐ ປັບປຸງໃໝ່: ອັບໂຫລດຫຼາຍຮູບ (ໃຊ້ upload.array)
app.post('/add-place', isAdminMode, upload.array('images', 10), (req, res) => {
    const { name, province, description, map_url } = req.body;
    
    if (!req.files || req.files.length === 0) {
        return res.status(400).send('ກະລຸນາເລືອກຮູບພາບຢ່າງໜ້ອຍ 1 ຮູບ');
    }

    // ໃຊ້ຮູບທຳອິດເປັນຮູບໜ້າປົກໃນ table places
    const mainImagePath = '/uploads/' + req.files[0].filename;

    const sqlPlace = 'INSERT INTO places (name, province, description, image, map_url) VALUES (?, ?, ?, ?, ?)';
    db.query(sqlPlace, [name, province, description, mainImagePath, map_url], (err, result) => {
        if (err) throw err;

        const newPlaceId = result.insertId;

        // ກຽມຂໍ້ມູນທຸກຮູບເພື່ອບັນທຶກລົງ table place_images (Gallery)
        const galleryData = req.files.map(file => [
            newPlaceId, 
            '/uploads/' + file.filename
        ]);

        const sqlGallery = 'INSERT INTO place_images (place_id, image_url) VALUES ?';
        db.query(sqlGallery, [galleryData], (err) => {
            if (err) throw err;
            res.redirect('/places');
        });
    });
});

app.get('/delete-place/:id', isAdminMode, (req, res) => {
    const sql = 'DELETE FROM places WHERE id = ?';
    db.query(sql, [req.params.id], (err, result) => {
        if (err) throw err;
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

app.post('/update-place/:id', isAdminMode, upload.array('images', 10), (req, res) => {
    const { name, province, description, map_url } = req.body;
    const id = req.params.id;

    if (req.files && req.files.length > 0) {
        // 1. ໃຊ້ຮູບທຳອິດເປັນຮູບໜ້າປົກ (ຄືກັນກັບຕອນ Add)
        const mainImagePath = '/uploads/' + req.files[0].filename;

        const sqlPlace = 'UPDATE places SET name = ?, province = ?, description = ?, image = ?, map_url = ? WHERE id = ?';
        db.query(sqlPlace, [name, province, description, mainImagePath, map_url, id], (err, result) => {
            if (err) throw err;

            // 2. ລຶບຮູບເກົ່າໃນ Gallery ອອກກ່ອນ ແລ້ວແທນທີ່ດ້ວຍຮູບໃໝ່
            const sqlDelGallery = 'DELETE FROM place_images WHERE place_id = ?';
            db.query(sqlDelGallery, [id], (err) => {
                if (err) throw err;

                // 3. ເພີ່ມຮູບໃໝ່ທັງໝົດລົງໃນ Gallery (Table: place_images)
                const galleryData = req.files.map(file => [id, '/uploads/' + file.filename]);
                const sqlInsertGallery = 'INSERT INTO place_images (place_id, image_url) VALUES ?';
                db.query(sqlInsertGallery, [galleryData], (err) => {
                    if (err) throw err;
                    res.redirect('/places');
                });
            });
        });
    } else {
        // ຖ້າບໍ່ມີການເລືອກຮູບໃໝ່ ໃຫ້ອັບເດດແຕ່ຂໍ້ມູນຕົວໜັງສື
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
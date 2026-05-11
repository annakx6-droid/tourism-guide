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



// ✅ GET /places - ອັນດຽວທີ່ມີ filter ຄົບຖ້ວນ
app.get('/places', (req, res) => {
    const keyword = req.query.search || ''; 
    const province = req.query.province || '';
    const category = req.query.category || '';
    
    let sql = "SELECT * FROM places WHERE name LIKE ?";
    let params = [`%${keyword}%`];

    if (province) {
        sql += " AND province = ?";
        params.push(province);
    }
    if (category) {
        sql += " AND category = ?";
        params.push(category);
    }

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('Query error:', err);
            return res.status(500).send('Database error');
        }
        res.render('places', { 
            title: 'ສະຖານທີ່ທ່ອງທ່ຽວ', 
            active: 'places', 
            placesData: results,
            isAdmin: req.session.isAdmin,
            searchValue: keyword,
            selectedProvince: province,
            selectedCategory: category
        });
    });
});
// ✅ ໜ້າເພີ່ມສະຖານທີ່ໃໝ່ (GET)
app.get('/add-place', isAdminMode, (req, res) => {
    res.render('add-place', { 
        title: 'ເພີ່ມສະຖານທີ່ໃໝ່', 
        active: 'places',
        isAdmin: req.session.isAdmin
    });
});

// --- ປັບປຸງການເພີ່ມຂໍ້ມູນ (INSERT) ---
app.post('/add-place', isAdminMode, upload.array('images', 10), (req, res) => {
    const { name, province, description, map_url, category } = req.body; // ເພີ່ມ category
    
    if (!req.files || req.files.length === 0) {
        return res.status(400).send('ກະລຸນາເລືອກຮູບພາບຢ່າງໜ້ອຍ 1 ຮູບ');
    }

    const mainImagePath = '/uploads/' + req.files[0].filename;

    const sqlPlace = 'INSERT INTO places (name, province, description, image, map_url, category) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(sqlPlace, [name, province, description, mainImagePath, map_url, category], (err, result) => {
        if (err) throw err;

        const newPlaceId = result.insertId;
        const galleryData = req.files.map(file => [newPlaceId, '/uploads/' + file.filename]);
        const sqlGallery = 'INSERT INTO place_images (place_id, image_url) VALUES ?';
        db.query(sqlGallery, [galleryData], (err) => {
            if (err) throw err;
            res.redirect('/places');
        });
    });
});

// ✅ POST /update-place/:id - ໂຄ້ດທີ່ຖືກຕ້ອງ
app.post('/update-place/:id', isAdminMode, upload.array('images', 10), (req, res) => {
    const { name, province, category, description, map_url } = req.body;
    const id = req.params.id;

    if (!name || !province) {
        return res.status(400).send('ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບຖ້ວນ');
    }

    if (req.files && req.files.length > 0) {
        const mainImagePath = '/uploads/' + req.files[0].filename;
        const sqlPlace = 'UPDATE places SET name = ?, province = ?, category = ?, description = ?, image = ?, map_url = ? WHERE id = ?';
        
        db.query(sqlPlace, [name, province, category, description, mainImagePath, map_url, id], (err, result) => {
            if (err) {
                console.error('Update place error:', err);
                return res.status(500).send('Server Error');
            }

            const sqlDelGallery = 'DELETE FROM place_images WHERE place_id = ?';
            db.query(sqlDelGallery, [id], (err) => {
                if (err) {
                    console.error('Delete gallery error:', err);
                    return res.status(500).send('Server Error');
                }

                const galleryData = req.files.map(file => [id, '/uploads/' + file.filename]);
                if (galleryData.length > 0) {
                    const sqlInsertGallery = 'INSERT INTO place_images (place_id, image_url) VALUES ?';
                    db.query(sqlInsertGallery, [galleryData], (err) => {
                        if (err) {
                            console.error('Insert gallery error:', err);
                            return res.status(500).send('Server Error');
                        }
                        res.redirect('/places');
                    });
                } else {
                    res.redirect('/places');
                }
            });
        });
    } else {
        const sql = 'UPDATE places SET name = ?, province = ?, category = ?, description = ?, map_url = ? WHERE id = ?';
        db.query(sql, [name, province, category, description, map_url, id], (err, result) => {
            if (err) {
                console.error('Update place error:', err);
                return res.status(500).send('Server Error');
            }
            if (result.affectedRows === 0) {
                console.log('No changes made - data might be the same');
            }
            res.redirect('/places');
        });
    }
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

// ເພີ່ມ route ນີ້
app.get('/places/:id', (req, res) => {
    const sql = `
        SELECT p.*, 
               GROUP_CONCAT(pi.image_url SEPARATOR ',') as gallery_images
        FROM places p
        LEFT JOIN place_images pi ON p.id = pi.place_id
        WHERE p.id = ?
        GROUP BY p.id
    `;
    
    db.query(sql, [req.params.id], (err, results) => {
        if (err) {
            console.error('Error fetching place details:', err);
            return res.status(500).send('Database error');
        }
        
        if (results.length === 0) {
            return res.status(404).send('ບໍ່ພົບຂໍ້ມູນສະຖານທີ່');
        }
        
        const place = results[0];
        let images = [];
        
        // ສ້າງ array ຂອງຮູບພາບ
        if (place.gallery_images) {
            images = place.gallery_images.split(',');
        }
        
        res.render('place-detail', { 
            title: place.name, 
            active: 'places', 
            place: place,
            images: images,  // ສົ່ງເປັນ array ຂອງ strings
            isAdmin: req.session.isAdmin
        });
    });
});



app.get('/about', (req, res) => {
    res.render('about', { title: 'ກ່ຽວກັບເຮົາ', active: 'about' });
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
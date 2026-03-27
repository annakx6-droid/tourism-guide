#🇱🇦 Laos Tourism Guide - Web Application
ໂຄງການເວັບໄຊແນະນຳສະຖານທີ່ທ່ອງທ່ຽວໃນປະເທດລາວ ທີ່ພັດທະນາດ້ວຍ Node.js ແລະ MySQL. ລະບົບນີ້ຮອງຮັບການຈັດການຂໍ້ມູນສະຖານທີ່ທ່ອງທ່ຽວ, ການແບ່ງໝວດໝູ່ຕາມແຂວງ, ແລະ ການອັບໂຫລດຮູບພາບປະກອບ.

## Features (ຄວາມສາມາດຂອງລະບົບ)
Display Places: ສະແດງລາຍຊື່ສະຖານທີ່ທ່ອງທ່ຽວທັງໝົດໃນຮູບແບບ Card ທີ່ສວຍງາມ.

Filter by Province: ສາມາດເລືອກເບິ່ງສະຖານທີ່ທ່ອງທ່ຽວແຍກຕາມແຂວງໄດ້.

Place Management: ລະບົບເພີ່ມ (Add), ແກ້ໄຂ (Edit), ແລະ ລຶບ (Delete) ຂໍ້ມູນສະຖານທີ່.

Image Upload: ຮອງຮັບການອັບໂຫລດຮູບພາບສະຖານທີ່ທ່ອງທ່ຽວຜ່ານລະບົບ Multer.

Responsive Design: ໜ້າເວັບຮອງຮັບການສະແດງຜົນທັງໃນຄອມພິວເຕີ ແລະ ມືຖື.

## Tech Stack (ເຕັກໂນໂລຊີທີ່ໃຊ້)
Backend: Node.js, Express.js

Frontend: EJS (Embedded JavaScript), CSS, JavaScript

Database: MySQL

Image Handling: Multer Middleware

Version Control: Git & GitHub

## Project Structure (ໂຄງສ້າງໂຟນເດີ)
tourism-guide/
                  ├── public/              # ໄຟລ໌ Static (CSS, Images, Uploads)
                  
                  ├── views/               # ໄຟລ໌ EJS ສໍາລັບການສະແດງຜົນ
                  │   ├── partials/        # Header ແລະ Footer ທີ່ໃຊ້ຮ່ວມກັນ
                  
                  ├── app.js               # ໄຟລ໌ຫຼັກຂອງ Server
                  
                  ├── package.json         # ລາຍການ Dependencies ຂອງໂປຣເຈັກ
                  
                  └── .gitignore           # ໄຟລ໌ກຳນົດສິ່ງທີ່ບໍ່ໃຫ້ຂຶ້ນ GitHub
## How to Install (ວິທີການຕິດຕັ້ງ)
Clone Repository:

Bash
git clone https://github.com/annakx6-droid/tourism-guide.git
Install Dependencies:

Bash
npm install
Database Setup:

ສ້າງ Database ໃນ MySQL ແລະ ລັນຄຳສັ່ງ SQL ຈາກໄຟລ໌ທີ່ກຽມໄວ້ເພື່ອສ້າງ Table places.

ຕັ້ງຄ່າການເຊື່ອມຕໍ່ Database ໃນໄຟລ໌ app.js.

Run Server:

Bash
node app.js


Developed by: annakx6-droid

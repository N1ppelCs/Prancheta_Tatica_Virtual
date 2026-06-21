const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const crestsDir = path.join(__dirname, '../../public/uploads/crests');
const avatarsDir = path.join(__dirname, '../../public/uploads/avatars');

if (!fs.existsSync(crestsDir)) {
  fs.mkdirSync(crestsDir, { recursive: true });
}
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

// Storage configurations
const crestStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, crestsDir);
  },
  filename: (req, file, cb) => {
    const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, uniquePrefix + '-' + cleanName);
  }
});

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (req, file, cb) => {
    const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, uniquePrefix + '-' + cleanName);
  }
});

// Filters
const crestFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/png', 'image/svg+xml'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato de arquivo inválido para escudo. Permitido apenas PNG ou SVG.'), false);
  }
};

const avatarFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato de arquivo inválido para avatar. Permitido apenas JPEG, PNG ou WEBP.'), false);
  }
};

const uploadCrest = multer({
  storage: crestStorage,
  fileFilter: crestFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: avatarFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

module.exports = {
  uploadCrest,
  uploadAvatar
};

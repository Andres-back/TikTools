/**
 * Configuración y validación segura de file uploads
 */

const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const config = require('../config');
const { ValidationError } = require('../middlewares/error-handler');
const logger = require('./logger');

/**
 * Crea configuración de multer para un tipo de upload
 */
function createUploadConfig(uploadPath, options = {}) {
  const {
    allowedMimes = config.uploads.allowedImageTypes,
    allowedExtensions = config.uploads.allowedImageExtensions,
    maxSize = config.uploads.maxSize,
    maxFiles = 5
  } = options;

  // Storage configuration
  const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
      const fullPath = path.join(__dirname, '../../../uploads', uploadPath);

      try {
        await fs.mkdir(fullPath, { recursive: true });
        cb(null, fullPath);
      } catch (error) {
        logger.error('Error creating upload directory', { error: error.message, path: fullPath });
        cb(error);
      }
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const filename = `${uuidv4()}${ext}`;
      cb(null, filename);
    }
  });

  // File filter
  const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeOk = allowedMimes.includes(file.mimetype);
    const extOk = allowedExtensions.includes(ext);

    if (mimeOk && extOk) {
      cb(null, true);
    } else {
      cb(new ValidationError(
        `Tipo de archivo no permitido. Permitidos: ${allowedExtensions.join(', ')}`
      ));
    }
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: maxSize,
      files: maxFiles
    }
  });
}

/**
 * Valida contenido real del archivo usando magic numbers
 * (Requiere file-type para validación profunda)
 */
async function validateFileContent(filePath, allowedMimes) {
  try {
    // Opcional: instalar file-type para validación profunda
    // const fileType = require('file-type');
    // const type = await fileType.fromFile(filePath);

    // Por ahora, validación básica
    const stats = await fs.stat(filePath);

    if (stats.size === 0) {
      await fs.unlink(filePath);
      throw new ValidationError('Archivo vacío no permitido');
    }

    return true;
  } catch (error) {
    logger.error('File validation error', { error: error.message, path: filePath });
    throw error;
  }
}

/**
 * Middleware para validar archivos después de upload
 */
function createFileValidationMiddleware(allowedMimes = config.uploads.allowedImageTypes) {
  return async (req, res, next) => {
    try {
      const files = [];

      // Recoger todos los archivos (files y file)
      if (req.files) {
        if (Array.isArray(req.files)) {
          files.push(...req.files);
        } else {
          Object.values(req.files).forEach(fileArray => {
            if (Array.isArray(fileArray)) {
              files.push(...fileArray);
            } else {
              files.push(fileArray);
            }
          });
        }
      } else if (req.file) {
        files.push(req.file);
      }

      if (files.length === 0) {
        return next();
      }

      // Validar cada archivo
      for (const file of files) {
        await validateFileContent(file.path, allowedMimes);
      }

      next();
    } catch (error) {
      // Limpiar archivos en caso de error
      try {
        const files = req.files || (req.file ? [req.file] : []);
        for (const file of files) {
          await fs.unlink(file.path).catch(() => {});
        }
      } catch (cleanupError) {
        logger.error('Error cleaning up files', { error: cleanupError.message });
      }

      next(error);
    }
  };
}

/**
 * Elimina archivo de forma segura
 */
async function deleteFile(filePath) {
  try {
    await fs.unlink(filePath);
    logger.debug('File deleted', { path: filePath });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logger.error('Error deleting file', { error: error.message, path: filePath });
    }
  }
}

/**
 * Genera URL pública para archivo subido
 */
function getPublicUrl(req, relativePath) {
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}${relativePath}`;
}

module.exports = {
  createUploadConfig,
  validateFileContent,
  createFileValidationMiddleware,
  deleteFile,
  getPublicUrl
};

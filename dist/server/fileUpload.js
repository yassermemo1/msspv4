"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileTypeDescription = exports.getFileExtension = exports.deleteFile = exports.getFileInfo = exports.uploadMultiple = exports.uploadSingle = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const util_1 = require("util");
const mkdir = (0, util_1.promisify)(fs_1.default.mkdir);
const access = (0, util_1.promisify)(fs_1.default.access);
// Create uploads directory if it doesn't exist
const ensureUploadDir = async () => {
    const uploadDir = path_1.default.join(process.cwd(), 'uploads');
    try {
        await access(uploadDir);
    }
    catch {
        await mkdir(uploadDir, { recursive: true });
    }
    return uploadDir;
};
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: async (req, file, cb) => {
        try {
            const uploadDir = await ensureUploadDir();
            cb(null, uploadDir);
        }
        catch (error) {
            cb(error, '');
        }
    },
    filename: (req, file, cb) => {
        // Generate unique filename with timestamp and original extension
        const timestamp = Date.now();
        const random = Math.round(Math.random() * 1E9);
        const extension = path_1.default.extname(file.originalname);
        const baseName = path_1.default.basename(file.originalname, extension);
        const safeName = baseName.replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `${timestamp}-${random}-${safeName}${extension}`;
        cb(null, filename);
    }
});
// File filter to restrict file types
const fileFilter = (req, file, cb) => {
    // Allow common document types
    const allowedMimes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/csv',
        'application/csv',
        'text/comma-separated-values',
        'application/vnd.ms-excel', // Sometimes CSV files are detected as Excel
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/zip',
        'application/x-zip-compressed'
    ];
    // Get file extension
    const fileExtension = path_1.default.extname(file.originalname).toLowerCase();
    // Special handling for CSV files
    if (fileExtension === '.csv') {
        cb(null, true);
        return;
    }
    // Check if file type is in allowed MIME types
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        // For CSV files that might be detected as application/octet-stream
        if (file.mimetype === 'application/octet-stream' && fileExtension === '.csv') {
            cb(null, true);
        }
        else {
            cb(new Error(`File type ${file.mimetype} is not allowed. Please upload PDF, Word, Excel, PowerPoint, text, CSV, image, or ZIP files only.`));
        }
    }
};
// Create multer instance
exports.upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit per file
        files: 20 // Allow up to 20 files in a single upload
    }
});
// Create multer instance for single file uploads
exports.uploadSingle = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 1 // Single file upload
    }
});
// Create multer instance for multiple file uploads
exports.uploadMultiple = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit per file
        files: 20, // Allow up to 20 files
        fieldSize: 50 * 1024 * 1024 // 50MB total size limit
    }
});
// Helper function to get file info
const getFileInfo = (file) => {
    return {
        fileName: file.filename,
        originalName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype
    };
};
exports.getFileInfo = getFileInfo;
// Helper function to delete file
const deleteFile = async (filePath) => {
    try {
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
            return true;
        }
        return false;
    }
    catch (error) {
        console.error('Error deleting file:', error);
        return false;
    }
};
exports.deleteFile = deleteFile;
// Helper function to get file extension from mime type
const getFileExtension = (mimeType) => {
    const mimeToExt = {
        'application/pdf': '.pdf',
        'application/msword': '.doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
        'application/vnd.ms-excel': '.xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
        'application/vnd.ms-powerpoint': '.ppt',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
        'text/plain': '.txt',
        'text/csv': '.csv',
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'application/zip': '.zip',
        'application/x-zip-compressed': '.zip'
    };
    return mimeToExt[mimeType] || '';
};
exports.getFileExtension = getFileExtension;
// Helper function to get human-readable file type
const getFileTypeDescription = (mimeType) => {
    const typeDescriptions = {
        'application/pdf': 'PDF Document',
        'application/msword': 'Word Document',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
        'application/vnd.ms-excel': 'Excel Spreadsheet',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel Spreadsheet',
        'application/vnd.ms-powerpoint': 'PowerPoint Presentation',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint Presentation',
        'text/plain': 'Text File',
        'text/csv': 'CSV File',
        'image/jpeg': 'JPEG Image',
        'image/png': 'PNG Image',
        'image/gif': 'GIF Image',
        'application/zip': 'ZIP Archive',
        'application/x-zip-compressed': 'ZIP Archive'
    };
    return typeDescriptions[mimeType] || 'Unknown File Type';
};
exports.getFileTypeDescription = getFileTypeDescription;

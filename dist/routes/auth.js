"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Public routes
router.post('/register', authController_1.register);
router.post('/login', authController_1.login);
router.post('/logout', auth_1.authenticate, authController_1.logout);
// Admin only routes
router.post('/trainer/register', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), authController_1.registerTrainer);
router.put('/trainer/:trainerId', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), authController_1.updateTrainer);
exports.default = router;

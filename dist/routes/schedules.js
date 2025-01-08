"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const scheduleController_1 = require("../controllers/scheduleController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Admin routes
router.post('/', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), scheduleController_1.createSchedule);
router.get('/', auth_1.authenticate, scheduleController_1.getSchedules);
// Trainer routes
router.get('/trainer', auth_1.authenticate, (0, auth_1.authorize)('TRAINER'), scheduleController_1.getTrainerSchedules);
exports.default = router;

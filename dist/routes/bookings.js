"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bookingController_1 = require("../controllers/bookingController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Trainee routes
router.post('/', auth_1.authenticate, (0, auth_1.authorize)('TRAINEE'), bookingController_1.createBooking);
router.delete('/:bookingId', auth_1.authenticate, (0, auth_1.authorize)('TRAINEE'), bookingController_1.cancelBooking);
router.get('/my-bookings', auth_1.authenticate, (0, auth_1.authorize)('TRAINEE'), bookingController_1.getTraineeBookings);
exports.default = router;

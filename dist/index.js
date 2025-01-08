"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const errorHandler_1 = require("./middleware/errorHandler");
const auth_1 = __importDefault(require("./routes/auth"));
const schedules_1 = __importDefault(require("./routes/schedules"));
const bookings_1 = __importDefault(require("./routes/bookings"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/schedules', schedules_1.default);
app.use('/api/bookings', bookings_1.default);
// Error handling
app.use(errorHandler_1.errorHandler);
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const renderRoutes_1 = __importDefault(require("./routes/renderRoutes"));
const path_1 = __importDefault(require("path"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use(express_1.default.json());
// Configurar EJS como motor de plantillas
app.set('view engine', 'ejs');
app.set('views', path_1.default.join(__dirname, 'views'));
app.use('/src/css', express_1.default.static(path_1.default.join(__dirname, 'css')));
app.use('/src/scriptsHTML', express_1.default.static(path_1.default.join(__dirname, 'scriptsHTML')));
app.use((0, cookie_parser_1.default)());
// Rutas
app.use('/', renderRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}, http://localhost:${PORT}`);
});

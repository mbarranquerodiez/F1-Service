import express from 'express';
import userRoutes from './routes/userRoutes';
import renderRoutes from './routes/renderRoutes';
import path from 'path';
import cookieParser from 'cookie-parser';



const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Configurar EJS como motor de plantillas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/src/css', express.static(path.join(__dirname, 'css')));
app.use('/src/scriptsHTML', express.static(path.join(__dirname, 'scriptsHTML')));
app.use(cookieParser());

// Rutas
app.use('/',renderRoutes)
app.use('/api/users', userRoutes);



// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}, http://localhost:${PORT}`);

});

import express from 'express';
import userRoutes from './routes/userRoutes';
import endpointRoutes from './routes/endpointRoutes';


const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Rutas
app.use('/api/users', userRoutes);
app.use('/api/endpoints', endpointRoutes);



// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);

});

// Importaciones de módulos
import express from 'express';
import Redis from 'ioredis';
import dotenv from 'dotenv';

// Configuración de variables de entorno
dotenv.config();

// Creación de la aplicación Express
const app = express();
const port = process.env.PORT || 3000;

// Creación del cliente Redis
const client = new Redis({
  password: process.env.REDIS_PASSWORD,
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
});

// Manejadores de eventos para el cliente Redis
client.on('connect', () => {
  console.log('Conexión exitosa a Redis');
});

client.on('error', (err) => {
  console.error('Error de conexión a Redis:', err);
});

// Middleware para manejar CORS
const allowedOrigin = process.env.FRONTEND_URL;

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,PATCH"); 
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});


// Middleware para analizar datos JSON en las solicitudes entrantes
app.use(express.json());


app.get('/', (req, res) => {
  res.send('¡Hello there!');
});

// Ruta para obtener el arreglo de nombres desde Redis
app.get('/names', async (req, res) => {
  try {
    // Obtener el arreglo de nombres desde Redis
    const names = await client.lrange('allNames', 0, -1);

    // Verificar si se encontraron nombres
    if (names.length > 0) {
      // Enviar los nombres como respuesta JSON
      res.json(names);
    } else {
      // Si no se encontraron nombres, enviar un mensaje de error
      res.status(404).send('No se encontraron nombres en Redis');
    }
  } catch (error) {
    // Manejar errores
    console.error('Error al obtener los nombres:', error);
    res.status(500).send('Error interno del servidor');
  }
});

// Ruta para obtener información de un medicamento específico por nombre
app.get('/med/:name', async (req, res) => {
  const { name } = req.params;

  try {
    // Obtener la información del medicamento desde Redis
    const medicationInfo = await client.hgetall(name);

    // Verificar si se encontró la información del medicamento
    if (medicationInfo) {
      // Incluir el nombre del medicamento en la información
      medicationInfo.name = name;

      // Enviar la información del medicamento como respuesta JSON
      res.json(medicationInfo);
    } else {
      // Si no se encontró la información, enviar un mensaje de error
      res.status(404).send('No se encontró el medicamento en Redis');
    }
  } catch (error) {
    // Manejar errores
    console.error('Error al obtener información del medicamento:', error);
    res.status(500).send('Error interno del servidor');
  }
});

// Agregar nuevo medicamento
app.post('/med', async (req, res) => {
  const { name, dosage, via, adult, ped, gpo90 } = req.body;

  try {
    await client.hmset(name, { "dosage": dosage, "via": via, "adult": adult, "ped": ped, "gpo90":gpo90});
    console.log(`Medicamento ${name} almacenado correctamente en Redis`);

    await client.rpush('allNames', name);
    console.log(`Nombre ${name} agregado correctamente a la lista 'names' en Redis`);

    res.send('Datos almacenados en Redis correctamente');
  } catch (error) {
    console.error('Error al almacenar datos en Redis:', error);
    res.status(500).send('Error interno del servidor');
  }
});


// Actualizar información de un medicamento específico por nombre
app.put('/med/:name', async (req, res) => {
  const { name } = req.params;
  const { dosage, via, adult, ped, gpo90 } = req.body;

  try {
    const medicamentoExists = await client.exists(name);

    if (medicamentoExists) {
      await client.hmset(name, { "dosage": dosage, "via": via, "adult": adult, "ped": ped, "gpo90": gpo90});
      res.send('Datos actualizados en Redis correctamente');
    } else {
      res.status(404).send('No se encontró el medicamento en Redis');
    }
  } catch (error) {
    console.error('Error al actualizar medicamento en Redis:', error);
    res.status(500).send('Error interno del servidor');
  }
});

// Eliminar un medicamento específico por nombre
app.delete('/med/:name', async (req, res) => {
  const { name } = req.params;

  try {
    const medicamentoExists = await client.exists(name);

    if (medicamentoExists) {
      await client.del(name);
      await client.lrem('allNames', 0, name);
      res.send('Medicamento eliminado de Redis correctamente');
    } else {
      res.status(404).send('No se encontró el medicamento en Redis');
    }
  } catch (error) {
    console.error('Error al eliminar medicamento de Redis:', error);
    res.status(500).send('Error interno del servidor');
  }
});

app.listen(port, () => {
  console.log(`El servidor está escuchando en http://localhost:${port}`);
});

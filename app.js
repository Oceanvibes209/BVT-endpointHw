const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();

require('dotenv').config();

const port = process.env.PORT;

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
});

app.use(async function (req, res, next) {
    try {
        req.db = await pool.getConnection();
        req.db.connection.config.namedPlaceholders = true;

        await req.db.query(`SET SESSION sql_mode = "TRADITIONAL"`);
        await req.db.query(`SET time_zone = '-8:00'`);

        await next();

        req.db.release();
    } catch (err) {
        console.log(err);

        if (req.db) req.db.release();
        throw err;
    }
});

app.use(cors());

app.use(express.json());

// gets the inventory table data from cars Database from mySQL
app.get('/inventory', async function (req, res) {// name of table in Database mysql (/inventory)
    try {

        const result = await req.db.query('SELECT * FROM car_data.inventory WHERE deleted_flag = 0'); //query in sql

        res.json({ success: true, message: 'Cars data retrieved', data: result[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});
//like a HTTP request

//Sets rules
app.use(async function (req, res, next) {
    try {
        console.log('Middleware after the get /inventory');

        await next();

    } catch (err) {

    }
});

//Creates new car in database
app.post('/inventory', async function (req, res) {
    try {
        const { id, make, model, quantity } = req.body;

        const query = await req.db.query(
            `INSERT INTO inventory (id, make, model, quantity) 
         VALUES (:id, :make, :model, :quantity)`,
            {
                id,
                make,
                model,
                quantity,
            }
        );

        res.json({ success: true, message: 'Car successfully created', data: null });
    } catch (err) {
        res.json({ success: false, message: err, data: null })
    }
});


// deletes car from db
app.delete('/inventory/:id', async function (req, res) {
    try {
        const carId = req.params.id; //Requesting an id in the URL

        const updateResult = await req.db.query('UPDATE car_data.inventory SET deleted_flag = 1 WHERE id = ?', [carId]);

        const resultSetHeader = updateResult[0];
        const affectedRows = resultSetHeader ? resultSetHeader.affectedRows : 0;

        if (affectedRows > 0) {
            res.json({ success: true, msg: 'Car deleted successfully' });
        } else {
            res.status(404).json({ success: false, msg: 'Car not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, msg: 'Internal server error' });
    }
});

app.put('/inventory/:id', async function (req, res) {
    try {
        const { make, model, quantity } = req.body;
        const carId = req.params.id; // Extract car ID from the URL parameters

        const query = await req.db.query(
            `UPDATE inventory 
         SET make = :make, model = :model, quantity = :quantity
         WHERE id = :carId`,
            {
                make,
                model,
                quantity,
                carId,
            }
        );

        // check if update was successful
        if (query.affectedRows === 0) {
            return res.json({ success: false, msg: 'Car not found', data: null });
        }

        res.json({ success: true, msg: 'Car successfully updated', data: null });
    } catch (err) {
        res.json({ success: false, msg: err.message, data: null });
    }
});

app.listen(port, () => console.log(`212 API Example listening on http://localhost:${port}`));
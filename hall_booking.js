// const express = require('express')
// const { MongoClient } = require('mongodb');
import express from "express"
import { MongoClient } from "mongodb"
import * as dotenv from 'dotenv'

dotenv.config()
const app = express()
const PORT = process.env.PORT
app.use(express.json()) 

app.get('/', function (req, res) {
    res.send('Hello Welcome to Hall Booking API')
})



const MONGO_URL = process.env.MONGO_URL;

async function createConnection() {
    const client = new MongoClient(MONGO_URL)
    await client.connect()
    console.log("Mongodb is connected")
    return client;
}

const client = await createConnection()

// Creating a room
app.post('/createRoom', async (req, res) => {
    try {
        const newProduct = req.body
        const result = await client.db("hall-booking").collection("rooms").insertMany(newProduct)

        res.status(201).send('Room Created');
    } catch {
        res.status(500).json({ error: 'Failed to create room' });
    }

})

//Booking a room
app.post('/createBookings', async (req, res) => {
    try {
        const { roomId, date, startTime, endTime } = req.body;


        const existingBooking = await client.db("hall-booking").collection("bookings").findOne({
            roomId: roomId,
            date: date,
            $or: [
                { startTime: { $lte: startTime }, end: { $gte: startTime } },
                { startTime: { $lte: endTime }, end: { $gte: endTime } },
                { startTime: { $gte: startTime }, end: { $lte: endTime } }
            ]
        });

        if (existingBooking) {
            res.status(400).json({ error: 'Room has booked already for the given date and time' });
            return;
        }


        const booking = await client.db("hall-booking").collection("bookings").insertOne(req.body);
        res.status(201).send('Booking Created');
    } catch (error) {
        res.status(500).json({ error: 'Failed to create Booking' });
    }
});

//list of all rooms with booking data
app.get('/getRoomBookings', async (req, res) => {
    try {
        const rooms = await client.db("hall-booking").collection("rooms").find().toArray();
        const result = []
        for (const room of rooms) {
            const bookings = await client.db("hall-booking").collection("bookings").find({ roomId: room.roomId }).toArray();
            for (const booking of bookings) {
                result.push({
                    roomName: room.name,
                    roomId: room.roomId,
                    bookedStatus: booking.status,
                    customerName: booking.customerName,
                    date: booking.date,
                    startTime: booking.startTime,
                    endTime: booking.endTime
                });
            }
        }
        res.json(result)
    } catch(error) {
        res.status(500).json({ error: 'Failed to retrieve room bookings' });
        console.log(error)
    }
});

// list of all customers with booked data
app.get('/getCustomerBookings', async (req, res) => {
    try {
        const bookings = await client.db("hall-booking").collection("bookings").find().toArray(); 
        const result = [];
        for (const booking of bookings) {
            const rooms = await client.db("hall-booking").collection("rooms").find({ roomId: booking.roomId}).toArray(); 
            for(const room of rooms){
            result.push({
                customerName: booking.customerName,
                roomName: room.name,
                date: booking.date,
                startTime: booking.startTime,
                endTime: booking.endTime
            });
          }
        }
        res.json(result); 
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve customer bookings' }); 
    }
});

// API for how many times customer booked the room
app.get('/getCustomerBooking/:name', async (req, res) => {
    const { name } = req.params;
  
    try {
        const customer = await client.db("hall-booking").collection("bookings").find({ customerName: name }).toArray(); 
  
        if (!customer) {
            res.status(404).json({ error: 'Customer not found' }); 
            return;
        }
        const result = customer.map(booking => ({ 
          customerName: booking.customerName,
          roomName: booking.roomId,
          date: booking.date,
          startTime: booking.startTime,
          endTime: booking.endTime,
          bookingId: booking._id,
          bookingDate: booking.date,
          bookingStatus: booking.status
      }));
      res.json(result); 
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve customer bookings' }); // Sending error response
    }
  });

app.listen(PORT, () => console.log("Server is starting", PORT))
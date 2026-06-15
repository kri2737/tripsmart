const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const User = require("./models/User");
const authRoutes = require("./routes/authRoutes");
require('dotenv').config();
const Trip = require('./models/Trip');
const tripRoutes = require('./routes/tripRoutes');
const app = express();

//middleware
app.use(cors());
app.use(express.json());

app.use("/api/auth",authRoutes);
app.use('/api/trips', tripRoutes);

app.get("/" , (req,res) =>{
      res.json({message : `Tripsmart API is running`});
});

mongoose.connect(process.env.MONGO_URI).then(()=>{
    console.log("MongoDB Connected");
    app.listen(process.env.PORT , () =>{
        console.log(`Server running on port ${process.env.PORT}`);
    });
})
.catch((err)=>{
    console.log("Connection failed", err);
});



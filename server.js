const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

//middleware
app.use(cors());
app.use(express.json());

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
app.listen(8000,()=>{
    console.log("server running on port 8000");
});
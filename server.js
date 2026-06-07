const express = require('express');
const app = express();

app.use(express.json());

app.get("/" , (req,res) =>{
      res.json({message : `Tripsmart API is running`});
});

app.listen(8000,()=>{
    console.log("server running on port 8000");
});
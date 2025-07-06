const mongoose= require("mongoose");
const initData=require("./data.js");
const Listing = require("../models/listing.js");

main()
.then(()=>{
    console.log("connnection successful")
})
.catch((error)=>{
    console.log(error);
})

async function main() {
    mongoose.connect("mongodb://127.0.0.1:27017/wanderlust");
}

const initDB=async ()=>{
    await Listing.deleteMany({});
    initData.data=initData.data.map((obj)=>({...obj, owner:"68655f69a0f5dd4ab18b3e6a"}));
    await Listing.insertMany(initData.data);
    console.log("data was initialised");
}

initDB();
const mongoose=require("mongoose");


const SellerSchema=new mongoose.Schema({

name:{
type:String,
required:true
},


email:{
type:String,
required:true,
unique:true
},


phone:String,


shopName:String,


address:String,


status:{
type:String,
default:"Pending"
},


approved:{
type:Boolean,
default:false
}


},{
timestamps:true
});


module.exports =
mongoose.models.Seller ||
mongoose.model("Seller",SellerSchema);
const mongoose = require('mongoose');


const OrderSchema = new mongoose.Schema({

 customerId:{
   type:mongoose.Schema.Types.ObjectId,
   ref:'User',
   required:true
 },


 sellerId:{
   type:mongoose.Schema.Types.ObjectId,
   ref:'User'
 },


 items:[
   {
     productId:{
       type:mongoose.Schema.Types.ObjectId,
       ref:'Product'
     },

     name:String,

     quantity:{
       type:Number,
       default:1
     },

     price:Number,

     image:String
   }
 ],


 total:{
   type:Number,
   required:true
 },


 paymentStatus:{
   type:String,
   enum:[
     "Pending",
     "Paid",
     "Failed"
   ],
   default:"Pending"
 },


 paymentMethod:{
   type:String,
   default:"Cash"
 },


 transactionId:{
   type:String,
   default:""
 },


 deliveryAddress:{
   name:String,
   phone:String,
   address:String,
   city:String
 },


 riderId:{
   type:mongoose.Schema.Types.ObjectId,
   ref:'User'
},


deliveryStatus:{
   type:String,
   enum:[
     "Waiting",
     "Assigned",
     "Picked",
     "On the way",
     "Completed"
   ],
   default:"Waiting"
},


status:{
   type:String,
   enum:[
     "Pending",
     "Confirmed",
     "Processing",
     "Shipped",
     "Delivered",
     "Cancelled"
   ],
   default:"Pending"
}


},{
 timestamps:true
});


module.exports =
mongoose.models.Order ||
mongoose.model('Order',OrderSchema);

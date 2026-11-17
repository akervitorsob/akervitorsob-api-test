const mongoose = require("mongoose");


const PaymentSchema = new mongoose.Schema({

    orderId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Order",
        required:true
    },


    customerId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },


    method:{
        type:String,
        enum:[
            "bkash",
            "nagad",
            "cash"
        ],
        required:true
    },


    amount:{
        type:Number,
        required:true
    },


    transactionId:{
        type:String,
        default:""
    },


    gatewayResponse:{
        type:Object,
        default:{}
    },


    status:{
        type:String,
        enum:[
            "Pending",
            "Success",
            "Failed"
        ],
        default:"Pending"
    }


},{
    timestamps:true
});



module.exports =
mongoose.models.Payment ||
mongoose.model("Payment", PaymentSchema);
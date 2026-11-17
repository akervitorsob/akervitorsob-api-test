const mongoose = require("mongoose");


const CartSchema = new mongoose.Schema({

    customerId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },


    items:[

        {

            productId:{
                type:mongoose.Schema.Types.ObjectId,
                ref:"Product",
                required:true
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


    totalAmount:{
        type:Number,
        default:0
    }


},{
    timestamps:true
});



module.exports =
mongoose.models.Cart ||
mongoose.model("Cart",CartSchema);
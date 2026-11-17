const mongoose = require("mongoose");

const warehouseSchema = new mongoose.Schema({

  name: { 
    type:String, 
    required:true 
  },

  code: { 
    type:String, 
    required:true, 
    unique:true, 
    index:true 
  },

  country: { 
    type:String, 
    default:"BD", 
    index:true 
  },

  city: { 
    type:String, 
    index:true 
  },

  address:String,


  location: {

    type:{
      type:String,
      enum:["Point"],
      default:"Point"
    },

    coordinates:{
      type:[Number],
      default:[90.4125,23.8103]
    }

  },


  inventory:[

    {

      productId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Product"
      },

      quantity:{
        type:Number,
        default:0
      },

      reserved:{
        type:Number,
        default:0
      },

      lowStockAlert:{
        type:Number,
        default:10
      }

    }

  ],


  active:{
    type:Boolean,
    default:true
  }


},{timestamps:true});



warehouseSchema.index({
  location:"2dsphere"
});


module.exports =
mongoose.models.Warehouse ||
mongoose.model("Warehouse", warehouseSchema);
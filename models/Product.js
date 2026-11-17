const mongoose = require("mongoose");


const ProductSchema = new mongoose.Schema(
{

    name: {
        type: String,
        required: true,
        trim: true
    },


    description: {
        type: String,
        default: ""
    },


    category: {
        type: String,
        required: true
    },


    price: {
        type: Number,
        required: true
    },


    discountPrice: {
        type: Number,
        default: 0
    },


    stock: {
        type: Number,
        default: 0
    },


    // Product Main Image
    image: {
        type: String,
        default: ""
    },


    // Multiple Images (future use)
    images: [
        {
            type: String
        }
    ],


    // Weight / Size Options
    weights: {
        type: [String],
        default: [
            "250g",
            "500g",
            "750g",
            "1kg"
        ]
    },


    // Color Options
    colors: {
        type: [String],
        default: []
    },


    // Seller Information
    sellerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },


    status: {

        type: String,

        enum: [
            "active",
            "inactive",
            "outofstock"
        ],

        default: "active"
    },


    featured: {

        type: Boolean,

        default: false
    },


    // Product Rating Future
    rating: {

        type: Number,

        default: 0
    },


    reviews: [

        {
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },

            comment: String,

            rating: Number

        }

    ]

},
{
    timestamps:true
});


module.exports =
mongoose.models.Product ||
mongoose.model(
    "Product",
    ProductSchema
);
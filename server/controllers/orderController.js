const Order = require('../models/orderModel');
const userint=require('../models/userinteractionModel')

const createOrder = async (req, res) => {
    try {
        const userId = req.userId
        const { productId, paymentMethod, shippingAddress } = req.body;

        if (!userId || !productId || !paymentMethod || !shippingAddress) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        const existingOrder = await Order.findOne({ productId });
        if (existingOrder) {
            return res.status(400).json({ message: 'Order ID already exists. Please use a unique order ID.' });
        }
        // Create a new order
        const order = new Order({
            userId,
            productId,
            paymentMethod,
            shippingAddress,
            paymentStatus: 'Pending',  
            orderStatus: 'Processing'  
        });

        // Save order to database
        await order.save();

        const userInteraction = await userint.findOne({ userId });
        
        res.status(201).json({ message: 'Order placed successfully', order });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = createOrder;

// Socket.io real-time order status handler

module.exports = (io)=>{
 io.on('connection',(socket)=>{

  socket.on('join-order',(orderId)=>{
    socket.join(`order-${orderId}`);
  });

  socket.on('order-status-update',(data)=>{
    io.to(`order-${data.orderId}`).emit(
      'order-updated',
      data
    );
  });

 });
};

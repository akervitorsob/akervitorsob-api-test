const router=require('express').Router();

router.get('/stats', async(req,res)=>{
 res.json({
  totalSales:0,
  orders:0,
  products:0,
  sellers:0,
  riders:0,
  warehouses:0,
  source:"SQLite API ready"
 });
});

module.exports=router;

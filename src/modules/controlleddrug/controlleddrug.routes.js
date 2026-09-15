const express=require("express");
const router=express.Router();
const {readRows}=require("../../config/google");

const clean=v=>String(v??"").trim();
const num=v=>{const n=Number(String(v??"").replace(/,/g,""));return Number.isFinite(n)?n:0;};
const norm=(rows)=>rows||[];

router.get("/movement",async(req,res)=>{
  try{res.json({success:true,data:norm(await readRows("STOCK_MOVEMENT"))});}
  catch(e){res.status(500).json({success:false,message:e.message});}
});

router.get("/stock",async(req,res)=>{
  try{
    const rows=await readRows("STOCK_MOVEMENT");
    const map=new Map();
    for(const r of rows){
      const code=clean(r.CODE), lot=clean(r.LOT)||"-"; if(!code)continue;
      const key=`${code}||${lot}`; const cur=map.get(key)||{code,name:clean(r.NAME),unit:clean(r.UNIT),lot,exp:clean(r.EXP),balance:0};
      cur.balance += clean(r.TYPE).toUpperCase()==="OUT" ? -num(r.QTY) : num(r.QTY);
      if(clean(r.NAME))cur.name=clean(r.NAME); if(clean(r.EXP))cur.exp=clean(r.EXP); map.set(key,cur);
    }
    const data=[...map.values()].filter(x=>x.balance!==0||x.exp||x.lot!=="-").sort((a,b)=>a.code.localeCompare(b.code)||a.lot.localeCompare(b.lot));
    res.json({success:true,data});
  }catch(e){res.status(500).json({success:false,message:e.message});}
});

router.get("/summary",async(req,res)=>{
  try{
    const rows=await readRows("STOCK_MOVEMENT"); const stock={}; let totalIn=0,totalOut=0;
    for(const r of rows){const q=num(r.QTY);const t=clean(r.TYPE).toUpperCase(); if(t==="OUT")totalOut+=q;else if(t==="IN")totalIn+=q; const c=clean(r.CODE); if(c)stock[c]=(stock[c]||0)+(t==="OUT"?-q:q);}
    const items=Object.entries(stock).map(([code,balance])=>({code,balance}));
    res.json({success:true,data:{totalItems:items.length,totalIn,totalOut,balance:totalIn-totalOut,negativeStock:items.filter(x=>x.balance<0).length,stock:items}});
  }catch(e){res.status(500).json({success:false,message:e.message});}
});
module.exports=router;

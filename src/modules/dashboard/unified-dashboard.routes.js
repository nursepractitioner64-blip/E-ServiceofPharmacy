const express = require("express");
const router = express.Router();
const { readRows } = require("../../config/google");

const clean = v => String(v ?? "").trim();
const num = v => {
  const n = Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

function mapRows(rows) {
  return (rows || []).map(r => Object.fromEntries(
    Object.entries(r).map(([k,v]) => [String(k).trim().toUpperCase(), v])
  ));
}

router.get("/unified", async (req, res) => {
  try {
    const [emergencyMaster, emergencyMovement, emergencyChecks, drugMaster, stockMovement] =
      await Promise.all([
        readRows("INVENTORY_MASTER").catch(()=>[]),
        readRows("INVENTORY_MOVEMENT").catch(()=>[]),
        readRows("EMERGENCY_CHECK_LOG").catch(()=>[]),
        readRows("DRUG_MASTER").catch(()=>[]),
        readRows("STOCK_MOVEMENT").catch(()=>[])
      ]);

    const em = mapRows(emergencyMaster);
    const mv = mapRows(emergencyMovement);
    const checks = mapRows(emergencyChecks);
    const dm = mapRows(drugMaster);
    const sm = mapRows(stockMovement);

    const balance = new Map();
    for (const r of mv) {
      const code=clean(r.CODE); if(!code) continue;
      const qty=num(r.QTY);
      const type=clean(r.TYPE).toUpperCase();
      balance.set(code,(balance.get(code)||0)+(type==="OUT" ? -qty : qty));
    }

    const required = new Map();
    for (const r of em) required.set(clean(r.CODE),num(r.REQUIRED));
    const emergency = em.filter(r=>clean(r.CODE)).map(r=>{
      const code=clean(r.CODE), bal=balance.get(code)||0, req=num(r.REQUIRED);
      return {code,name:clean(r.NAME),unit:clean(r.UNIT),required:req,balance:bal,status:bal>=req?"PASS":"FAIL"};
    });

    const latest = new Map();
    for (const r of checks) {
      const code=clean(r.CODE); if(!code) continue;
      const t=clean(r.TIMESTAMP||r.DATE||r.CHECK_DATE);
      const old=latest.get(code);
      if(!old || t >= old._t) latest.set(code,{...r,_t:t});
    }
    let checked=0, passed=0, failed=0;
    for (const x of emergency) {
      const c=latest.get(x.code);
      if(c){ checked++; const ok=clean(c.STATUS).toUpperCase()==="PASS" || clean(c.RESULT).toUpperCase()==="PASS"; if(ok) passed++; else failed++; }
    }

    const stock = new Map();
    for (const r of sm) {
      const key=clean(r.CODE)+"|"+clean(r.LOT);
      const q=num(r.QTY), type=clean(r.TYPE).toUpperCase();
      stock.set(key,(stock.get(key)||0)+(type==="OUT"?-q:q));
    }
    const controlled = [...stock.entries()].map(([key,balance])=>{
      const [code,lot]=key.split("|");
      const master=dm.find(r=>clean(r.CODE)===code)||{};
      return {code,name:clean(master.NAME),unit:clean(master.UNIT),lot, balance};
    }).filter(x=>x.code);
    const negative=controlled.filter(x=>x.balance<0);

    res.json({success:true,data:{
      emergency:{
        total:emergency.length, ready:emergency.filter(x=>x.status==="PASS").length,
        fail:emergency.filter(x=>x.status==="FAIL").length, checked, passed, failed,
        items:emergency
      },
      controlledDrug:{
        lots:controlled.length, negative:negative.length, totalBalance:controlled.reduce((s,x)=>s+x.balance,0),
        items:controlled
      },
      alerts:{
        emergencyFail:emergency.filter(x=>x.status==="FAIL"),
        controlledNegative:negative
      },
      generatedAt:new Date().toISOString()
    }});
  } catch(err) {
    console.error("UNIFIED DASHBOARD ERROR:",err);
    res.status(500).json({success:false,message:err.message||"UNIFIED_DASHBOARD_ERROR"});
  }
});
module.exports = router;

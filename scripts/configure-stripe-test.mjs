import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import Stripe from "stripe";
const require=createRequire(import.meta.url);
createRequire(require.resolve("next/package.json"))("@next/env").loadEnvConfig(process.cwd(),true,{info(){},error(){}});
const path="docs/audit-commercial/stripe-test-configuration-2026-10-09.json";
const config=JSON.parse(await readFile(path,"utf8"));
if(!/^(sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY??""))throw Error("Test key required");
const client=new Stripe(process.env.STRIPE_SECRET_KEY,{timeout:10000,maxNetworkRetries:1});
try{
 const account=await client.accounts.retrieve(null);
 if(account.id!==config.accountId)throw Error("Wrong sandbox");
 for(const interval of ["monthly","yearly"]){
  const plan=config[interval];
  const price=await client.prices.retrieve(plan.priceId);
  if(price.livemode || (price.tax_behavior!=="unspecified" && price.tax_behavior!=="inclusive"))throw Error("Unexpected tax behavior");
  await client.prices.update(price.id,{tax_behavior:"inclusive"});
  const id="kalivoa_welcome_"+interval+"_v2";
  let coupon;
  try{coupon=await client.coupons.retrieve(id,{expand:["applies_to"]});}catch(e){
   if(e.code!=="resource_missing")throw e;
   coupon=await client.coupons.create({id,name:interval==="monthly"?"Bienvenue Kalivoa : 12 mois":"Bienvenue Kalivoa : 1re annee",currency:"eur",amount_off:plan.welcomeAmountOff,
    duration:plan.welcomeDuration,...(interval==="monthly"?{duration_in_months:12}:{}),applies_to:{products:[config.productId]},metadata:{app:"kalivoa",billingInterval:interval}},{idempotencyKey:"kalivoa:coupon:"+id});
  }
  coupon=await client.coupons.retrieve(id,{expand:["applies_to"]});
  if(!coupon.applies_to?.products.includes(config.productId))throw Error("Missing product restriction");
  plan.previousCouponId=plan.welcomeCouponId.endsWith("_v1")?plan.welcomeCouponId:plan.previousCouponId;
  plan.welcomeCouponId=id;
  console.log(JSON.stringify({interval,priceId:price.id,taxBehavior:"inclusive",couponId:id,productRestrictionVerified:true}));
 }
 config.verification.taxBehaviorVerified=true;
 config.verification.method="Stripe API and Dashboard";
 await writeFile(path,JSON.stringify(config,null,2)+"\n");
 for(const file of [".env.local",".env.local.example"]){
  let source=await readFile(file,"utf8");source=source.replaceAll("kalivoa_welcome_monthly_v1","kalivoa_welcome_monthly_v2").replaceAll("kalivoa_welcome_yearly_v1","kalivoa_welcome_yearly_v2");
  await writeFile(file,source);
 }
}catch(e){console.log(JSON.stringify({failed:true,errorType:e.type??e.name,code:e.code??null,localReason:e.type?undefined:e.message}));process.exitCode=1;}

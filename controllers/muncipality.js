const asyncHandler=require('../middlewares/async');
const ErrorResponce=require('../utils/ErrorResponce');
const User = require('../schemas/User');
const Price = require('../schemas/Price');
const Muncipality = require('../schemas/Muncipality');
const Billing=require('../schemas/Billing');

//@desc Update current meter data
//@router POST /api/munci
//@access Private

exports.meterData=asyncHandler(async(req,res,next)=>{

    const {consumerNumber,currentReading}=req.body;
    const fk_consumerId=consumerNumber;

    //checking if the given user exist
    const user=await User.findByPk(consumerNumber);
    if(!user){
        return next(new ErrorResponce('No such user',404));
    }
    //calculating currentWaterconsumption
    const currentWaterConsumption=currentReading-user.currentThreshold;
    //finding latest updated price
    const {currentPrice,id,quantity}=await Price.findOne({order:[['updatedAt', 'DESC']]});
    const priceId=id;

    //calculating monthly price
    //const currentMonthlyPrice=currentPrice*parseFloat(currentWaterConsumption/1000).toFixed(2);
    let currentMonthlyPrice=0;
    if(currentWaterConsumption<quantity){
        currentMonthlyPrice=currentPrice;
    }
    else if(currentWaterConsumption<10000){
      currentMonthlyPrice=currentPrice+((currentWaterConsumption-quantity)/1000)*4.41;
    }

   //checking if user to confirm to create or update
    const checkUser= await Muncipality.findOne({where:{fk_consumerId:fk_consumerId}});
    let muncipality;
    if(!checkUser){
        //creating new record
       muncipality=await Muncipality.create({currentWaterConsumption,currentMonthlyPrice,fk_consumerId,priceId,currentMeterReading:currentReading});
    }
    else{
        let newContent={currentWaterConsumption:currentWaterConsumption,currentMonthlyPrice:currentMonthlyPrice};
        //updating the content based on userId
        await Muncipality.update(newContent,{where:{id:checkUser.id}});
        muncipality= await Muncipality.findOne({where:{id:checkUser.id}})
    }
    if(!muncipality){
        return next(new ErrorResponce('The data is not updated'));
    }
    const date=muncipality.createdAt;
   


    //condition to update the billing and userthreshold on 00:00:00 everymonth @30
    if(date.getDate()==="30" && date.getHours()==="0" && date.getMinutes()==="00" && date.getSeconds()==="00" ){
        let updateContent={currentThreshold:currentReading};
        await User.update(updateContent,{where:{consumerNumber:fk_consumerId}});
        let due=0;
        let fine=0
        const previousBilling=await Billing.findOne({where:{fk_consumerId:result[i].dataValues.fk_consumerId},order:[['updatedAt', 'DESC']]});
        if(!previousBilling){
         due=0;
         fine=0;
        }
        else{
            if (previousBilling.status==="unpaid"){
                due=previousBilling.totalCost;
                fine=previousBilling.fine+5;
            }
            else{
                due=0;
                fine=0;  
            }
        }
        const consumedPrice=currentMonthlyPrice;
        const totalCost=consumedPrice+due+fine;
        const monthYear= date.getMonth() + '/' +date.getYear();
        const billing=await Billing.create({fk_consumerId:fk_consumerId,consumedPrice:consumedPrice,totalCost:totalCost,monthYear:monthYear,due:due,fine:fine});
        if (!billing){
            return next(new ErrorResponce("Billing is not created",404));
        }
    }    
    //returning the status
    res.status(200).json({
        success:true,
        message:"Data has been updated"
    })
});

exports.getConsumerData=asyncHandler(async(req,res,next)=>{
const consumerNumber= req.user.consumerNumber; 
if(!consumerNumber){
    return next(new ErrorResponce("User with given consumer number do not exist",404));
}
const consumer= await Muncipality.findOne({where:{fk_consumerId:consumerNumber},order:[['updatedAt', 'DESC']]});
if(!consumer){
     return next(new ErrorResponce("The given consumer data is not updated",404));
}
res.status(200).json({
    success:true,
    consumer

})

});



const prisma=require("../prisma/client");

exports.getVendors = async(req,res)=>{

    try{

        const vendors =
            await prisma.vendor.findMany({

                orderBy:{
                    vendorName:"asc"
                }

            });

        res.json(vendors);

    }catch(error){

        res.status(500).json({
            error:error.message
        });
    }
};

exports.createVendor = async(req,res)=>{

    try{

        const count =
            await prisma.vendor.count();

        const vendorCode =
            "VEN" +
            String(count + 1)
                .padStart(3,'0');

        const vendor =
            await prisma.vendor.create({

                data: {

                    vendorCode,

                    vendorName:
                        req.body.vendorName,

                    contactPerson:
                        req.body.contactPerson,

                    phone:
                        req.body.phone,

                    email:
                        req.body.email,

                    gstNumber:
                        req.body.gstNumber,

                    address:
                        req.body.address || null
                }
            });

        res.json(vendor);

    }catch(error){

        res.status(500).json({
            error:error.message
        });
    }
};
exports.updateVendor = async(req,res)=>{

    try{

        const id =
            Number(req.params.id);

        const vendor =
            await prisma.vendor.update({

                where:{
                    id
                },

                data:{

                    vendorName:
                        req.body.vendorName,

                    contactPerson:
                        req.body.contactPerson,

                    phone:
                        req.body.phone,

                    email:
                        req.body.email,

                    gstNumber:
                        req.body.gstNumber,

                    address:
                        req.body.address || null
                }
            });

        res.json(vendor);

    }catch(error){

        res.status(500).json({
            error:error.message
        });
    }
};
exports.deleteVendor = async(req,res)=>{

    try{

        await prisma.vendor.delete({

            where:{
                id:Number(req.params.id)
            }

        });

        res.json({
            success:true,
            message:"Vendor deleted"
        });

    }catch(error){

        res.status(500).json({
            error:error.message
        });
    }
};
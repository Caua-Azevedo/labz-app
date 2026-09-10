require('dotenv').config();
const bcrypt=require('bcryptjs');
const {PrismaClient}=require('@prisma/client');
const prisma=new PrismaClient();

async function main(){
  const email='demo@labzapp.com.br';
  const user=await prisma.user.upsert({
    where:{email},
    update:{},
    create:{name:'Nutricionista Demo',email,passwordHash:await bcrypt.hash('labz12345',12)}
  });
  const count=await prisma.patient.count({where:{ownerId:user.id}});
  if(!count){
    await prisma.patient.createMany({data:[
      {ownerId:user.id,name:'Ana Beatriz',goal:'Emagrecimento',adherence:78,currentWeight:68.4},
      {ownerId:user.id,name:'Carlos Eduardo',goal:'Performance',adherence:54,currentWeight:82.1},
      {ownerId:user.id,name:'Júlia Prado',goal:'Reeducação alimentar',adherence:91,currentWeight:73.1}
    ]});
  }
  console.log('Demo:',email,'/ labz12345');
}
main().finally(()=>prisma.$disconnect());

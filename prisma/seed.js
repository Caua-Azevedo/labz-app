require('dotenv').config();
const bcrypt=require('bcryptjs');
const {PrismaClient}=require('@prisma/client');
const prisma=new PrismaClient();

async function main(){
  const email='demo@labzapp.com.br';
  const user=await prisma.user.upsert({where:{email},update:{},create:{name:'Rafael Diaz',email,passwordHash:await bcrypt.hash('labz12345',12)}});
  const count=await prisma.patient.count({where:{ownerId:user.id}});
  if(!count){
    const ana=await prisma.patient.create({data:{ownerId:user.id,name:'Ana Beatriz',goal:'Emagrecimento',adherence:78,currentWeight:71.8,anamnesis:{complaint:'Redução de gordura corporal com rotina sustentável.',history:'Sem histórico clínico relevante informado.',allergies:'Nega alergias alimentares.',meds:'Não informado.',routine:'Treina 4x por semana.'},evolutions:[{date:'02/09/2026',weight:71.8,adherence:78,notes:'Boa adaptação ao plano.'}],measures:[{date:'28/07/2026',weight:74.6,waist:82,hip:103,fat:31.2},{date:'02/09/2026',weight:71.8,waist:78,hip:100,fat:29.4}]}});
    const carlos=await prisma.patient.create({data:{ownerId:user.id,name:'Carlos Eduardo',goal:'Performance',adherence:54,currentWeight:82.4,anamnesis:{complaint:'Melhorar performance e ganho de massa.',meds:'Creatina.',routine:'Musculação 5x/semana.'},evolutions:[{date:'03/09/2026',weight:82.4,adherence:54,notes:'Ajustar opções práticas.'}],measures:[{date:'19/08/2026',weight:81.6,waist:86,hip:99,fat:16.8},{date:'03/09/2026',weight:82.4,waist:86,hip:99,fat:16.5}]}});
    const julia=await prisma.patient.create({data:{ownerId:user.id,name:'Júlia Prado',goal:'Reeducação alimentar',adherence:91,currentWeight:73.1,anamnesis:{complaint:'Melhorar relação com alimentação.',allergies:'Intolerância à lactose relatada.',routine:'Costuma cozinhar em casa.'},evolutions:[{date:'01/09/2026',weight:73.1,adherence:91,notes:'Excelente adesão.'}],measures:[{date:'06/07/2026',weight:78.4,waist:88,hip:108,fat:34.5},{date:'01/09/2026',weight:73.1,waist:82,hip:103,fat:31.1}]}});
    await prisma.diet.create({data:{ownerId:user.id,patientId:ana.id,name:'Emagrecimento 1850 kcal',calories:1850,waterLiters:2.2,notes:'Priorizar saciedade e praticidade.',meals:[{name:'Café da manhã',foods:[{name:'Ovos',qty:'2 un',kcal:'140'},{name:'Pão integral',qty:'2 fatias',kcal:'130'}]},{name:'Almoço',foods:[{name:'Arroz',qty:'120 g',kcal:'156'},{name:'Frango',qty:'150 g',kcal:'248'}]}]}});
    await prisma.diet.create({data:{ownerId:user.id,name:'Template performance',calories:2800,waterLiters:3,isTemplate:true,notes:'Base para pacientes com foco em performance.',meals:[{name:'Pré-treino',foods:[{name:'Banana',qty:'1 un',kcal:'90'},{name:'Aveia',qty:'40 g',kcal:'150'}]}]}});
    const now=new Date();const day=new Date(now.getFullYear(),now.getMonth(),now.getDate(),14,0,0);
    await prisma.appointment.createMany({data:[{ownerId:user.id,patientId:ana.id,startsAt:day,type:'Retorno',valueCents:20000,status:'scheduled',notes:'Revisar adesão e medidas.'},{ownerId:user.id,patientId:carlos.id,startsAt:new Date(day.getTime()+90*60000),type:'Avaliação',valueCents:25000,status:'scheduled'},{ownerId:user.id,patientId:julia.id,startsAt:new Date(day.getTime()+180*60000),type:'Retorno',valueCents:20000,status:'done'}]});
  }
  console.log('Demo:',email,'/ labz12345');
}
main().finally(()=>prisma.$disconnect());

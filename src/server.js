require('dotenv').config();
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('Defina JWT_SECRET no .env');

app.use(express.json({limit:'1mb'}));
app.use(cookieParser());

function sign(user){ return jwt.sign({sub:user.id, role:user.role}, JWT_SECRET, {expiresIn:'7d'}); }
function setAuthCookie(res, token){ res.cookie('labz_session', token, {httpOnly:true, sameSite:'lax', secure:process.env.NODE_ENV==='production', maxAge:7*24*60*60*1000}); }
async function auth(req,res,next){
  try{
    const token=req.cookies.labz_session;
    if(!token) return res.status(401).json({error:'Não autorizado'});
    const payload=jwt.verify(token,JWT_SECRET);
    const user=await prisma.user.findUnique({where:{id:payload.sub}});
    if(!user) return res.status(401).json({error:'Sessão inválida'});
    req.user=user; next();
  }catch{ return res.status(401).json({error:'Sessão expirada'}); }
}
const safeUser=u=>({id:u.id,name:u.name,email:u.email,role:u.role});
const patientOut=p=>({...p,start:p.createdAt.toLocaleDateString('pt-BR')});
const appointmentOut=a=>({
  id:a.id,patientId:a.patientId,date:a.startsAt.toISOString().slice(0,10),time:a.startsAt.toISOString().slice(11,16),
  type:a.type,status:a.status,value:a.valueCents/100,notes:a.notes||'',patientName:a.patient?.name||''
});
const dietOut=d=>({id:d.id,patientId:d.patientId,name:d.name,calories:d.calories,water:d.waterLiters,notes:d.notes||'',isTemplate:d.isTemplate,meals:d.meals||[],updatedAt:d.updatedAt});

app.post('/api/auth/register', async(req,res)=>{
  const parsed=z.object({name:z.string().min(2),email:z.string().email(),password:z.string().min(8)}).safeParse(req.body);
  if(!parsed.success) return res.status(400).json({error:'Dados de cadastro inválidos'});
  const email=parsed.data.email.toLowerCase();
  if(await prisma.user.findUnique({where:{email}})) return res.status(409).json({error:'E-mail já cadastrado'});
  const user=await prisma.user.create({data:{name:parsed.data.name,email,passwordHash:await bcrypt.hash(parsed.data.password,12)}});
  setAuthCookie(res,sign(user)); res.status(201).json({user:safeUser(user)});
});
app.post('/api/auth/login', async(req,res)=>{
  const parsed=z.object({email:z.string().email(),password:z.string().min(1)}).safeParse(req.body);
  if(!parsed.success) return res.status(400).json({error:'E-mail ou senha inválidos'});
  const user=await prisma.user.findUnique({where:{email:parsed.data.email.toLowerCase()}});
  if(!user || !(await bcrypt.compare(parsed.data.password,user.passwordHash))) return res.status(401).json({error:'E-mail ou senha inválidos'});
  setAuthCookie(res,sign(user)); res.json({user:safeUser(user)});
});
app.post('/api/auth/logout',(req,res)=>{res.clearCookie('labz_session');res.status(204).end();});
app.get('/api/auth/me',auth,(req,res)=>res.json(safeUser(req.user)));

app.get('/api/patients',auth,async(req,res)=>{
  const rows=await prisma.patient.findMany({where:{ownerId:req.user.id},orderBy:{createdAt:'desc'}}); res.json(rows.map(patientOut));
});
app.post('/api/patients',auth,async(req,res)=>{
  const p=req.body||{}; if(!String(p.name||'').trim()) return res.status(400).json({error:'Nome é obrigatório'});
  const row=await prisma.patient.create({data:{ownerId:req.user.id,name:String(p.name).trim(),goal:p.goal||null,adherence:Number(p.adherence||0),currentWeight:p.currentWeight?Number(p.currentWeight):null,email:p.email||null,phone:p.phone||null,notes:p.notes||null,anamnesis:p.anamnesis||{},evolutions:p.evolutions||[],measures:p.measures||[]}});
  res.status(201).json(patientOut(row));
});
app.put('/api/patients/:id',auth,async(req,res)=>{
  const current=await prisma.patient.findFirst({where:{id:req.params.id,ownerId:req.user.id}}); if(!current) return res.status(404).json({error:'Paciente não encontrado'});
  const p=req.body||{};
  const row=await prisma.patient.update({where:{id:current.id},data:{
    ...(p.name!==undefined?{name:String(p.name).trim()}:{}), ...(p.goal!==undefined?{goal:p.goal||null}:{}), ...(p.adherence!==undefined?{adherence:Number(p.adherence)}:{}),
    ...(p.currentWeight!==undefined?{currentWeight:p.currentWeight===null?null:Number(p.currentWeight)}:{}), ...(p.notes!==undefined?{notes:p.notes||null}:{}),
    ...(p.anamnesis!==undefined?{anamnesis:p.anamnesis}:{}), ...(p.evolutions!==undefined?{evolutions:p.evolutions}:{}), ...(p.measures!==undefined?{measures:p.measures}:{})
  }}); res.json(patientOut(row));
});

app.get('/api/appointments',auth,async(req,res)=>{const rows=await prisma.appointment.findMany({where:{ownerId:req.user.id},include:{patient:true},orderBy:{startsAt:'asc'}});res.json(rows.map(appointmentOut));});
app.post('/api/appointments',auth,async(req,res)=>{
  const a=req.body||{}; const patient=await prisma.patient.findFirst({where:{id:a.patientId,ownerId:req.user.id}}); if(!patient) return res.status(404).json({error:'Paciente não encontrado'});
  const row=await prisma.appointment.create({data:{ownerId:req.user.id,patientId:a.patientId,startsAt:new Date(`${a.date}T${a.time}:00`),type:a.type||'Consulta',valueCents:Math.round(Number(a.value||0)*100),status:a.status||'scheduled',notes:a.notes||null},include:{patient:true}});res.status(201).json(appointmentOut(row));
});
app.put('/api/appointments/:id',auth,async(req,res)=>{
  const current=await prisma.appointment.findFirst({where:{id:req.params.id,ownerId:req.user.id}}); if(!current) return res.status(404).json({error:'Consulta não encontrada'}); const a=req.body||{};
  if(a.patientId && !(await prisma.patient.findFirst({where:{id:a.patientId,ownerId:req.user.id}}))) return res.status(404).json({error:'Paciente não encontrado'});
  const row=await prisma.appointment.update({where:{id:current.id},data:{...(a.date&&a.time?{startsAt:new Date(`${a.date}T${a.time}:00`)}:{}),...(a.patientId?{patientId:a.patientId}:{}),...(a.type?{type:a.type}:{}),...(a.value!==undefined?{valueCents:Math.round(Number(a.value)*100)}:{}),...(a.status?{status:a.status}:{}),...(a.notes!==undefined?{notes:a.notes||null}:{})},include:{patient:true}});res.json(appointmentOut(row));
});

app.get('/api/diets',auth,async(req,res)=>{const rows=await prisma.diet.findMany({where:{ownerId:req.user.id},orderBy:{updatedAt:'desc'}});res.json(rows.map(dietOut));});
app.post('/api/diets',auth,async(req,res)=>{
  const d=req.body||{}; if(d.patientId && !(await prisma.patient.findFirst({where:{id:d.patientId,ownerId:req.user.id}}))) return res.status(404).json({error:'Paciente não encontrado'});
  const row=await prisma.diet.create({data:{ownerId:req.user.id,patientId:d.patientId||null,name:d.name||'Plano alimentar',calories:d.calories?Number(d.calories):null,waterLiters:d.water?Number(d.water):null,notes:d.notes||null,isTemplate:Boolean(d.isTemplate),meals:d.meals||[]}});res.status(201).json(dietOut(row));
});
app.put('/api/diets/:id',auth,async(req,res)=>{
  const current=await prisma.diet.findFirst({where:{id:req.params.id,ownerId:req.user.id}}); if(!current) return res.status(404).json({error:'Dieta não encontrada'}); const d=req.body||{};
  if(d.patientId && !(await prisma.patient.findFirst({where:{id:d.patientId,ownerId:req.user.id}}))) return res.status(404).json({error:'Paciente não encontrado'});
  const row=await prisma.diet.update({where:{id:current.id},data:{patientId:d.patientId||null,name:d.name||current.name,calories:d.calories?Number(d.calories):null,waterLiters:d.water?Number(d.water):null,notes:d.notes||null,isTemplate:Boolean(d.isTemplate),meals:d.meals||[]}});res.json(dietOut(row));
});

app.get('/api/health',(_,res)=>res.json({ok:true}));
app.use(express.static(path.join(__dirname,'..','public')));
app.use((req,res,next)=>{if(req.method==='GET'&&!req.path.startsWith('/api/')) return res.sendFile(path.join(__dirname,'..','public','index.html')); next();});
app.use((err,req,res,next)=>{console.error(err);res.status(500).json({error:'Erro interno do servidor'});});
app.listen(PORT,()=>console.log(`Labz em http://localhost:${PORT}`));

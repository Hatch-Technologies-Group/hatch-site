require('dotenv').config({ path: 'apps/api/.env' });
const { PrismaClient } = require('@hatch/db');
const prisma = new PrismaClient();
async function main(){
  await prisma.$connect();
  const res = await prisma.emailSequence.findMany({ take: 3 });
  console.log('ok', res);
}
main().catch((e)=>{ console.error('error', e); process.exit(1);}).finally(async()=>{ await prisma.$disconnect(); });

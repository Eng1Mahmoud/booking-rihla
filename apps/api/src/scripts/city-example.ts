import { db } from '../prisma/db.ts';

async function main() {
  try {
    // Reuse Cairo when this learning example is run again.
    let city = await db.orm.public.City.where({
      nameAr: 'القاهرة',
      nameEn: 'Cairo',
    }).first();

    if (!city) {
      city = await db.orm.public.City.create({
        nameAr: 'القاهرة',
        nameEn: 'Cairo',
      });
      console.log('Created city:', city);
    } else {
      console.log('Using existing city:', city);
    }

    const cities = await db.orm.public.City.all();
    console.log('All cities:', cities);
  } finally {
    await db.close();
  }
}

main().catch(() => {
  // Keep connection strings and raw database errors out of the console.
  console.error('City example failed. Check DATABASE_URL and the City table.');
  process.exitCode = 1;
});

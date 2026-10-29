   import mongoose from "mongoose";

   // Tests bruger en separat database i Docker-MongoDB'en,
   // så de aldrig rører udviklingsdataene i "strive"
   const TEST_URI = process.env.MONGO_TEST_URI ?? "mongodb://localhost:27017/strive-test";

   export async function connectTestDb() {
    await mongoose.connect(TEST_URI, { serverSelectionTimeoutMS: 4000 });

     // Sikkerhedsnet: nægt at køre, hvis vi ved en fejl er forbundet til en rigtig database
     if (!mongoose.connection.name.endsWith("-test")) {
       throw new Error(`Tests må kun køre mod en testdatabase, ikke "${mongoose.connection.name}"`);
     }
   }

   // Tømmer alle collections, så hver test starter med en tom database
   export async function clearTestDb() {
     for (const collection of Object.values(mongoose.connection.collections)) {
       await collection.deleteMany({});
     }
   }

   // Sletter testdatabasen og lukker forbindelsen
   export async function closeTestDb() {
     await mongoose.connection.dropDatabase();
     await mongoose.disconnect();
   }

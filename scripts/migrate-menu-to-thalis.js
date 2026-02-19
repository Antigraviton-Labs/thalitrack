/**
 * One-time migration script: menuItems[] → thalis[{ thaliId, ... }]
 * 
 * Usage:
 *   node scripts/migrate-menu-to-thalis.js
 * 
 * Requirements:
 *   - Set MONGODB_URI in .env
 *   - Run ONCE, then remove menuItems from schema
 */

const mongoose = require('mongoose');
const { randomUUID } = require('crypto');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in .env');
    process.exit(1);
}

async function migrate() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;
        const messCollection = db.collection('messes');

        // Find all messes with non-empty menuItems
        const messes = await messCollection.find({
            menuItems: { $exists: true, $not: { $size: 0 } },
        }).toArray();

        console.log(`Found ${messes.length} messes with menuItems to migrate.`);

        let migrated = 0;
        for (const mess of messes) {
            // Skip if already has thalis
            if (mess.thalis && mess.thalis.length > 0) {
                console.log(`  Skipping ${mess.name} — already has thalis`);
                continue;
            }

            const thali = {
                thaliId: randomUUID(),
                thaliName: 'Default Thali',
                description: '',
                price: 0,
                items: (mess.menuItems || []).map((item) => ({
                    itemName: item.dishName || item.itemName || 'Unknown',
                    description: '',
                    price: item.price || 0,
                })),
                averageRating: 0,
                totalRatings: 0,
            };

            await messCollection.updateOne(
                { _id: mess._id },
                {
                    $set: { thalis: [thali], status: mess.status || 'open' },
                    $unset: { menuItems: '' },
                }
            );

            console.log(`  ✅ Migrated: ${mess.name} (${thali.items.length} items)`);
            migrated++;
        }

        // Also set status: 'open' for messes without status field
        const statusResult = await messCollection.updateMany(
            { status: { $exists: false } },
            { $set: { status: 'open' } }
        );
        console.log(`Set status='open' for ${statusResult.modifiedCount} messes without status.`);

        console.log(`\n🎉 Migration complete. ${migrated} messes migrated.`);
    } catch (error) {
        console.error('❌ Migration error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    }
}

migrate();

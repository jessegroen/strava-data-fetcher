const fs = require('fs');
const path = require('path');

const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.STRAVA_REFRESH_TOKEN;
const OUTPUT_FILE = path.join(__dirname, '../data/strava-activities.json');

async function getAccessToken() {
   console.log('🔑 Getting access token...');
   const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
         client_id: CLIENT_ID,
         client_secret: CLIENT_SECRET,
         refresh_token: REFRESH_TOKEN,
         grant_type: 'refresh_token',
      }),
   });

   if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get access token: ${response.statusText} - ${errorText}`);
   }

   const data = await response.json();
   return data.access_token;
}

async function fetchActivities(accessToken) {
   console.log('📥 Fetching activities from Strava...');
   const allActivities = [];
   let page = 1;
   const perPage = 200;

   while (true) {
      const response = await fetch(
         `https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}&page=${page}`,
         { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!response.ok) {
         throw new Error(`Failed to fetch activities: ${response.statusText}`);
      }

      const activities = await response.json();
      if (activities.length === 0) break;

      allActivities.push(...activities);
      console.log(`  - Fetched page ${page} (${activities.length} activities)`);
      page++;
   }

   return allActivities;
}

function processActivities(activities) {
   console.log('⚙️  Processing activities...');

   const stats = {
      totalActivities: activities.length,
      byType: {},
      totalDistance: 0,
      totalTime: 0,
      totalElevation: 0,
      lastUpdated: new Date().toISOString(),
      recentActivities: []
   };

   // Sorteer op datum (nieuwste eerst)
   const sortedActivities = [...activities].sort((a, b) =>
      new Date(b.start_date) - new Date(a.start_date)
   );

   activities.forEach(activity => {
      // Tel per type
      const type = activity.type || 'Unknown';
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      // Totalen
      stats.totalDistance += (activity.distance || 0) / 1000; // in km
      stats.totalTime += (activity.moving_time || 0) / 3600; // in uren
      stats.totalElevation += activity.total_elevation_gain || 0; // in meters
   });

   // Laatste 10 activiteiten voor op je dashboard
   stats.recentActivities = sortedActivities.slice(0, 10).map(activity => ({
      name: activity.name,
      type: activity.type,
      date: activity.start_date,
      distance: Math.round((activity.distance || 0) / 1000), // km
      movingTime: Math.round((activity.moving_time || 0) / 60), // minuten
      elevationGain: Math.round(activity.total_elevation_gain || 0), // meters
   }));

   // Rond totalen af
   stats.totalDistance = Math.round(stats.totalDistance);
   stats.totalTime = Math.round(stats.totalTime);
   stats.totalElevation = Math.round(stats.totalElevation);

   return stats;
}

async function main() {
   try {
      const accessToken = await getAccessToken();
      const activities = await fetchActivities(accessToken);
      console.log(`✅ Fetched ${activities.length} activities in total`);

      const processedData = processActivities(activities);

      // Zorg dat de data directory bestaat
      const dir = path.dirname(OUTPUT_FILE);
      if (!fs.existsSync(dir)) {
         fs.mkdirSync(dir, { recursive: true });
      }

      console.log('💾 Saving to file...');
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(processedData, null, 2));

      console.log(`✨ Done! Data saved to ${OUTPUT_FILE}`);
      console.log('\n📊 Summary:');
      console.log(`   Total activities: ${processedData.totalActivities}`);
      console.log(`   Total distance: ${processedData.totalDistance} km`);
      console.log(`   Total time: ${processedData.totalTime} hours`);
      console.log(`   By type:`, processedData.byType);
   } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
   }
}

main();
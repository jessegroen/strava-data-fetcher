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

function convertToYourFormat(activities) {
   console.log('⚙️  Converting activities to your format...');

   return activities.map(activity => {
      // Converteer de datum naar jouw formaat: "Sep 2, 2025, 4:37:58 AM"
      const activityDate = new Date(activity.start_date);
      const formattedDate = activityDate.toLocaleString('en-US', {
         month: 'short',
         day: 'numeric',
         year: 'numeric',
         hour: 'numeric',
         minute: '2-digit',
         second: '2-digit',
         hour12: true
      });

      return {
         "Activity ID": activity.id,
         "Activity Date": formattedDate,
         "Activity Name": activity.name,
         "Activity Type": activity.type,
         "Activity Description": activity.description || "",
         "Elapsed Time": activity.elapsed_time,
         "Distance": Math.round(activity.distance / 10) / 100, // Converteer meters naar km met 2 decimalen
         "Filename": `activities/${activity.id}.gpx`,
         "Moving Time": activity.moving_time,
         "Max Speed": activity.max_speed || 0,
         "Average Speed": activity.average_speed || 0,
         "Elevation Gain": activity.total_elevation_gain || 0,
         "Elevation Loss": 0, // Strava API geeft deze niet standaard, zou 0 zijn of je moet berekenen
         "Elevation Low": activity.elev_low || 0,
         "Elevation High": activity.elev_high || 0,
         "Calories": activity.calories || 0
      };
   });
}

function generateStats(activities) {
   console.log('📊 Generating statistics...');

   const stats = {
      totalActivities: activities.length,
      byType: {},
      totalDistance: 0,
      totalTime: 0,
      totalElevation: 0,
   };

   activities.forEach(activity => {
      const type = activity["Activity Type"];
      stats.byType[type] = (stats.byType[type] || 0) + 1;
      stats.totalDistance += activity.Distance;
      stats.totalTime += activity["Moving Time"] / 3600; // naar uren
      stats.totalElevation += activity["Elevation Gain"];
   });

   stats.totalDistance = Math.round(stats.totalDistance);
   stats.totalTime = Math.round(stats.totalTime);
   stats.totalElevation = Math.round(stats.totalElevation);

   return stats;
}

async function main() {
   try {
      const accessToken = await getAccessToken();
      const rawActivities = await fetchActivities(accessToken);
      console.log(`✅ Fetched ${rawActivities.length} activities in total`);

      const convertedActivities = convertToYourFormat(rawActivities);
      const stats = generateStats(convertedActivities);

      // Sorteer op datum (nieuwste eerst)
      convertedActivities.sort((a, b) =>
         new Date(b["Activity Date"]) - new Date(a["Activity Date"])
      );

      const output = {
         lastUpdated: new Date().toISOString(),
         stats: stats,
         activities: convertedActivities
      };

      // Zorg dat de data directory bestaat
      const dir = path.dirname(OUTPUT_FILE);
      if (!fs.existsSync(dir)) {
         fs.mkdirSync(dir, { recursive: true });
      }

      console.log('💾 Saving to file...');
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

      console.log(`✨ Done! Data saved to ${OUTPUT_FILE}`);
      console.log('\n📊 Summary:');
      console.log(`   Total activities: ${stats.totalActivities}`);
      console.log(`   Total distance: ${stats.totalDistance} km`);
      console.log(`   Total time: ${stats.totalTime} hours`);
      console.log(`   By type:`, stats.byType);
   } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
   }
}

main();
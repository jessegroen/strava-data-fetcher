# Strava Data Fetcher

Automated GitHub Action that fetches Strava activity data daily and stores it as JSON.

## Data URL

The latest data is available at:
```
https://raw.githubusercontent.com/jouw-username/strava-data-fetcher/main/data/strava-activities.json
```

## Data Structure
```json
{
  "totalActivities": 123,
  "byType": {
    "Run": 50,
    "Ride": 30,
    "Hike": 43
  },
  "totalDistance": 1234,
  "totalTime": 567,
  "totalElevation": 8900,
  "lastUpdated": "2024-01-01T12:00:00.000Z",
  "recentActivities": [...]
}
```

## Setup

1. Add GitHub Secrets:
   - `STRAVA_CLIENT_ID`
   - `STRAVA_CLIENT_SECRET`
   - `STRAVA_REFRESH_TOKEN`

2. Run manually or wait for daily automated run at 06:00 UTC
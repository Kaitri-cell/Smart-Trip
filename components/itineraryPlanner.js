/**
 * Itinerary Planner Component
 * Runs TSP Branch & Bound on locations containing selected activities,
 * compares against Nearest Neighbor Greedy, and constructs day-by-day
 * non-overlapping schedules with realistic transit times.
 */

import { runTSPBranchAndBound } from '../algorithms/tsp.js';
import { runFloydWarshall } from '../algorithms/floydWarshall.js';
import { buildAdjacencyList } from '../data/sampleData.js';

export class ItineraryPlanner {
    /**
     * Optimize multi-stop tour and generate day-by-day schedule
     */
    static generateOptimizedPlan(trip, selectedActivities) {
        const locations = trip.locations || [];
        const days = Math.max(1, Number(trip.days) || 1);
        const hotel = locations.find(l => l.category === 'Accommodation') || locations[0];
        const hotelId = hotel ? hotel.id : locations[0].id;

        // Collect distinct locations for the selected activities
        const locationSet = new Set();
        locationSet.add(hotelId);

        selectedActivities.forEach(act => {
            if (act.location && locations.some(l => l.id === act.location)) {
                locationSet.add(act.location);
            }
        });

        // Ensure at least 2 locations
        if (locationSet.size < 2 && locations.length > 1) {
            locationSet.add(locations[1].id);
        }

        const selectedLocationIds = Array.from(locationSet);

        // Compute all-pairs shortest distances matrix for these locations using Floyd-Warshall
        const allNodeIds = locations.map(l => l.id);
        const graph = buildAdjacencyList(locations, trip.connections);
        const fwResult = runFloydWarshall(allNodeIds, graph);

        // Extract submatrix for selectedLocationIds
        const K = selectedLocationIds.length;
        const submatrix = Array.from({ length: K }, () => Array(K).fill(0));

        for (let i = 0; i < K; i++) {
            const u = selectedLocationIds[i];
            const uIdx = allNodeIds.indexOf(u);
            for (let j = 0; j < K; j++) {
                const v = selectedLocationIds[j];
                const vIdx = allNodeIds.indexOf(v);
                submatrix[i][j] = fwResult.matrix[uIdx][vIdx];
            }
        }

        // Run TSP Branch & Bound
        const tspResult = runTSPBranchAndBound(selectedLocationIds, submatrix, hotelId);

        // Distribute visits and activities across days
        const dailySchedule = this.buildDailySchedule(
            days,
            tspResult.tour,
            selectedActivities,
            fwResult,
            hotelId
        );

        return {
            selectedLocationIds,
            tspResult,
            dailySchedule,
            hotelId,
            fwResult
        };
    }

    /**
     * Build day-by-day itinerary respecting time slots and travel durations
     */
    static buildDailySchedule(days, tour, activities, fwResult, hotelId) {
        // Group activities by location
        const actsByLoc = {};
        activities.forEach(act => {
            if (!actsByLoc[act.location]) actsByLoc[act.location] = [];
            actsByLoc[act.location].push(act);
        });

        // Extract ordered unique stops (excluding start/end hotel)
        const stopsToVisit = tour.filter((loc, idx) => {
            if (idx === 0 || idx === tour.length - 1) return false;
            return true;
        });

        // If no stops, fallback to hotel
        if (stopsToVisit.length === 0) {
            stopsToVisit.push(tour[0] || hotelId);
        }

        // Partition stops across trip days
        const daysSchedule = [];
        const stopsPerDay = Math.ceil(stopsToVisit.length / days);

        for (let dayNum = 1; dayNum <= days; dayNum++) {
            const dayStops = stopsToVisit.slice((dayNum - 1) * stopsPerDay, dayNum * stopsPerDay);
            const events = [];

            let currentMinutes = 9 * 60; // 09:00 AM
            let currentLoc = hotelId;

            // Day Start from Hotel
            if (dayStops.length > 0) {
                const firstStop = dayStops[0];
                const legDist = this.getPairDistance(fwResult, currentLoc, firstStop);
                const transitMinutes = Math.max(10, Math.round(legDist * 3)); // ~20 km/h average city transit

                events.push({
                    type: 'TRANSIT',
                    time: this.formatTime(currentMinutes),
                    endTime: this.formatTime(currentMinutes + transitMinutes),
                    from: currentLoc,
                    to: firstStop,
                    distance: legDist,
                    durationMins: transitMinutes,
                    description: `Transit from ${currentLoc} to ${firstStop}`
                });

                currentMinutes += transitMinutes;
                currentLoc = firstStop;
            }

            // Iterate over stops of the day
            dayStops.forEach((stop, stopIdx) => {
                const stopActs = actsByLoc[stop] || [];
                const actToSchedule = stopActs.shift() || {
                    name: `Sightseeing & Exploration at ${stop}`,
                    duration: 1.5,
                    category: 'Attraction'
                };

                const actDurationMins = Math.round((Number(actToSchedule.duration) || 1.5) * 60);

                events.push({
                    type: 'ACTIVITY',
                    time: this.formatTime(currentMinutes),
                    endTime: this.formatTime(currentMinutes + actDurationMins),
                    location: stop,
                    title: actToSchedule.name,
                    category: actToSchedule.category,
                    durationMins: actDurationMins,
                    description: actToSchedule.description || `Explore highlights of ${stop}`
                });

                currentMinutes += actDurationMins;

                // Insert Lunch Break around 13:00 if day is active
                if (currentMinutes >= 13 * 60 && currentMinutes < 14 * 60) {
                    events.push({
                        type: 'FOOD',
                        time: this.formatTime(currentMinutes),
                        endTime: this.formatTime(currentMinutes + 60),
                        location: stop,
                        title: 'Lunch Break & Local Gastronomy',
                        category: 'Food',
                        durationMins: 60,
                        description: 'Enjoy regional specialties at nearby heritage cafe.'
                    });
                    currentMinutes += 60;
                }

                // If another stop remains today, transit there
                if (stopIdx < dayStops.length - 1) {
                    const nextStop = dayStops[stopIdx + 1];
                    const legDist = this.getPairDistance(fwResult, currentLoc, nextStop);
                    const transitMinutes = Math.max(10, Math.round(legDist * 3));

                    events.push({
                        type: 'TRANSIT',
                        time: this.formatTime(currentMinutes),
                        endTime: this.formatTime(currentMinutes + transitMinutes),
                        from: currentLoc,
                        to: nextStop,
                        distance: legDist,
                        durationMins: transitMinutes,
                        description: `Local transfer from ${currentLoc} to ${nextStop}`
                    });

                    currentMinutes += transitMinutes;
                    currentLoc = nextStop;
                }
            });

            // Return to Hotel in the evening
            if (currentLoc !== hotelId) {
                const returnDist = this.getPairDistance(fwResult, currentLoc, hotelId);
                const returnTransit = Math.max(15, Math.round(returnDist * 3));

                events.push({
                    type: 'TRANSIT',
                    time: this.formatTime(currentMinutes),
                    endTime: this.formatTime(currentMinutes + returnTransit),
                    from: currentLoc,
                    to: hotelId,
                    distance: returnDist,
                    durationMins: returnTransit,
                    description: `Return journey to ${hotelId}`
                });

                currentMinutes += returnTransit;
            }

            // Evening leisure
            events.push({
                type: 'LEISURE',
                time: this.formatTime(currentMinutes),
                endTime: '21:30',
                location: hotelId,
                title: 'Evening Relaxation & Dinner',
                category: 'Leisure',
                durationMins: 90,
                description: 'Relax at hotel terrace, dinner, and plan for the next morning.'
            });

            daysSchedule.push({
                day: dayNum,
                title: `Day ${dayNum} - ${dayStops.join(' & ') || 'City Discovery'}`,
                events
            });
        }

        return daysSchedule;
    }

    static getPairDistance(fwResult, fromId, toId) {
        if (!fwResult || !fwResult.nodeIds) return 3.0;
        const u = fwResult.nodeIds.indexOf(fromId);
        const v = fwResult.nodeIds.indexOf(toId);
        if (u < 0 || v < 0 || fwResult.matrix[u][v] === Infinity) return 3.0;
        return fwResult.matrix[u][v];
    }

    static formatTime(totalMinutes) {
        const hrs = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        const period = hrs >= 12 ? 'PM' : 'AM';
        const displayHrs = hrs > 12 ? hrs - 12 : (hrs === 0 ? 12 : hrs);
        const displayMins = mins < 10 ? `0${mins}` : mins;
        return `${displayHrs}:${displayMins} ${period}`;
    }
}

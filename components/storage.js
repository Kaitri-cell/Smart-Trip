/**
 * Trip Storage Manager
 * Handles browser LocalStorage persistence: Save, Load, Rename, Duplicate, Delete, Export, Import.
 */

import { SAMPLE_TRIP } from '../data/sampleData.js';

const STORAGE_KEY = 'SMART_TRIP_BUDGET_PLANNER_DATA';

export class StorageManager {
    static getTrips() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                // Initialize with sample trip
                const initial = [JSON.parse(JSON.stringify(SAMPLE_TRIP))];
                this.saveAllTrips(initial);
                return initial;
            }
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [JSON.parse(JSON.stringify(SAMPLE_TRIP))];
        } catch (e) {
            console.error('Failed to load trips from LocalStorage:', e);
            return [JSON.parse(JSON.stringify(SAMPLE_TRIP))];
        }
    }

    static saveAllTrips(trips) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
        } catch (e) {
            console.error('Failed to write to LocalStorage:', e);
        }
    }

    static getTripById(id) {
        const trips = this.getTrips();
        return trips.find(t => t.id === id) || null;
    }

    static saveTrip(trip) {
        const trips = this.getTrips();
        const index = trips.findIndex(t => t.id === trip.id);
        const updatedTrip = { ...trip, updatedAt: new Date().toISOString() };

        if (index >= 0) {
            trips[index] = updatedTrip;
        } else {
            trips.unshift(updatedTrip);
        }
        this.saveAllTrips(trips);
        return updatedTrip;
    }

    static deleteTrip(id) {
        let trips = this.getTrips();
        trips = trips.filter(t => t.id !== id);
        if (trips.length === 0) {
            trips = [JSON.parse(JSON.stringify(SAMPLE_TRIP))];
        }
        this.saveAllTrips(trips);
        return trips;
    }

    static duplicateTrip(id) {
        const trips = this.getTrips();
        const original = trips.find(t => t.id === id);
        if (!original) return null;

        const copy = JSON.parse(JSON.stringify(original));
        copy.id = 'trip-' + Date.now();
        copy.name = `${original.name} (Copy)`;
        copy.createdAt = new Date().toISOString();
        trips.unshift(copy);
        this.saveAllTrips(trips);
        return copy;
    }

    static renameTrip(id, newName) {
        const trips = this.getTrips();
        const target = trips.find(t => t.id === id);
        if (target) {
            target.name = newName.trim();
            target.updatedAt = new Date().toISOString();
            this.saveAllTrips(trips);
            return target;
        }
        return null;
    }

    static exportTripsJSON() {
        const trips = this.getTrips();
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(trips, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `smart_trips_backup_${Date.now()}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    }

    static resetToSample() {
        const sample = [JSON.parse(JSON.stringify(SAMPLE_TRIP))];
        this.saveAllTrips(sample);
        return sample[0];
    }
}

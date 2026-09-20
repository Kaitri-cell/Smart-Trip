/**
 * Default Sample Data for Smart Trip Budget Planner
 * Pre-populated scenario: "Udaipur Explorer"
 */

export const SAMPLE_TRIP = {
    id: 'udaipur-sample-01',
    name: 'Udaipur Explorer',
    travelers: 2,
    days: 4,
    budget: 25000,
    currency: '₹',
    mode: 'Balanced', // 'Budget Saver' | 'Balanced' | 'Experience Maximizer'
    createdAt: new Date().toISOString(),

    // Target budget allocation in percentages
    budgetAllocation: {
        transportation: 16, // ₹4,000
        accommodation: 28,  // ₹7,000
        food: 20,           // ₹5,000
        activities: 20,     // ₹5,000
        localTravel: 8,     // ₹2,000
        emergency: 8        // ₹2,000
    },

    // Intercity transport options
    transportOptions: [
        { id: 't1', name: 'Superfast Express Train', mode: 'Train', costPerPerson: 1500, durationHours: 5.5, description: 'Comfortable sleeper/AC class travel' },
        { id: 't2', name: 'AC Sleeper Volvo Bus', mode: 'Bus', costPerPerson: 1000, durationHours: 7.0, description: 'Economical overnight highway transit' },
        { id: 't3', name: 'Direct Flight', mode: 'Flight', costPerPerson: 4500, durationHours: 1.5, description: 'Fastest transit with minimal travel fatigue' }
    ],

    // Locations in graph
    locations: [
        { id: 'Hotel', name: 'Heritage Haveli Hotel', category: 'Accommodation', description: 'Central base stay in old Udaipur' },
        { id: 'City Palace', name: 'Udaipur City Palace', category: 'Attraction', description: 'Historic royal complex overlooking Lake Pichola' },
        { id: 'Lake Pichola', name: 'Lake Pichola Ghats', category: 'Attraction', description: 'Iconic freshwater lake with royal palaces' },
        { id: 'Fateh Sagar', name: 'Fateh Sagar Lake', category: 'Attraction', description: 'Scenic lake surrounded by Aravalli hills' },
        { id: 'Museum', name: 'Vintage Car & Folk Art Museum', category: 'Attraction', description: 'Cultural heritage exhibits and vintage cars' },
        { id: 'Market', name: 'Hathi Pol Bazaar', category: 'Shopping', description: 'Handicrafts, traditional textiles, and street snacks' },
        { id: 'Railway Station', name: 'Udaipur City Railway Station', category: 'Transport', description: 'Primary intercity transit hub' }
    ],

    // Weighted connections (Adjacency edges)
    // Distance in km, Time in minutes
    connections: [
        { from: 'Hotel', to: 'City Palace', distance: 4.0, time: 15, mode: 'Cab', bidirectional: true },
        { from: 'Hotel', to: 'Market', distance: 2.5, time: 10, mode: 'Walking', bidirectional: true },
        { from: 'City Palace', to: 'Lake Pichola', distance: 1.5, time: 8, mode: 'Walking', bidirectional: true },
        { from: 'City Palace', to: 'Museum', distance: 3.0, time: 12, mode: 'Cab', bidirectional: true },
        { from: 'Market', to: 'Museum', distance: 2.0, time: 10, mode: 'Walking', bidirectional: true },
        { from: 'Museum', to: 'Fateh Sagar', distance: 5.0, time: 18, mode: 'Cab', bidirectional: true },
        { from: 'Fateh Sagar', to: 'Lake Pichola', distance: 4.5, time: 16, mode: 'Cab', bidirectional: true },
        { from: 'Railway Station', to: 'Hotel', distance: 3.5, time: 14, mode: 'Cab', bidirectional: true },
        { from: 'Railway Station', to: 'Market', distance: 2.0, time: 8, mode: 'Cab', bidirectional: true }
    ],

    // Candidate Activities
    activities: [
        {
            id: 'act-1',
            name: 'City Palace Guided Tour',
            costPerPerson: 400,
            duration: 2.5,
            experience: 9,
            category: 'Heritage',
            location: 'City Palace',
            description: 'Comprehensive historical walkthrough of royal courtyards and armory.'
        },
        {
            id: 'act-2',
            name: 'Lake Pichola Sunset Boat Ride',
            costPerPerson: 1000,
            duration: 1.5,
            experience: 10,
            category: 'Adventure',
            location: 'Lake Pichola',
            description: 'Signature luxury sunset cruise around Jag Mandir island.'
        },
        {
            id: 'act-3',
            name: 'Bagore Ki Haveli Folk Museum & Dance',
            costPerPerson: 300,
            duration: 2.0,
            experience: 7,
            category: 'Culture',
            location: 'Museum',
            description: 'Evening Dharohar cultural performance and puppet dance.'
        },
        {
            id: 'act-4',
            name: 'Old City Walking Tour & Artisan Bazaar',
            costPerPerson: 800,
            duration: 3.0,
            experience: 8,
            category: 'Culture',
            location: 'Market',
            description: 'Curated shopping, street photography, and traditional handicraft trails.'
        },
        {
            id: 'act-5',
            name: 'Fateh Sagar Speedboat & Sunset Cafe',
            costPerPerson: 1200,
            duration: 1.5,
            experience: 9,
            category: 'Adventure',
            location: 'Fateh Sagar',
            description: 'Thrilling speedboat ride to Nehru Park followed by lakefront refreshments.'
        },
        {
            id: 'act-6',
            name: 'Traditional Royal Rajasthani Dinner',
            costPerPerson: 500,
            duration: 1.5,
            experience: 8,
            category: 'Food',
            location: 'Hotel',
            description: 'Authentic Dal Baati Churma and Gatte ki Sabzi gourmet feast.'
        },
        {
            id: 'act-7',
            name: 'Sajjangarh Monsoon Palace Excursion',
            costPerPerson: 900,
            duration: 3.5,
            experience: 8,
            category: 'Nature',
            location: 'Fateh Sagar',
            description: 'Hilltop castle panoramic vista overlooking lakes and Aravalli ranges.'
        }
    ]
};

export function buildAdjacencyList(locations, connections) {
    const graph = {};
    for (const loc of locations) {
        graph[loc.id] = [];
    }

    for (const conn of connections) {
        if (!graph[conn.from]) graph[conn.from] = [];
        if (!graph[conn.to]) graph[conn.to] = [];

        graph[conn.from].push({
            to: conn.to,
            distance: Number(conn.distance),
            time: Number(conn.time),
            mode: conn.mode
        });

        if (conn.bidirectional) {
            graph[conn.to].push({
                to: conn.from,
                distance: Number(conn.distance),
                time: Number(conn.time),
                mode: conn.mode
            });
        }
    }

    return graph;
}

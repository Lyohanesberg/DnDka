import { MapObject, TokenPosition, Point, Edge, MapToken } from '../types';

const GRID_SIZE = 40;
const GRID_COLS = 20;
const GRID_ROWS = 15;

// Helper: Does an object block vision?
export const blocksVision = (obj: MapObject): boolean => {
    return (
        obj.type === 'wall' || 
        obj.type === 'tree' || 
        obj.type === 'rock' || 
        (obj.type === 'door' && obj.state !== 'open')
    );
};

// Convert Grid Position to Center Pixel Position
export const gridToPixelCenter = (pos: TokenPosition): Point => ({
    x: pos.x * GRID_SIZE + GRID_SIZE / 2,
    y: pos.y * GRID_SIZE + GRID_SIZE / 2
});

// Convert MapObjects to a list of Line Segments (Edges) for raycasting
export const getMapEdges = (objects: MapObject[]): Edge[] => {
    const edges: Edge[] = [];
    
    // 1. Add World Borders
    const width = GRID_COLS * GRID_SIZE;
    const height = GRID_ROWS * GRID_SIZE;
    edges.push({ p1: { x: 0, y: 0 }, p2: { x: width, y: 0 } });
    edges.push({ p1: { x: width, y: 0 }, p2: { x: width, y: height } });
    edges.push({ p1: { x: width, y: height }, p2: { x: 0, y: height } });
    edges.push({ p1: { x: 0, y: height }, p2: { x: 0, y: 0 } });

    // 2. Add Object Edges
    objects.forEach(obj => {
        if (!blocksVision(obj)) return;

        const x = obj.position.x * GRID_SIZE;
        const y = obj.position.y * GRID_SIZE;
        const w = GRID_SIZE;
        const h = GRID_SIZE;

        // Simplify: Add 4 edges of the cell
        // Optimizing this to merge adjacent walls is possible but 
        // for 20x15 grid, not strictly necessary for performance.
        edges.push({ p1: { x: x, y: y }, p2: { x: x + w, y: y } });         // Top
        edges.push({ p1: { x: x + w, y: y }, p2: { x: x + w, y: y + h } }); // Right
        edges.push({ p1: { x: x + w, y: y + h }, p2: { x: x, y: y + h } }); // Bottom
        edges.push({ p1: { x: x, y: y + h }, p2: { x: x, y: y } });         // Left
    });

    return edges;
};

// Calculate Intersection of Ray and Segment
const getIntersection = (rayOrigin: Point, rayAngle: number, segment: Edge): Point | null => {
    // Ray: r_px + r_dx * T1 = s_px + s_dx * T2
    const r_dx = Math.cos(rayAngle);
    const r_dy = Math.sin(rayAngle);

    const s_px = segment.p1.x;
    const s_py = segment.p1.y;
    const s_dx = segment.p2.x - segment.p1.x;
    const s_dy = segment.p2.y - segment.p1.y;

    // Solve for T2
    const mag = s_dx * r_dy - s_dy * r_dx;
    if (mag === 0) return null; // Parallel

    const T2 = (r_dx * (s_py - rayOrigin.y) + r_dy * (rayOrigin.x - s_px)) / mag;
    const T1 = (s_px + s_dx * T2 - rayOrigin.x) / r_dx;

    // Must be within segment bounds and forward of ray
    if (T1 > 0 && T2 >= 0 && T2 <= 1) {
        return {
            x: rayOrigin.x + r_dx * T1,
            y: rayOrigin.y + r_dy * T1
        };
    }
    return null;
};

// Main Visibility Algorithm
export const computeVisibilityPolygon = (origin: Point, edges: Edge[]): Point[] => {
    // 1. Get all unique points from edges
    const points: Point[] = [];
    const uniqueAngleSet = new Set<number>();

    edges.forEach(edge => {
        points.push(edge.p1);
        points.push(edge.p2);
    });

    // 2. Calculate angles to all points
    const angles: number[] = [];
    points.forEach(p => {
        const angle = Math.atan2(p.y - origin.y, p.x - origin.x);
        // Add angle, and slight offsets to hit "corners"
        const offset = 0.00001;
        [angle - offset, angle, angle + offset].forEach(a => {
             if (!uniqueAngleSet.has(a)) {
                 uniqueAngleSet.add(a);
                 angles.push(a);
             }
        });
    });

    // Sort angles
    angles.sort((a, b) => a - b);

    // 3. Cast Rays
    const polygon: Point[] = [];

    angles.forEach(angle => {
        let closestIntersect: Point | null = null;
        let minDist = Infinity;

        edges.forEach(edge => {
            const intersect = getIntersection(origin, angle, edge);
            if (intersect) {
                const dist = (intersect.x - origin.x) ** 2 + (intersect.y - origin.y) ** 2;
                if (dist < minDist) {
                    minDist = dist;
                    closestIntersect = intersect;
                }
            }
        });

        if (closestIntersect) {
            polygon.push(closestIntersect);
        }
    });

    return polygon;
};

// Check if a point is inside a polygon (Ray Casting algo for point-in-poly)
export const isPointInPolygon = (point: Point, vs: Point[]): boolean => {
    let x = point.x, y = point.y;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        let xi = vs[i].x, yi = vs[i].y;
        let xj = vs[j].x, yj = vs[j].y;
        
        let intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
};

// Utility to combine multiple visibility polygons (Union)
// Note: True polygon union is hard. For "Shared Vision", checking if a point is in ANY polygon is easier and sufficient for filtering.
export const isVisibleByAny = (targetPos: TokenPosition, sources: MapToken[], mapObjects: MapObject[]): boolean => {
    const edges = getMapEdges(mapObjects);
    const targetPixel = gridToPixelCenter(targetPos);
    
    // Treat sources (player tokens) as "eyes"
    // If ANY player sees the target, return true.
    return sources.some(source => {
        const origin = gridToPixelCenter(source.position);
        
        // Optimization: Simple distance check first (e.g., 60ft vision range? Let's assume infinite for now or map wide)
        // const dist = Math.hypot(targetPixel.x - origin.x, targetPixel.y - origin.y);
        // if (dist > 1000) return false;

        const polygon = computeVisibilityPolygon(origin, edges);
        return isPointInPolygon(targetPixel, polygon);
    });
};

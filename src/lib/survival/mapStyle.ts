import type { StyleSpecification } from 'maplibre-gl';

export interface TerrainPalette {
  forest: string; grass: string; wetland: string; water: string;
  shore: string; ice: string; path: string; pathEdge: string;
}

/** Keep geographic surfaces, paths and water; never retain labels, buildings or POIs. */
export function terrainOnlyStyle(style: StyleSpecification, groundColor: string, palette?: TerrainPalette): StyleSpecification {
  return { ...style, layers: style.layers
    .filter(layer => layer.type !== 'symbol' && !/building|aeroway|poi/i.test(layer.id))
    .map(layer => {
      if (layer.type === 'background') return { ...layer, paint: { ...layer.paint, 'background-color': groundColor } };
      if (!palette) return layer;
      if (layer.type === 'fill') {
        const id = layer.id;
        const color = /water/.test(id) ? palette.water : /wood|forest/.test(id) ? palette.forest
          : /wetland/.test(id) ? palette.wetland : /sand/.test(id) ? palette.shore
          : /ice/.test(id) ? palette.ice : /grass|park/.test(id) ? palette.grass
          : /landuse/.test(id) ? groundColor : undefined;
        if (color) {
          const { 'fill-pattern': pattern, ...paint } = layer.paint ?? {};
          void pattern;
          return { ...layer, paint: { ...paint, 'fill-color': color, 'fill-opacity': /wood|forest/.test(id) ? 0.85 : 1, 'fill-outline-color': color } };
        }
      }
      if (layer.type === 'line') {
        const color = /water/.test(layer.id) ? palette.water : /park|contour/.test(layer.id) ? palette.forest
          : /road|tunnel|bridge|highway|railway/.test(layer.id) ? (/casing/.test(layer.id) ? palette.pathEdge : palette.path) : undefined;
        if (color) return { ...layer, paint: { ...layer.paint, 'line-color': color } };
      }
      return layer;
    })
    // Invisible probe keeps POI tiles queryable for landmarks without drawing any label or brand.
    .concat(style.sources?.openmaptiles ? [{ id: 'game-poi-probe', type: 'circle', source: 'openmaptiles', 'source-layer': 'poi', minzoom: 14, paint: { 'circle-radius': 1, 'circle-opacity': 0 } } as StyleSpecification['layers'][number]] : []) };
}
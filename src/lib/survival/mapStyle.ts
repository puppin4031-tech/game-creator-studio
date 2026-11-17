import type { StyleSpecification } from 'maplibre-gl';

export interface TerrainPalette {
  forest: string; grass: string; wetland: string; water: string;
  shore: string; ice: string; path: string; pathEdge: string;
}

/** Keep geographic surfaces, roads, water, and render real-world buildings & POI labels at 40% opacity. */
export function terrainOnlyStyle(style: StyleSpecification, groundColor: string, palette?: TerrainPalette): StyleSpecification {
  return {
    ...style,
    layers: style.layers
      .filter(layer => !/aeroway/i.test(layer.id))
      .map((layer): StyleSpecification['layers'][number] => {
        if (layer.type === 'background') {
          return { ...layer, paint: { ...layer.paint, 'background-color': groundColor } };
        }
        if (!palette) return layer;

        // Building structures: Render at 40% opacity as requested
        if (/building/i.test(layer.id)) {
          if (layer.type === 'fill' || (layer.type as string) === 'fill-extrusion') {
            return {
              ...layer,
              paint: {
                ...layer.paint,
                'fill-color': '#6c7866',
                'fill-opacity': 0.4,
                'fill-outline-color': '#4a5745',
              },
            };
          }
        }

        // Real-world labels (POIs, commercial shops, building names like 하이오커피, 이마트): Fix opacity to 40%
        if (layer.type === 'symbol') {
          return {
            ...layer,
            paint: {
              ...(layer.paint ?? {}),
              'text-opacity': 0.4,
              'icon-opacity': 0.4,
              'text-color': '#2a3a28',
              'text-halo-color': '#f2f5ec',
              'text-halo-width': 1,
              'text-halo-blur': 0.5,
            },
          };
        }

        if (layer.type === 'fill') {
          const id = layer.id;
          const color = /water/.test(id) ? palette.water : /wood|forest/.test(id) ? palette.forest
            : /wetland/.test(id) ? palette.wetland : /sand/.test(id) ? palette.shore
            : /ice/.test(id) ? palette.ice : /grass|park/.test(id) ? palette.grass
            : /landuse/.test(id) ? groundColor : undefined;
          if (color) {
            const { 'fill-pattern': pattern, ...paint } = layer.paint ?? {};
            void pattern;
            return {
              ...layer,
              paint: {
                ...paint,
                'fill-color': color,
                'fill-opacity': /wood|forest/.test(id) ? 0.85 : 0.95,
                'fill-outline-color': color,
              },
            };
          }
        }

        if (layer.type === 'line') {
          const isRoad = /road|tunnel|bridge|highway|motorway|primary|secondary|tertiary|residential|service|pedestrian|path|track/.test(layer.id);
          const color = /water/.test(layer.id) ? palette.water : /park|contour/.test(layer.id) ? palette.forest
            : isRoad ? (/casing/.test(layer.id) ? palette.pathEdge : palette.path) : undefined;
          if (color) {
            return {
              ...layer,
              paint: {
                ...layer.paint,
                'line-color': isRoad ? '#d0cfbf' : color,
                'line-opacity': 0.85,
              },
            };
          }
        }
        return layer;
      })
      // Keep POI probe queryable
      .concat(
        (style.sources?.openmaptiles
          ? [
              {
                id: 'game-poi-probe',
                type: 'circle',
                source: 'openmaptiles',
                'source-layer': 'poi',
                minzoom: 14,
                paint: { 'circle-radius': 1, 'circle-opacity': 0 },
              } as unknown as StyleSpecification['layers'][number],
            ]
          : []) as StyleSpecification['layers']
      ),
  };
}

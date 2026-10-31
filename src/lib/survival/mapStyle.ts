import type { StyleSpecification } from 'maplibre-gl';

/** Keep geographic surfaces, paths and water; never retain labels, buildings or POIs. */
export function terrainOnlyStyle(style: StyleSpecification, groundColor: string): StyleSpecification {
  return { ...style, layers: style.layers.filter(layer => layer.type !== 'symbol' && !/building|aeroway|poi/i.test(layer.id)).map(layer => layer.type === 'background' ? { ...layer, paint: { ...layer.paint, 'background-color': groundColor } } : layer) };
}
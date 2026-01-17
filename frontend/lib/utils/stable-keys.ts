/**
 * Genera keys estables para listas con posibles duplicados.
 * Usa item + contador de ocurrencias para garantizar unicidad.
 *
 * Para listas read-only donde el orden es estable (ej: datos de AI).
 * No usar para listas que el usuario puede reordenar.
 */
export function createStableKeys(items: readonly string[]): string[] {
	const counts = new Map<string, number>();
	return items.map((item) => {
		const count = (counts.get(item) ?? 0) + 1;
		counts.set(item, count);
		return `${item}:${count}`;
	});
}

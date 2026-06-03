"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quickselectTopK = quickselectTopK;
exports.selectTop = selectTop;
/**
 * Quickselect algorithm for O(n) top-K selection
 * Returns top k elements sorted descending by compare function
 *
 * Best case: O(n), Worst case: O(n log n), Average: O(n)
 * vs Timsort O(n log n) for full sort + O(k log n) for top-k slice
 */
function quickselectTopK(arr, k, compare) {
    if (arr.length <= k) {
        return arr.slice().sort((a, b) => compare(b) - compare(a));
    }
    const pivotIndex = Math.floor(Math.random() * arr.length);
    const pivotVal = compare(arr[pivotIndex]);
    const left = arr.filter(a => compare(a) > pivotVal);
    const right = arr.filter(a => compare(a) < pivotVal);
    const middle = arr.filter(a => compare(a) === pivotVal);
    if (left.length >= k) {
        return quickselectTopK(left, k, compare);
    }
    const needed = k - left.length;
    if (needed <= middle.length) {
        return [...left, ...middle.slice(0, needed)];
    }
    return [...left, ...middle, ...quickselectTopK(right, k - left.length - middle.length, compare)];
}
/**
 * Select top candidate using Quickselect
 */
function selectTop(arr, compare) {
    const result = quickselectTopK(arr, 1, compare);
    return result[0];
}

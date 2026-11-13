// Add testing code similar to below.

import { expect, test } from 'vitest' // I don't believe we need to change this top line.
import { sum } from './app.js'
//        ^
// function name in curly bracket to test function.
test('adds 1 + 2 to equal 3', () => {
    expect(sum(1, 2)).toBe(3)
});

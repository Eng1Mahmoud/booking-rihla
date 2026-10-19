// Fixed 44-seat template. Numbers and database ids remain unchanged.
export function seatPosition(number: number, centerFacilities: boolean) {
  if (!centerFacilities || number <= 16) {
    return {
      gridColumn: [1, 2, 4, 5][(number - 1) % 4],
      gridRow: Math.floor((number - 1) / 4) + 1,
    };
  }
  // Two left-hand pairs opposite the WC, then the middle entrance.
  if (number <= 20) {
    return {
      gridColumn: number % 2 === 1 ? 1 : 2,
      gridRow: number <= 18 ? 5 : 6,
    };
  }
  return {
    gridColumn: [1, 2, 4, 5][(number - 21) % 4],
    gridRow: Math.floor((number - 21) / 4) + 7,
  };
}

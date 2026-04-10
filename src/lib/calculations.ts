export function absoluteReturn(invested: number, current: number): number {
  if (invested === 0) return 0;
  return ((current - invested) / invested) * 100;
}

export function cagr(invested: number, current: number, years: number): number {
  if (invested === 0 || years <= 0) return 0;
  return (Math.pow(current / invested, 1 / years) - 1) * 100;
}

export function dailyPnL(units: number, currentNAV: number, previousNAV: number): number {
  return units * (currentNAV - previousNAV);
}

export function dailyChangePercent(currentNAV: number, previousNAV: number): number {
  if (previousNAV === 0) return 0;
  return ((currentNAV - previousNAV) / previousNAV) * 100;
}

export function xirr(
  cashflows: { amount: number; date: Date }[]
): number {
  if (cashflows.length < 2) return 0;

  const dayMs = 24 * 60 * 60 * 1000;
  const dates = cashflows.map(cf => cf.date.getTime());
  const amounts = cashflows.map(cf => cf.amount);
  const minDate = Math.min(...dates);

  const yearFractions = dates.map(d => (d - minDate) / (365.25 * dayMs));

  function npv(rate: number): number {
    return amounts.reduce((sum, amt, i) => {
      return sum + amt / Math.pow(1 + rate, yearFractions[i]);
    }, 0);
  }

  function npvDerivative(rate: number): number {
    return amounts.reduce((sum, amt, i) => {
      if (yearFractions[i] === 0) return sum;
      return sum - yearFractions[i] * amt / Math.pow(1 + rate, yearFractions[i] + 1);
    }, 0);
  }

  let rate = 0.1;
  const tolerance = 1e-7;
  const maxIterations = 100;

  for (let i = 0; i < maxIterations; i++) {
    const f = npv(rate);
    const fPrime = npvDerivative(rate);
    if (Math.abs(fPrime) < 1e-10) break;
    const newRate = rate - f / fPrime;
    if (Math.abs(newRate - rate) < tolerance) {
      return newRate * 100;
    }
    rate = newRate;
  }

  return rate * 100;
}

export function monthlyReturns(
  navHistory: { date: string; nav: string }[]
): { month: string; returnPct: number }[] {
  const monthMap = new Map<string, { first: number; last: number }>();

  // navHistory is newest first, reverse for chronological
  const sorted = [...navHistory].reverse();

  for (const point of sorted) {
    const [day, month, year] = point.date.split('-');
    const key = `${year}-${month}`;
    const nav = parseFloat(point.nav);
    if (!monthMap.has(key)) {
      monthMap.set(key, { first: nav, last: nav });
    } else {
      monthMap.get(key)!.last = nav;
    }
  }

  const results: { month: string; returnPct: number }[] = [];
  const entries = Array.from(monthMap.entries());

  for (let i = 1; i < entries.length; i++) {
    const [key, data] = entries[i];
    const prevData = entries[i - 1][1];
    const ret = ((data.last - prevData.last) / prevData.last) * 100;
    results.push({ month: key, returnPct: parseFloat(ret.toFixed(2)) });
  }

  return results;
}

export function parseMFDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split('-');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

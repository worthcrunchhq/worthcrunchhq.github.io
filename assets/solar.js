/* solar.js — WorthCrunch Solar Savings & Payback Calculator
   100% client-side. Estimates are approximate and for education only.
   Data as of 2026. Peak sun hours = annual daily average (kWh/m²/day).
   Electricity rates = approx. average residential price (USD/kWh). */

"use strict";

// --- Static data (approximate, editable by user) -----------------------------
// [peakSunHours, electricityRate $/kWh]
const STATE_DATA = {
  AL:[4.5,0.155], AK:[3.0,0.245], AZ:[6.5,0.145], AR:[4.5,0.125], CA:[5.5,0.310],
  CO:[5.5,0.150], CT:[4.0,0.280], DE:[4.3,0.165], DC:[4.2,0.160], FL:[5.3,0.145],
  GA:[4.8,0.140], HI:[5.8,0.410], ID:[4.7,0.115], IL:[4.0,0.160], IN:[4.0,0.150],
  IA:[4.2,0.135], KS:[5.0,0.140], KY:[4.2,0.125], LA:[4.7,0.120], ME:[4.0,0.230],
  MD:[4.3,0.175], MA:[4.0,0.300], MI:[3.8,0.185], MN:[4.2,0.145], MS:[4.6,0.130],
  MO:[4.5,0.120], MT:[4.5,0.125], NE:[4.7,0.115], NV:[6.3,0.150], NH:[4.0,0.230],
  NJ:[4.2,0.175], NM:[6.5,0.140], NY:[3.8,0.230], NC:[4.7,0.135], ND:[4.5,0.110],
  OH:[3.9,0.155], OK:[5.2,0.120], OR:[4.0,0.130], PA:[3.9,0.170], RI:[4.0,0.280],
  SC:[4.8,0.145], SD:[4.6,0.130], TN:[4.4,0.130], TX:[5.3,0.150], UT:[5.3,0.110],
  VT:[3.9,0.210], VA:[4.4,0.145], WA:[3.5,0.110], WV:[3.9,0.140], WI:[4.0,0.165],
  WY:[5.0,0.125]
};
const STATE_NAMES = {
  AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",
  CT:"Connecticut",DE:"Delaware",DC:"Washington D.C.",FL:"Florida",GA:"Georgia",HI:"Hawaii",
  ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",
  ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",
  MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",
  NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",
  OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",
  TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",WA:"Washington",
  WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming"
};

// --- Model assumptions (editable) --------------------------------------------
const DEFAULTS = {
  costPerWatt: 2.85,     // gross national avg $/W installed (2025-26)
  derate: 0.83,          // system losses (inverter, wiring, temp, soiling)
  shading: { good: 1.0, average: 0.90, poor: 0.75 },
  degradation: 0.005,    // 0.5%/yr panel output decline
  elecInflation: 0.03,   // 3%/yr electricity price escalation
  co2PerKwh: 0.85,       // lb CO2 per kWh, US grid average
  years: 25,
  federalCreditCashLoan: 0.0,  // 25D expired for systems placed in service after 2025-12-31
  leaseSavingsRate: 0.15       // PPA/lease: ~15% off utility bill, $0 down
};

const fmt$ = n => "$" + Math.round(n).toLocaleString("en-US");
const fmt1 = n => (Math.round(n*10)/10).toLocaleString("en-US");

// --- Core calculation --------------------------------------------------------
function calculate(inp) {
  const psh = inp.peakSunHours;
  const rate = inp.rate;                         // $/kWh
  const annualUsage = inp.annualUsageKwh;        // kWh/yr
  const shadeMult = DEFAULTS.shading[inp.shading] || 1.0;

  // Production per installed kW per year
  const prodPerKw = psh * 365 * DEFAULTS.derate * shadeMult;
  // Size to offset ~100% of usage
  const systemKw = annualUsage / prodPerKw;
  const annualProduction = systemKw * prodPerKw; // ≈ annualUsage

  const grossCost = systemKw * 1000 * inp.costPerWatt;
  const federal = inp.method === "cash" || inp.method === "loan"
    ? grossCost * DEFAULTS.federalCreditCashLoan : 0;
  const otherIncentives = inp.otherIncentives || 0;
  const netCost = Math.max(0, grossCost - federal - otherIncentives);

  // Year-1 savings: value of offset energy, capped at actual bill (conservative re: net metering)
  const year1Savings = Math.min(annualProduction, annualUsage) * rate;

  // Lifetime with degradation + electricity inflation
  let lifetimeSavings = 0, cumulative = 0, paybackYear = null;
  const timeline = [];
  for (let y = 1; y <= DEFAULTS.years; y++) {
    const deg = Math.pow(1 - DEFAULTS.degradation, y - 1);
    const esc = Math.pow(1 + DEFAULTS.elecInflation, y - 1);
    const yearSavings = year1Savings * deg * esc;
    lifetimeSavings += yearSavings;
    cumulative += yearSavings;
    if (paybackYear === null && cumulative >= netCost) {
      // linear interpolation within the year
      const prev = cumulative - yearSavings;
      paybackYear = (y - 1) + (netCost - prev) / yearSavings;
    }
    timeline.push({ year: y, net: cumulative - netCost });
  }
  const co2Tons = (annualProduction * DEFAULTS.co2PerKwh * DEFAULTS.years) / 2000;

  // Lease / PPA path (no upfront, third party owns + claims commercial credit)
  const leaseAnnual = annualUsage * rate * DEFAULTS.leaseSavingsRate;
  const lease25 = leaseAnnual * (Math.pow(1+DEFAULTS.elecInflation,25)-1)/DEFAULTS.elecInflation;

  return {
    systemKw, annualProduction, grossCost, federal, otherIncentives, netCost,
    year1Savings, lifetimeSavings, netLifetime: lifetimeSavings - netCost,
    paybackYear, co2Tons, timeline, prodPerKw,
    lease: { annual: leaseAnnual, total25: lease25 }
  };
}

// --- Expose for the page -----------------------------------------------------
window.WC_SOLAR = { STATE_DATA, STATE_NAMES, DEFAULTS, calculate, fmt$, fmt1 };

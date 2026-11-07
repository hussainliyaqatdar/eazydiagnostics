// Tests that are sold by the lab but are not (yet) in "CMS Catalog.xlsx".
// build.js appends these to the catalog rows exported by export-raw.js, so they
// survive re-exporting the spreadsheet. Same shape as a spreadsheet row; once a
// test is added to the spreadsheet itself, delete it from here.
//   "MRP (Rs.)" is the price the customer pays, like every other catalog row.
module.exports = [
  { "Test Name": "Apolipoprotein A1 (ApoA1)", Code: "1901D", "MRP (Rs.)": 800, Type: "Specialised" },
  { "Test Name": "Apolipoprotein B (ApoB)", Code: "1903D", "MRP (Rs.)": 800, Type: "Specialised" },
];

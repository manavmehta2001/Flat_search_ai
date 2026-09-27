// Shared matching/scoring logic used by both the browser (index.html)
// and the serverless functions (api/summarize.js). Loaded as a plain
// <script> in the browser and via require() in Node.
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.JourneyHomeMatching = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  var NICE_TO_HAVES = [
    { key: "balcony", label: "Balcony / outdoor space" },
    { key: "washer", label: "In-unit washing machine" },
    { key: "transit", label: "Close to metro/bus" },
    { key: "gym", label: "Gym in building" },
    { key: "light", label: "Good natural light" },
    { key: "storage", label: "Extra storage" },
    { key: "kitchen", label: "Modular kitchen" },
    { key: "backup", label: "Power backup" },
    { key: "security", label: "24x7 security / gated" },
    { key: "furnished", label: "Furnished / semi-furnished" },
  ];

  var PEOPLE = [
    { id: "riya", name: "Riya" },
    { id: "meera", name: "Meera" },
    { id: "kavita", name: "Kavita" },
  ];

  function labelFor(key) {
    var f = NICE_TO_HAVES.filter(function (n) {
      return n.key === key;
    })[0];
    return f ? f.label : key;
  }

  // Returns an array of human-readable reasons this flat breaks one of
  // this person's dealbreakers. Empty array means it clears all of them.
  function checkDealbreakers(person, flat) {
    var reasons = [];
    if (flat.rent > person.maxRent) {
      reasons.push(
        "over " +
          person.name +
          "’s budget (₹" +
          Number(flat.rent).toLocaleString("en-IN") +
          " vs max ₹" +
          Number(person.maxRent).toLocaleString("en-IN") +
          ")"
      );
    }
    if (
      (person.excludedAreas || []).indexOf(
        (flat.area || "").trim().toLowerCase()
      ) !== -1
    ) {
      reasons.push("area is on " + person.name + "’s no-go list");
    }
    if (person.needsLift && !flat.lift) {
      reasons.push(person.name + " needs a lift");
    }
    if (person.needsParking && !flat.parking) {
      reasons.push(person.name + " needs parking");
    }
    if ((person.minBathrooms || 0) > (flat.bathrooms || 0)) {
      reasons.push(
        person.name + " needs at least " + person.minBathrooms + " bathroom(s)"
      );
    }
    if (person.needsPetFriendly && flat.petPolicy !== "allowed") {
      reasons.push(person.name + " needs it to be pet-friendly");
    }
    return reasons;
  }

  // Scores how well a flat (already past every dealbreaker) covers the
  // nice-to-haves each person asked for.
  function scoreFlat(people, flat) {
    var totalWanted = 0;
    var totalMatched = 0;
    var perPerson = {};
    people.forEach(function (person) {
      var wanted = person.niceToHaves || [];
      var flatHas = flat.niceToHaves || [];
      var matched = wanted.filter(function (k) {
        return flatHas.indexOf(k) !== -1;
      });
      var gap = wanted.filter(function (k) {
        return flatHas.indexOf(k) === -1;
      });
      totalWanted += wanted.length;
      totalMatched += matched.length;
      perPerson[person.id] = { name: person.name, matched: matched, gap: gap };
    });
    return { totalWanted: totalWanted, totalMatched: totalMatched, perPerson: perPerson };
  }

  return {
    NICE_TO_HAVES: NICE_TO_HAVES,
    PEOPLE: PEOPLE,
    labelFor: labelFor,
    checkDealbreakers: checkDealbreakers,
    scoreFlat: scoreFlat,
  };
});

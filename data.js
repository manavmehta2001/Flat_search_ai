const crypto = require("crypto");
const { readData, writeData } = require("../lib/store");

const PEOPLE_IDS = ["riya", "meera", "kavita"];

module.exports = async (req, res) => {
  try {
    if (req.method === "GET") {
      const data = await readData();
      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      const body =
        req.body && typeof req.body === "object"
          ? req.body
          : JSON.parse(req.body || "{}");
      const data = await readData();

      if (body.action === "savePerson") {
        if (!PEOPLE_IDS.includes(body.personId)) {
          return res.status(400).json({ error: "Invalid person id" });
        }
        data.people[body.personId] = body.data;
      } else if (body.action === "addFlat") {
        const id = crypto.randomUUID();
        data.flats.push(Object.assign({ id: id }, body.data));
      } else if (body.action === "deleteFlat") {
        data.flats = data.flats.filter((f) => f.id !== body.id);
      } else {
        return res.status(400).json({ error: "Unknown action" });
      }

      await writeData(data);
      return res.status(200).json(data);
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

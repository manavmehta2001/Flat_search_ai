const { head, put, BlobNotFoundError } = require("@vercel/blob");

const DATA_PATH = "journey-home/data.json";

async function readData() {
  try {
    const meta = await head(DATA_PATH);
    const response = await fetch(meta.url);
    if (!response.ok) {
      throw new Error("Could not read stored data (" + response.status + ")");
    }
    const data = await response.json();
    if (!data.people) data.people = {};
    if (!data.flats) data.flats = [];
    return data;
  } catch (err) {
    if (err instanceof BlobNotFoundError) {
      return { people: {}, flats: [] };
    }
    throw err;
  }
}

async function writeData(data) {
  await put(DATA_PATH, JSON.stringify(data), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

module.exports = { readData, writeData, DATA_PATH };

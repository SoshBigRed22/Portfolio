const fs = require("fs/promises");
const path = require("path");

const SOURCE_URL = "https://www.ticketmaster.com/joji-tickets/artist/2503150";
const OUTPUT_FILE = path.join(__dirname, "tour-dates.json");
const DEFAULT_TICKETS_URL = SOURCE_URL;

const defaultOfficialLinks = [
	{ label: "Official Website", url: "https://jojimusic.com" },
	{ label: "Tickets", url: SOURCE_URL },
	{ label: "Instagram", url: "https://www.instagram.com/sushitrash/" },
	{ label: "X / Twitter", url: "https://x.com/sushitrash" },
	{ label: "YouTube", url: "https://www.youtube.com/@joji" },
	{ label: "Spotify", url: "https://open.spotify.com/artist/3MZsBdqDrRTJihTHQrO6Dq" },
	{ label: "SoundCloud", url: "https://soundcloud.com/jojiofficial" }
];

const decodeHtml = (value) =>
	value
		.replace(/&amp;/g, "&")
		.replace(/&#39;/g, "'")
		.replace(/&quot;/g, '"')
		.replace(/&nbsp;/g, " ")
		.replace(/&ndash;/g, "-")
		.replace(/&mdash;/g, "-")
		.replace(/&rsquo;/g, "'")
		.replace(/&lsquo;/g, "'");

const stripTagsToText = (html) => {
	const withoutScripts = html
		.replace(/<script[\s\S]*?<\/script>/gi, " ")
		.replace(/<style[\s\S]*?<\/style>/gi, " ");

	return decodeHtml(withoutScripts.replace(/<[^>]+>/g, "\n").replace(/\r/g, ""));
};

const normalizeWhitespace = (value) => value.replace(/\s+/g, " ").trim();

const parseDate = (mmddyy) => {
	const [mm, dd, yy] = mmddyy.split("/").map((part) => Number(part));
	const fullYear = yy >= 70 ? 1900 + yy : 2000 + yy;
	return `${fullYear}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
};

const inferCountry = (region) => {
	if (region === "ON" || region === "QC") {
		return "Canada";
	}
	return "USA";
};

const parseLocation = (raw) => {
	const parts = raw.split(",").map((part) => part.trim()).filter(Boolean);
	if (parts.length >= 2) {
		return { city: parts[0], region: parts[1], country: inferCountry(parts[1]) };
	}

	return { city: raw.trim() || "TBA", region: "TBA", country: "TBA" };
};

const extractTourDatesFromAboutSection = (plainText) => {
	const startIndex = plainText.indexOf("Joji 2026 Tour Dates:");
	if (startIndex === -1) {
		return [];
	}

	const section = plainText.slice(startIndex, startIndex + 4500);
	const pattern = /(\d{2}\/\d{2}\/\d{2})\s*[\u2013\-]\s*([^@\n\r]+?)\s*@\s*([^\n\r]+)/g;
	const rows = [];
	let match;

	while ((match = pattern.exec(section)) !== null) {
		const date = parseDate(match[1]);
		const location = normalizeWhitespace(match[2]);
		const venue = normalizeWhitespace(match[3]);
		const { city, region, country } = parseLocation(location);

		rows.push({
			date,
			city,
			region,
			country,
			venue,
			ticketsUrl: DEFAULT_TICKETS_URL
		});
	}

	return rows;
};

const extractTotalEvents = (plainText) => {
	const explicitCount = plainText.match(/Loaded\s+\d+\s+out\s+of\s+(\d+)\s+events/i);
	if (explicitCount) {
		return Number(explicitCount[1]);
	}

	const fallbackCount = plainText.match(/out\s+of\s+(\d+)\s+events/i);
	if (fallbackCount) {
		return Number(fallbackCount[1]);
	}

	return null;
};

const dedupeAndSort = (tourDates) => {
	const seen = new Set();
	const unique = [];

	for (const show of tourDates) {
		const key = `${show.date}|${show.city}|${show.region}|${show.venue}`.toLowerCase();
		if (!seen.has(key)) {
			seen.add(key);
			unique.push(show);
		}
	}

	unique.sort((a, b) => a.date.localeCompare(b.date));
	return unique;
};

const readExistingLinks = async () => {
	try {
		const existingRaw = await fs.readFile(OUTPUT_FILE, "utf8");
		const existing = JSON.parse(existingRaw);
		if (Array.isArray(existing.officialLinks) && existing.officialLinks.length > 0) {
			return existing.officialLinks;
		}
	} catch {
		// Keep default links if the file is missing or invalid.
	}

	return defaultOfficialLinks;
};

const updateTourData = async () => {
	const response = await fetch(SOURCE_URL, {
		headers: {
			"User-Agent": "Mozilla/5.0"
		}
	});

	if (!response.ok) {
		throw new Error(`Request failed: HTTP ${response.status}`);
	}

	const html = await response.text();
	const plainText = stripTagsToText(html);
	const extractedDates = extractTourDatesFromAboutSection(plainText);
	const totalEvents = extractTotalEvents(plainText);

	if (extractedDates.length === 0) {
		throw new Error("No tour dates matched expected patterns. Source layout may have changed.");
	}

	const officialLinks = await readExistingLinks();
	const normalizedTourDates = dedupeAndSort(extractedDates);
	const payload = {
		sourceUrl: SOURCE_URL,
		generatedAt: new Date().toISOString().slice(0, 10),
		totalEvents: Number.isInteger(totalEvents) ? totalEvents : normalizedTourDates.length,
		tourDates: normalizedTourDates,
		officialLinks
	};

	await fs.writeFile(OUTPUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
	console.log(`Updated ${OUTPUT_FILE} with ${payload.tourDates.length} listed dates (source reports ${payload.totalEvents} total events).`);
};

updateTourData().catch((error) => {
	console.error(`Tour update failed: ${error.message}`);
	process.exitCode = 1;
});

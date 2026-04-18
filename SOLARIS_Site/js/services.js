const tourDatesContainer = document.getElementById("tourDatesContainer");
const officialLinksContainer = document.getElementById("officialLinksContainer");

const getOfficialTicketsUrl = (data) => {
	if (typeof data?.sourceUrl === "string" && data.sourceUrl.trim().length > 0) {
		return data.sourceUrl;
	}

	if (Array.isArray(data?.officialLinks)) {
		const ticketEntry = data.officialLinks.find((link) =>
			typeof link?.label === "string" && /ticket/i.test(link.label) && typeof link?.url === "string"
		);

		if (ticketEntry?.url) {
			return ticketEntry.url;
		}
	}

	return "https://www.ticketmaster.com/joji-tickets/artist/2503150";
};

const formatDate = (rawDate) => {
	const parsedDate = new Date(rawDate);
	if (Number.isNaN(parsedDate.getTime())) {
		return rawDate;
	}

	return parsedDate.toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
		year: "numeric"
	});
};

const createTicketLink = (url, label = "Get Tickets") => {
	const ticketLink = document.createElement("a");
	ticketLink.className = "tickets-link";
	ticketLink.href = url;
	ticketLink.textContent = label;
	ticketLink.target = "_blank";
	ticketLink.rel = "noopener noreferrer";
	return ticketLink;
};

const renderTourDates = (tourDates) => {
	if (!tourDatesContainer) {
		return;
	}

	tourDatesContainer.innerHTML = "";

	if (!Array.isArray(tourDates) || tourDates.length === 0) {
		const emptyMessage = document.createElement("p");
		emptyMessage.className = "services-message";
		emptyMessage.textContent = "No tour dates are listed yet. Check back soon for updates.";
		tourDatesContainer.appendChild(emptyMessage);
		return;
	}

	tourDates.forEach((show) => {
		const card = document.createElement("article");
		card.className = "tour-card";

		const date = document.createElement("p");
		date.className = "tour-date";
		date.textContent = formatDate(show.date || "TBA");

		const location = document.createElement("h4");
		location.className = "tour-location";
		location.textContent = `${show.city || "TBA"}, ${show.region || show.country || "TBA"}`;

		const venue = document.createElement("p");
		venue.className = "tour-venue";
		venue.textContent = show.venue || "Venue TBA";

		card.appendChild(date);
		card.appendChild(location);
		card.appendChild(venue);

		if (show.ticketsUrl) {
			card.appendChild(createTicketLink(show.ticketsUrl));
		}

		tourDatesContainer.appendChild(card);
	});
};

const renderOfficialLinks = (officialLinks) => {
	if (!officialLinksContainer) {
		return;
	}

	officialLinksContainer.innerHTML = "";

	if (!Array.isArray(officialLinks) || officialLinks.length === 0) {
		const fallbackMessage = document.createElement("p");
		fallbackMessage.className = "services-message";
		fallbackMessage.textContent = "Official links are not available yet.";
		officialLinksContainer.appendChild(fallbackMessage);
		return;
	}

	officialLinks.forEach((link) => {
		const anchor = document.createElement("a");
		anchor.className = "official-link-pill";
		anchor.href = link.url;
		anchor.textContent = link.label;
		anchor.target = "_blank";
		anchor.rel = "noopener noreferrer";
		officialLinksContainer.appendChild(anchor);
	});
};

const renderMeta = (generatedAt) => {
	if (!generatedAt || !tourDatesContainer) {
		return;
	}

	const stamp = document.createElement("p");
	stamp.className = "services-meta";
	stamp.textContent = `Data last updated: ${formatDate(generatedAt)}`;
	tourDatesContainer.prepend(stamp);
};

const renderOfficialSourceNotice = (tourDates, totalEvents, officialTicketsUrl) => {
	if (!tourDatesContainer || !Array.isArray(tourDates) || !Number.isInteger(totalEvents)) {
		return;
	}

	if (tourDates.length >= totalEvents || totalEvents <= 0) {
		return;
	}

	const note = document.createElement("p");
	note.className = "services-official-note";
	note.textContent = `Showing ${tourDates.length} of ${totalEvents} dates here. To view all official tour dates and venues, please visit `;

	const link = document.createElement("a");
	link.href = officialTicketsUrl;
	link.textContent = "Ticketmaster";
	link.target = "_blank";
	link.rel = "noopener noreferrer";

	note.appendChild(link);
	note.appendChild(document.createTextNode("."));
	tourDatesContainer.appendChild(note);
};

const showLoadError = () => {
	if (tourDatesContainer) {
		tourDatesContainer.innerHTML = "<p class=\"services-message\">Unable to load tour data right now.</p>";
	}

	if (officialLinksContainer) {
		officialLinksContainer.innerHTML = "<p class=\"services-message\">Unable to load official links right now.</p>";
	}
};

const loadServicesData = async () => {
	try {
		const response = await fetch("js/tour-dates.json", { cache: "no-store" });
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}

		const data = await response.json();
		renderTourDates(data.tourDates);
		renderOfficialLinks(data.officialLinks);
		renderMeta(data.generatedAt);
		renderOfficialSourceNotice(data.tourDates, data.totalEvents, getOfficialTicketsUrl(data));
	} catch (error) {
		showLoadError();
	}
};

loadServicesData();

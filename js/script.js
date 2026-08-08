const filterButtons = Array.from(document.querySelectorAll(".filter-btn"));
const projectCards = Array.from(document.querySelectorAll(".project-card"));
const versionTag = document.getElementById("site-version");

const PATCH_INFO = {
	version: "2.7",
	date: "2026-08-08"
};

const RECENT_WINDOW_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const parseDateValue = (value) => {
	if (!value) {
		return null;
	}

	const parsed = Date.parse(`${value}T00:00:00`);
	return Number.isNaN(parsed) ? null : parsed;
};

const getLatestAddedTimestamp = () => {
	const timestamps = projectCards
		.map((card) => parseDateValue(card.dataset.addedDate))
		.filter((timestamp) => timestamp !== null);

	if (timestamps.length === 0) {
		return null;
	}

	return Math.max(...timestamps);
};

const isRecentBatchCard = (card, nowTimestamp, latestTimestamp) => {
	if (latestTimestamp === null) {
		return false;
	}

	const cardTimestamp = parseDateValue(card.dataset.addedDate);
	if (cardTimestamp === null || cardTimestamp !== latestTimestamp) {
		return false;
	}

	const ageInDays = (nowTimestamp - cardTimestamp) / MS_PER_DAY;
	return ageInDays >= 0 && ageInDays <= RECENT_WINDOW_DAYS;
};

const syncRecentState = () => {
	const latestTimestamp = getLatestAddedTimestamp();
	const nowTimestamp = Date.now();

	projectCards.forEach((card) => {
		const isRecent = isRecentBatchCard(card, nowTimestamp, latestTimestamp);
		card.dataset.recent = isRecent ? "true" : "false";

		const newBadge = card.querySelector(".status-new");
		if (newBadge) {
			newBadge.classList.toggle("is-hidden", !isRecent);
		}
	});
};

if (filterButtons.length > 0 && projectCards.length > 0) {
	syncRecentState();

	const applyFilter = (status) => {
		projectCards.forEach((card) => {
			const shouldShow =
				status === "all" ||
				(status === "recent" ? card.dataset.recent === "true" : card.dataset.status === status);
			card.classList.toggle("is-hidden", !shouldShow);
		});

		filterButtons.forEach((button) => {
			const isActive = button.dataset.filter === status;
			button.classList.toggle("is-active", isActive);
			button.setAttribute("aria-pressed", String(isActive));
		});
	};

	filterButtons.forEach((button) => {
		button.addEventListener("click", () => {
			applyFilter(button.dataset.filter || "all");
		});
	});

	applyFilter("all");
}

if (versionTag) {
	versionTag.textContent = `v${PATCH_INFO.version} · ${PATCH_INFO.date}`;
}

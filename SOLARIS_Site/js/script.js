const albumContainer = document.getElementById("albumContainer");
const sortFilter = document.getElementById("sortFilter");

if (albumContainer && sortFilter) {
	const albumSections = Array.from(albumContainer.querySelectorAll(".album-section"));

	const sortAlbums = (mode) => {
		const sorted = [...albumSections];

		const getYear = (album) => Number(album.dataset.year);
		const getMonth = (album) => Number(album.dataset.month || 0);

		if (mode === "oldest") {
			sorted.sort((a, b) => {
				const yearDiff = getYear(a) - getYear(b);
				if (yearDiff !== 0) {
					return yearDiff;
				}
				return getMonth(a) - getMonth(b);
			});
		} else if (mode === "newest") {
			sorted.sort((a, b) => {
				const yearDiff = getYear(b) - getYear(a);
				if (yearDiff !== 0) {
					return yearDiff;
				}
				return getMonth(b) - getMonth(a);
			});
		} else {
			sorted.sort((a, b) => Number(a.dataset.order) - Number(b.dataset.order));
		}

		sorted.forEach((section) => albumContainer.appendChild(section));
	};

	sortFilter.addEventListener("change", (event) => {
		sortAlbums(event.target.value);
	});
}
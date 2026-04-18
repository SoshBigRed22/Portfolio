const filterButtons = Array.from(document.querySelectorAll(".filter-btn"));
const projectCards = Array.from(document.querySelectorAll(".project-card"));

if (filterButtons.length > 0 && projectCards.length > 0) {
	const applyFilter = (status) => {
		projectCards.forEach((card) => {
			const shouldShow = status === "all" || card.dataset.status === status;
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
